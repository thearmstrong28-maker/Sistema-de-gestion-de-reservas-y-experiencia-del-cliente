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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shift_entity_1 = require("./entities/shift.entity");
const shift_slot_1 = require("./shift-slot");
let ShiftsService = class ShiftsService {
    shiftRepository;
    constructor(shiftRepository) {
        this.shiftRepository = shiftRepository;
    }
    listActive() {
        return this.shiftRepository
            .find({
            where: { isActive: true },
            order: { shiftDate: 'ASC', startsAt: 'ASC' },
        })
            .then((shifts) => shifts.map((shift) => {
            const window = (0, shift_slot_1.getShiftWindow)(shift.shiftName);
            if (!window) {
                return shift;
            }
            return {
                ...shift,
                startsAt: window.startsAt,
                endsAt: window.endsAt,
            };
        }));
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shift_entity_1.ShiftEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ShiftsService);
//# sourceMappingURL=shifts.service.js.map