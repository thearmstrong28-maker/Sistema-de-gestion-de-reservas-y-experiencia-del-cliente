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
exports.FrequentCustomersQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class FrequentCustomersQueryDto {
    date;
    shiftId;
    minVisits;
    limit;
}
exports.FrequentCustomersQueryDto = FrequentCustomersQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)({ message: 'La fecha no es válida.' }),
    __metadata("design:type", Date)
], FrequentCustomersQueryDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], FrequentCustomersQueryDto.prototype, "shiftId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'El mínimo de visitas debe ser un número entero.' }),
    (0, class_validator_1.Min)(1, { message: 'El mínimo de visitas debe ser al menos 1.' }),
    __metadata("design:type", Number)
], FrequentCustomersQueryDto.prototype, "minVisits", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'El límite debe ser un número entero.' }),
    (0, class_validator_1.Min)(1, { message: 'El límite debe ser al menos 1.' }),
    __metadata("design:type", Number)
], FrequentCustomersQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=frequent-customers.query.dto.js.map