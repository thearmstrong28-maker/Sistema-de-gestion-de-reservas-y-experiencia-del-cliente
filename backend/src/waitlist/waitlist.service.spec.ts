import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import { WaitlistEntryEntity } from './entities/waitlist-entry.entity';
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

  it('lists waitlist entries ordered by position then creation date', async () => {
    waitlistRepository.find.mockResolvedValue([
      { id: 'wait-1' },
      { id: 'wait-2' },
    ]);

    await service.list({
      date: new Date('2026-04-06T00:00:00.000Z'),
      shiftId: 'shift-1',
    });

    expect(waitlistRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestedDate: '2026-04-06', requestedShiftId: 'shift-1' },
        order: { position: 'ASC', createdAt: 'ASC' },
      }),
    );
  });
});
