import {
  Body,
  Controller,
  Get,
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
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Host)
  @Post()
  create(
    @Body() createReservationDto: CreateReservationDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.reservationsService.reserveTable(
      createReservationDto,
      request.user.userId,
    );
  }

  @Get('availability')
  availability(@Query() query: CheckAvailabilityDto) {
    return this.reservationsService.getAvailability(query);
  }
}
