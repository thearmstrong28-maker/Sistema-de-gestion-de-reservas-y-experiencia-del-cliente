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
exports.WaitlistService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("../customers/entities/customer.entity");
const shift_entity_1 = require("../shifts/entities/shift.entity");
const shift_slot_1 = require("../shifts/shift-slot");
const waitlist_entry_entity_1 = require("./entities/waitlist-entry.entity");
const waitlist_status_enum_1 = require("./enums/waitlist-status.enum");
let WaitlistService = class WaitlistService {
    waitlistRepository;
    customerRepository;
    shiftRepository;
    constructor(waitlistRepository, customerRepository, shiftRepository) {
        this.waitlistRepository = waitlistRepository;
        this.customerRepository = customerRepository;
        this.shiftRepository = shiftRepository;
    }
    async create(createWaitlistEntryDto) {
        await this.ensureCustomerExists(createWaitlistEntryDto.customerId);
        const requestedShift = await this.resolveShift(createWaitlistEntryDto.requestedShiftId, createWaitlistEntryDto.turno, createWaitlistEntryDto.requestedDate);
        const requestedDate = createWaitlistEntryDto.requestedDate
            .toISOString()
            .slice(0, 10);
        const existingEntry = await this.findExistingWaitingEntry(createWaitlistEntryDto.customerId, requestedDate, requestedShift?.id ?? null);
        if (existingEntry) {
            return existingEntry;
        }
        const position = createWaitlistEntryDto.position ??
            (await this.getNextPosition(requestedDate, requestedShift?.id));
        const entry = this.waitlistRepository.create({
            customerId: createWaitlistEntryDto.customerId,
            requestedShiftId: requestedShift?.id ?? null,
            requestedDate,
            partySize: createWaitlistEntryDto.partySize,
            notes: createWaitlistEntryDto.notes,
            position,
        });
        return this.saveWaitlistEntry(entry, createWaitlistEntryDto.customerId, requestedDate, requestedShift?.id ?? null);
    }
    async list(query) {
        const requestedDate = query.date?.toISOString().slice(0, 10);
        return this.waitlistRepository.find({
            where: {
                ...(requestedDate ? { requestedDate } : {}),
                ...(query.shiftId ? { requestedShiftId: query.shiftId } : {}),
                status: (0, typeorm_2.In)(waitlist_status_enum_1.ACTIVE_WAITLIST_STATUSES),
            },
            relations: { customer: true, requestedShift: true },
            order: {
                position: 'ASC',
                createdAt: 'ASC',
                id: 'ASC',
            },
        });
    }
    async update(id, updateWaitlistEntryDto) {
        const entry = await this.waitlistRepository.findOne({ where: { id } });
        if (!entry) {
            throw new common_1.NotFoundException('Waitlist entry not found');
        }
        entry.status = updateWaitlistEntryDto.status ?? entry.status;
        entry.position = updateWaitlistEntryDto.position ?? entry.position;
        entry.notes = updateWaitlistEntryDto.notes ?? entry.notes;
        return this.waitlistRepository.save(entry);
    }
    async ensureCustomerExists(customerId) {
        const customer = await this.customerRepository.findOne({
            where: { id: customerId },
            select: { id: true },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
    }
    async resolveShift(shiftId, turno, requestedDate) {
        if (shiftId) {
            const shift = await this.shiftRepository.findOne({
                where: { id: shiftId, isActive: true },
            });
            if (!shift) {
                throw new common_1.NotFoundException('Shift not found or inactive');
            }
            return shift;
        }
        if (!turno) {
            return null;
        }
        const shiftDate = requestedDate.toISOString().slice(0, 10);
        const shiftName = (0, shift_slot_1.buildShiftName)(shiftDate, turno);
        const window = shift_slot_1.SHIFT_SLOT_WINDOWS[turno];
        const existing = await this.shiftRepository.findOne({
            where: { shiftName },
        });
        if (existing) {
            const existingSlot = (0, shift_slot_1.extractShiftSlot)(existing.shiftName);
            const existingWindow = existingSlot
                ? shift_slot_1.SHIFT_SLOT_WINDOWS[existingSlot]
                : window;
            const shouldNormalize = existing.shiftDate !== shiftDate ||
                existing.startsAt !== existingWindow.startsAt ||
                existing.endsAt !== existingWindow.endsAt ||
                !existing.isActive;
            if (shouldNormalize) {
                existing.isActive = true;
                existing.shiftDate = shiftDate;
                existing.startsAt = existingWindow.startsAt;
                existing.endsAt = existingWindow.endsAt;
                return this.shiftRepository.save(existing);
            }
            return existing;
        }
        return this.shiftRepository.save(this.shiftRepository.create({
            shiftName,
            shiftDate,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            isActive: true,
        }));
    }
    async getNextPosition(requestedDate, requestedShiftId) {
        const rows = await this.waitlistRepository
            .createQueryBuilder('w')
            .select('COALESCE(MAX(w.position), 0)', 'maxPosition')
            .where('w.requested_date = :requestedDate', { requestedDate })
            .andWhere(requestedShiftId
            ? 'w.requested_shift_id = :requestedShiftId'
            : 'w.requested_shift_id IS NULL', { requestedShiftId })
            .andWhere('w.status IN (:...statuses)', {
            statuses: waitlist_status_enum_1.ACTIVE_WAITLIST_STATUSES,
        })
            .getRawOne();
        return Number(rows?.maxPosition ?? 0) + 1;
    }
    async findExistingWaitingEntry(customerId, requestedDate, requestedShiftId) {
        const requestedShiftWhere = requestedShiftId === null ? (0, typeorm_2.IsNull)() : requestedShiftId;
        return this.waitlistRepository.findOne({
            where: {
                customerId,
                requestedDate,
                requestedShiftId: requestedShiftWhere,
                status: waitlist_status_enum_1.WaitlistStatus.Waiting,
            },
        });
    }
    async saveWaitlistEntry(entry, customerId, requestedDate, requestedShiftId) {
        try {
            return await this.waitlistRepository.save(entry);
        }
        catch (error) {
            if (this.isPostgresConstraintError(error, '23505')) {
                const fallback = await this.findExistingWaitingEntry(customerId, requestedDate, requestedShiftId);
                if (fallback) {
                    return fallback;
                }
            }
            throw error;
        }
    }
    isPostgresConstraintError(error, code) {
        if (typeof error !== 'object' || error === null) {
            return false;
        }
        const maybe = error;
        return maybe.code === code || maybe.driverError?.code === code;
    }
};
exports.WaitlistService = WaitlistService;
exports.WaitlistService = WaitlistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(waitlist_entry_entity_1.WaitlistEntryEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(customer_entity_1.CustomerEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(shift_entity_1.ShiftEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], WaitlistService);
//# sourceMappingURL=waitlist.service.js.map