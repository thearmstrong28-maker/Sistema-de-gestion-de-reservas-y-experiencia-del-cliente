import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import { WaitlistEntryEntity } from '../waitlist/entities/waitlist-entry.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { RestaurantTableEntity } from './entities/table.entity';
import { TableAvailabilityStatus } from './enums/table-availability-status.enum';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let tableRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let reservationRepository: {
    count: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let shiftRepository: {
    findOne: jest.Mock;
  };
  let customerRepository: {
    findOne: jest.Mock;
  };
  let waitlistRepository: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const now = new Date('2026-03-26T12:00:00.000Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    tableRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((value: RestaurantTableEntity) => value),
    };

    reservationRepository = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(
        (value: ReservationEntity | ReservationEntity[]) => value,
      ),
      find: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };

    shiftRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'shift-1',
        shiftDate: '2026-03-26',
        startsAt: '18:00:00',
        endsAt: '22:00:00',
        isActive: true,
      }),
    };

    customerRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    };

    waitlistRepository = {
      create: jest.fn((value: WaitlistEntryEntity) => value),
      save: jest.fn((value: WaitlistEntryEntity) =>
        Promise.resolve({ id: 'waitlist-1', ...value }),
      ),
      delete: jest.fn().mockResolvedValue(undefined),
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
          provide: getRepositoryToken(RestaurantTableEntity),
          useValue: tableRepository,
        },
        {
          provide: getRepositoryToken(ReservationEntity),
          useValue: reservationRepository,
        },
        {
          provide: getRepositoryToken(ShiftEntity),
          useValue: shiftRepository,
        },
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: customerRepository,
        },
        {
          provide: getRepositoryToken(WaitlistEntryEntity),
          useValue: waitlistRepository,
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
      service.create(
        {
          customerId: 'customer-1',
          shiftId: 'shift-1',
          partySize: 2,
          startsAt: startAt,
        },
        'user-admin-001',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows receptionist backfills that stay inside the shift window', async () => {
    shiftRepository.findOne.mockResolvedValueOnce({
      id: 'shift-1',
      shiftDate: '2026-03-26',
      startsAt: '08:00:00',
      endsAt: '15:00:00',
      isActive: true,
    });
    tableRepository.find.mockResolvedValue([
      {
        id: 'table-1',
        tableNumber: 1,
        capacity: 4,
        isActive: true,
      },
    ]);
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve({
        id: 'reservation-backfill',
        ...value,
      }),
    );

    const reservation = await service.create(
      {
        customerId: 'customer-1',
        shiftId: 'shift-1',
        partySize: 2,
        startsAt: new Date('2026-03-26T11:00:00.000Z'),
      },
      'user-admin-001',
    );

    expect(reservation.id).toBe('reservation-backfill');
    expect(reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shiftId: 'shift-1',
        startsAt: new Date('2026-03-26T11:00:00.000Z'),
      }),
    );
  });

  it('creates a reservation without mesa and keeps it on waitlist when no table is available', async () => {
    tableRepository.find.mockResolvedValue([
      {
        id: 'table-1',
        tableNumber: 1,
        capacity: 2,
        isActive: true,
      },
    ]);
    reservationRepository.count.mockResolvedValue(1);
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve({ id: 'reservation-no-table', ...value }),
    );

    const reservation = await service.create(
      {
        customerId: 'customer-1',
        shiftId: 'shift-1',
        partySize: 2,
        startsAt: new Date('2026-03-26T19:00:00.000Z'),
      },
      'user-admin-001',
    );

    expect(reservation.tableId).toBeNull();
    expect(waitlistRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        requestedShiftId: 'shift-1',
        requestedDate: '2026-03-26',
        partySize: 2,
      }),
    );
  });

  it('assigns best-fit table when no tableId is provided', async () => {
    tableRepository.find.mockResolvedValue([
      {
        id: 'table-2',
        tableNumber: 2,
        capacity: 4,
        area: 'main',
        isActive: true,
      },
      {
        id: 'table-3',
        tableNumber: 3,
        capacity: 6,
        area: 'terrace',
        isActive: true,
      },
    ]);
    reservationRepository.count.mockResolvedValue(0);
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve({
        id: 'reservation-1',
        ...value,
      }),
    );

    waitlistRepository.save.mockResolvedValue({
      id: 'waitlist-1',
      customerId: 'customer-1',
      requestedShiftId: 'shift-1',
      requestedDate: '2026-03-26',
      partySize: 3,
      notes: null,
      position: 1,
    });

    const reservation = await service.create(
      {
        customerId: 'customer-1',
        shiftId: 'shift-1',
        partySize: 3,
        startsAt: new Date('2026-03-26T19:30:00.000Z'),
      },
      'user-admin-001',
    );

    expect(reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'table-2',
        partySize: 3,
        createdByUserId: 'user-admin-001',
      }),
    );
    expect(waitlistRepository.delete).toHaveBeenCalledWith('waitlist-1');
    expect(tableRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { capacity: 'ASC', tableNumber: 'ASC', id: 'ASC' },
      }),
    );
    expect(reservation.id).toBe('reservation-1');
    expect(reservation.tableId).toBe('table-2');
  });

  it('marks table as occupied when creating an active reservation', async () => {
    tableRepository.find.mockResolvedValue([
      {
        id: 'table-2',
        tableNumber: 2,
        capacity: 4,
        isActive: true,
      },
    ]);
    tableRepository.findOne.mockResolvedValue({
      id: 'table-2',
      tableNumber: 2,
      capacity: 4,
      isActive: true,
      availabilityStatus: TableAvailabilityStatus.Disponible,
    });
    reservationRepository.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve({
        id: 'reservation-1',
        ...value,
      }),
    );

    await service.create(
      {
        customerId: 'customer-1',
        shiftId: 'shift-1',
        partySize: 3,
        startsAt: new Date('2026-03-26T19:30:00.000Z'),
      },
      'user-admin-001',
    );

    expect(tableRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'table-2',
        availabilityStatus: TableAvailabilityStatus.Ocupada,
      }),
    );
  });

  it('updates an active reservation and keeps it valid inside shift', async () => {
    reservationRepository.findOne
      .mockResolvedValueOnce({
        id: 'reservation-1',
        customerId: 'customer-1',
        shiftId: 'shift-1',
        reservationDate: '2026-03-26',
        startsAt: new Date('2026-03-26T19:00:00.000Z'),
        endsAt: new Date('2026-03-26T20:30:00.000Z'),
        partySize: 2,
        tableId: null,
        status: ReservationStatus.Confirmed,
        specialRequests: null,
        notes: null,
      })
      .mockResolvedValueOnce(null);

    tableRepository.find.mockResolvedValue([
      {
        id: 'table-2',
        tableNumber: 2,
        capacity: 4,
        isActive: true,
      },
    ]);
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve(value),
    );

    const updated = await service.update('reservation-1', {
      partySize: 3,
      startsAt: new Date('2026-03-26T19:15:00.000Z'),
      notes: 'updated note',
    });

    expect(updated.partySize).toBe(3);
    expect(updated.tableId).toBe('table-2');
    expect(updated.notes).toBe('updated note');
  });

  it('cancels an active reservation using status update', async () => {
    reservationRepository.findOne.mockResolvedValue({
      id: 'reservation-1',
      status: ReservationStatus.Pending,
    });
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve(value),
    );

    const cancelled = await service.cancel('reservation-1');
    expect(cancelled.status).toBe(ReservationStatus.Cancelled);
  });

  it('marks no-show on an active reservation', async () => {
    reservationRepository.findOne.mockResolvedValue({
      id: 'reservation-1',
      status: ReservationStatus.Confirmed,
    });
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve(value),
    );

    const noShow = await service.markNoShow('reservation-1');
    expect(noShow.status).toBe(ReservationStatus.NoShow);
  });

  it('updates reservation status for receptionist actions', async () => {
    reservationRepository.findOne.mockResolvedValue({
      id: 'reservation-1',
      status: ReservationStatus.Pending,
    });
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve(value),
    );

    const seated = await service.updateStatus(
      'reservation-1',
      ReservationStatus.Seated,
    );

    expect(seated.status).toBe(ReservationStatus.Seated);
  });

  it('releases table when reservation changes to completed', async () => {
    reservationRepository.findOne.mockResolvedValue({
      id: 'reservation-1',
      status: ReservationStatus.Seated,
      tableId: 'table-3',
    });
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve(value),
    );
    tableRepository.findOne.mockResolvedValue({
      id: 'table-3',
      tableNumber: 3,
      capacity: 4,
      isActive: true,
      availabilityStatus: TableAvailabilityStatus.Ocupada,
    });
    reservationRepository.count.mockResolvedValue(0);

    const completed = await service.updateStatus(
      'reservation-1',
      ReservationStatus.Completed,
    );

    expect(completed.status).toBe(ReservationStatus.Completed);
    expect(tableRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'table-3',
        availabilityStatus: TableAvailabilityStatus.Disponible,
      }),
    );
  });

  it('assigns a table to an existing reservation', async () => {
    reservationRepository.findOne.mockResolvedValue({
      id: 'reservation-1',
      shiftId: 'shift-1',
      partySize: 4,
      tableId: null,
      startsAt: new Date('2026-03-26T19:00:00.000Z'),
      endsAt: new Date('2026-03-26T20:30:00.000Z'),
      status: ReservationStatus.Pending,
    });
    tableRepository.findOne.mockResolvedValue({
      id: 'table-3',
      tableNumber: 3,
      capacity: 4,
      isActive: true,
    });
    reservationRepository.save.mockImplementation((value: ReservationEntity) =>
      Promise.resolve(value),
    );

    const assigned = await service.assignTable('reservation-1', {
      tableId: 'table-3',
    });

    expect(assigned.tableId).toBe('table-3');
  });

  it('lists reservations for the selected day with relations', async () => {
    reservationRepository.find.mockResolvedValue([{ id: 'reservation-1' }]);

    await service.list({
      date: new Date('2026-03-26T00:00:00.000Z'),
      shiftId: 'shift-1',
    });

    expect(reservationRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reservationDate: '2026-03-26', shiftId: 'shift-1' },
        relations: { customer: true, table: true, shift: true },
        order: { startsAt: 'ASC', createdAt: 'ASC' },
      }),
    );
  });
});
