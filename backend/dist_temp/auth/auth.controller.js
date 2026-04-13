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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("./decorators/roles.decorator");
const login_dto_1 = require("./dto/login.dto");
const login_manager_dto_1 = require("./dto/login-manager.dto");
const login_receptionist_dto_1 = require("./dto/login-receptionist.dto");
const register_dto_1 = require("./dto/register.dto");
const verify_password_dto_1 = require("./dto/verify-password.dto");
const role_enum_1 = require("./enums/role.enum");
const role_enum_2 = require("./enums/role.enum");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
const auth_service_1 = require("./auth.service");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    register(registerDto) {
        return this.authService.register(registerDto);
    }
    async login(loginDto, response) {
        const { accessToken, refreshToken } = await this.authService.login(loginDto);
        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/auth/refresh',
        });
        return { accessToken };
    }
    async loginManager(loginManagerDto, response) {
        const { accessToken, refreshToken } = await this.authService.loginManager(loginManagerDto);
        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/auth/refresh',
        });
        return { accessToken };
    }
    async loginReceptionist(loginReceptionistDto, response) {
        const { accessToken, refreshToken, profile } = await this.authService.loginReceptionist(loginReceptionistDto);
        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/auth/refresh',
        });
        return { accessToken, profile };
    }
    async refresh(request) {
        const refreshToken = request.cookies?.refreshToken;
        return this.authService.refresh(refreshToken);
    }
    getUserClasses() {
        return this.authService.getUserClasses();
    }
    me(request) {
        return request.user;
    }
    verifyPassword(request, verifyPasswordDto) {
        return this.authService.verifyPassword(request.user.userId, verifyPasswordDto.password);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('login-gerente'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_manager_dto_1.LoginManagerDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginManager", null);
__decorate([
    (0, common_1.Post)('login-recepcionista'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_receptionist_dto_1.LoginReceptionistDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginReceptionist", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Get)('user-classes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getUserClasses", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...role_enum_1.ALL_ROLES),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_2.Role.Admin),
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)('verificar-contrasena'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_password_dto_1.VerifyPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map