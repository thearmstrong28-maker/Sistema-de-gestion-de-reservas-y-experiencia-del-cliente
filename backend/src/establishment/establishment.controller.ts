import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateTablesBulkDto } from './dto/create-tables-bulk.dto';
import { CreateTablesDistributionDto } from './dto/create-tables-distribution.dto';
import { UpdateTableAvailabilityDto } from './dto/update-table-availability.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { EstablishmentService } from './establishment.service';

@Controller('establishment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class EstablishmentController {
  constructor(private readonly establishmentService: EstablishmentService) {}

  @Get()
  getSummary(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.establishmentService.getSummary(request.user);
  }

  @Get('tables')
  listTables() {
    return this.establishmentService.listTables();
  }

  @Post('tables/bulk')
  createTablesBulk(@Body() payload: CreateTablesBulkDto) {
    return this.establishmentService.createTablesBulk(payload);
  }

  @Post('tables/distribution')
  createTablesDistribution(@Body() payload: CreateTablesDistributionDto) {
    return this.establishmentService.createTablesDistribution(payload);
  }

  @Roles(Role.Admin, Role.Host)
  @Patch('tables/:id/availability')
  updateTableAvailability(
    @Param('id') id: string,
    @Body() payload: UpdateTableAvailabilityDto,
  ) {
    return this.establishmentService.updateTableAvailability(id, payload);
  }

  @Patch('tables/:id')
  updateTable(@Param('id') id: string, @Body() payload: UpdateTableDto) {
    return this.establishmentService.updateTable(id, payload);
  }

  @Delete('tables/:id')
  removeTable(@Param('id') id: string) {
    return this.establishmentService.deleteTable(id);
  }
}
