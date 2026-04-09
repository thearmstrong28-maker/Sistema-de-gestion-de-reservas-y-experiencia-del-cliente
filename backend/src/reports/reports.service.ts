import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DailyComparisonQueryDto } from './dto/daily-comparison.query.dto';
import { DailyOccupancyQueryDto } from './dto/daily-occupancy.query.dto';
import { DailySummaryQueryDto } from './dto/daily-summary.query.dto';
import { FrequentCustomersQueryDto } from './dto/frequent-customers.query.dto';

export interface DailyOccupancyRow {
  shiftId: string;
  shiftDate: string;
  shiftName: string;
  totalTables: number;
  occupiedTables: number;
  reservedGuests: number;
  totalCapacity: number;
  occupancyPercent: number;
}

export interface DailySummaryRow {
  restaurantName: string;
  reportDate: string;
  reservationsCount: number;
  attendedCount: number;
  customerCount: number;
  noShowCount: number;
  attendancePercent: number;
}

export interface DailyComparisonRow {
  reportDate: string;
  reservationsCount: number;
  attendedCount: number;
  customerCount: number;
  noShowCount: number;
  attendancePercent: number;
}

export interface FrequentCustomerRow {
  customerId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  visitCount: number;
  noShowCount: number;
  lastVisitAt: string | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async getDailySummary(
    admin: AuthenticatedUser,
    query: DailySummaryQueryDto,
  ): Promise<DailySummaryRow> {
    const restaurantName = this.resolveRestaurantName(admin);
    const reportDate = this.resolveReportDate(query.date);
    const row = await this.getDailyMetrics(reportDate);

    return {
      restaurantName,
      reportDate,
      ...row,
    };
  }

  async getDailyComparison(
    admin: AuthenticatedUser,
    query: DailyComparisonQueryDto,
  ): Promise<DailyComparisonRow[]> {
    const reportDate = this.resolveReportDate(query.date);
    const days = Math.min(Math.max(query.days ?? 7, 1), 30);
    this.resolveRestaurantName(admin);

    const rawRows: unknown = await this.dataSource.query(
      `
        WITH requested_dates AS (
          SELECT generate_series(
            ($1::date - (($2 - 1) * INTERVAL '1 day'))::date,
            $1::date,
            INTERVAL '1 day'
          )::date AS report_date
        )
        SELECT
          to_char(d.report_date, 'YYYY-MM-DD') AS "reportDate",
          COALESCE(m.reservations_count, 0) AS "reservationsCount",
          COALESCE(m.attended_count, 0) AS "attendedCount",
          COALESCE(m.customer_count, 0) AS "customerCount",
          COALESCE(m.no_show_count, 0) AS "noShowCount",
          CASE
            WHEN COALESCE(m.reservations_count, 0) = 0 THEN 0
            ELSE ROUND(
              (COALESCE(m.attended_count, 0)::numeric / COALESCE(m.reservations_count, 0)::numeric) * 100,
              2
            )
          END AS "attendancePercent"
        FROM requested_dates d
        LEFT JOIN daily_establishment_report m
          ON m.report_date = d.report_date
        ORDER BY d.report_date ASC
      `,
      [reportDate, days],
    );
    const rows = rawRows as Array<Record<string, unknown>>;

    return rows.map((row: Record<string, unknown>) => ({
      reportDate: String(row.reportDate),
      reservationsCount: Number(row.reservationsCount),
      attendedCount: Number(row.attendedCount),
      customerCount: Number(row.customerCount),
      noShowCount: Number(row.noShowCount),
      attendancePercent: Number(row.attendancePercent),
    }));
  }

  async getDailyOccupancy(
    query: DailyOccupancyQueryDto,
  ): Promise<DailyOccupancyRow[]> {
    const date = query.date ? query.date.toISOString().slice(0, 10) : null;
    const rawRows: unknown = await this.dataSource.query(
      `
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
      `,
      [date, query.shiftId ?? null],
    );
    const rows = rawRows as Array<Record<string, unknown>>;

    return rows.map((row: Record<string, unknown>) => ({
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

  async getFrequentCustomers(
    query: FrequentCustomersQueryDto,
  ): Promise<FrequentCustomerRow[]> {
    const limit = Math.min(query.limit ?? 100, 500);
    const minVisits = query.minVisits ?? 1;

    const rawRows: unknown = await this.dataSource.query(
      `
        SELECT
          customer_id AS "customerId",
          full_name AS "fullName",
          email,
          phone,
          visit_count AS "visitCount",
          no_show_count AS "noShowCount",
          last_visit_at AS "lastVisitAt"
        FROM frequent_customers
        WHERE visit_count >= $1
        ORDER BY visit_count DESC, last_visit_at DESC NULLS LAST, full_name ASC
        LIMIT $2
      `,
      [minVisits, limit],
    );
    const rows = rawRows as Array<Record<string, unknown>>;

    return rows.map((row: Record<string, unknown>) => ({
      customerId: String(row.customerId),
      fullName: String(row.fullName),
      email: (row.email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      visitCount: Number(row.visitCount),
      noShowCount: Number(row.noShowCount),
      lastVisitAt: (row.lastVisitAt as string | null) ?? null,
    }));
  }

  private async getDailyMetrics(
    reportDate: string,
  ): Promise<Omit<DailySummaryRow, 'restaurantName' | 'reportDate'>> {
    const rawRows: unknown = await this.dataSource.query(
      `
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
      `,
      [reportDate],
    );
    const row = (rawRows as Array<Record<string, unknown>>)[0];

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

  private resolveRestaurantName(admin: AuthenticatedUser): string {
    return admin.restaurantName?.trim() || 'Restaurante principal';
  }

  private resolveReportDate(value?: Date): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
  }
}
