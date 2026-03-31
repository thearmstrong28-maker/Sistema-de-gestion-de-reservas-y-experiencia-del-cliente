import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { ReservationEntity } from './entities/reservation.entity';
import { TableEntity } from './entities/table.entity';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([TableEntity, ReservationEntity]),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
