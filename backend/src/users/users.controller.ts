import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UsersService, type PublicUser } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('internal')
  createInternal(
    @Req() request: Request & { user: AuthenticatedUser },
    @Body() createInternalUserDto: CreateInternalUserDto,
  ): Promise<PublicUser> {
    return this.usersService.createInternal(
      request.user,
      createInternalUserDto,
    );
  }

  @Get()
  list(
    @Req() request: Request & { user: AuthenticatedUser },
    @Query() query: ListUsersQueryDto,
  ): Promise<PublicUser[]> {
    return this.usersService.list(request.user, query);
  }

  @Delete(':id')
  remove(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param('id') id: string,
  ): Promise<PublicUser> {
    return this.usersService.remove(request.user, id);
  }
}
