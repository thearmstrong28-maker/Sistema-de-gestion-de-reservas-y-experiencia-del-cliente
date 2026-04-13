"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../auth/entities/user.entity");
const role_enum_1 = require("../auth/enums/role.enum");
let UsersService = class UsersService {
    userRepository;
    bcryptRounds = 10;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async createInternal(admin, createInternalUserDto) {
        const restaurantName = this.resolveRestaurantName(admin);
        const email = this.resolveInternalEmail(createInternalUserDto.fullName, createInternalUserDto.email);
        const fullName = createInternalUserDto.fullName.trim();
        const existingUser = await this.userRepository.findOne({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Ya existe un usuario con ese email');
        }
        const user = this.userRepository.create({
            email,
            fullName,
            role: createInternalUserDto.role,
            phone: createInternalUserDto.phone?.trim() || null,
            restaurantName,
            passwordHash: await bcrypt_1.default.hash(createInternalUserDto.password, this.bcryptRounds),
            isActive: true,
        });
        try {
            return this.toPublicUser(await this.userRepository.save(user));
        }
        catch (error) {
            if (this.isUniqueEmailViolation(error)) {
                throw new common_1.ConflictException('Ya existe un usuario con ese email');
            }
            throw error;
        }
    }
    async list(admin, query) {
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
            .where('user.role <> :adminRole', { adminRole: role_enum_1.Role.Admin })
            .andWhere('user.restaurantName = :restaurantName', { restaurantName })
            .orderBy('user.fullName', 'ASC')
            .addOrderBy('user.createdAt', 'DESC');
        if (query.role) {
            qb.andWhere('user.role = :role', { role: query.role });
        }
        if (query.isActive !== undefined) {
            qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
        }
        else {
            qb.andWhere('user.isActive = true');
        }
        const users = await qb.getMany();
        return users.map((user) => this.toPublicUser(user));
    }
    async update(admin, id, updateUserDto) {
        const restaurantName = this.resolveRestaurantName(admin);
        const user = await this.userRepository.findOne({
            where: { id, restaurantName },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role === role_enum_1.Role.Admin) {
            throw new common_1.ForbiddenException('No se puede editar un usuario admin');
        }
        const email = updateUserDto.email?.trim().toLowerCase();
        if (email && email !== user.email) {
            const existingUser = await this.userRepository.findOne({
                where: { email },
            });
            if (existingUser && existingUser.id !== user.id) {
                throw new common_1.ConflictException('Ya existe un usuario con ese email');
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
        }
        catch (error) {
            if (this.isUniqueEmailViolation(error)) {
                throw new common_1.ConflictException('Ya existe un usuario con ese email');
            }
            throw error;
        }
    }
    async remove(admin, id) {
        const restaurantName = this.resolveRestaurantName(admin);
        const user = await this.userRepository.findOne({
            where: { id, restaurantName },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (user.role === role_enum_1.Role.Admin) {
            throw new common_1.ForbiddenException('No se puede dar de baja un usuario admin');
        }
        user.isActive = false;
        return this.toPublicUser(await this.userRepository.save(user));
    }
    toPublicUser(user) {
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
    isUniqueEmailViolation(error) {
        if (typeof error !== 'object' || error === null) {
            return false;
        }
        const driverError = error;
        return driverError.driverError?.code === '23505';
    }
    resolveRestaurantName(admin) {
        return admin.restaurantName?.trim() || 'Restaurante principal';
    }
    resolveInternalEmail(fullName, email) {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map