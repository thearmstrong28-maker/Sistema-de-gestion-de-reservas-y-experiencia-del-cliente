import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { AssignTableDto } from './dto/assign-table.dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Roles(Role.Admin, Role.Host)
  @Post()
  create(
    @Body() createReservationDto: CreateReservationDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.reservationsService.create(
      createReservationDto,
      request.user.userId,
    );
  }

  @Roles(Role.Admin, Role.Host)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @Roles(Role.Admin, Role.Host)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.reservationsService.cancel(id);
  }

  @Roles(Role.Admin, Role.Host)
  @Patch(':id/no-show')
  noShow(@Param('id') id: string) {
    return this.reservationsService.markNoShow(id);
  }

  @Roles(Role.Host)
  @Patch(':id/assign-table')
  assignTable(@Param('id') id: string, @Body() assignTableDto: AssignTableDto) {
    return this.reservationsService.assignTable(id, assignTableDto);
  }

  @Roles(Role.Admin, Role.Host, Role.Manager)
  @Get('availability')
  availability(@Query() query: CheckAvailabilityDto) {
    return this.reservationsService.getAvailability(query);
  }
}
