import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EstablishmentModule } from './establishment/establishment.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ShiftsModule } from './shifts/shifts.module';
import { UsersModule } from './users/users.module';
import { WaitlistModule } from './waitlist/waitlist.module';

const DEFAULT_DB_NAME = 'restaurant_reservations';
const DEFAULT_DB_PASSWORD = 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const dbPort = Number(process.env.DB_PORT ?? 5432);
        const databaseUrl = process.env.DATABASE_URL;

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          host: databaseUrl ? undefined : (process.env.DB_HOST ?? 'localhost'),
          port: databaseUrl
            ? undefined
            : Number.isFinite(dbPort)
              ? dbPort
              : 5432,
          username: databaseUrl
            ? undefined
            : (process.env.DB_USER ?? 'postgres'),
          password: databaseUrl
            ? undefined
            : (process.env.DB_PASSWORD ?? DEFAULT_DB_PASSWORD),
          database: databaseUrl
            ? undefined
            : (process.env.DB_NAME ?? DEFAULT_DB_NAME),
          ssl:
            process.env.DB_SSL === 'true'
              ? { rejectUnauthorized: false }
              : false,
          synchronize: process.env.DB_SYNCHRONIZE === 'true',
          autoLoadEntities: true,
        };
      },
    }),
    AuthModule,
    EstablishmentModule,
    ReservationsModule,
    ShiftsModule,
    CustomersModule,
    UsersModule,
    WaitlistModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
