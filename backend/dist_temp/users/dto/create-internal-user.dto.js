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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInternalUserDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const role_enum_1 = require("../../auth/enums/role.enum");
const INTERNAL_ROLES = [role_enum_1.Role.Host, role_enum_1.Role.Manager];
class CreateInternalUserDto {
    email;
    fullName;
    password;
    role;
    phone;
}
exports.CreateInternalUserDto = CreateInternalUserDto;
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Ingresá un correo electrónico válido.' }),
    __metadata("design:type", String)
], CreateInternalUserDto.prototype, "email", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)({ message: 'El nombre completo debe ser un texto válido.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El nombre completo es obligatorio.' }),
    (0, class_validator_1.MaxLength)(120, {
        message: 'El nombre completo no puede superar 120 caracteres.',
    }),
    __metadata("design:type", String)
], CreateInternalUserDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'La contraseña debe ser un texto válido.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'La contraseña es obligatoria.' }),
    (0, class_validator_1.MinLength)(6, {
        message: 'La contraseña debe tener al menos 6 caracteres.',
    }),
    __metadata("design:type", String)
], CreateInternalUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsIn)(INTERNAL_ROLES, {
        message: 'El rol seleccionado no es válido.',
    }),
    __metadata("design:type", Object)
], CreateInternalUserDto.prototype, "role", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'El teléfono debe ser un texto válido.' }),
    (0, class_validator_1.MaxLength)(30, {
        message: 'El teléfono no puede superar 30 caracteres.',
    }),
    __metadata("design:type", String)
], CreateInternalUserDto.prototype, "phone", void 0);
//# sourceMappingURL=create-internal-user.dto.js.map