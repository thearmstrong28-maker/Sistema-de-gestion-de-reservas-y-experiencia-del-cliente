import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { LoginManagerDto } from './dto/login-manager.dto';
import { LoginReceptionistDto } from './dto/login-receptionist.dto';
import { RegisterDto } from './dto/register.dto';
import { UserClassEntity } from './entities/user-class.entity';
import { UserEntity } from './entities/user.entity';
import { Role } from './enums/role.enum';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
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
export declare class AuthService {
    private readonly userRepository;
    private readonly userClassRepository;
    private readonly jwtService;
    private readonly configService;
    private readonly dataSource;
    private readonly bcryptRounds;
    constructor(userRepository: Repository<UserEntity>, userClassRepository: Repository<UserClassEntity>, jwtService: JwtService, configService: ConfigService, dataSource: DataSource);
    register(registerDto: RegisterDto): Promise<PublicUser>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    loginManager(loginManagerDto: LoginManagerDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    loginReceptionist(loginReceptionistDto: LoginReceptionistDto): Promise<{
        accessToken: string;
        refreshToken: string;
        profile: AuthenticatedUser;
    }>;
    refresh(refreshToken?: string): Promise<{
        accessToken: string;
    }>;
    getUserClasses(): Promise<PublicUserClass[]>;
    verifyPassword(userId: string, password: string): Promise<{
        valid: true;
    }>;
    private findActiveUserByEmailFromRepository;
    private shouldBootstrapRestaurantAdmin;
    private getRestaurantNameKey;
    private findActiveUserById;
    private findActiveManagersByFullName;
    private findActiveReceptionistsByIdentifier;
    private normalizeEmail;
    private normalizeName;
    private generateTokens;
    private toAuthenticatedUser;
    private toPublicUser;
    private compareUserClasses;
    private toPublicUserClass;
}
