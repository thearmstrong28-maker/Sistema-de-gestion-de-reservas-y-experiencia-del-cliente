import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DailyOccupancyQueryDto } from './dto/daily-occupancy.query.dto';
import { FrequentCustomersQueryDto } from './dto/frequent-customers.query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.Manager)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-occupancy')
  dailyOccupancy(@Query() query: DailyOccupancyQueryDto) {
    return this.reportsService.getDailyOccupancy(query);
  }

  @Get('frequent-customers')
  frequentCustomers(@Query() query: FrequentCustomersQueryDto) {
    return this.reportsService.getFrequentCustomers(query);
  }
}
