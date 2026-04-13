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
exports.EstablishmentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const role_enum_1 = require("../auth/enums/role.enum");
const reservation_entity_1 = require("../reservations/entities/reservation.entity");
const table_entity_1 = require("../reservations/entities/table.entity");
const table_category_enum_1 = require("../reservations/enums/table-category.enum");
const table_availability_status_enum_1 = require("../reservations/enums/table-availability-status.enum");
const reservation_status_enum_1 = require("../reservations/enums/reservation-status.enum");
const shift_slot_1 = require("../shifts/shift-slot");
const shift_entity_1 = require("../shifts/entities/shift.entity");
const user_entity_1 = require("../auth/entities/user.entity");
const waitlist_entry_entity_1 = require("../waitlist/entities/waitlist-entry.entity");
const waitlist_status_enum_1 = require("../waitlist/enums/waitlist-status.enum");
let EstablishmentService = class EstablishmentService {
    userRepository;
    tableRepository;
    reservationRepository;
    dataSource;
    constructor(userRepository, tableRepository, reservationRepository, dataSource) {
        this.userRepository = userRepository;
        this.tableRepository = tableRepository;
        this.reservationRepository = reservationRepository;
        this.dataSource = dataSource;
    }
    async getSummary(admin) {
        const restaurantName = this.resolveRestaurantName(admin);
        const scopedRoles = [role_enum_1.Role.Customer, role_enum_1.Role.Host, role_enum_1.Role.Manager];
        const [usersCount, activeUsersCount, customerUsersCount, internalUsersCount, tablesCount, activeTablesCount, reservationsCount,] = await Promise.all([
            this.userRepository.count({
                where: { restaurantName, role: (0, typeorm_2.In)(scopedRoles) },
            }),
            this.userRepository.count({
                where: { restaurantName, isActive: true, role: (0, typeorm_2.In)(scopedRoles) },
            }),
            this.userRepository.count({
                where: { restaurantName, role: role_enum_1.Role.Customer },
            }),
            this.userRepository.count({
                where: { restaurantName, role: (0, typeorm_2.In)([role_enum_1.Role.Host, role_enum_1.Role.Manager]) },
            }),
            this.tableRepository.count(),
            this.tableRepository.count({ where: { isActive: true } }),
            this.reservationRepository.count(),
        ]);
        return {
            restaurantName,
            usersCount,
            activeUsersCount,
            customerUsersCount,
            internalUsersCount,
            tablesCount,
            activeTablesCount,
            reservationsCount,
        };
    }
    async listTables() {
        return this.tableRepository.find({
            where: { isActive: true },
            order: { posY: 'ASC', posX: 'ASC', tableNumber: 'ASC' },
        });
    }
    async updateTableAvailability(id, payload) {
        return this.dataSource.transaction(async (manager) => {
            const tableRepository = manager.getRepository(table_entity_1.RestaurantTableEntity);
            const table = await tableRepository
                .createQueryBuilder('table')
                .setLock('pessimistic_write')
                .where('table.id = :id', { id })
                .andWhere('table.isActive = true')
                .getOne();
            if (!table) {
                throw new common_1.NotFoundException('La mesa no existe');
            }
            table.availabilityStatus = payload.availabilityStatus;
            if (payload.availabilityStatus === table_availability_status_enum_1.TableAvailabilityStatus.Disponible) {
                const promoted = await this.promoteWaitlistEntryIfEligible(manager, table);
                if (promoted) {
                    table.availabilityStatus = table_availability_status_enum_1.TableAvailabilityStatus.Ocupada;
                }
            }
            return tableRepository.save(table);
        });
    }
    async updateTable(id, payload) {
        if (payload.capacity === undefined &&
            payload.availabilityStatus === undefined &&
            payload.category === undefined) {
            throw new common_1.BadRequestException('Debés enviar al menos un dato para actualizar la mesa');
        }
        const table = await this.tableRepository.findOne({
            where: { id, isActive: true },
        });
        if (!table) {
            throw new common_1.NotFoundException('La mesa no existe');
        }
        if (payload.capacity !== undefined) {
            if (payload.capacity < 1) {
                throw new common_1.BadRequestException('La capacidad debe ser al menos 1');
            }
            table.capacity = payload.capacity;
        }
        if (payload.availabilityStatus !== undefined) {
            table.availabilityStatus = payload.availabilityStatus;
        }
        if (payload.category !== undefined) {
            table.category = payload.category;
        }
        return this.tableRepository.save(table);
    }
    async deleteTable(id) {
        const table = await this.tableRepository.findOne({
            where: { id, isActive: true },
        });
        if (!table) {
            throw new common_1.NotFoundException('La mesa no existe');
        }
        table.isActive = false;
        table.availabilityStatus = table_availability_status_enum_1.TableAvailabilityStatus.Disponible;
        return this.tableRepository.save(table);
    }
    async createTablesBulk(payload) {
        if (payload.quantity < 1) {
            throw new common_1.BadRequestException('La cantidad debe ser al menos 1');
        }
        const capacity = payload.capacity ?? 2;
        const category = payload.category ?? table_category_enum_1.TableCategory.Normal;
        return this.dataSource.transaction(async (manager) => {
            await manager.query('SELECT pg_advisory_xact_lock($1)', [914_202_601]);
            const maxTableRows = (await manager.query('SELECT COALESCE(MAX(table_number), 0) AS "maxTableNumber" FROM restaurant_tables'));
            const startNumber = Number(maxTableRows[0]?.maxTableNumber ?? 0) + 1;
            const tables = Array.from({ length: payload.quantity }, (_, index) => manager.create(table_entity_1.RestaurantTableEntity, {
                tableNumber: startNumber + index,
                capacity,
                category,
                availabilityStatus: table_availability_status_enum_1.TableAvailabilityStatus.Disponible,
                posX: (index % 6) * 120,
                posY: Math.floor(index / 6) * 120,
                layoutLabel: 'Principal',
                isActive: true,
            }));
            return manager.getRepository(table_entity_1.RestaurantTableEntity).save(tables);
        });
    }
    async createTablesDistribution(payload) {
        if (!payload.tables.length) {
            throw new common_1.BadRequestException('Debés incluir al menos una mesa en la distribución');
        }
        this.validateDistribution(payload.tables);
        await this.dataSource.transaction(async (manager) => {
            for (const table of payload.tables) {
                await manager.query(`
            INSERT INTO restaurant_tables (table_number, capacity, pos_x, pos_y, layout_label, category, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT (table_number)
            DO UPDATE SET
              capacity = EXCLUDED.capacity,
              pos_x = EXCLUDED.pos_x,
              pos_y = EXCLUDED.pos_y,
              category = EXCLUDED.category,
              layout_label = EXCLUDED.layout_label,
              is_active = true,
              updated_at = NOW()
          `, [
                    table.tableNumber,
                    table.capacity,
                    table.posX,
                    table.posY,
                    table.layoutLabel?.trim() || null,
                    table.category ?? table_category_enum_1.TableCategory.Normal,
                ]);
            }
        });
        return this.listTables();
    }
    resolveRestaurantName(admin) {
        return admin.restaurantName?.trim() || 'Restaurante principal';
    }
    validateDistribution(tables) {
        const tableNumbers = new Set();
        const coordinates = new Set();
        for (const table of tables) {
            if (tableNumbers.has(table.tableNumber)) {
                throw new common_1.BadRequestException(`La mesa ${table.tableNumber} está repetida en la distribución`);
            }
            tableNumbers.add(table.tableNumber);
            const coordinateKey = `${table.posX}:${table.posY}`;
            if (coordinates.has(coordinateKey)) {
                throw new common_1.BadRequestException(`Hay dos mesas con la misma posición (${table.posX}, ${table.posY})`);
            }
            coordinates.add(coordinateKey);
        }
    }
    async promoteWaitlistEntryIfEligible(manager, table) {
        const now = new Date();
        const currentSlot = this.resolveCurrentSlot(now);
        if (!currentSlot) {
            return false;
        }
        const reservationDate = (0, shift_slot_1.formatLocalDateKey)(now);
        const shiftName = (0, shift_slot_1.buildShiftName)(reservationDate, currentSlot);
        const shiftRepository = manager.getRepository(shift_entity_1.ShiftEntity);
        const shift = await shiftRepository.findOne({
            where: { shiftName, isActive: true },
        });
        if (!shift) {
            return false;
        }
        const shiftSlot = (0, shift_slot_1.extractShiftSlot)(shift.shiftName);
        const shiftWindow = shiftSlot
            ? shift_slot_1.SHIFT_SLOT_WINDOWS[shiftSlot]
            : {
                startsAt: shift.startsAt,
                endsAt: shift.endsAt,
            };
        const shiftStart = (0, shift_slot_1.createLocalDateTime)(reservationDate, shiftWindow.startsAt);
        const shiftEnd = (0, shift_slot_1.createLocalDateTime)(reservationDate, shiftWindow.endsAt);
        const startsAt = now > shiftStart ? now : shiftStart;
        const defaultDurationMinutes = 90;
        const endsAt = new Date(Math.min(shiftEnd.getTime(), startsAt.getTime() + defaultDurationMinutes * 60_000));
        if (endsAt <= startsAt) {
            return false;
        }
        const waitlistRepository = manager.getRepository(waitlist_entry_entity_1.WaitlistEntryEntity);
        const reservationRepository = manager.getRepository(reservation_entity_1.ReservationEntity);
        const candidates = await waitlistRepository
            .createQueryBuilder('waitlist')
            .setLock('pessimistic_write')
            .where('waitlist.requestedDate = :reservationDate', { reservationDate })
            .andWhere('waitlist.requestedShiftId = :shiftId', { shiftId: shift.id })
            .andWhere('waitlist.partySize <= :tableCapacity', {
            tableCapacity: table.capacity,
        })
            .andWhere('waitlist.status IN (:...statuses)', {
            statuses: waitlist_status_enum_1.ACTIVE_WAITLIST_STATUSES,
        })
            .orderBy('waitlist.position', 'ASC', 'NULLS LAST')
            .addOrderBy('waitlist.createdAt', 'ASC')
            .addOrderBy('waitlist.id', 'ASC')
            .getMany();
        for (const candidate of candidates) {
            const existingReservation = await reservationRepository.findOne({
                where: {
                    customerId: candidate.customerId,
                    shiftId: shift.id,
                    reservationDate,
                    status: (0, typeorm_2.In)(reservation_status_enum_1.ACTIVE_RESERVATION_STATUSES),
                },
            });
            if (existingReservation &&
                existingReservation.tableId &&
                existingReservation.tableId !== table.id) {
                continue;
            }
            if (existingReservation) {
                existingReservation.tableId = table.id;
                await reservationRepository.save(existingReservation);
            }
            else {
                const createdReservation = reservationRepository.create({
                    customerId: candidate.customerId,
                    tableId: table.id,
                    shiftId: shift.id,
                    reservationDate,
                    startsAt,
                    endsAt,
                    partySize: candidate.partySize,
                    status: reservation_status_enum_1.ReservationStatus.Confirmed,
                    notes: candidate.notes ?? null,
                    specialRequests: null,
                    createdByUserId: null,
                });
                await reservationRepository.save(createdReservation);
            }
            candidate.status = waitlist_status_enum_1.WaitlistStatus.Accepted;
            await waitlistRepository.save(candidate);
            return true;
        }
        return false;
    }
    resolveCurrentSlot(now) {
        const currentTime = (0, shift_slot_1.formatLocalTimeKey)(now);
        if (currentTime >= shift_slot_1.SHIFT_SLOT_WINDOWS.matutino.startsAt &&
            currentTime < shift_slot_1.SHIFT_SLOT_WINDOWS.matutino.endsAt) {
            return 'matutino';
        }
        if (currentTime >= shift_slot_1.SHIFT_SLOT_WINDOWS.vespertino.startsAt &&
            currentTime < shift_slot_1.SHIFT_SLOT_WINDOWS.vespertino.endsAt) {
            return 'vespertino';
        }
        return null;
    }
};
exports.EstablishmentService = EstablishmentService;
exports.EstablishmentService = EstablishmentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(table_entity_1.RestaurantTableEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(reservation_entity_1.ReservationEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], EstablishmentService);
//# sourceMappingURL=establishment.service.js.map