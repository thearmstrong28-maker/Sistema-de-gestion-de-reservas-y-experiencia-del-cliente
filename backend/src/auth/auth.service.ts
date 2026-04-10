import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { DataSource, ILike, Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { LoginManagerDto } from './dto/login-manager.dto';
import { LoginReceptionistDto } from './dto/login-receptionist.dto';
import { RegisterDto } from './dto/register.dto';
import { UserClassEntity } from './entities/user-class.entity';
import { UserEntity } from './entities/user.entity';
import { Role } from './enums/role.enum';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

type JwtExpiresIn = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  restaurantName: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUserClass {
  id: string;
  code: string;
  displayName: string;
  description: string;
  accessLevel: string;
  role: Role;
  isActive: boolean;
}

const ACCESS_LEVEL_ORDER = ['ALTO', 'MEDIO', 'BAJO'] as const;

@Injectable()
export class AuthService {
  private readonly bcryptRounds = 10;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserClassEntity)
    private readonly userClassRepository: Repository<UserClassEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async register(registerDto: RegisterDto): Promise<PublicUser> {
    const email = this.normalizeEmail(registerDto.email);
    const restaurantName = registerDto.restaurantName.trim();
    const restaurantNameKey = restaurantName.toLowerCase();
    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.bcryptRounds,
    );
    const phone = registerDto.phone.trim();

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        restaurantNameKey,
      ]);

      const transactionRepository = manager.getRepository(UserEntity);
      const existingUser = await transactionRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }

      const existingRestaurantAdmin = await transactionRepository.findOne({
        where: {
          restaurantName: ILike(restaurantName),
          role: Role.Admin,
          isActive: true,
        },
      });

      if (existingRestaurantAdmin) {
        throw new ConflictException(
          'Ya existe un administrador activo para este restaurante. El registro público no permite crear otra cuenta administradora.',
        );
      }

      const user = transactionRepository.create({
        email,
        passwordHash,
        fullName: restaurantName,
        restaurantName,
        phone,
        role: Role.Admin,
        isActive: true,
      });

      const savedUser = await transactionRepository.save(user);
      return this.toPublicUser(savedUser);
    });
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.dataSource.transaction(async (manager) => {
      const transactionRepository = manager.getRepository(UserEntity);
      const authenticatedUser = await this.findActiveUserByEmailFromRepository(
        transactionRepository,
        loginDto.email,
      );
      const passwordMatches = await bcrypt.compare(
        loginDto.password,
        authenticatedUser.passwordHash,
      );

      if (!passwordMatches) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const shouldBootstrapAdmin =
        this.shouldBootstrapRestaurantAdmin(authenticatedUser);

      if (shouldBootstrapAdmin) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          this.getRestaurantNameKey(authenticatedUser.restaurantName),
        ]);

        const existingActiveAdmin = await transactionRepository.findOne({
          where: {
            restaurantName: ILike(
              authenticatedUser.restaurantName?.trim() ?? '',
            ),
            role: Role.Admin,
            isActive: true,
          },
        });

        if (!existingActiveAdmin) {
          authenticatedUser.role = Role.Admin;
        }
      }

      return transactionRepository.save({
        ...authenticatedUser,
        lastLoginAt: new Date(),
      });
    });

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return { accessToken, refreshToken };
  }

  async loginManager(
    loginManagerDto: LoginManagerDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const matchingManagers = await this.findActiveManagersByFullName(
      loginManagerDto.fullName,
    );

    if (matchingManagers.length > 1) {
      throw new ConflictException(
        'Hay más de un gerente activo con ese nombre. Contactá a un administrador para corregirlo.',
      );
    }

    const manager = matchingManagers[0];

    if (!manager) {
      throw new UnauthorizedException(
        'No tenés acceso de gerente con esas credenciales',
      );
    }

    const passwordMatches = await bcrypt.compare(
      loginManagerDto.password,
      manager.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'No tenés acceso de gerente con esas credenciales',
      );
    }

    const savedManager = await this.userRepository.save({
      ...manager,
      lastLoginAt: new Date(),
    });

    return this.generateTokens(savedManager);
  }

  async loginReceptionist(loginReceptionistDto: LoginReceptionistDto): Promise<{
    accessToken: string;
    refreshToken: string;
    profile: AuthenticatedUser;
  }> {
    const matchingReceptionists =
      await this.findActiveReceptionistsByIdentifier(
        loginReceptionistDto.identifier,
      );

    if (matchingReceptionists.length > 1) {
      throw new ConflictException(
        'Hay más de un recepcionista activo con ese nombre. Contactá a un administrador para corregirlo.',
      );
    }

    const receptionist = matchingReceptionists[0];

    if (!receptionist) {
      throw new UnauthorizedException(
        'No tenés acceso de recepcionista con esas credenciales',
      );
    }

    const passwordMatches = await bcrypt.compare(
      loginReceptionistDto.password,
      receptionist.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'No tenés acceso de recepcionista con esas credenciales',
      );
    }

    const savedReceptionist = await this.userRepository.save({
      ...receptionist,
      lastLoginAt: new Date(),
    });
    const tokens = await this.generateTokens(savedReceptionist);

    return {
      ...tokens,
      profile: this.toAuthenticatedUser(savedReceptionist),
    };
  }

  async refresh(refreshToken?: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('El token de renovación es obligatorio');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>(
            'JWT_REFRESH_SECRET',
            'change-me-refresh-secret',
          ),
        },
      );

      const user = await this.findActiveUserById(payload.sub);
      const { accessToken } = await this.generateTokens(user);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Token de renovación inválido');
    }
  }

  async getUserClasses(): Promise<PublicUserClass[]> {
    const userClasses = await this.userClassRepository.find({
      where: { isActive: true },
    });

    return userClasses
      .filter((userClass) => userClass.isActive)
      .sort((left, right) => this.compareUserClasses(left, right))
      .map((userClass) => this.toPublicUserClass(userClass));
  }

  async verifyPassword(
    userId: string,
    password: string,
  ): Promise<{ valid: true }> {
    const user = await this.findActiveUserById(userId);
    const matches = await bcrypt.compare(password, user.passwordHash);

    if (!matches) {
      throw new UnauthorizedException('La contraseña ingresada no es correcta');
    }

    return { valid: true };
  }

  private async findActiveUserByEmailFromRepository(
    repository: Pick<Repository<UserEntity>, 'findOne'>,
    email: string,
  ): Promise<UserEntity> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await repository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  private shouldBootstrapRestaurantAdmin(user: UserEntity): boolean {
    return Boolean(user.restaurantName?.trim()) && user.role === Role.Customer;
  }

  private getRestaurantNameKey(restaurantName?: string | null): string {
    return restaurantName?.trim().toLowerCase() ?? '';
  }

  private async findActiveUserById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token de renovación inválido');
    }

    return user;
  }

  private async findActiveManagersByFullName(
    fullName: string,
  ): Promise<UserEntity[]> {
    const normalizedFullName = this.normalizeName(fullName);
    const managers = await this.userRepository.find({
      where: { role: Role.Manager, isActive: true },
    });

    return managers.filter(
      (manager) => this.normalizeName(manager.fullName) === normalizedFullName,
    );
  }

  private async findActiveReceptionistsByIdentifier(
    identifier: string,
  ): Promise<UserEntity[]> {
    const normalizedIdentifier = this.normalizeName(identifier);
    const normalizedEmail = this.normalizeEmail(identifier);
    const receptionists = await this.userRepository.find({
      where: { role: Role.Host, isActive: true },
    });

    const matchingByEmail = receptionists.filter(
      (receptionist) => receptionist.email === normalizedEmail,
    );

    if (matchingByEmail.length > 0) {
      return matchingByEmail;
    }

    return receptionists.filter(
      (receptionist) =>
        this.normalizeName(receptionist.fullName) === normalizedIdentifier,
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeName(value: string): string {
    return value.trim().toLowerCase();
  }

  private async generateTokens(
    user: Pick<UserEntity, 'id' | 'email' | 'role' | 'fullName'>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
    const accessTokenExpiresIn =
      this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') ?? '15m';
    const refreshTokenExpiresIn =
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? '7d';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        'change-me-access-secret',
      ),
      expiresIn: accessTokenExpiresIn as JwtExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'change-me-refresh-secret',
      ),
      expiresIn: refreshTokenExpiresIn as JwtExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  private toAuthenticatedUser(user: UserEntity): AuthenticatedUser {
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      restaurantName: user.restaurantName ?? null,
    };
  }

  private toPublicUser(user: UserEntity): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      restaurantName: user.restaurantName ?? null,
      phone: user.phone ?? null,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private compareUserClasses(
    left: UserClassEntity,
    right: UserClassEntity,
  ): number {
    const leftLevelIndex = ACCESS_LEVEL_ORDER.indexOf(
      left.accessLevel as (typeof ACCESS_LEVEL_ORDER)[number],
    );
    const rightLevelIndex = ACCESS_LEVEL_ORDER.indexOf(
      right.accessLevel as (typeof ACCESS_LEVEL_ORDER)[number],
    );

    if (leftLevelIndex !== rightLevelIndex) {
      return leftLevelIndex - rightLevelIndex;
    }

    return left.displayName.localeCompare(right.displayName, 'es');
  }

  private toPublicUserClass(userClass: UserClassEntity): PublicUserClass {
    return {
      id: userClass.id,
      code: userClass.code,
      displayName: userClass.displayName,
      description: userClass.description,
      accessLevel: userClass.accessLevel,
      role: userClass.role,
      isActive: userClass.isActive,
    };
  }
}
