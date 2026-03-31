import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReservationsService } from './reservations.service';
import { Table } from './schemas/table.schema';
import { Reservation } from './schemas/reservation.schema';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let tableModel: {
    find: jest.Mock;
    countDocuments: jest.Mock;
    insertMany: jest.Mock;
  };
  let reservationModel: {
    find: jest.Mock;
    create: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const now = new Date('2026-03-26T12:00:00.000Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    tableModel = {
      find: jest.fn(),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
      insertMany: jest.fn(),
    };

    reservationModel = {
      find: jest.fn(),
      create: jest.fn(),
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
        { provide: getModelToken(Table.name), useValue: tableModel },
        {
          provide: getModelToken(Reservation.name),
          useValue: reservationModel,
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
    const tableQuery = {
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'table-1',
          number: 1,
          name: 'Table 1',
          capacity: 2,
          isActive: true,
        },
      ]),
    };
    const reservationQuery = {
      exec: jest.fn().mockResolvedValue([
        {
          tableId: 'table-1',
          startAt: new Date('2026-03-26T19:00:00.000Z'),
          endAt: new Date('2026-03-26T20:30:00.000Z'),
          status: 'CONFIRMED',
        },
      ]),
    };

    tableModel.find.mockReturnValue(tableQuery);
    reservationModel.find.mockReturnValue(reservationQuery);

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
    const tableQuery = {
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'table-2',
          number: 2,
          name: 'Table 2',
          capacity: 4,
          isActive: true,
        },
        {
          _id: 'table-3',
          number: 3,
          name: 'Table 3',
          capacity: 6,
          isActive: true,
        },
      ]),
    };
    const reservationQuery = {
      exec: jest.fn().mockResolvedValue([]),
    };

    tableModel.find.mockReturnValue(tableQuery);
    reservationModel.find.mockReturnValue(reservationQuery);
    reservationModel.create.mockResolvedValue({
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

    expect(reservationModel.create).toHaveBeenCalledWith(
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
