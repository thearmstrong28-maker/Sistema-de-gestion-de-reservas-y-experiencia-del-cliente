import { Repository } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { Role } from '../auth/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export interface PublicUser {
    id: string;
    email: string;
    fullName: string;
    restaurantName: string | null;
    role: Role;
    isActive: boolean;
    phone: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class UsersService {
    private readonly userRepository;
    private readonly bcryptRounds;
    constructor(userRepository: Repository<UserEntity>);
    createInternal(admin: AuthenticatedUser, createInternalUserDto: CreateInternalUserDto): Promise<PublicUser>;
    list(admin: AuthenticatedUser, query: ListUsersQueryDto): Promise<PublicUser[]>;
    update(admin: AuthenticatedUser, id: string, updateUserDto: UpdateUserDto): Promise<PublicUser>;
    remove(admin: AuthenticatedUser, id: string): Promise<PublicUser>;
    private toPublicUser;
    private isUniqueEmailViolation;
    private resolveRestaurantName;
    private resolveInternalEmail;
}
