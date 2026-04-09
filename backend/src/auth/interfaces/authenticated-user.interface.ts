import { Role } from '../enums/role.enum';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
  restaurantName: string | null;
}
