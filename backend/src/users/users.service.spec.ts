import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { Role } from '../auth/enums/role.enum';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const admin = {
    userId: 'admin-1',
    email: 'admin@restaurant.test',
    role: Role.Admin,
    fullName: 'Admin',
    restaurantName: 'Casa del Sabor',
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('updates profile data and role for a restaurant user', async () => {
    userRepository.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'ana@example.test',
      fullName: 'Ana Ruiz',
      phone: '1111',
      role: Role.Host,
      restaurantName: 'Casa del Sabor',
      isActive: true,
      createdAt: new Date('2026-04-06T10:00:00.000Z'),
      updatedAt: new Date('2026-04-06T10:00:00.000Z'),
    } as UserEntity);
    userRepository.save.mockImplementation((value: UserEntity) => ({
      ...value,
      updatedAt: new Date('2026-04-07T10:00:00.000Z'),
    }));

    const result = await service.update(admin, 'user-1', {
      fullName: 'Ana María Ruiz',
      email: 'ANA.MARIA@EXAMPLE.TEST',
      phone: '+54 9 11 4444-3333',
      role: Role.Manager,
    });

    expect(userRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 'user-1', restaurantName: 'Casa del Sabor' },
    });
    expect(userRepository.findOne).toHaveBeenNthCalledWith(2, {
      where: { email: 'ana.maria@example.test' },
    });
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana.maria@example.test',
        fullName: 'Ana María Ruiz',
        phone: '+54 9 11 4444-3333',
        role: Role.Manager,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        email: 'ana.maria@example.test',
        fullName: 'Ana María Ruiz',
        phone: '+54 9 11 4444-3333',
        role: Role.Manager,
      }),
    );
  });

  it('rejects duplicate emails when editing a user', async () => {
    userRepository.findOne
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'ana@example.test',
        fullName: 'Ana Ruiz',
        restaurantName: 'Casa del Sabor',
        role: Role.Host,
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 'user-2',
        email: 'dup@example.test',
        restaurantName: 'Casa del Sabor',
        role: Role.Customer,
        isActive: true,
      });

    await expect(
      service.update(admin, 'user-1', {
        email: 'dup@example.test',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('blocks editing admin users', async () => {
    userRepository.findOne.mockResolvedValueOnce({
      id: 'admin-user',
      email: 'root@example.test',
      fullName: 'Root',
      restaurantName: 'Casa del Sabor',
      role: Role.Admin,
      isActive: true,
    });

    await expect(
      service.update(admin, 'admin-user', {
        fullName: 'Nuevo nombre',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userRepository.save).not.toHaveBeenCalled();
  });
});
