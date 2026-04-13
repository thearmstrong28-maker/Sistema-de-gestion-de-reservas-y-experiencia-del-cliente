import { Role } from '../../auth/enums/role.enum';
declare const INTERNAL_ROLES: readonly [Role.Host, Role.Manager];
export declare class CreateInternalUserDto {
    email?: string;
    fullName: string;
    password: string;
    role: (typeof INTERNAL_ROLES)[number];
    phone?: string;
}
export {};
