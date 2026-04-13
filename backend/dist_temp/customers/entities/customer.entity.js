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
exports.CustomerEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
const reservation_entity_1 = require("../../reservations/entities/reservation.entity");
const waitlist_entry_entity_1 = require("../../waitlist/entities/waitlist-entry.entity");
let CustomerEntity = class CustomerEntity {
    id;
    userId;
    user;
    fullName;
    email;
    phone;
    preferences;
    visitCount;
    notes;
    reservations;
    waitlistEntries;
    createdAt;
    updatedAt;
};
exports.CustomerEntity = CustomerEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomerEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true, unique: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.UserEntity, {
        nullable: true,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'full_name', type: 'text' }),
    __metadata("design:type", String)
], CustomerEntity.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: () => "'{}'::jsonb" }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "preferences", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'visit_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CustomerEntity.prototype, "visitCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CustomerEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => reservation_entity_1.ReservationEntity, (reservation) => reservation.customer),
    __metadata("design:type", Array)
], CustomerEntity.prototype, "reservations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => waitlist_entry_entity_1.WaitlistEntryEntity, (entry) => entry.customer),
    __metadata("design:type", Array)
], CustomerEntity.prototype, "waitlistEntries", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CustomerEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], CustomerEntity.prototype, "updatedAt", void 0);
exports.CustomerEntity = CustomerEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'customers' }),
    (0, typeorm_1.Index)(['email'], { unique: true })
], CustomerEntity);
//# sourceMappingURL=customer.entity.js.map