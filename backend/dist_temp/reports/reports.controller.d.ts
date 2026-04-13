import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DailyComparisonQueryDto } from './dto/daily-comparison.query.dto';
import { DailyOccupancyQueryDto } from './dto/daily-occupancy.query.dto';
import { DailySummaryQueryDto } from './dto/daily-summary.query.dto';
import { FrequentCustomersQueryDto } from './dto/frequent-customers.query.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    dailySummary(request: Request & {
        user: AuthenticatedUser;
    }, query: DailySummaryQueryDto): Promise<import("./reports.service").DailySummaryRow>;
    dailyComparison(request: Request & {
        user: AuthenticatedUser;
    }, query: DailyComparisonQueryDto): Promise<import("./reports.service").DailyComparisonRow[]>;
    dailyOccupancy(query: DailyOccupancyQueryDto): Promise<import("./reports.service").DailyOccupancyRow[]>;
    frequentCustomers(query: FrequentCustomersQueryDto): Promise<import("./reports.service").FrequentCustomerRow[]>;
    snapshots(request: Request & {
        user: AuthenticatedUser;
    }): Promise<import("./reports.service").ReportSnapshotRow[]>;
    deleteSnapshot(request: Request & {
        user: AuthenticatedUser;
    }, id: string): Promise<{
        deleted: true;
    }>;
}
