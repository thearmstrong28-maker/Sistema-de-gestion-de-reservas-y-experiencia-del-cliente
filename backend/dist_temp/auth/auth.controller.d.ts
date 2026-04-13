import type { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { LoginManagerDto } from './dto/login-manager.dto';
import { LoginReceptionistDto } from './dto/login-receptionist.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuthService, type PublicUser, type PublicUserClass } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<PublicUser>;
    login(loginDto: LoginDto, response: Response): Promise<{
        accessToken: string;
    }>;
    loginManager(loginManagerDto: LoginManagerDto, response: Response): Promise<{
        accessToken: string;
    }>;
    loginReceptionist(loginReceptionistDto: LoginReceptionistDto, response: Response): Promise<{
        accessToken: string;
        profile: AuthenticatedUser;
    }>;
    refresh(request: Request): Promise<{
        accessToken: string;
    }>;
    getUserClasses(): Promise<PublicUserClass[]>;
    me(request: Request & {
        user: AuthenticatedUser;
    }): AuthenticatedUser;
    verifyPassword(request: Request & {
        user: AuthenticatedUser;
    }, verifyPasswordDto: VerifyPasswordDto): Promise<{
        valid: true;
    }>;
}
