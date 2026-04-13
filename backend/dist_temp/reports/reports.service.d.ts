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
export interface ReportSnapshotRow {
    id: string;
    restaurantName: string;
    reportDate: string;
    reservationsCount: number;
    attendedCount: number;
    customerCount: number;
    noShowCount: number;
    attendancePercent: number;
    source: string;
    createdAt: string;
    updatedAt: string;
}
export declare class ReportsService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getDailySummary(admin: AuthenticatedUser, query: DailySummaryQueryDto): Promise<DailySummaryRow>;
    getDailyComparison(admin: AuthenticatedUser, query: DailyComparisonQueryDto): Promise<DailyComparisonRow[]>;
    getDailyOccupancy(query: DailyOccupancyQueryDto): Promise<DailyOccupancyRow[]>;
    getFrequentCustomers(query: FrequentCustomersQueryDto): Promise<FrequentCustomerRow[]>;
    listSnapshots(admin: AuthenticatedUser): Promise<ReportSnapshotRow[]>;
    deleteSnapshot(admin: AuthenticatedUser, id: string): Promise<{
        deleted: true;
    }>;
    private getDailyMetrics;
    private ensureSnapshotForDate;
    private ensureSnapshotsForRange;
    private getSnapshotMetrics;
    private resolveRestaurantName;
    private isPastDate;
    private getTodayDate;
    private resolveReportDate;
}
