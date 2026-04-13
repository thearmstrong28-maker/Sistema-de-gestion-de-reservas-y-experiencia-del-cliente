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
exports.WaitlistEntryEntity = void 0;
const typeorm_1 = require("typeorm");
const customer_entity_1 = require("../../customers/entities/customer.entity");
const shift_entity_1 = require("../../shifts/entities/shift.entity");
const waitlist_status_enum_1 = require("../enums/waitlist-status.enum");
let WaitlistEntryEntity = class WaitlistEntryEntity {
    id;
    customerId;
    customer;
    requestedShiftId;
    requestedShift;
    requestedDate;
    partySize;
    status;
    position;
    notes;
    createdAt;
    updatedAt;
};
exports.WaitlistEntryEntity = WaitlistEntryEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', type: 'uuid' }),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.CustomerEntity, (customer) => customer.waitlistEntries, {
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", customer_entity_1.CustomerEntity)
], WaitlistEntryEntity.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_shift_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "requestedShiftId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => shift_entity_1.ShiftEntity, (shift) => shift.waitlistEntries, {
        nullable: true,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'requested_shift_id' }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "requestedShift", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_date', type: 'date' }),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "requestedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'party_size', type: 'int' }),
    __metadata("design:type", Number)
], WaitlistEntryEntity.prototype, "partySize", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: waitlist_status_enum_1.WaitlistStatus,
        enumName: 'waitlist_status',
        default: waitlist_status_enum_1.WaitlistStatus.Waiting,
    }),
    __metadata("design:type", String)
], WaitlistEntryEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntryEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], WaitlistEntryEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], WaitlistEntryEntity.prototype, "updatedAt", void 0);
exports.WaitlistEntryEntity = WaitlistEntryEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'waitlist_entries' }),
    (0, typeorm_1.Index)(['requestedDate', 'requestedShiftId', 'status'])
], WaitlistEntryEntity);
//# sourceMappingURL=waitlist-entry.entity.js.map