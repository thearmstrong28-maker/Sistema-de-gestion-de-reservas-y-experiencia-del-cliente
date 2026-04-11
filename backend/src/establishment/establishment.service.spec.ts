import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { RestaurantTableEntity } from '../reservations/entities/table.entity';
import { TableCategory } from '../reservations/enums/table-category.enum';
import { TableAvailabilityStatus } from '../reservations/enums/table-availability-status.enum';
import { WaitlistStatus } from '../waitlist/enums/waitlist-status.enum';
import { WaitlistEntryEntity } from '../waitlist/entities/waitlist-entry.entity';
import { EstablishmentService } from './establishment.service';

describe('EstablishmentService', () => {
  let service: EstablishmentService;
  let tableRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let reservationRepository: {
    count: jest.Mock;
  };
  let transactionManager: {
    getRepository: jest.Mock;
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 6, 10, 0, 0));

    tableRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    reservationRepository = {
      count: jest.fn(),
    };

    transactionManager = {
      getRepository: jest.fn(),
    };

    dataSource.transaction.mockImplementation(
      async (
        runner: (manager: typeof transactionManager) => Promise<unknown>,
      ) => runner(transactionManager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: { count: jest.fn() },
        },
        {
          provide: getRepositoryToken(RestaurantTableEntity),
          useValue: tableRepository,
        },
        {
          provide: getRepositoryToken(ReservationEntity),
          useValue: reservationRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get(EstablishmentService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('updates table capacity, availability and category', async () => {
    tableRepository.findOne.mockResolvedValueOnce({
      id: 'table-1',
      capacity: 4,
      category: TableCategory.Normal,
      availabilityStatus: TableAvailabilityStatus.Disponible,
      isActive: true,
    });
    tableRepository.save.mockImplementation((value: RestaurantTableEntity) =>
      Promise.resolve(value),
    );

    const updated = await service.updateTable('table-1', {
      capacity: 6,
      availabilityStatus: TableAvailabilityStatus.Ocupada,
      category: TableCategory.Premium,
    });

    expect(tableRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        capacity: 6,
        availabilityStatus: TableAvailabilityStatus.Ocupada,
        category: TableCategory.Premium,
      }),
    );
    expect(updated.capacity).toBe(6);
    expect(updated.availabilityStatus).toBe(TableAvailabilityStatus.Ocupada);
    expect(updated.category).toBe(TableCategory.Premium);
  });

  it('promotes first eligible waitlist entry when marking a table available', async () => {
    const table = {
      id: 'table-1',
      capacity: 4,
      availabilityStatus: TableAvailabilityStatus.Ocupada,
      isActive: true,
    };

    const tableRepoInTx = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(table),
      })),
      save: jest.fn((value: RestaurantTableEntity) => Promise.resolve(value)),
    };

    const shiftRepoInTx = {
      findOne: jest.fn().mockResolvedValue({
        id: 'shift-matutino',
        shiftName: '2026-04-06:matutino',
        startsAt: '06:00:00',
        endsAt: '14:00:00',
        isActive: true,
      }),
    };

    const waitlistCandidate = {
      id: 'wait-1',
      customerId: 'customer-1',
      requestedDate: '2026-04-06',
      requestedShiftId: 'shift-matutino',
      partySize: 3,
      status: WaitlistStatus.Waiting,
      notes: 'Prefiere ventana',
    };

    const waitlistRepoInTx = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([waitlistCandidate]),
      })),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const reservationRepoInTx = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: ReservationEntity) => value),
      save: jest.fn((value: ReservationEntity) => Promise.resolve(value)),
    };

    transactionManager.getRepository.mockImplementation(
      (entity: { name: string }) => {
        if (entity.name === 'RestaurantTableEntity') {
          return tableRepoInTx;
        }
        if (entity.name === 'ReservationEntity') {
          return reservationRepoInTx;
        }
        if (entity.name === WaitlistEntryEntity.name) {
          return waitlistRepoInTx;
        }
        return shiftRepoInTx;
      },
    );

    const updated = await service.updateTableAvailability('table-1', {
      availabilityStatus: TableAvailabilityStatus.Disponible,
    });

    expect(reservationRepoInTx.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        tableId: 'table-1',
        shiftId: 'shift-matutino',
      }),
    );
    expect(waitlistRepoInTx.delete).toHaveBeenCalledWith('wait-1');
    expect(updated.availabilityStatus).toBe(TableAvailabilityStatus.Ocupada);
  });

  it('keeps table available when there is no eligible waitlist entry', async () => {
    const table = {
      id: 'table-1',
      capacity: 4,
      availabilityStatus: TableAvailabilityStatus.Ocupada,
      isActive: true,
    };

    const tableRepoInTx = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(table),
      })),
      save: jest.fn((value: RestaurantTableEntity) => Promise.resolve(value)),
    };

    const shiftRepoInTx = {
      findOne: jest.fn().mockResolvedValue({
        id: 'shift-matutino',
        shiftName: '2026-04-06:matutino',
        startsAt: '06:00:00',
        endsAt: '14:00:00',
        isActive: true,
      }),
    };

    const waitlistRepoInTx = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      save: jest.fn(),
    };

    const reservationRepoInTx = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    transactionManager.getRepository.mockImplementation(
      (entity: { name: string }) => {
        if (entity.name === 'RestaurantTableEntity') {
          return tableRepoInTx;
        }
        if (entity.name === 'ReservationEntity') {
          return reservationRepoInTx;
        }
        if (entity.name === 'WaitlistEntryEntity') {
          return waitlistRepoInTx;
        }
        return shiftRepoInTx;
      },
    );

    const updated = await service.updateTableAvailability('table-1', {
      availabilityStatus: TableAvailabilityStatus.Disponible,
    });

    expect(reservationRepoInTx.create).not.toHaveBeenCalled();
    expect(waitlistRepoInTx.save).not.toHaveBeenCalled();
    expect(updated.availabilityStatus).toBe(TableAvailabilityStatus.Disponible);
  });

  it('deactivates a table when deleted', async () => {
    tableRepository.findOne.mockResolvedValueOnce({
      id: 'table-2',
      capacity: 2,
      availabilityStatus: TableAvailabilityStatus.Ocupada,
      isActive: true,
    });
    tableRepository.save.mockImplementation((value: RestaurantTableEntity) =>
      Promise.resolve(value),
    );

    const deleted = await service.deleteTable('table-2');

    expect(tableRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        availabilityStatus: TableAvailabilityStatus.Disponible,
      }),
    );
    expect(deleted.isActive).toBe(false);
  });

  it('rejects empty updates for a table', async () => {
    await expect(service.updateTable('table-3', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when the table does not exist', async () => {
    tableRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.deleteTable('missing-table')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
