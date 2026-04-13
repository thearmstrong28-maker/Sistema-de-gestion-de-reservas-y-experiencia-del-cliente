import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { WaitlistEntryEntity } from '../waitlist/entities/waitlist-entry.entity';
import { CustomerEntity } from './entities/customer.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      ReservationEntity,
      WaitlistEntryEntity,
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
