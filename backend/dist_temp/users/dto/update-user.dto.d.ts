import { Role } from '../../auth/enums/role.enum';
declare const EDITABLE_ROLES: readonly [Role.Host, Role.Manager, Role.Customer];
export declare class UpdateUserDto {
    fullName?: string;
    email?: string;
    phone?: string;
    role?: (typeof EDITABLE_ROLES)[number];
}
export {};
