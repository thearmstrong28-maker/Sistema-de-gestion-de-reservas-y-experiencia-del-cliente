"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstablishmentModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const user_entity_1 = require("../auth/entities/user.entity");
const reservation_entity_1 = require("../reservations/entities/reservation.entity");
const table_entity_1 = require("../reservations/entities/table.entity");
const waitlist_entry_entity_1 = require("../waitlist/entities/waitlist-entry.entity");
const establishment_controller_1 = require("./establishment.controller");
const establishment_service_1 = require("./establishment.service");
let EstablishmentModule = class EstablishmentModule {
};
exports.EstablishmentModule = EstablishmentModule;
exports.EstablishmentModule = EstablishmentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.UserEntity,
                table_entity_1.RestaurantTableEntity,
                reservation_entity_1.ReservationEntity,
                waitlist_entry_entity_1.WaitlistEntryEntity,
            ]),
        ],
        controllers: [establishment_controller_1.EstablishmentController],
        providers: [establishment_service_1.EstablishmentService],
    })
], EstablishmentModule);
//# sourceMappingURL=establishment.module.js.map