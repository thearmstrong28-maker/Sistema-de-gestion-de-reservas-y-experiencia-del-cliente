import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DailyOccupancyQueryDto } from './dto/daily-occupancy.query.dto';
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
}
