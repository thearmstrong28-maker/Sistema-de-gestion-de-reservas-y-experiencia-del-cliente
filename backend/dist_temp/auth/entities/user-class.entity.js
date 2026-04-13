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
exports.UserClassEntity = void 0;
const typeorm_1 = require("typeorm");
const role_enum_1 = require("../enums/role.enum");
let UserClassEntity = class UserClassEntity {
    id;
    code;
    displayName;
    description;
    accessLevel;
    role;
    isActive;
    createdAt;
    updatedAt;
};
exports.UserClassEntity = UserClassEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserClassEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', unique: true }),
    __metadata("design:type", String)
], UserClassEntity.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name', type: 'text' }),
    __metadata("design:type", String)
], UserClassEntity.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], UserClassEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'access_level', type: 'text' }),
    __metadata("design:type", String)
], UserClassEntity.prototype, "accessLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: role_enum_1.Role }),
    __metadata("design:type", String)
], UserClassEntity.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], UserClassEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], UserClassEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], UserClassEntity.prototype, "updatedAt", void 0);
exports.UserClassEntity = UserClassEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'user_classes' }),
    (0, typeorm_1.Index)(['role']),
    (0, typeorm_1.Index)(['isActive'])
], UserClassEntity);
//# sourceMappingURL=user-class.entity.js.map