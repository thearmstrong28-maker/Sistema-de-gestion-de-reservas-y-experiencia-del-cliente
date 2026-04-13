import { Role } from '../enums/role.enum';
export declare class UserEntity {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    restaurantName?: string | null;
    role: Role;
    isActive: boolean;
    phone?: string | null;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
