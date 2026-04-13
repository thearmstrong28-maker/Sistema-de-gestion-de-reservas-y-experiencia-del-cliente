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
exports.RegisterDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const role_enum_1 = require("../enums/role.enum");
class RegisterDto {
    email;
    phone;
    restaurantName;
    password;
    role;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsEmail)({}, { message: 'Ingresá un correo electrónico válido.' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)({ message: 'El teléfono debe ser un texto válido.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El teléfono es obligatorio.' }),
    (0, class_validator_1.Matches)(/^\+?(?:[0-9\s().-]*\d){7,15}[0-9\s().-]*$/, {
        message: 'Ingresá un teléfono internacional válido.',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)({ message: 'El nombre del restaurante debe ser un texto válido.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El nombre del restaurante es obligatorio.' }),
    (0, class_validator_1.MinLength)(2, {
        message: 'El nombre del restaurante debe tener al menos 2 caracteres.',
    }),
    (0, class_validator_1.MaxLength)(120, {
        message: 'El nombre del restaurante no puede superar 120 caracteres.',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "restaurantName", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'La contraseña debe ser un texto válido.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'La contraseña es obligatoria.' }),
    (0, class_validator_1.MinLength)(8, {
        message: 'La contraseña debe tener al menos 8 caracteres.',
    }),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
        message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(role_enum_1.Role, { message: 'El rol seleccionado no es válido.' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
//# sourceMappingURL=register.dto.js.map