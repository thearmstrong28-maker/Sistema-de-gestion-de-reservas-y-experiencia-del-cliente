import { Role } from '../enums/role.enum';
export declare class RegisterDto {
    email: string;
    phone: string;
    restaurantName: string;
    password: string;
    role?: Role;
}
