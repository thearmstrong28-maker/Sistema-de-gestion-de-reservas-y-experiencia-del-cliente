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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const daily_comparison_query_dto_1 = require("./dto/daily-comparison.query.dto");
const daily_occupancy_query_dto_1 = require("./dto/daily-occupancy.query.dto");
const daily_summary_query_dto_1 = require("./dto/daily-summary.query.dto");
const frequent_customers_query_dto_1 = require("./dto/frequent-customers.query.dto");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    dailySummary(request, query) {
        return this.reportsService.getDailySummary(request.user, query);
    }
    dailyComparison(request, query) {
        return this.reportsService.getDailyComparison(request.user, query);
    }
    dailyOccupancy(query) {
        return this.reportsService.getDailyOccupancy(query);
    }
    frequentCustomers(query) {
        return this.reportsService.getFrequentCustomers(query);
    }
    snapshots(request) {
        return this.reportsService.listSnapshots(request.user);
    }
    deleteSnapshot(request, id) {
        return this.reportsService.deleteSnapshot(request.user, id);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('daily-summary'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, daily_summary_query_dto_1.DailySummaryQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "dailySummary", null);
__decorate([
    (0, common_1.Get)('daily-comparison'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, daily_comparison_query_dto_1.DailyComparisonQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "dailyComparison", null);
__decorate([
    (0, common_1.Get)('daily-occupancy'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [daily_occupancy_query_dto_1.DailyOccupancyQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "dailyOccupancy", null);
__decorate([
    (0, common_1.Get)('frequent-customers'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [frequent_customers_query_dto_1.FrequentCustomersQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "frequentCustomers", null);
__decorate([
    (0, common_1.Get)('snapshots'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "snapshots", null);
__decorate([
    (0, common_1.Delete)('snapshots/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "deleteSnapshot", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Manager),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map