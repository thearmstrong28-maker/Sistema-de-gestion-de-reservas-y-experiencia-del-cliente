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
exports.UpdateUserDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const role_enum_1 = require("../../auth/enums/role.enum");
const EDITABLE_ROLES = [role_enum_1.Role.Host, role_enum_1.Role.Manager, role_enum_1.Role.Customer];
const normalizeOptionalText = ({ value }) => {
    if (typeof value !== 'string') {
        return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};
class UpdateUserDto {
    fullName;
    email;
    phone;
    role;
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, class_transformer_1.Transform)(normalizeOptionalText),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'El nombre completo debe ser un texto válido.' }),
    (0, class_validator_1.MaxLength)(120, {
        message: 'El nombre completo no puede superar 120 caracteres.',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "fullName", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value !== 'string') {
            return value;
        }
        const trimmed = value.trim().toLowerCase();
        return trimmed.length > 0 ? trimmed : undefined;
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Ingresá un correo electrónico válido.' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, class_transformer_1.Transform)(normalizeOptionalText),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'El teléfono debe ser un texto válido.' }),
    (0, class_validator_1.MaxLength)(30, {
        message: 'El teléfono no puede superar 30 caracteres.',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "phone", void 0);
__decorate([
    (0, class_transformer_1.Transform)(normalizeOptionalText),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(EDITABLE_ROLES, {
        message: 'El rol seleccionado no es válido.',
    }),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "role", void 0);
//# sourceMappingURL=update-user.dto.js.map