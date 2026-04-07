import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserClassEntity } from './entities/user-class.entity';
import { UserEntity } from './entities/user.entity';
import { Role } from './enums/role.enum';

type JwtExpiresIn = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

interface PublicUser {
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

interface PublicUserClass {
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
  ) {}

  async register(registerDto: RegisterDto): Promise<PublicUser> {
    const role = registerDto.role ?? Role.Customer;

    if (role !== Role.Customer) {
      throw new ForbiddenException(
        'Only customer self-registration is allowed',
      );
    }

    const email = this.normalizeEmail(registerDto.email);
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.bcryptRounds,
    );
    const restaurantName = registerDto.restaurantName.trim();
    const phone = registerDto.phone.trim();
    const user = this.userRepository.create({
      email,
      passwordHash,
      fullName: restaurantName,
      restaurantName,
      phone,
      role,
      isActive: true,
    });

    try {
      const savedUser = await this.userRepository.save(user);
      return this.toPublicUser(savedUser);
    } catch (error) {
      if (this.isUniqueEmailViolation(error)) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.findActiveUserByEmail(loginDto.email);
    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken?: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
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
      throw new UnauthorizedException('Invalid refresh token');
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

  private async findActiveUserByEmail(email: string): Promise<UserEntity> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async findActiveUserById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return user;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
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

  private isUniqueEmailViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const driverError = error as { driverError?: { code?: string } };
    return driverError.driverError?.code === '23505';
  }
}
