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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const typeorm_2 = require("typeorm");
const user_class_entity_1 = require("./entities/user-class.entity");
const user_entity_1 = require("./entities/user.entity");
const role_enum_1 = require("./enums/role.enum");
const ACCESS_LEVEL_ORDER = ['ALTO', 'MEDIO', 'BAJO'];
let AuthService = class AuthService {
    userRepository;
    userClassRepository;
    jwtService;
    configService;
    dataSource;
    bcryptRounds = 10;
    constructor(userRepository, userClassRepository, jwtService, configService, dataSource) {
        this.userRepository = userRepository;
        this.userClassRepository = userClassRepository;
        this.jwtService = jwtService;
        this.configService = configService;
        this.dataSource = dataSource;
    }
    async register(registerDto) {
        const email = this.normalizeEmail(registerDto.email);
        const restaurantName = registerDto.restaurantName.trim();
        const restaurantNameKey = restaurantName.toLowerCase();
        const passwordHash = await bcrypt_1.default.hash(registerDto.password, this.bcryptRounds);
        const phone = registerDto.phone.trim();
        return this.dataSource.transaction(async (manager) => {
            await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
                restaurantNameKey,
            ]);
            const transactionRepository = manager.getRepository(user_entity_1.UserEntity);
            const existingUser = await transactionRepository.findOne({
                where: { email },
            });
            if (existingUser) {
                throw new common_1.ConflictException('El correo electrónico ya está registrado');
            }
            const existingRestaurantAdmin = await transactionRepository.findOne({
                where: {
                    restaurantName: (0, typeorm_2.ILike)(restaurantName),
                    role: role_enum_1.Role.Admin,
                    isActive: true,
                },
            });
            if (existingRestaurantAdmin) {
                throw new common_1.ConflictException('Ya existe un administrador activo para este restaurante. El registro público no permite crear otra cuenta administradora.');
            }
            const user = transactionRepository.create({
                email,
                passwordHash,
                fullName: restaurantName,
                restaurantName,
                phone,
                role: role_enum_1.Role.Admin,
                isActive: true,
            });
            const savedUser = await transactionRepository.save(user);
            return this.toPublicUser(savedUser);
        });
    }
    async login(loginDto) {
        const user = await this.dataSource.transaction(async (manager) => {
            const transactionRepository = manager.getRepository(user_entity_1.UserEntity);
            const authenticatedUser = await this.findActiveUserByEmailFromRepository(transactionRepository, loginDto.email);
            const passwordMatches = await bcrypt_1.default.compare(loginDto.password, authenticatedUser.passwordHash);
            if (!passwordMatches) {
                throw new common_1.UnauthorizedException('Credenciales inválidas');
            }
            const shouldBootstrapAdmin = this.shouldBootstrapRestaurantAdmin(authenticatedUser);
            if (shouldBootstrapAdmin) {
                await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
                    this.getRestaurantNameKey(authenticatedUser.restaurantName),
                ]);
                const existingActiveAdmin = await transactionRepository.findOne({
                    where: {
                        restaurantName: (0, typeorm_2.ILike)(authenticatedUser.restaurantName?.trim() ?? ''),
                        role: role_enum_1.Role.Admin,
                        isActive: true,
                    },
                });
                if (!existingActiveAdmin) {
                    authenticatedUser.role = role_enum_1.Role.Admin;
                }
            }
            return transactionRepository.save({
                ...authenticatedUser,
                lastLoginAt: new Date(),
            });
        });
        const { accessToken, refreshToken } = await this.generateTokens(user);
        return { accessToken, refreshToken };
    }
    async loginManager(loginManagerDto) {
        const matchingManagers = await this.findActiveManagersByFullName(loginManagerDto.fullName);
        if (matchingManagers.length > 1) {
            throw new common_1.ConflictException('Hay más de un gerente activo con ese nombre. Contactá a un administrador para corregirlo.');
        }
        const manager = matchingManagers[0];
        if (!manager) {
            throw new common_1.UnauthorizedException('No tenés acceso de gerente con esas credenciales');
        }
        const passwordMatches = await bcrypt_1.default.compare(loginManagerDto.password, manager.passwordHash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('No tenés acceso de gerente con esas credenciales');
        }
        const savedManager = await this.userRepository.save({
            ...manager,
            lastLoginAt: new Date(),
        });
        return this.generateTokens(savedManager);
    }
    async loginReceptionist(loginReceptionistDto) {
        const matchingReceptionists = await this.findActiveReceptionistsByIdentifier(loginReceptionistDto.identifier);
        if (matchingReceptionists.length > 1) {
            throw new common_1.ConflictException('Hay más de un recepcionista activo con ese nombre. Contactá a un administrador para corregirlo.');
        }
        const receptionist = matchingReceptionists[0];
        if (!receptionist) {
            throw new common_1.UnauthorizedException('No tenés acceso de recepcionista con esas credenciales');
        }
        const passwordMatches = await bcrypt_1.default.compare(loginReceptionistDto.password, receptionist.passwordHash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('No tenés acceso de recepcionista con esas credenciales');
        }
        const savedReceptionist = await this.userRepository.save({
            ...receptionist,
            lastLoginAt: new Date(),
        });
        const tokens = await this.generateTokens(savedReceptionist);
        return {
            ...tokens,
            profile: this.toAuthenticatedUser(savedReceptionist),
        };
    }
    async refresh(refreshToken) {
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('El token de renovación es obligatorio');
        }
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET', 'change-me-refresh-secret'),
            });
            const user = await this.findActiveUserById(payload.sub);
            const { accessToken } = await this.generateTokens(user);
            return { accessToken };
        }
        catch {
            throw new common_1.UnauthorizedException('Token de renovación inválido');
        }
    }
    async getUserClasses() {
        const userClasses = await this.userClassRepository.find({
            where: { isActive: true },
        });
        return userClasses
            .filter((userClass) => userClass.isActive)
            .sort((left, right) => this.compareUserClasses(left, right))
            .map((userClass) => this.toPublicUserClass(userClass));
    }
    async verifyPassword(userId, password) {
        const user = await this.findActiveUserById(userId);
        const matches = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!matches) {
            throw new common_1.UnauthorizedException('La contraseña ingresada no es correcta');
        }
        return { valid: true };
    }
    async findActiveUserByEmailFromRepository(repository, email) {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await repository.findOne({
            where: { email: normalizedEmail },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        return user;
    }
    shouldBootstrapRestaurantAdmin(user) {
        return Boolean(user.restaurantName?.trim()) && user.role === role_enum_1.Role.Customer;
    }
    getRestaurantNameKey(restaurantName) {
        return restaurantName?.trim().toLowerCase() ?? '';
    }
    async findActiveUserById(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Token de renovación inválido');
        }
        return user;
    }
    async findActiveManagersByFullName(fullName) {
        const normalizedFullName = this.normalizeName(fullName);
        const managers = await this.userRepository.find({
            where: { role: role_enum_1.Role.Manager, isActive: true },
        });
        return managers.filter((manager) => this.normalizeName(manager.fullName) === normalizedFullName);
    }
    async findActiveReceptionistsByIdentifier(identifier) {
        const normalizedIdentifier = this.normalizeName(identifier);
        const normalizedEmail = this.normalizeEmail(identifier);
        const receptionists = await this.userRepository.find({
            where: { role: role_enum_1.Role.Host, isActive: true },
        });
        const matchingByEmail = receptionists.filter((receptionist) => receptionist.email === normalizedEmail);
        if (matchingByEmail.length > 0) {
            return matchingByEmail;
        }
        return receptionists.filter((receptionist) => this.normalizeName(receptionist.fullName) === normalizedIdentifier);
    }
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    normalizeName(value) {
        return value.trim().toLowerCase();
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
        };
        const accessTokenExpiresIn = this.configService.get('ACCESS_TOKEN_EXPIRES_IN') ?? '15m';
        const refreshTokenExpiresIn = this.configService.get('REFRESH_TOKEN_EXPIRES_IN') ?? '7d';
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_ACCESS_SECRET', 'change-me-access-secret'),
            expiresIn: accessTokenExpiresIn,
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET', 'change-me-refresh-secret'),
            expiresIn: refreshTokenExpiresIn,
        });
        return { accessToken, refreshToken };
    }
    toAuthenticatedUser(user) {
        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            restaurantName: user.restaurantName ?? null,
        };
    }
    toPublicUser(user) {
        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            restaurantName: user.restaurantName ?? null,
            phone: user.phone ?? null,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
    compareUserClasses(left, right) {
        const leftLevelIndex = ACCESS_LEVEL_ORDER.indexOf(left.accessLevel);
        const rightLevelIndex = ACCESS_LEVEL_ORDER.indexOf(right.accessLevel);
        if (leftLevelIndex !== rightLevelIndex) {
            return leftLevelIndex - rightLevelIndex;
        }
        return left.displayName.localeCompare(right.displayName, 'es');
    }
    toPublicUserClass(userClass) {
        return {
            id: userClass.id,
            code: userClass.code,
            displayName: userClass.displayName,
            description: userClass.description,
            accessLevel: userClass.accessLevel,
            role: userClass.role,
            isActive: userClass.isActive,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(user_class_entity_1.UserClassEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.DataSource])
], AuthService);
//# sourceMappingURL=auth.service.js.map