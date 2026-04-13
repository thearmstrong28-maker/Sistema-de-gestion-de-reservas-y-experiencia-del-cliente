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
exports.ReservationEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
const customer_entity_1 = require("../../customers/entities/customer.entity");
const table_entity_1 = require("./table.entity");
const shift_entity_1 = require("../../shifts/entities/shift.entity");
const reservation_status_enum_1 = require("../enums/reservation-status.enum");
let ReservationEntity = class ReservationEntity {
    id;
    customerId;
    customer;
    tableId;
    table;
    shiftId;
    shift;
    reservationDate;
    startsAt;
    endsAt;
    partySize;
    status;
    specialRequests;
    cancellationReason;
    notes;
    createdByUserId;
    createdByUser;
    createdAt;
    updatedAt;
};
exports.ReservationEntity = ReservationEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReservationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', type: 'uuid' }),
    __metadata("design:type", String)
], ReservationEntity.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.CustomerEntity, (customer) => customer.reservations, {
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", customer_entity_1.CustomerEntity)
], ReservationEntity.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'table_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], ReservationEntity.prototype, "tableId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => table_entity_1.RestaurantTableEntity, (table) => table.reservations, {
        nullable: true,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'table_id' }),
    __metadata("design:type", Object)
], ReservationEntity.prototype, "table", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shift_id', type: 'uuid' }),
    __metadata("design:type", String)
], ReservationEntity.prototype, "shiftId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => shift_entity_1.ShiftEntity, (shift) => shift.reservations, {
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'shift_id' }),
    __metadata("design:type", shift_entity_1.ShiftEntity)
], ReservationEntity.prototype, "shift", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reservation_date', type: 'date' }),
    __metadata("design:type", String)
], ReservationEntity.prototype, "reservationDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'starts_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ReservationEntity.prototype, "startsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ends_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ReservationEntity.prototype, "endsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'party_size', type: 'int' }),
    __metadata("design:type", Number)
], ReservationEntity.prototype, "partySize", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: reservation_status_enum_1.ReservationStatus,
        enumName: 'reservation_status',
        default: reservation_status_enum_1.ReservationStatus.Pending,
    }),
    __metadata("design:type", String)
], ReservationEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'special_requests', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ReservationEntity.prototype, "specialRequests", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancellation_reason', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ReservationEntity.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ReservationEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], ReservationEntity.prototype, "createdByUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, {
        nullable: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by_user_id' }),
    __metadata("design:type", Object)
], ReservationEntity.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ReservationEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], ReservationEntity.prototype, "updatedAt", void 0);
exports.ReservationEntity = ReservationEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'reservations' }),
    (0, typeorm_1.Index)(['customerId', 'reservationDate', 'shiftId']),
    (0, typeorm_1.Index)(['tableId', 'startsAt', 'endsAt', 'status'])
], ReservationEntity);
//# sourceMappingURL=reservation.entity.js.map