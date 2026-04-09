import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserClassEntity } from './entities/user-class.entity';
import { UserEntity } from './entities/user.entity';
import { Role } from './enums/role.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: {
    findOne: jest.MockedFunction<
      (options: unknown) => Promise<UserEntity | null>
    >;
    create: jest.MockedFunction<(value: Partial<UserEntity>) => UserEntity>;
    save: jest.MockedFunction<(value: UserEntity) => UserEntity>;
    update: jest.MockedFunction<
      (criteria: string, partial: Partial<UserEntity>) => void
    >;
  };
  let userClassRepository: {
    find: jest.MockedFunction<(options: unknown) => Promise<UserClassEntity[]>>;
  };
  let transactionRepository: {
    findOne: jest.MockedFunction<
      (options: unknown) => Promise<UserEntity | null>
    >;
    create: jest.MockedFunction<(value: Partial<UserEntity>) => UserEntity>;
    save: jest.MockedFunction<
      (value: Partial<UserEntity>) => Promise<UserEntity>
    >;
  };
  let entityManager: {
    query: jest.MockedFunction<
      (sql: string, params: unknown[]) => Promise<void>
    >;
    getRepository: jest.MockedFunction<
      (entity: typeof UserEntity) => typeof transactionRepository
    >;
  };
  let dataSource: Pick<DataSource, 'transaction'>;

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        ACCESS_TOKEN_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
      };

      return values[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    userRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
      create: jest.fn((value: Partial<UserEntity>) => value as UserEntity),
      save: jest.fn((value: UserEntity) => ({
        ...value,
      })),
      update: jest.fn(() => undefined),
    };

    userClassRepository = {
      find: jest.fn(() => Promise.resolve([])),
    };

    transactionRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
      create: jest.fn((value: Partial<UserEntity>) => value as UserEntity),
      save: jest.fn((value: Partial<UserEntity>) =>
        Promise.resolve({
          ...(value as UserEntity),
        }),
      ),
    };

    entityManager = {
      query: jest.fn(() => Promise.resolve()),
      getRepository: jest.fn(() => transactionRepository),
    };

    dataSource = {
      transaction: jest.fn((callback) =>
        Promise.resolve(callback(entityManager as never)),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(UserClassEntity),
          useValue: userClassRepository,
        },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers the initial restaurant administrator with a hashed password', async () => {
    transactionRepository.save.mockImplementation((value: UserEntity) =>
      Promise.resolve({
        ...value,
        id: 'user-1',
        createdAt: new Date('2026-04-06T10:00:00.000Z'),
        updatedAt: new Date('2026-04-06T10:00:00.000Z'),
      } as UserEntity),
    );

    const result = await service.register({
      email: 'Guest@Example.Test',
      phone: '+54 9 11 5555-4444',
      restaurantName: 'Casa del Sabor',
      password: 'StrongP@ss1',
    });

    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'guest@example.test',
        fullName: 'Casa del Sabor',
        restaurantName: 'Casa del Sabor',
        phone: '+54 9 11 5555-4444',
        role: Role.Admin,
        isActive: true,
      }),
    );

    const savedUser = transactionRepository.save.mock.calls[0]?.[0];
    expect(savedUser.passwordHash).not.toBe('StrongP@ss1');
    expect(await bcrypt.compare('StrongP@ss1', savedUser.passwordHash)).toBe(
      true,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-1',
        email: 'guest@example.test',
        fullName: 'Casa del Sabor',
        restaurantName: 'Casa del Sabor',
        phone: '+54 9 11 5555-4444',
        role: Role.Admin,
        isActive: true,
      }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate emails with a conflict', async () => {
    transactionRepository.findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'guest@example.test',
    } as UserEntity);

    await expect(
      service.register({
        email: 'guest@example.test',
        phone: '+54 9 11 5555-4444',
        restaurantName: 'Casa del Sabor',
        password: 'StrongP@ss1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects registration when restaurant already has an active admin', async () => {
    transactionRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@restaurant.test',
        role: Role.Admin,
        isActive: true,
        restaurantName: 'Casa del Sabor',
      } as UserEntity);

    await expect(
      service.register({
        email: 'nuevo@restaurant.test',
        phone: '+54 9 11 5555-4444',
        restaurantName: 'Casa del Sabor',
        password: 'StrongP@ss1',
      }),
    ).rejects.toThrow(
      'Ya existe un administrador activo para este restaurante',
    );
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('does not block registration when there is no active admin', async () => {
    await expect(
      service.register({
        email: 'guest@example.test',
        phone: '+54 9 11 5555-4444',
        restaurantName: 'Casa del Sabor',
        password: 'StrongP@ss1',
      }),
    ).resolves.toEqual(expect.objectContaining({ role: Role.Admin }));
  });

  it('promotes a customer to admin on login when the restaurant has no active admin', async () => {
    transactionRepository.findOne
      .mockResolvedValueOnce({
        id: 'customer-1',
        email: 'customer@example.test',
        passwordHash: await bcrypt.hash('StrongP@ss1', 10),
        fullName: 'Casa del Sabor',
        restaurantName: 'Casa del Sabor',
        role: Role.Customer,
        isActive: true,
      } as UserEntity)
      .mockResolvedValueOnce(null);
    transactionRepository.save.mockImplementation(
      (value: Partial<UserEntity>) =>
        Promise.resolve({
          ...(value as UserEntity),
        }),
    );
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'customer@example.test',
      password: 'StrongP@ss1',
    });

    expect(entityManager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['casa del sabor'],
    );
    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'customer@example.test',
        role: Role.Admin,
        isActive: true,
      }),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: Role.Admin }),
      expect.any(Object),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ role: Role.Admin }),
      expect.any(Object),
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('does not promote a customer when an active admin already exists', async () => {
    transactionRepository.findOne
      .mockResolvedValueOnce({
        id: 'customer-1',
        email: 'customer@example.test',
        passwordHash: await bcrypt.hash('StrongP@ss1', 10),
        fullName: 'Casa del Sabor',
        restaurantName: 'Casa del Sabor',
        role: Role.Customer,
        isActive: true,
      } as UserEntity)
      .mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@example.test',
        fullName: 'Casa del Sabor',
        restaurantName: 'Casa del Sabor',
        role: Role.Admin,
        isActive: true,
      } as UserEntity);
    transactionRepository.save.mockImplementation(
      (value: Partial<UserEntity>) =>
        Promise.resolve({
          ...(value as UserEntity),
        }),
    );
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'customer@example.test',
      password: 'StrongP@ss1',
    });

    expect(entityManager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['casa del sabor'],
    );
    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'customer@example.test',
        role: Role.Customer,
        isActive: true,
      }),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: Role.Customer }),
      expect.any(Object),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ role: Role.Customer }),
      expect.any(Object),
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('returns only active user classes ordered by access level and display name', async () => {
    userClassRepository.find.mockResolvedValue([
      {
        id: 'class-1',
        code: 'CUSTOMER_GUEST',
        displayName: 'Cliente',
        description: 'Invitado',
        accessLevel: 'BAJO',
        role: Role.Customer,
        isActive: true,
      },
      {
        id: 'class-2',
        code: 'HOST',
        displayName: 'Host',
        description: 'Recepcionista',
        accessLevel: 'MEDIO',
        role: Role.Host,
        isActive: true,
      },
      {
        id: 'class-3',
        code: 'ADMIN',
        displayName: 'Administrador',
        description: 'Administrador',
        accessLevel: 'ALTO',
        role: Role.Admin,
        isActive: true,
      },
      {
        id: 'class-4',
        code: 'MANAGER',
        displayName: 'Gerente',
        description: 'Gerente',
        accessLevel: 'MEDIO',
        role: Role.Manager,
        isActive: false,
      },
      {
        id: 'class-5',
        code: 'HOST_SUPPORT',
        displayName: 'Asistente',
        description: 'Apoyo',
        accessLevel: 'MEDIO',
        role: Role.Host,
        isActive: true,
      },
    ]);

    await expect(service.getUserClasses()).resolves.toEqual([
      {
        id: 'class-3',
        code: 'ADMIN',
        displayName: 'Administrador',
        description: 'Administrador',
        accessLevel: 'ALTO',
        role: Role.Admin,
        isActive: true,
      },
      {
        id: 'class-5',
        code: 'HOST_SUPPORT',
        displayName: 'Asistente',
        description: 'Apoyo',
        accessLevel: 'MEDIO',
        role: Role.Host,
        isActive: true,
      },
      {
        id: 'class-2',
        code: 'HOST',
        displayName: 'Host',
        description: 'Recepcionista',
        accessLevel: 'MEDIO',
        role: Role.Host,
        isActive: true,
      },
      {
        id: 'class-1',
        code: 'CUSTOMER_GUEST',
        displayName: 'Cliente',
        description: 'Invitado',
        accessLevel: 'BAJO',
        role: Role.Customer,
        isActive: true,
      },
    ]);

    expect(userClassRepository.find).toHaveBeenCalledWith({
      where: { isActive: true },
    });
  });
});
