import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { CustomersService } from './customers.service';
import { CustomerEntity } from './entities/customer.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let reservationRepository: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let reservationQueryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    groupBy: jest.Mock;
    getRawMany: jest.Mock;
  };

  beforeEach(async () => {
    customerRepository = {
      create: jest.fn((value: CustomerEntity) => value),
      save: jest.fn((value: CustomerEntity) => ({
        id: 'customer-1',
        ...value,
      })),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    reservationQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    reservationRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(reservationQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: customerRepository,
        },
        {
          provide: getRepositoryToken(ReservationEntity),
          useValue: reservationRepository,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('creates a customer with preferences', async () => {
    const customer = await service.create({
      fullName: '  Ana Ruiz  ',
      email: 'ANA@MAIL.TEST',
      phone: '+5491111111111',
      preferences: { allergies: ['nuts'] },
      notes: 'window seat',
    });

    expect(customerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Ana Ruiz',
        email: 'ana@mail.test',
        preferences: { allergies: ['nuts'] },
      }),
    );
    expect(customer.id).toBe('customer-1');
  });

  it('returns visit history for existing customer', async () => {
    customerRepository.findOne.mockResolvedValue({ id: 'customer-1' });
    reservationRepository.find.mockResolvedValue([{ id: 'reservation-1' }]);

    const history = await service.getVisitHistory('customer-1');
    expect(history).toHaveLength(1);
    expect(reservationRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'customer-1' },
      }),
    );
  });

  it('throws when visit history customer does not exist', async () => {
    customerRepository.findOne.mockResolvedValue(null);

    await expect(service.getVisitHistory('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns customer list with reservation metrics', async () => {
    customerRepository.find.mockResolvedValue([
      {
        id: 'customer-1',
        fullName: 'Ana Ruiz',
      },
      {
        id: 'customer-2',
        fullName: 'Luis Perez',
      },
    ]);
    reservationQueryBuilder.getRawMany.mockResolvedValue([
      {
        customerId: 'customer-1',
        reservationsCount: '8',
        attendedCount: '5',
        cancelledCount: '2',
        noShowCount: '1',
      },
    ]);

    const rows = await service.listWithMetrics({});

    expect(reservationRepository.createQueryBuilder).toHaveBeenCalledWith(
      'reservation',
    );
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'customer-1',
        reservationsCount: 8,
        attendedCount: 5,
        cancelledCount: 2,
        noShowCount: 1,
      }),
      expect.objectContaining({
        id: 'customer-2',
        reservationsCount: 0,
        attendedCount: 0,
        cancelledCount: 0,
        noShowCount: 0,
      }),
    ]);
  });
});
