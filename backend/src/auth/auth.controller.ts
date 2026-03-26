import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { ALL_ROLES } from './enums/role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('refresh')
  async refresh(@Req() request: Request): Promise<{ accessToken: string }> {
    const refreshToken = request.cookies?.refreshToken as string | undefined;
    return this.authService.refresh(refreshToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ALL_ROLES)
  @Get('me')
  me(@Req() request: Request & { user: AuthenticatedUser }): AuthenticatedUser {
    return request.user;
  }
}
