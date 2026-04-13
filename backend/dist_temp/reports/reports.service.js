"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let ReportsService = class ReportsService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getDailySummary(admin, query) {
        const restaurantName = this.resolveRestaurantName(admin);
        const reportDate = this.resolveReportDate(query.date);
        await this.ensureSnapshotForDate(restaurantName, reportDate);
        const row = this.isPastDate(reportDate)
            ? await this.getSnapshotMetrics(restaurantName, reportDate)
            : await this.getDailyMetrics(reportDate);
        return {
            restaurantName,
            reportDate,
            ...row,
        };
    }
    async getDailyComparison(admin, query) {
        const restaurantName = this.resolveRestaurantName(admin);
        const reportDate = this.resolveReportDate(query.date);
        const days = Math.min(Math.max(query.days ?? 7, 1), 30);
        await this.ensureSnapshotsForRange(restaurantName, reportDate, days);
        const rawRows = await this.dataSource.query(`
        WITH requested_dates AS (
          SELECT generate_series(
            ($1::date - (($2 - 1) * INTERVAL '1 day'))::date,
            $1::date,
            INTERVAL '1 day'
          )::date AS report_date
        )
        SELECT
          to_char(d.report_date, 'YYYY-MM-DD') AS "reportDate",
          CASE
            WHEN d.report_date < CURRENT_DATE
              THEN COALESCE(s.reservations_count, 0)
              ELSE COALESCE(m.reservations_count, 0)
          END AS "reservationsCount",
          CASE
            WHEN d.report_date < CURRENT_DATE
              THEN COALESCE(s.attended_count, 0)
              ELSE COALESCE(m.attended_count, 0)
          END AS "attendedCount",
          CASE
            WHEN d.report_date < CURRENT_DATE
              THEN COALESCE(s.customer_count, 0)
              ELSE COALESCE(m.customer_count, 0)
          END AS "customerCount",
          CASE
            WHEN d.report_date < CURRENT_DATE
              THEN COALESCE(s.no_show_count, 0)
              ELSE COALESCE(m.no_show_count, 0)
          END AS "noShowCount",
          CASE
            WHEN d.report_date < CURRENT_DATE THEN COALESCE(s.attendance_percent, 0)
            WHEN COALESCE(m.reservations_count, 0) = 0 THEN 0
            ELSE ROUND(
              (COALESCE(m.attended_count, 0)::numeric / COALESCE(m.reservations_count, 0)::numeric) * 100,
              2
            )
          END AS "attendancePercent"
        FROM requested_dates d
        LEFT JOIN report_snapshots s
          ON s.report_date = d.report_date
          AND s.restaurant_name = $3
        LEFT JOIN daily_establishment_report m
          ON m.report_date = d.report_date
        ORDER BY d.report_date ASC
      `, [reportDate, days, restaurantName]);
        const rows = Array.isArray(rawRows)
            ? rawRows
            : [];
        return rows.map((row) => ({
            reportDate: String(row.reportDate),
            reservationsCount: Number(row.reservationsCount),
            attendedCount: Number(row.attendedCount),
            customerCount: Number(row.customerCount),
            noShowCount: Number(row.noShowCount),
            attendancePercent: Number(row.attendancePercent),
        }));
    }
    async getDailyOccupancy(query) {
        const date = query.date ? query.date.toISOString().slice(0, 10) : null;
        const rawRows = await this.dataSource.query(`
        SELECT
          shift_id AS "shiftId",
          shift_date::text AS "shiftDate",
          shift_name AS "shiftName",
          total_tables AS "totalTables",
          occupied_tables AS "occupiedTables",
          reserved_guests AS "reservedGuests",
          total_capacity AS "totalCapacity",
          occupancy_percent AS "occupancyPercent"
        FROM daily_shift_occupancy
        WHERE ($1::date IS NULL OR shift_date = $1::date)
          AND ($2::uuid IS NULL OR shift_id = $2::uuid)
        ORDER BY shift_date DESC, shift_name ASC
      `, [date, query.shiftId ?? null]);
        const rows = rawRows;
        return rows.map((row) => ({
            shiftId: String(row.shiftId),
            shiftDate: String(row.shiftDate),
            shiftName: String(row.shiftName),
            totalTables: Number(row.totalTables),
            occupiedTables: Number(row.occupiedTables),
            reservedGuests: Number(row.reservedGuests),
            totalCapacity: Number(row.totalCapacity),
            occupancyPercent: Number(row.occupancyPercent),
        }));
    }
    async getFrequentCustomers(query) {
        const limit = Math.min(query.limit ?? 100, 500);
        const minVisits = query.minVisits ?? 1;
        const date = query.date ? query.date.toISOString().slice(0, 10) : null;
        const rawRows = await this.dataSource.query(`
        SELECT
          c.id AS "customerId",
          c.full_name AS "fullName",
          c.email,
          c.phone,
          COUNT(r.id) FILTER (WHERE r.status IN ('SEATED', 'COMPLETED')) AS "visitCount",
          COUNT(r.id) FILTER (WHERE r.status = 'NO_SHOW') AS "noShowCount",
          MAX(r.starts_at) FILTER (WHERE r.status IN ('SEATED', 'COMPLETED')) AS "lastVisitAt"
        FROM customers c
        LEFT JOIN reservations r
          ON r.customer_id = c.id
         AND ($1::date IS NULL OR r.reservation_date = $1::date)
         AND ($2::uuid IS NULL OR r.shift_id = $2::uuid)
        GROUP BY c.id, c.full_name, c.email, c.phone
        HAVING COUNT(r.id) FILTER (WHERE r.status IN ('SEATED', 'COMPLETED')) >= $3
        ORDER BY "visitCount" DESC, "lastVisitAt" DESC NULLS LAST, "fullName" ASC
        LIMIT $4
      `, [date, query.shiftId ?? null, minVisits, limit]);
        const rows = rawRows;
        return rows.map((row) => ({
            customerId: String(row.customerId),
            fullName: String(row.fullName),
            email: row.email ?? null,
            phone: row.phone ?? null,
            visitCount: Number(row.visitCount),
            noShowCount: Number(row.noShowCount),
            lastVisitAt: row.lastVisitAt ?? null,
        }));
    }
    async listSnapshots(admin) {
        const restaurantName = this.resolveRestaurantName(admin);
        const rawRows = await this.dataSource.query(`
        SELECT
          id,
          restaurant_name AS "restaurantName",
          report_date::text AS "reportDate",
          reservations_count AS "reservationsCount",
          attended_count AS "attendedCount",
          customer_count AS "customerCount",
          no_show_count AS "noShowCount",
          attendance_percent AS "attendancePercent",
          source,
          created_at::text AS "createdAt",
          updated_at::text AS "updatedAt"
        FROM report_snapshots
        WHERE restaurant_name = $1
        ORDER BY report_date DESC, created_at DESC
      `, [restaurantName]);
        const rows = rawRows;
        return rows.map((row) => ({
            id: String(row.id),
            restaurantName: String(row.restaurantName),
            reportDate: String(row.reportDate),
            reservationsCount: Number(row.reservationsCount),
            attendedCount: Number(row.attendedCount),
            customerCount: Number(row.customerCount),
            noShowCount: Number(row.noShowCount),
            attendancePercent: Number(row.attendancePercent),
            source: String(row.source),
            createdAt: String(row.createdAt),
            updatedAt: String(row.updatedAt),
        }));
    }
    async deleteSnapshot(admin, id) {
        const restaurantName = this.resolveRestaurantName(admin);
        const result = await this.dataSource.query(`
        DELETE FROM report_snapshots
        WHERE id = $1::uuid
          AND restaurant_name = $2
        RETURNING id
      `, [id, restaurantName]);
        const rows = result;
        if (!rows.length) {
            throw new common_1.NotFoundException('No se encontró el reporte para eliminar');
        }
        return { deleted: true };
    }
    async getDailyMetrics(reportDate) {
        const rawRows = await this.dataSource.query(`
        SELECT
          COALESCE(reservations_count, 0) AS "reservationsCount",
          COALESCE(attended_count, 0) AS "attendedCount",
          COALESCE(customer_count, 0) AS "customerCount",
          COALESCE(no_show_count, 0) AS "noShowCount",
          CASE
            WHEN COALESCE(reservations_count, 0) = 0 THEN 0
            ELSE ROUND(
              (COALESCE(attended_count, 0)::numeric / COALESCE(reservations_count, 0)::numeric) * 100,
              2
            )
          END AS "attendancePercent"
        FROM daily_establishment_report
        WHERE report_date = $1::date
        LIMIT 1
      `, [reportDate]);
        const row = Array.isArray(rawRows)
            ? rawRows[0]
            : undefined;
        if (!row) {
            return {
                reservationsCount: 0,
                attendedCount: 0,
                customerCount: 0,
                noShowCount: 0,
                attendancePercent: 0,
            };
        }
        return {
            reservationsCount: Number(row.reservationsCount),
            attendedCount: Number(row.attendedCount),
            customerCount: Number(row.customerCount),
            noShowCount: Number(row.noShowCount),
            attendancePercent: Number(row.attendancePercent),
        };
    }
    async ensureSnapshotForDate(restaurantName, reportDate) {
        if (!this.isPastDate(reportDate)) {
            return;
        }
        await this.dataSource.query(`
        WITH metrics AS (
          SELECT
            $2::date AS report_date,
            COALESCE(m.reservations_count, 0) AS reservations_count,
            COALESCE(m.attended_count, 0) AS attended_count,
            COALESCE(m.customer_count, 0) AS customer_count,
            COALESCE(m.no_show_count, 0) AS no_show_count,
            CASE
              WHEN COALESCE(m.reservations_count, 0) = 0 THEN 0
              ELSE ROUND(
                (COALESCE(m.attended_count, 0)::numeric / COALESCE(m.reservations_count, 0)::numeric) * 100,
                2
              )
            END AS attendance_percent
          FROM (SELECT 1) seed
          LEFT JOIN daily_establishment_report m
            ON m.report_date = $2::date
        )
        INSERT INTO report_snapshots (
          restaurant_name,
          report_date,
          reservations_count,
          attended_count,
          customer_count,
          no_show_count,
          attendance_percent,
          source
        )
        SELECT
          $1,
          report_date,
          reservations_count,
          attended_count,
          customer_count,
          no_show_count,
          attendance_percent,
          'auto_query_backfill'
        FROM metrics
        ON CONFLICT (restaurant_name, report_date)
        DO UPDATE SET
          reservations_count = EXCLUDED.reservations_count,
          attended_count = EXCLUDED.attended_count,
          customer_count = EXCLUDED.customer_count,
          no_show_count = EXCLUDED.no_show_count,
          attendance_percent = EXCLUDED.attendance_percent,
          source = CASE
            WHEN report_snapshots.source = 'manual' THEN report_snapshots.source
            ELSE EXCLUDED.source
          END,
          updated_at = NOW()
      `, [restaurantName, reportDate]);
    }
    async ensureSnapshotsForRange(restaurantName, reportDate, days) {
        await this.dataSource.query(`
        WITH requested_dates AS (
          SELECT generate_series(
            ($2::date - (($3 - 1) * INTERVAL '1 day'))::date,
            $2::date,
            INTERVAL '1 day'
          )::date AS report_date
        ),
        metrics AS (
          SELECT
            d.report_date,
            COALESCE(m.reservations_count, 0) AS reservations_count,
            COALESCE(m.attended_count, 0) AS attended_count,
            COALESCE(m.customer_count, 0) AS customer_count,
            COALESCE(m.no_show_count, 0) AS no_show_count,
            CASE
              WHEN COALESCE(m.reservations_count, 0) = 0 THEN 0
              ELSE ROUND(
                (COALESCE(m.attended_count, 0)::numeric / COALESCE(m.reservations_count, 0)::numeric) * 100,
                2
              )
            END AS attendance_percent
          FROM requested_dates d
          LEFT JOIN daily_establishment_report m ON m.report_date = d.report_date
          WHERE d.report_date < CURRENT_DATE
        )
        INSERT INTO report_snapshots (
          restaurant_name,
          report_date,
          reservations_count,
          attended_count,
          customer_count,
          no_show_count,
          attendance_percent,
          source
        )
        SELECT
          $1,
          report_date,
          reservations_count,
          attended_count,
          customer_count,
          no_show_count,
          attendance_percent,
          'auto_query_backfill'
        FROM metrics
        ON CONFLICT (restaurant_name, report_date)
        DO UPDATE SET
          reservations_count = EXCLUDED.reservations_count,
          attended_count = EXCLUDED.attended_count,
          customer_count = EXCLUDED.customer_count,
          no_show_count = EXCLUDED.no_show_count,
          attendance_percent = EXCLUDED.attendance_percent,
          source = CASE
            WHEN report_snapshots.source = 'manual' THEN report_snapshots.source
            ELSE EXCLUDED.source
          END,
          updated_at = NOW()
      `, [restaurantName, reportDate, days]);
    }
    async getSnapshotMetrics(restaurantName, reportDate) {
        const rawRows = await this.dataSource.query(`
        SELECT
          reservations_count AS "reservationsCount",
          attended_count AS "attendedCount",
          customer_count AS "customerCount",
          no_show_count AS "noShowCount",
          attendance_percent AS "attendancePercent"
        FROM report_snapshots
        WHERE restaurant_name = $1
          AND report_date = $2::date
        LIMIT 1
      `, [restaurantName, reportDate]);
        const row = Array.isArray(rawRows)
            ? rawRows[0]
            : undefined;
        if (!row) {
            return this.getDailyMetrics(reportDate);
        }
        return {
            reservationsCount: Number(row.reservationsCount),
            attendedCount: Number(row.attendedCount),
            customerCount: Number(row.customerCount),
            noShowCount: Number(row.noShowCount),
            attendancePercent: Number(row.attendancePercent),
        };
    }
    resolveRestaurantName(admin) {
        return admin.restaurantName?.trim() || 'Restaurante principal';
    }
    isPastDate(reportDate) {
        return reportDate < this.getTodayDate();
    }
    getTodayDate() {
        return new Date().toISOString().slice(0, 10);
    }
    resolveReportDate(value) {
        if (!value) {
            return new Date().toISOString().slice(0, 10);
        }
        return value.toISOString().slice(0, 10);
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ReportsService);
//# sourceMappingURL=reports.service.js.map