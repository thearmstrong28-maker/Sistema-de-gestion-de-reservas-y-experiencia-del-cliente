import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
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

@Injectable()
export class UsersService {
  private readonly bcryptRounds = 10;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createInternal(
    admin: AuthenticatedUser,
    createInternalUserDto: CreateInternalUserDto,
  ): Promise<PublicUser> {
    const restaurantName = this.resolveRestaurantName(admin);
    const email = this.resolveInternalEmail(
      createInternalUserDto.fullName,
      createInternalUserDto.email,
    );
    const fullName = createInternalUserDto.fullName.trim();

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const user = this.userRepository.create({
      email,
      fullName,
      role: createInternalUserDto.role,
      phone: createInternalUserDto.phone?.trim() || null,
      restaurantName,
      passwordHash: await bcrypt.hash(
        createInternalUserDto.password,
        this.bcryptRounds,
      ),
      isActive: true,
    });

    try {
      return this.toPublicUser(await this.userRepository.save(user));
    } catch (error) {
      if (this.isUniqueEmailViolation(error)) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }

      throw error;
    }
  }

  async list(
    admin: AuthenticatedUser,
    query: ListUsersQueryDto,
  ): Promise<PublicUser[]> {
    const restaurantName = this.resolveRestaurantName(admin);
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.restaurantName',
        'user.role',
        'user.isActive',
        'user.phone',
        'user.lastLoginAt',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.role <> :adminRole', { adminRole: Role.Admin })
      .andWhere('user.restaurantName = :restaurantName', { restaurantName })
      .orderBy('user.fullName', 'ASC')
      .addOrderBy('user.createdAt', 'DESC');

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    } else {
      qb.andWhere('user.isActive = true');
    }

    const users = await qb.getMany();
    return users.map((user) => this.toPublicUser(user));
  }

  async update(
    admin: AuthenticatedUser,
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<PublicUser> {
    const restaurantName = this.resolveRestaurantName(admin);
    const user = await this.userRepository.findOne({
      where: { id, restaurantName },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === Role.Admin) {
      throw new ForbiddenException('No se puede editar un usuario admin');
    }

    const email = updateUserDto.email?.trim().toLowerCase();

    if (email && email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }

      user.email = email;
    }

    if (updateUserDto.fullName !== undefined) {
      user.fullName = updateUserDto.fullName;
    }

    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone;
    }

    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }

    try {
      return this.toPublicUser(await this.userRepository.save(user));
    } catch (error) {
      if (this.isUniqueEmailViolation(error)) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }

      throw error;
    }
  }

  async remove(admin: AuthenticatedUser, id: string): Promise<PublicUser> {
    const restaurantName = this.resolveRestaurantName(admin);
    const user = await this.userRepository.findOne({
      where: { id, restaurantName },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === Role.Admin) {
      throw new ForbiddenException('No se puede dar de baja un usuario admin');
    }

    user.isActive = false;
    return this.toPublicUser(await this.userRepository.save(user));
  }

  private toPublicUser(user: UserEntity): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      restaurantName: user.restaurantName ?? null,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private isUniqueEmailViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const driverError = error as { driverError?: { code?: string } };
    return driverError.driverError?.code === '23505';
  }

  private resolveRestaurantName(admin: AuthenticatedUser): string {
    // MVP mono-restaurante: el scope se toma del admin autenticado.
    return admin.restaurantName?.trim() || 'Restaurante principal';
  }

  private resolveInternalEmail(fullName: string, email?: string): string {
    if (email?.trim()) {
      return email.trim().toLowerCase();
    }

    const slug = fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 32);
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    return `${slug || 'usuario'}.${suffix}@interno.local`;
  }
}
