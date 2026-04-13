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
exports.EstablishmentController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const create_tables_bulk_dto_1 = require("./dto/create-tables-bulk.dto");
const create_tables_distribution_dto_1 = require("./dto/create-tables-distribution.dto");
const update_table_availability_dto_1 = require("./dto/update-table-availability.dto");
const update_table_dto_1 = require("./dto/update-table.dto");
const establishment_service_1 = require("./establishment.service");
let EstablishmentController = class EstablishmentController {
    establishmentService;
    constructor(establishmentService) {
        this.establishmentService = establishmentService;
    }
    getSummary(request) {
        return this.establishmentService.getSummary(request.user);
    }
    listTables() {
        return this.establishmentService.listTables();
    }
    createTablesBulk(payload) {
        return this.establishmentService.createTablesBulk(payload);
    }
    createTablesDistribution(payload) {
        return this.establishmentService.createTablesDistribution(payload);
    }
    updateTableAvailability(id, payload) {
        return this.establishmentService.updateTableAvailability(id, payload);
    }
    updateTable(id, payload) {
        return this.establishmentService.updateTable(id, payload);
    }
    removeTable(id) {
        return this.establishmentService.deleteTable(id);
    }
};
exports.EstablishmentController = EstablishmentController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EstablishmentController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('tables'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EstablishmentController.prototype, "listTables", null);
__decorate([
    (0, common_1.Post)('tables/bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tables_bulk_dto_1.CreateTablesBulkDto]),
    __metadata("design:returntype", void 0)
], EstablishmentController.prototype, "createTablesBulk", null);
__decorate([
    (0, common_1.Post)('tables/distribution'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tables_distribution_dto_1.CreateTablesDistributionDto]),
    __metadata("design:returntype", void 0)
], EstablishmentController.prototype, "createTablesDistribution", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    (0, common_1.Patch)('tables/:id/availability'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_table_availability_dto_1.UpdateTableAvailabilityDto]),
    __metadata("design:returntype", void 0)
], EstablishmentController.prototype, "updateTableAvailability", null);
__decorate([
    (0, common_1.Patch)('tables/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_table_dto_1.UpdateTableDto]),
    __metadata("design:returntype", void 0)
], EstablishmentController.prototype, "updateTable", null);
__decorate([
    (0, common_1.Delete)('tables/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstablishmentController.prototype, "removeTable", null);
exports.EstablishmentController = EstablishmentController = __decorate([
    (0, common_1.Controller)('establishment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin),
    __metadata("design:paramtypes", [establishment_service_1.EstablishmentService])
], EstablishmentController);
//# sourceMappingURL=establishment.controller.js.map