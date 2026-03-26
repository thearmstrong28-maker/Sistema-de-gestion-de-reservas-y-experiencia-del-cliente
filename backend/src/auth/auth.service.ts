import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { Role } from './enums/role.enum';

type JwtExpiresIn = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

interface MockUser {
  id: string;
  email: string;
  password: string;
  role: Role;
  name: string;
}

@Injectable()
export class AuthService {
  private readonly mockUser: MockUser = {
    id: 'user-admin-001',
    email: 'admin@local.test',
    password: 'Admin123!',
    role: Role.Admin,
    name: 'Admin User',
  };

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = this.validateMockUser(loginDto.email, loginDto.password);
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

      if (payload.sub !== this.mockUser.id) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const { accessToken } = await this.generateTokens(this.mockUser);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private validateMockUser(email: string, password: string): MockUser {
    if (email !== this.mockUser.email || password !== this.mockUser.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.mockUser;
  }

  private async generateTokens(
    user: MockUser,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
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
}
