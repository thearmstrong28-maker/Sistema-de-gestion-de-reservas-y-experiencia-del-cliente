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
exports.CreateTablesDistributionDto = exports.TableDistributionItemDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const table_category_enum_1 = require("../../reservations/enums/table-category.enum");
class TableDistributionItemDto {
    tableNumber;
    capacity;
    posX;
    posY;
    category;
    layoutLabel;
}
exports.TableDistributionItemDto = TableDistributionItemDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'El número de mesa debe ser un número entero.' }),
    (0, class_validator_1.Min)(1, { message: 'El número de mesa debe ser al menos 1.' }),
    __metadata("design:type", Number)
], TableDistributionItemDto.prototype, "tableNumber", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'La capacidad debe ser un número entero.' }),
    (0, class_validator_1.Min)(1, { message: 'La capacidad debe ser al menos 1.' }),
    __metadata("design:type", Number)
], TableDistributionItemDto.prototype, "capacity", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'La posición X debe ser un número entero.' }),
    __metadata("design:type", Number)
], TableDistributionItemDto.prototype, "posX", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'La posición Y debe ser un número entero.' }),
    __metadata("design:type", Number)
], TableDistributionItemDto.prototype, "posY", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(table_category_enum_1.TableCategory, {
        message: 'La categoría seleccionada no es válida.',
    }),
    __metadata("design:type", String)
], TableDistributionItemDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'La etiqueta de sector debe ser texto.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'La etiqueta de sector no puede estar vacía.' }),
    (0, class_validator_1.MaxLength)(60, {
        message: 'La etiqueta de sector no puede superar 60 caracteres.',
    }),
    __metadata("design:type", String)
], TableDistributionItemDto.prototype, "layoutLabel", void 0);
class CreateTablesDistributionDto {
    tables;
}
exports.CreateTablesDistributionDto = CreateTablesDistributionDto;
__decorate([
    (0, class_validator_1.IsArray)({ message: 'Debés enviar una lista de mesas.' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TableDistributionItemDto),
    __metadata("design:type", Array)
], CreateTablesDistributionDto.prototype, "tables", void 0);
//# sourceMappingURL=create-tables-distribution.dto.js.map