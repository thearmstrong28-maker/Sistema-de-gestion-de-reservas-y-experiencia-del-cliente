import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationEntity } from './entities/reservation.entity';
import { TableEntity } from './entities/table.entity';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let tableRepository: {
    find: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let reservationRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const now = new Date('2026-03-26T12:00:00.000Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    tableRepository = {
      find: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn((value: TableEntity | TableEntity[]) => value),
      save: jest.fn(),
    };

    reservationRepository = {
      find: jest.fn(),
      create: jest.fn(
        (value: ReservationEntity | ReservationEntity[]) => value,
      ),
      save: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, fallback?: string | number) => {
        const values: Record<string, string> = {
          RESERVATION_MAX_DAYS_AHEAD: '30',
          RESERVATION_ARRIVAL_TOLERANCE_MINUTES: '15',
          RESERVATION_DEFAULT_DURATION_MINUTES: '90',
        };

        return values[key] ?? fallback;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(TableEntity),
          useValue: tableRepository,
        },
        {
          provide: getRepositoryToken(ReservationEntity),
          useValue: reservationRepository,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects reservations outside the configured window', async () => {
    const startAt = new Date('2026-05-01T19:00:00.000Z');

    await expect(
      service.reserveTable(
        {
          customerName: 'Ana',
          partySize: 2,
          startAt,
        },
        'user-admin-001',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws a conflict when the only suitable table is occupied', async () => {
    tableRepository.find.mockResolvedValue([
      {
        id: 'table-1',
        number: 1,
        name: 'Table 1',
        capacity: 2,
        isActive: true,
      },
    ]);
    reservationRepository.find.mockResolvedValue([
      {
        tableId: 'table-1',
        startAt: new Date('2026-03-26T19:00:00.000Z'),
        endAt: new Date('2026-03-26T20:30:00.000Z'),
        status: 'CONFIRMED',
      },
    ]);

    await expect(
      service.reserveTable(
        {
          customerName: 'Ana',
          partySize: 2,
          startAt: new Date('2026-03-26T19:30:00.000Z'),
        },
        'user-admin-001',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('assigns the best-fit table by capacity', async () => {
    tableRepository.find.mockResolvedValue([
      {
        id: 'table-2',
        number: 2,
        name: 'Table 2',
        capacity: 4,
        isActive: true,
      },
      {
        id: 'table-3',
        number: 3,
        name: 'Table 3',
        capacity: 6,
        isActive: true,
      },
    ]);
    reservationRepository.find.mockResolvedValue([]);
    reservationRepository.save.mockResolvedValue({
      id: 'reservation-1',
      tableId: 'table-2',
    });

    const reservation = await service.reserveTable(
      {
        customerName: 'Ana',
        partySize: 3,
        startAt: new Date('2026-03-26T19:00:00.000Z'),
      },
      'user-admin-001',
    );

    expect(reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'table-2',
        partySize: 3,
        createdBy: 'user-admin-001',
      }),
    );
    expect(reservation).toEqual({
      id: 'reservation-1',
      tableId: 'table-2',
    });
  });
});
