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
exports.ShiftEntity = void 0;
const typeorm_1 = require("typeorm");
const reservation_entity_1 = require("../../reservations/entities/reservation.entity");
const waitlist_entry_entity_1 = require("../../waitlist/entities/waitlist-entry.entity");
let ShiftEntity = class ShiftEntity {
    id;
    shiftName;
    shiftDate;
    startsAt;
    endsAt;
    isActive;
    reservations;
    waitlistEntries;
    createdAt;
    updatedAt;
};
exports.ShiftEntity = ShiftEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ShiftEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shift_name', type: 'text' }),
    __metadata("design:type", String)
], ShiftEntity.prototype, "shiftName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shift_date', type: 'date' }),
    __metadata("design:type", String)
], ShiftEntity.prototype, "shiftDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'starts_at', type: 'time' }),
    __metadata("design:type", String)
], ShiftEntity.prototype, "startsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ends_at', type: 'time' }),
    __metadata("design:type", String)
], ShiftEntity.prototype, "endsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ShiftEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => reservation_entity_1.ReservationEntity, (reservation) => reservation.shift),
    __metadata("design:type", Array)
], ShiftEntity.prototype, "reservations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => waitlist_entry_entity_1.WaitlistEntryEntity, (entry) => entry.requestedShift),
    __metadata("design:type", Array)
], ShiftEntity.prototype, "waitlistEntries", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ShiftEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ShiftEntity.prototype, "updatedAt", void 0);
exports.ShiftEntity = ShiftEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'shifts' }),
    (0, typeorm_1.Index)(['shiftName'], { unique: true })
], ShiftEntity);
//# sourceMappingURL=shift.entity.js.map