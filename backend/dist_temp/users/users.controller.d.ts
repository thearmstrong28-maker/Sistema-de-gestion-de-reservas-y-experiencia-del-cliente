import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UsersService, type PublicUser } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    createInternal(request: Request & {
        user: AuthenticatedUser;
    }, createInternalUserDto: CreateInternalUserDto): Promise<PublicUser>;
    list(request: Request & {
        user: AuthenticatedUser;
    }, query: ListUsersQueryDto): Promise<PublicUser[]>;
    update(request: Request & {
        user: AuthenticatedUser;
    }, id: string, updateUserDto: UpdateUserDto): Promise<PublicUser>;
    remove(request: Request & {
        user: AuthenticatedUser;
    }, id: string): Promise<PublicUser>;
}
