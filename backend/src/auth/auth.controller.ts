import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginManagerDto } from './dto/login-manager.dto';
import { LoginReceptionistDto } from './dto/login-receptionist.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { ALL_ROLES } from './enums/role.enum';
import { Role } from './enums/role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import {
  AuthService,
  type PublicUser,
  type PublicUserClass,
} from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<PublicUser> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } =
      await this.authService.login(loginDto);

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/auth/refresh',
    });

    return { accessToken };
  }

  @Post('login-gerente')
  async loginManager(
    @Body() loginManagerDto: LoginManagerDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } =
      await this.authService.loginManager(loginManagerDto);

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/auth/refresh',
    });

    return { accessToken };
  }

  @Post('login-recepcionista')
  async loginReceptionist(
    @Body() loginReceptionistDto: LoginReceptionistDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string; profile: AuthenticatedUser }> {
    const { accessToken, refreshToken, profile } =
      await this.authService.loginReceptionist(loginReceptionistDto);

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/auth/refresh',
    });

    return { accessToken, profile };
  }

  @Post('refresh')
  async refresh(@Req() request: Request): Promise<{ accessToken: string }> {
    const refreshToken = request.cookies?.refreshToken as string | undefined;
    return this.authService.refresh(refreshToken);
  }

  @Get('user-classes')
  getUserClasses(): Promise<PublicUserClass[]> {
    return this.authService.getUserClasses();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ALL_ROLES)
  @Get('me')
  me(@Req() request: Request & { user: AuthenticatedUser }): AuthenticatedUser {
    return request.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @HttpCode(200)
  @Post('verificar-contrasena')
  verifyPassword(
    @Req() request: Request & { user: AuthenticatedUser },
    @Body() verifyPasswordDto: VerifyPasswordDto,
  ): Promise<{ valid: true }> {
    return this.authService.verifyPassword(
      request.user.userId,
      verifyPasswordDto.password,
    );
  }
}
