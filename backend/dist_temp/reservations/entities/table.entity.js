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
exports.TableEntity = exports.RestaurantTableEntity = void 0;
const typeorm_1 = require("typeorm");
const reservation_entity_1 = require("./reservation.entity");
const table_category_enum_1 = require("../enums/table-category.enum");
const table_availability_status_enum_1 = require("../enums/table-availability-status.enum");
let RestaurantTableEntity = class RestaurantTableEntity {
    id;
    tableNumber;
    area;
    capacity;
    category;
    availabilityStatus;
    posX;
    posY;
    layoutLabel;
    isActive;
    reservations;
    createdAt;
    updatedAt;
};
exports.RestaurantTableEntity = RestaurantTableEntity;
exports.TableEntity = RestaurantTableEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RestaurantTableEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'table_number', type: 'int' }),
    __metadata("design:type", Number)
], RestaurantTableEntity.prototype, "tableNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RestaurantTableEntity.prototype, "area", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], RestaurantTableEntity.prototype, "capacity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'category',
        type: 'enum',
        enum: table_category_enum_1.TableCategory,
        enumName: 'table_category',
        default: table_category_enum_1.TableCategory.Normal,
    }),
    __metadata("design:type", String)
], RestaurantTableEntity.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'availability_status',
        type: 'enum',
        enum: table_availability_status_enum_1.TableAvailabilityStatus,
        default: table_availability_status_enum_1.TableAvailabilityStatus.Disponible,
    }),
    __metadata("design:type", String)
], RestaurantTableEntity.prototype, "availabilityStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pos_x', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], RestaurantTableEntity.prototype, "posX", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pos_y', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], RestaurantTableEntity.prototype, "posY", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'layout_label', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RestaurantTableEntity.prototype, "layoutLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], RestaurantTableEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => reservation_entity_1.ReservationEntity, (reservation) => reservation.table),
    __metadata("design:type", Array)
], RestaurantTableEntity.prototype, "reservations", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RestaurantTableEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], RestaurantTableEntity.prototype, "updatedAt", void 0);
exports.TableEntity = exports.RestaurantTableEntity = RestaurantTableEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'restaurant_tables' }),
    (0, typeorm_1.Index)(['tableNumber'], { unique: true })
], RestaurantTableEntity);
//# sourceMappingURL=table.entity.js.map