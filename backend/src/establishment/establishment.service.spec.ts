import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { RestaurantTableEntity } from '../reservations/entities/table.entity';
import { TableAvailabilityStatus } from '../reservations/enums/table-availability-status.enum';
import { UserEntity } from '../auth/entities/user.entity';
import { EstablishmentService } from './establishment.service';

describe('EstablishmentService', () => {
  let service: EstablishmentService;
  let tableRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    tableRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

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
          useValue: { count: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get(EstablishmentService);
  });

  it('updates table capacity and availability', async () => {
    tableRepository.findOne.mockResolvedValueOnce({
      id: 'table-1',
      capacity: 4,
      availabilityStatus: TableAvailabilityStatus.Disponible,
      isActive: true,
    });
    tableRepository.save.mockImplementation((value: RestaurantTableEntity) =>
      Promise.resolve(value),
    );

    const updated = await service.updateTable('table-1', {
      capacity: 6,
      availabilityStatus: TableAvailabilityStatus.Ocupada,
    });

    expect(tableRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'table-1', isActive: true },
    });
    expect(tableRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        capacity: 6,
        availabilityStatus: TableAvailabilityStatus.Ocupada,
      }),
    );
    expect(updated.capacity).toBe(6);
    expect(updated.availabilityStatus).toBe(TableAvailabilityStatus.Ocupada);
  });

  it('toggles table availability through the dedicated endpoint logic', async () => {
    tableRepository.findOne.mockResolvedValueOnce({
      id: 'table-1',
      capacity: 4,
      availabilityStatus: TableAvailabilityStatus.Disponible,
      isActive: true,
    });
    tableRepository.save.mockImplementation((value: RestaurantTableEntity) =>
      Promise.resolve(value),
    );

    const updated = await service.updateTableAvailability('table-1', {
      availabilityStatus: TableAvailabilityStatus.Ocupada,
    });

    expect(tableRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'table-1', isActive: true },
    });
    expect(tableRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        availabilityStatus: TableAvailabilityStatus.Ocupada,
      }),
    );
    expect(updated.availabilityStatus).toBe(TableAvailabilityStatus.Ocupada);
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
