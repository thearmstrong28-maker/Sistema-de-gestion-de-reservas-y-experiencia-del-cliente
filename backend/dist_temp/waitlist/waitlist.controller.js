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
exports.WaitlistController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const create_waitlist_entry_dto_1 = require("./dto/create-waitlist-entry.dto");
const list_waitlist_query_1 = require("./dto/list-waitlist.query");
const update_waitlist_entry_dto_1 = require("./dto/update-waitlist-entry.dto");
const waitlist_service_1 = require("./waitlist.service");
let WaitlistController = class WaitlistController {
    waitlistService;
    constructor(waitlistService) {
        this.waitlistService = waitlistService;
    }
    create(createWaitlistEntryDto) {
        return this.waitlistService.create(createWaitlistEntryDto);
    }
    list(query) {
        return this.waitlistService.list(query);
    }
    update(id, updateWaitlistEntryDto) {
        return this.waitlistService.update(id, updateWaitlistEntryDto);
    }
};
exports.WaitlistController = WaitlistController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_waitlist_entry_dto_1.CreateWaitlistEntryDto]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_waitlist_query_1.ListWaitlistQueryDto]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_waitlist_entry_dto_1.UpdateWaitlistEntryDto]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "update", null);
exports.WaitlistController = WaitlistController = __decorate([
    (0, common_1.Controller)('waitlist'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.Admin, role_enum_1.Role.Host),
    __metadata("design:paramtypes", [waitlist_service_1.WaitlistService])
], WaitlistController);
//# sourceMappingURL=waitlist.controller.js.map