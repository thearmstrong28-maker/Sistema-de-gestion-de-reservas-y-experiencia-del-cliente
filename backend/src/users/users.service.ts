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
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';

interface PublicUser {
  id: string;
  email: string;
  fullName: string;
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
    createInternalUserDto: CreateInternalUserDto,
  ): Promise<PublicUser> {
    const email = createInternalUserDto.email.trim().toLowerCase();
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

  async list(query: ListUsersQueryDto): Promise<PublicUser[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.role',
        'user.isActive',
        'user.phone',
        'user.lastLoginAt',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.role <> :adminRole', { adminRole: Role.Admin })
      .orderBy('user.fullName', 'ASC')
      .addOrderBy('user.createdAt', 'DESC');

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    const users = await qb.getMany();
    return users.map((user) => this.toPublicUser(user));
  }

  async remove(id: string): Promise<PublicUser> {
    const user = await this.userRepository.findOne({ where: { id } });

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
}
