import { Role } from '../enums/role.enum';
export declare class UserClassEntity {
    id: string;
    code: string;
    displayName: string;
    description: string;
    accessLevel: string;
    role: Role;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
