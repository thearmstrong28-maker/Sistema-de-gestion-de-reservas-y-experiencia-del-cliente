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
exports.ReservationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("../customers/entities/customer.entity");
const shift_entity_1 = require("../shifts/entities/shift.entity");
const shift_slot_1 = require("../shifts/shift-slot");
const waitlist_entry_entity_1 = require("../waitlist/entities/waitlist-entry.entity");
const waitlist_status_enum_1 = require("../waitlist/enums/waitlist-status.enum");
const reservation_status_enum_1 = require("./enums/reservation-status.enum");
const reservation_entity_1 = require("./entities/reservation.entity");
const table_entity_1 = require("./entities/table.entity");
const table_availability_status_enum_1 = require("./enums/table-availability-status.enum");
let ReservationsService = class ReservationsService {
    reservationRepository;
    tableRepository;
    shiftRepository;
    customerRepository;
    waitlistRepository;
    configService;
    constructor(reservationRepository, tableRepository, shiftRepository, customerRepository, waitlistRepository, configService) {
        this.reservationRepository = reservationRepository;
        this.tableRepository = tableRepository;
        this.shiftRepository = shiftRepository;
        this.customerRepository = customerRepository;
        this.waitlistRepository = waitlistRepository;
        this.configService = configService;
    }
    async create(createReservationDto, createdByUserId) {
        await this.ensureCustomerExists(createReservationDto.customerId);
        const shift = await this.resolveShift(createReservationDto.shiftId, createReservationDto.turno, createReservationDto.startsAt);
        const { startsAt, endsAt, reservationDate } = this.resolveReservationTiming({
            startsAt: createReservationDto.startsAt,
            endsAt: createReservationDto.endsAt,
        });
        this.validateReservationWindow(startsAt);
        this.validateReservationAgainstShift(shift, startsAt, endsAt, reservationDate);
        await this.ensureUniqueActiveCustomerShiftReservation(createReservationDto.customerId, shift.id, reservationDate);
        const table = await this.resolveTableAssignment({
            shiftId: shift.id,
            partySize: createReservationDto.partySize,
            startsAt,
            endsAt,
            preferredTableId: createReservationDto.tableId,
            allowFallbackWhenPreferredUnavailable: true,
            returnNullWhenNoTableAvailable: true,
        });
        const reservation = this.reservationRepository.create({
            customerId: createReservationDto.customerId,
            tableId: table?.id ?? null,
            shiftId: shift.id,
            reservationDate,
            startsAt,
            endsAt,
            partySize: createReservationDto.partySize,
            specialRequests: createReservationDto.specialRequests,
            notes: createReservationDto.notes,
            status: table ? reservation_status_enum_1.ReservationStatus.Confirmed : reservation_status_enum_1.ReservationStatus.Pending,
            createdByUserId,
        });
        const savedReservation = await this.saveReservation(reservation);
        const waitlistEntry = await this.waitlistRepository.save(this.waitlistRepository.create({
            customerId: createReservationDto.customerId,
            requestedShiftId: shift.id,
            requestedDate: reservationDate,
            partySize: createReservationDto.partySize,
            notes: createReservationDto.notes ??
                createReservationDto.specialRequests ??
                null,
        }));
        if (table) {
            savedReservation.tableId = table.id;
            await this.saveReservationAndSyncTables(savedReservation, [table.id]);
            waitlistEntry.status = waitlist_status_enum_1.WaitlistStatus.Accepted;
            await this.waitlistRepository.save(waitlistEntry);
            return savedReservation;
        }
        return savedReservation;
    }
    async list(query) {
        const reservationDate = query.date
            ? query.date.toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        return this.reservationRepository.find({
            where: {
                reservationDate,
                ...(query.shiftId ? { shiftId: query.shiftId } : {}),
            },
            relations: { customer: true, table: true, shift: true },
            order: { startsAt: 'ASC', createdAt: 'ASC' },
        });
    }
    async listTablesLayout() {
        return this.tableRepository.find({
            where: { isActive: true },
            order: { posY: 'ASC', posX: 'ASC', tableNumber: 'ASC' },
        });
    }
    async update(id, updateReservationDto) {
        const reservation = await this.getReservationOrThrow(id);
        if (!reservation_status_enum_1.ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
            throw new common_1.BadRequestException('Only active reservations can be updated');
        }
        if (updateReservationDto.customerId) {
            await this.ensureCustomerExists(updateReservationDto.customerId);
        }
        const shift = await this.resolveShift(updateReservationDto.turno
            ? updateReservationDto.shiftId
            : (updateReservationDto.shiftId ?? reservation.shiftId), updateReservationDto.turno, updateReservationDto.startsAt ?? reservation.startsAt);
        const durationMs = reservation.endsAt.getTime() - reservation.startsAt.getTime();
        const { startsAt, endsAt, reservationDate } = this.resolveReservationTiming({
            startsAt: updateReservationDto.startsAt ?? reservation.startsAt,
            endsAt: updateReservationDto.endsAt ??
                (updateReservationDto.startsAt
                    ? new Date(updateReservationDto.startsAt.getTime() + durationMs)
                    : reservation.endsAt),
        });
        this.validateReservationWindow(startsAt);
        this.validateReservationAgainstShift(shift, startsAt, endsAt, reservationDate);
        await this.ensureUniqueActiveCustomerShiftReservation(updateReservationDto.customerId ?? reservation.customerId, shift.id, reservationDate, reservation.id);
        const previousTableId = reservation.tableId;
        const table = await this.resolveTableAssignment({
            shiftId: shift.id,
            partySize: updateReservationDto.partySize ?? reservation.partySize,
            startsAt,
            endsAt,
            preferredTableId: updateReservationDto.tableId === undefined
                ? (reservation.tableId ?? undefined)
                : updateReservationDto.tableId,
            allowFallbackWhenPreferredUnavailable: updateReservationDto.tableId === undefined,
            reservationIdToExclude: reservation.id,
        });
        reservation.customerId =
            updateReservationDto.customerId ?? reservation.customerId;
        reservation.shiftId = shift.id;
        reservation.reservationDate = reservationDate;
        reservation.startsAt = startsAt;
        reservation.endsAt = endsAt;
        reservation.partySize =
            updateReservationDto.partySize ?? reservation.partySize;
        reservation.tableId = table?.id ?? null;
        reservation.specialRequests =
            updateReservationDto.specialRequests ?? reservation.specialRequests;
        reservation.notes = updateReservationDto.notes ?? reservation.notes;
        return this.saveReservationAndSyncTables(reservation, [
            previousTableId,
            reservation.tableId,
        ]);
    }
    async cancel(id, reason) {
        const reservation = await this.getReservationOrThrow(id);
        this.assertReservationIsActiveForStatusChange(reservation);
        reservation.cancellationReason = this.normalizeCancellationReason(reason);
        reservation.status = reservation_status_enum_1.ReservationStatus.Cancelled;
        return this.saveReservationAndSyncTables(reservation, [
            reservation.tableId,
        ]);
    }
    async markNoShow(id) {
        const reservation = await this.getReservationOrThrow(id);
        this.assertReservationIsActiveForStatusChange(reservation);
        this.assertNoShowGracePeriodElapsed(reservation);
        reservation.status = reservation_status_enum_1.ReservationStatus.NoShow;
        return this.saveReservationAndSyncTables(reservation, [
            reservation.tableId,
        ]);
    }
    async updateStatus(id, status) {
        const reservation = await this.getReservationOrThrow(id);
        this.assertReservationIsActiveForStatusChange(reservation);
        reservation.status = status;
        return this.saveReservationAndSyncTables(reservation, [
            reservation.tableId,
        ]);
    }
    async assignTable(id, assignTableDto) {
        const reservation = await this.getReservationOrThrow(id);
        if (!reservation_status_enum_1.ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
            throw new common_1.BadRequestException('Only active reservations can be assigned');
        }
        const previousTableId = reservation.tableId;
        const table = await this.resolveTableAssignment({
            shiftId: reservation.shiftId,
            partySize: reservation.partySize,
            startsAt: reservation.startsAt,
            endsAt: reservation.endsAt,
            preferredTableId: assignTableDto.tableId,
            allowFallbackWhenPreferredUnavailable: !assignTableDto.tableId,
            reservationIdToExclude: reservation.id,
        });
        reservation.tableId = table?.id ?? null;
        return this.saveReservationAndSyncTables(reservation, [
            previousTableId,
            reservation.tableId,
        ]);
    }
    async getAvailability(query) {
        const shift = await this.resolveShift(query.shiftId, query.turno, query.startsAt);
        const { startsAt, endsAt, reservationDate } = this.resolveReservationTiming({
            startsAt: query.startsAt,
            endsAt: query.endsAt,
        });
        this.validateReservationWindow(startsAt);
        this.validateReservationAgainstShift(shift, startsAt, endsAt, reservationDate);
        const tables = await this.tableRepository.find({
            where: {
                isActive: true,
                capacity: (0, typeorm_2.MoreThan)(query.partySize - 1),
            },
            order: { capacity: 'ASC', tableNumber: 'ASC', id: 'ASC' },
        });
        const availableTables = [];
        for (const table of tables) {
            const occupied = await this.isTableOccupied(table.id, startsAt, endsAt, undefined, shift.id);
            if (!occupied) {
                availableTables.push({
                    id: table.id,
                    tableNumber: table.tableNumber,
                    capacity: table.capacity,
                    area: table.area ?? null,
                });
            }
        }
        return {
            shiftId: shift.id,
            startsAt,
            endsAt,
            partySize: query.partySize,
            available: availableTables.length > 0,
            recommendedTableId: availableTables[0]?.id ?? null,
            availableTables,
        };
    }
    resolveReservationTiming({ startsAt, endsAt, }) {
        const defaultDurationMinutes = this.getNumberConfig('RESERVATION_DEFAULT_DURATION_MINUTES', 90);
        const normalizedStart = new Date(startsAt);
        const normalizedEnd = endsAt
            ? new Date(endsAt)
            : new Date(normalizedStart.getTime() + defaultDurationMinutes * 60_000);
        if (Number.isNaN(normalizedStart.getTime())) {
            throw new common_1.BadRequestException('Invalid startsAt value');
        }
        if (Number.isNaN(normalizedEnd.getTime())) {
            throw new common_1.BadRequestException('Invalid endsAt value');
        }
        if (normalizedEnd <= normalizedStart) {
            throw new common_1.BadRequestException('Reservation end must be after start');
        }
        const reservationDate = (0, shift_slot_1.formatLocalDateKey)(normalizedStart);
        return {
            startsAt: normalizedStart,
            endsAt: normalizedEnd,
            reservationDate,
        };
    }
    async resolveShift(shiftId, turno, startsAt) {
        if (shiftId) {
            return this.getShiftOrThrow(shiftId);
        }
        if (!turno) {
            throw new common_1.BadRequestException('ShiftId or turno is required');
        }
        const reservationDate = (0, shift_slot_1.formatLocalDateKey)(startsAt);
        const shiftName = (0, shift_slot_1.buildShiftName)(reservationDate, turno);
        const window = shift_slot_1.SHIFT_SLOT_WINDOWS[turno];
        const existing = await this.shiftRepository.findOne({
            where: { shiftName },
        });
        if (existing) {
            const shouldNormalize = existing.shiftDate !== reservationDate ||
                existing.startsAt !== window.startsAt ||
                existing.endsAt !== window.endsAt ||
                !existing.isActive;
            if (shouldNormalize) {
                existing.isActive = true;
                existing.shiftDate = reservationDate;
                existing.startsAt = window.startsAt;
                existing.endsAt = window.endsAt;
                return this.shiftRepository.save(existing);
            }
            return existing;
        }
        const created = this.shiftRepository.create({
            shiftName,
            shiftDate: reservationDate,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            isActive: true,
        });
        return this.shiftRepository.save(created);
    }
    validateReservationWindow(startsAt) {
        const now = new Date();
        const maxDaysAhead = this.getNumberConfig('RESERVATION_MAX_DAYS_AHEAD', 30);
        const reservationDate = (0, shift_slot_1.formatLocalDateKey)(startsAt);
        const today = (0, shift_slot_1.formatLocalDateKey)(now);
        const latestAllowed = new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60_000);
        if (reservationDate < today) {
            throw new common_1.BadRequestException('Reservation start is outside allowed window');
        }
        if (startsAt > latestAllowed) {
            throw new common_1.BadRequestException('Reservation exceeds max days ahead window');
        }
    }
    assertNoShowGracePeriodElapsed(reservation) {
        const graceMinutes = this.getNumberConfig('RESERVATION_NO_SHOW_GRACE_MINUTES', 15);
        const eligibleAt = new Date(reservation.startsAt.getTime() + graceMinutes * 60_000);
        if (new Date() < eligibleAt) {
            throw new common_1.BadRequestException(`La ausencia solo se puede marcar luego de ${graceMinutes} minutos de gracia`);
        }
    }
    validateReservationAgainstShift(shift, startsAt, endsAt, reservationDate) {
        if (reservationDate !== shift.shiftDate) {
            throw new common_1.BadRequestException('Reservation date must match shift date');
        }
        const startTime = (0, shift_slot_1.formatLocalTimeKey)(startsAt);
        const endTime = (0, shift_slot_1.formatLocalTimeKey)(endsAt);
        const shiftSlot = (0, shift_slot_1.extractShiftSlot)(shift.shiftName);
        const shiftWindow = shiftSlot
            ? shift_slot_1.SHIFT_SLOT_WINDOWS[shiftSlot]
            : {
                startsAt: `${shift.startsAt}:00`.slice(0, 8),
                endsAt: `${shift.endsAt}:00`.slice(0, 8),
            };
        if (startTime < shiftWindow.startsAt || endTime > shiftWindow.endsAt) {
            throw new common_1.BadRequestException('La reserva debe caer dentro del horario del turno (06:00-14:00 o 14:00-22:00)');
        }
    }
    async resolveTableAssignment({ shiftId, partySize, startsAt, endsAt, preferredTableId, allowFallbackWhenPreferredUnavailable, reservationIdToExclude, returnNullWhenNoTableAvailable = false, }) {
        if (preferredTableId) {
            const preferred = await this.tableRepository.findOne({
                where: { id: preferredTableId, isActive: true },
            });
            if (!preferred) {
                throw new common_1.NotFoundException('Requested table not found or inactive');
            }
            const preferredIsValid = preferred.capacity >= partySize &&
                !(await this.isTableOccupied(preferred.id, startsAt, endsAt, reservationIdToExclude, shiftId));
            if (preferredIsValid) {
                return preferred;
            }
            if (!allowFallbackWhenPreferredUnavailable) {
                throw new common_1.ConflictException('Requested table is not available for this slot');
            }
        }
        const candidates = await this.tableRepository.find({
            where: {
                isActive: true,
                capacity: (0, typeorm_2.MoreThan)(partySize - 1),
            },
            order: {
                capacity: 'ASC',
                tableNumber: 'ASC',
                id: 'ASC',
            },
        });
        for (const table of candidates) {
            const occupied = await this.isTableOccupied(table.id, startsAt, endsAt, reservationIdToExclude, shiftId);
            if (!occupied) {
                return table;
            }
        }
        if (returnNullWhenNoTableAvailable) {
            return null;
        }
        throw new common_1.ConflictException('No available table matches the requested slot');
    }
    async isTableOccupied(tableId, startsAt, endsAt, reservationIdToExclude, shiftId) {
        const where = {
            tableId,
            startsAt: (0, typeorm_2.LessThan)(endsAt),
            endsAt: (0, typeorm_2.MoreThan)(startsAt),
            status: (0, typeorm_2.In)(reservation_status_enum_1.ACTIVE_RESERVATION_STATUSES),
        };
        if (shiftId) {
            where.shiftId = shiftId;
        }
        if (reservationIdToExclude) {
            where.id = (0, typeorm_2.Not)(reservationIdToExclude);
        }
        const count = await this.reservationRepository.count({ where });
        return count > 0;
    }
    async ensureUniqueActiveCustomerShiftReservation(customerId, shiftId, reservationDate, reservationIdToExclude) {
        const where = {
            customerId,
            shiftId,
            reservationDate,
            status: (0, typeorm_2.In)(reservation_status_enum_1.ACTIVE_RESERVATION_STATUSES),
        };
        if (reservationIdToExclude) {
            where.id = (0, typeorm_2.Not)(reservationIdToExclude);
        }
        const existing = await this.reservationRepository.findOne({ where });
        if (existing) {
            throw new common_1.ConflictException('Customer already has an active reservation for this shift and date');
        }
    }
    async getReservationOrThrow(id) {
        const reservation = await this.reservationRepository.findOne({
            where: { id },
        });
        if (!reservation) {
            throw new common_1.NotFoundException('Reservation not found');
        }
        return reservation;
    }
    assertReservationIsActiveForStatusChange(reservation) {
        if (!reservation_status_enum_1.ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
            throw new common_1.BadRequestException('Only active reservations can change status');
        }
    }
    async getShiftOrThrow(id) {
        const shift = await this.shiftRepository.findOne({
            where: { id, isActive: true },
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found or inactive');
        }
        return shift;
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
    async saveReservation(reservation) {
        try {
            return await this.reservationRepository.save(reservation);
        }
        catch (error) {
            if (this.isPostgresConstraintError(error, '23505')) {
                throw new common_1.ConflictException('Reservation conflicts with existing data');
            }
            if (this.isPostgresConstraintError(error, '23P01')) {
                throw new common_1.ConflictException('Table is already occupied in that time slot');
            }
            throw error;
        }
    }
    normalizeCancellationReason(reason) {
        const normalizedReason = reason?.trim();
        return normalizedReason ? normalizedReason : 'Sin motivo especificado';
    }
    async saveReservationAndSyncTables(reservation, tableIdsToSync) {
        const saved = await this.saveReservation(reservation);
        await this.syncTableAvailability(tableIdsToSync);
        return saved;
    }
    async syncTableAvailability(tableIdsToSync) {
        const uniqueTableIds = [...new Set(tableIdsToSync)].filter((tableId) => Boolean(tableId));
        for (const tableId of uniqueTableIds) {
            const table = await this.tableRepository.findOne({
                where: { id: tableId, isActive: true },
            });
            if (!table) {
                continue;
            }
            const activeReservationCount = await this.reservationRepository.count({
                where: {
                    tableId,
                    status: (0, typeorm_2.In)(reservation_status_enum_1.ACTIVE_RESERVATION_STATUSES),
                },
            });
            const nextStatus = activeReservationCount > 0
                ? table_availability_status_enum_1.TableAvailabilityStatus.Ocupada
                : table_availability_status_enum_1.TableAvailabilityStatus.Disponible;
            if (table.availabilityStatus !== nextStatus) {
                table.availabilityStatus = nextStatus;
                await this.tableRepository.save(table);
            }
        }
    }
    getNumberConfig(key, fallback) {
        const raw = this.configService.get(key, fallback);
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    isPostgresConstraintError(error, code) {
        if (typeof error !== 'object' || error === null) {
            return false;
        }
        const maybe = error;
        return maybe.code === code || maybe.driverError?.code === code;
    }
};
exports.ReservationsService = ReservationsService;
exports.ReservationsService = ReservationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(reservation_entity_1.ReservationEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(table_entity_1.RestaurantTableEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(shift_entity_1.ShiftEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(customer_entity_1.CustomerEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(waitlist_entry_entity_1.WaitlistEntryEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService])
], ReservationsService);
//# sourceMappingURL=reservations.service.js.map