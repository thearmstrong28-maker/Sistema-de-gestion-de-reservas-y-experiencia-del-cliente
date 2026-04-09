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
import { UsersModule } from './users/users.module';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const dbPort = Number(process.env.DB_PORT ?? 5432);

        return {
          type: 'postgres' as const,
          host: process.env.DB_HOST ?? 'localhost',
          port: Number.isFinite(dbPort) ? dbPort : 5432,
          username: process.env.DB_USER ?? 'postgres',
          password: process.env.DB_PASSWORD ?? '34343434',
          database:
            process.env.DB_NAME ??
            'Sistema de gestión de reservas y experiencia del cliente',
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
    CustomersModule,
    UsersModule,
    WaitlistModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
