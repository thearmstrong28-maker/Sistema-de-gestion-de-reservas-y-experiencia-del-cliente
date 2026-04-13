"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const customer_entity_1 = require("../customers/entities/customer.entity");
const shift_entity_1 = require("../shifts/entities/shift.entity");
const reservations_controller_1 = require("./reservations.controller");
const reservation_entity_1 = require("./entities/reservation.entity");
const table_entity_1 = require("./entities/table.entity");
const waitlist_entry_entity_1 = require("../waitlist/entities/waitlist-entry.entity");
const reservations_service_1 = require("./reservations.service");
let ReservationsModule = class ReservationsModule {
};
exports.ReservationsModule = ReservationsModule;
exports.ReservationsModule = ReservationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([
                reservation_entity_1.ReservationEntity,
                table_entity_1.RestaurantTableEntity,
                shift_entity_1.ShiftEntity,
                customer_entity_1.CustomerEntity,
                waitlist_entry_entity_1.WaitlistEntryEntity,
            ]),
        ],
        controllers: [reservations_controller_1.ReservationsController],
        providers: [reservations_service_1.ReservationsService],
        exports: [reservations_service_1.ReservationsService],
    })
], ReservationsModule);
//# sourceMappingURL=reservations.module.js.map