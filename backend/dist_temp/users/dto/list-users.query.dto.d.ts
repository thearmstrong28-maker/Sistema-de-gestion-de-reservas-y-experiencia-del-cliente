import { Role } from '../../auth/enums/role.enum';
declare const LISTABLE_ROLES: readonly [Role.Customer, Role.Host, Role.Manager];
export declare class ListUsersQueryDto {
    role?: (typeof LISTABLE_ROLES)[number];
    isActive?: boolean;
}
export {};
