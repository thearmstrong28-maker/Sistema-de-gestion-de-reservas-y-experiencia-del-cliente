import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../auth/entities/user.entity';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { RestaurantTableEntity } from '../reservations/entities/table.entity';
import { WaitlistEntryEntity } from '../waitlist/entities/waitlist-entry.entity';
import { EstablishmentController } from './establishment.controller';
import { EstablishmentService } from './establishment.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      UserEntity,
      RestaurantTableEntity,
      ReservationEntity,
      WaitlistEntryEntity,
    ]),
  ],
  controllers: [EstablishmentController],
  providers: [EstablishmentService],
})
export class EstablishmentModule {}
