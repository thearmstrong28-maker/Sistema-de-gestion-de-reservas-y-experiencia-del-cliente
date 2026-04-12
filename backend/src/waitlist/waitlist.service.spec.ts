import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import { WaitlistEntryEntity } from './entities/waitlist-entry.entity';
import { WaitlistStatus } from './enums/waitlist-status.enum';
import { WaitlistService } from './waitlist.service';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let waitlistRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let customerRepository: { findOne: jest.Mock };
  let shiftRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxPosition: '2' }),
    };

    waitlistRepository = {
      create: jest.fn((value: WaitlistEntryEntity) => value),
      save: jest.fn((value: WaitlistEntryEntity) => ({
        id: 'wait-1',
        ...value,
      })),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    customerRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    };

    shiftRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'shift-1', isActive: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: getRepositoryToken(WaitlistEntryEntity),
          useValue: waitlistRepository,
        },
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: customerRepository,
        },
        {
          provide: getRepositoryToken(ShiftEntity),
          useValue: shiftRepository,
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  it('assigns automatic position when position is not provided', async () => {
    const result = await service.create({
      customerId: 'customer-1',
      requestedShiftId: 'shift-1',
      requestedDate: new Date('2026-04-06T00:00:00.000Z'),
      partySize: 2,
    });

    expect(waitlistRepository.createQueryBuilder).toHaveBeenCalled();
    expect(result.position).toBe(3);
  });

  it('reuses an existing waiting entry for the same date and shift', async () => {
    const existingEntry = {
      id: 'wait-1',
      customerId: 'customer-1',
      requestedShiftId: 'shift-1',
      requestedDate: '2026-04-06',
      partySize: 2,
      status: WaitlistStatus.Waiting,
      position: 1,
      notes: null,
    };

    waitlistRepository.findOne.mockResolvedValueOnce(existingEntry);

    const result = await service.create({
      customerId: 'customer-1',
      requestedShiftId: 'shift-1',
      requestedDate: new Date('2026-04-06T00:00:00.000Z'),
      partySize: 2,
    });

    expect(result).toBe(existingEntry);
    expect(waitlistRepository.save).not.toHaveBeenCalled();
    const firstFindOneCall = waitlistRepository.findOne as {
      mock: { calls: Array<[unknown]> };
    };

    expect(firstFindOneCall.mock.calls[0][0]).toMatchObject({
      where: {
        customerId: 'customer-1',
        requestedShiftId: 'shift-1',
        requestedDate: '2026-04-06',
      },
    });
  });

  it('returns the existing waiting entry when a unique constraint race happens on save', async () => {
    const existingEntry = {
      id: 'wait-1',
      customerId: 'customer-1',
      requestedShiftId: 'shift-1',
      requestedDate: '2026-04-06',
      partySize: 2,
      status: WaitlistStatus.Waiting,
      position: 1,
      notes: null,
    };

    waitlistRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingEntry);
    waitlistRepository.save.mockRejectedValueOnce({ code: '23505' });

    const result = await service.create({
      customerId: 'customer-1',
      requestedShiftId: 'shift-1',
      requestedDate: new Date('2026-04-06T00:00:00.000Z'),
      partySize: 2,
    });

    expect(result).toBe(existingEntry);
    expect(waitlistRepository.save).toHaveBeenCalledTimes(1);
    const secondFindOneCall = waitlistRepository.findOne as {
      mock: { calls: Array<[unknown]> };
    };

    expect(secondFindOneCall.mock.calls[1][0]).toMatchObject({
      where: {
        customerId: 'customer-1',
        requestedShiftId: 'shift-1',
        requestedDate: '2026-04-06',
      },
    });
  });

  it('lists waitlist entries ordered by position then creation date', async () => {
    waitlistRepository.find.mockResolvedValue([
      { id: 'wait-1' },
      { id: 'wait-2' },
    ]);

    await service.list({
      date: new Date('2026-04-06T00:00:00.000Z'),
      shiftId: 'shift-1',
    });

    const firstFindCall = waitlistRepository.find.mock.calls[0] as [
      {
        where: {
          requestedDate: string;
          requestedShiftId: string;
          status: unknown;
        };
        order: {
          position: 'ASC';
          createdAt: 'ASC';
          id: 'ASC';
        };
      },
    ];

    expect(firstFindCall[0].where.requestedDate).toBe('2026-04-06');
    expect(firstFindCall[0].where.requestedShiftId).toBe('shift-1');
    expect(firstFindCall[0].where.status).toBeDefined();
    expect(firstFindCall[0].order).toEqual({
      position: 'ASC',
      createdAt: 'ASC',
      id: 'ASC',
    });
  });
});
