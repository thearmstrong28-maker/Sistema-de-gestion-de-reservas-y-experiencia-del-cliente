import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a customer with a hashed password', async () => {
    userRepository.save.mockImplementation((value: UserEntity) => ({
      ...value,
      id: 'user-1',
      createdAt: new Date('2026-04-06T10:00:00.000Z'),
      updatedAt: new Date('2026-04-06T10:00:00.000Z'),
    }));

    const result = await service.register({
      email: 'Guest@Example.Test',
      password: 'StrongP@ss1',
      fullName: 'Guest User',
    });

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'guest@example.test',
        fullName: 'Guest User',
        role: Role.Customer,
        isActive: true,
      }),
    );

    const savedUser = userRepository.save.mock.calls[0]?.[0];
    expect(savedUser.passwordHash).not.toBe('StrongP@ss1');
    expect(await bcrypt.compare('StrongP@ss1', savedUser.passwordHash)).toBe(
      true,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-1',
        email: 'guest@example.test',
        fullName: 'Guest User',
        role: Role.Customer,
        isActive: true,
      }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate emails with a conflict', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'guest@example.test',
    });

    await expect(
      service.register({
        email: 'guest@example.test',
        password: 'StrongP@ss1',
        fullName: 'Guest User',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks self-registration for elevated roles', async () => {
    await expect(
      service.register({
        email: 'guest@example.test',
        password: 'StrongP@ss1',
        fullName: 'Guest User',
        role: Role.Admin,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
