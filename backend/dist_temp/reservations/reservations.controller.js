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
exports.ReservationsController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const create_reservation_dto_1 = require("./dto/create-reservation.dto");
const cancel_reservation_dto_1 = require("./dto/cancel-reservation.dto");
const check_availability_dto_1 = require("./dto/check-availability.dto");
const update_reservation_status_dto_1 = require("./dto/update-reservation-status.dto");
const update_reservation_dto_1 = require("./dto/update-reservation.dto");
const assign_table_dto_1 = require("./dto/assign-table.dto");
const list_reservations_query_1 = require("./dto/list-reservations.query");
const reservations_service_1 = require("./reservations.service");
let ReservationsController = class ReservationsController {
    reservationsService;
    constructor(reservationsService) {
        this.reservationsService = reservationsService;
    }
    create(createReservationDto, request) {
        return this.reservationsService.create(createReservationDto, request.user.userId);
    }
    update(id, updateReservationDto) {
        return this.reservationsService.update(id, updateReservationDto);
    }
    updateStatus(id, updateReservationStatusDto) {
        return this.reservationsService.updateStatus(id, updateReservationStatusDto.status);
    }
    cancel(id, cancelReservationDto) {
        return this.reservationsService.cancel(id, cancelReservationDto?.reason);
    }
    noShow(id) {
        return this.reservationsService.markNoShow(id);
    }
    assignTable(id, assignTableDto) {
        return this.reservationsService.assignTable(id, assignTableDto);
    }
    availability(query) {
        return this.reservationsService.getAvailability(query);
    }
    tables() {
        return this.reservationsService.listTablesLayout();
    }
    list(query) {
        return this.reservationsService.list(query);
    }
};
exports.ReservationsController = ReservationsController;
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_reservation_dto_1.CreateReservationDto, Object]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "create", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_reservation_dto_1.UpdateReservationDto]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_reservation_status_dto_1.UpdateReservationStatusDto]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "updateStatus", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cancel_reservation_dto_1.CancelReservationDto]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "cancel", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    (0, common_1.Patch)(':id/no-show'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "noShow", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    (0, common_1.Patch)(':id/assign-table'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_table_dto_1.AssignTableDto]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "assignTable", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host, role_enum_1.Role.Manager),
    (0, common_1.Get)('availability'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [check_availability_dto_1.CheckAvailabilityDto]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "availability", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    (0, common_1.Get)('tables'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "tables", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host, role_enum_1.Role.Manager),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_reservations_query_1.ListReservationsQueryDto]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "list", null);
exports.ReservationsController = ReservationsController = __decorate([
    (0, common_1.Controller)('reservations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [reservations_service_1.ReservationsService])
], ReservationsController);
//# sourceMappingURL=reservations.controller.js.map