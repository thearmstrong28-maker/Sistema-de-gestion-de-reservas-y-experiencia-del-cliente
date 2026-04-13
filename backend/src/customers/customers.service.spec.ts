import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { WaitlistEntryEntity } from '../waitlist/entities/waitlist-entry.entity';
import { CustomersService } from './customers.service';
import { CustomerEntity } from './entities/customer.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };
  let reservationRepository: {
    count: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let waitlistRepository: {
    count: jest.Mock;
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
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      remove: jest.fn().mockImplementation((value: CustomerEntity) => value),
    };

    reservationQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    reservationRepository = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(reservationQueryBuilder),
    };

    waitlistRepository = {
      count: jest.fn().mockResolvedValue(0),
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
        {
          provide: getRepositoryToken(WaitlistEntryEntity),
          useValue: waitlistRepository,
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

  it('rejects customers without any contact method', async () => {
    await expect(
      service.create({
        fullName: 'Ana Ruiz',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate customers by phone or email', async () => {
    customerRepository.find.mockResolvedValueOnce([
      {
        id: 'customer-99',
        email: 'ana@mail.test',
        phone: '+5491111111111',
      },
    ]);

    await expect(
      service.create({
        fullName: 'Ana Ruiz',
        email: 'ana@mail.test',
        phone: '+5491111111111',
      }),
    ).rejects.toThrow('Ya existe un cliente con ese correo o teléfono');
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

  it('removes a customer without reservations or waitlist entries', async () => {
    customerRepository.findOne.mockResolvedValueOnce({
      id: 'customer-1',
      fullName: 'Ana Ruiz',
      email: 'ana@mail.test',
      phone: '+5491111111111',
      preferences: {},
      notes: null,
      userId: null,
    });

    const result = await service.remove('customer-1');

    expect(reservationRepository.count).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
    });
    expect(waitlistRepository.count).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
    });
    expect(customerRepository.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'customer-1' }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'customer-1' }));
  });

  it('rejects removing a customer with reservations', async () => {
    customerRepository.findOne.mockResolvedValueOnce({
      id: 'customer-1',
      fullName: 'Ana Ruiz',
      email: 'ana@mail.test',
      phone: '+5491111111111',
      preferences: {},
      notes: null,
      userId: null,
    });
    reservationRepository.count.mockResolvedValueOnce(1);

    await expect(service.remove('customer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(customerRepository.remove).not.toHaveBeenCalled();
  });

  it('rejects updates that would leave the customer without contact info', async () => {
    customerRepository.findOne.mockResolvedValueOnce({
      id: 'customer-1',
      fullName: 'Ana Ruiz',
      email: null,
      phone: null,
      preferences: {},
      notes: null,
    });

    await expect(
      service.update('customer-1', {
        fullName: 'Ana Ruiz',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate phone numbers on update', async () => {
    customerRepository.findOne.mockResolvedValueOnce({
      id: 'customer-1',
      fullName: 'Ana Ruiz',
      email: 'ana@mail.test',
      phone: '+5491111111111',
      preferences: {},
      notes: null,
    });
    customerRepository.find.mockResolvedValueOnce([
      {
        id: 'customer-2',
        email: 'ana.otra@mail.test',
        phone: '+5492222222222',
      },
    ]);

    await expect(
      service.update('customer-1', {
        phone: '+5492222222222',
      }),
    ).rejects.toThrow('Ya existe un cliente con ese correo o teléfono');
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
