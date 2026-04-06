import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationEntity } from './entities/reservation.entity';
import { RestaurantTableEntity } from './entities/table.entity';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ReservationEntity,
      RestaurantTableEntity,
      ShiftEntity,
      CustomerEntity,
    ]),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
