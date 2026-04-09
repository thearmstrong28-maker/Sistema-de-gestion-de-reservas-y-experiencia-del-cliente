import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DailyComparisonQueryDto } from './dto/daily-comparison.query.dto';
import { DailyOccupancyQueryDto } from './dto/daily-occupancy.query.dto';
import { DailySummaryQueryDto } from './dto/daily-summary.query.dto';
import { FrequentCustomersQueryDto } from './dto/frequent-customers.query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  dailySummary(
    @Req() request: Request & { user: AuthenticatedUser },
    @Query() query: DailySummaryQueryDto,
  ) {
    return this.reportsService.getDailySummary(request.user, query);
  }

  @Get('daily-comparison')
  dailyComparison(
    @Req() request: Request & { user: AuthenticatedUser },
    @Query() query: DailyComparisonQueryDto,
  ) {
    return this.reportsService.getDailyComparison(request.user, query);
  }

  @Get('daily-occupancy')
  dailyOccupancy(@Query() query: DailyOccupancyQueryDto) {
    return this.reportsService.getDailyOccupancy(query);
  }

  @Get('frequent-customers')
  frequentCustomers(@Query() query: FrequentCustomersQueryDto) {
    return this.reportsService.getFrequentCustomers(query);
  }

  @Get('snapshots')
  snapshots(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.reportsService.listSnapshots(request.user);
  }

  @Delete('snapshots/:id')
  deleteSnapshot(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param('id') id: string,
  ) {
    return this.reportsService.deleteSnapshot(request.user, id);
  }
}
