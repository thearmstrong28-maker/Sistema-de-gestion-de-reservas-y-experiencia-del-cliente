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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const reservation_entity_1 = require("../reservations/entities/reservation.entity");
const customer_entity_1 = require("./entities/customer.entity");
const waitlist_entry_entity_1 = require("../waitlist/entities/waitlist-entry.entity");
let CustomersService = class CustomersService {
    customerRepository;
    reservationRepository;
    waitlistEntryRepository;
    constructor(customerRepository, reservationRepository, waitlistEntryRepository) {
        this.customerRepository = customerRepository;
        this.reservationRepository = reservationRepository;
        this.waitlistEntryRepository = waitlistEntryRepository;
    }
    async create(createCustomerDto) {
        const fullName = createCustomerDto.fullName.trim();
        const email = this.normalizeEmail(createCustomerDto.email);
        const phone = this.normalizePhone(createCustomerDto.phone);
        this.ensureCustomerHasContactMethod(fullName, email, phone);
        await this.ensureCustomerDoesNotDuplicate({ email, phone });
        const customer = this.customerRepository.create({
            fullName,
            email,
            phone,
            preferences: createCustomerDto.preferences ?? {},
            notes: createCustomerDto.notes,
        });
        return this.customerRepository.save(customer);
    }
    async list(query) {
        const text = query.q?.trim();
        if (!text) {
            return this.customerRepository.find({
                order: { fullName: 'ASC', createdAt: 'DESC' },
                take: 100,
            });
        }
        const pattern = `%${text}%`;
        return this.customerRepository.find({
            where: [
                { fullName: (0, typeorm_2.ILike)(pattern) },
                { email: (0, typeorm_2.ILike)(pattern) },
                { phone: (0, typeorm_2.ILike)(pattern) },
            ],
            order: { fullName: 'ASC', createdAt: 'DESC' },
            take: 100,
        });
    }
    async update(customerId, updateCustomerDto) {
        const customer = await this.customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        customer.fullName = updateCustomerDto.fullName?.trim() ?? customer.fullName;
        customer.email =
            updateCustomerDto.email !== undefined
                ? this.normalizeEmail(updateCustomerDto.email)
                : customer.email;
        customer.phone =
            updateCustomerDto.phone !== undefined
                ? this.normalizePhone(updateCustomerDto.phone)
                : customer.phone;
        customer.preferences =
            updateCustomerDto.preferences ?? customer.preferences;
        customer.notes = updateCustomerDto.notes ?? customer.notes;
        this.ensureCustomerHasContactMethod(customer.fullName, customer.email ?? null, customer.phone ?? null);
        await this.ensureCustomerDoesNotDuplicate({
            email: customer.email ?? null,
            phone: customer.phone ?? null,
            customerIdToExclude: customer.id,
        });
        return this.customerRepository.save(customer);
    }
    async remove(customerId) {
        const customer = await this.customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        const [reservationsCount, waitlistEntriesCount] = await Promise.all([
            this.reservationRepository.count({ where: { customerId } }),
            this.waitlistEntryRepository.count({ where: { customerId } }),
        ]);
        if (reservationsCount > 0 || waitlistEntriesCount > 0 || customer.userId) {
            throw new common_1.BadRequestException('No se puede eliminar un cliente con reservas, lista de espera o usuario vinculado.');
        }
        await this.customerRepository.remove(customer);
        return customer;
    }
    async listWithMetrics(query) {
        const customers = await this.list(query);
        if (!customers.length) {
            return [];
        }
        const customerIds = customers.map((customer) => customer.id);
        const metricsRows = await this.reservationRepository
            .createQueryBuilder('reservation')
            .select('reservation.customerId', 'customerId')
            .addSelect('COUNT(reservation.id)::int', 'reservationsCount')
            .addSelect("SUM(CASE WHEN reservation.status IN ('SEATED', 'COMPLETED') THEN 1 ELSE 0 END)::int", 'attendedCount')
            .addSelect("SUM(CASE WHEN reservation.status = 'CANCELLED' THEN 1 ELSE 0 END)::int", 'cancelledCount')
            .addSelect("SUM(CASE WHEN reservation.status = 'NO_SHOW' THEN 1 ELSE 0 END)::int", 'noShowCount')
            .where('reservation.customerId IN (:...customerIds)', { customerIds })
            .groupBy('reservation.customerId')
            .getRawMany();
        const metricsByCustomer = new Map(metricsRows.map((row) => [row.customerId, row]));
        return customers.map((customer) => {
            const row = metricsByCustomer.get(customer.id);
            return {
                ...customer,
                reservationsCount: Number(row?.reservationsCount ?? 0),
                attendedCount: Number(row?.attendedCount ?? 0),
                cancelledCount: Number(row?.cancelledCount ?? 0),
                noShowCount: Number(row?.noShowCount ?? 0),
            };
        });
    }
    async getVisitHistory(customerId) {
        const customer = await this.customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return this.reservationRepository.find({
            where: { customerId },
            relations: { table: true, shift: true },
            order: { startsAt: 'DESC' },
            take: 200,
        });
    }
    normalizeEmail(email) {
        const normalized = email?.trim().toLowerCase();
        return normalized ? normalized : null;
    }
    normalizePhone(phone) {
        const normalized = phone?.trim();
        return normalized ? normalized : null;
    }
    ensureCustomerHasContactMethod(fullName, email, phone) {
        if (!fullName.trim()) {
            throw new common_1.BadRequestException('El nombre del cliente es obligatorio');
        }
        if (!email && !phone) {
            throw new common_1.BadRequestException('El cliente debe tener al menos un medio de contacto');
        }
    }
    async ensureCustomerDoesNotDuplicate({ email, phone, customerIdToExclude, }) {
        const where = [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
        ];
        if (!where.length) {
            return;
        }
        const matches = await this.customerRepository.find({
            where,
            select: { id: true, email: true, phone: true },
        });
        const conflictingCustomer = matches.find((customer) => customer.id !== customerIdToExclude);
        if (conflictingCustomer) {
            throw new common_1.ConflictException('Ya existe un cliente con ese correo o teléfono');
        }
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.CustomerEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(reservation_entity_1.ReservationEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(waitlist_entry_entity_1.WaitlistEntryEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CustomersService);
//# sourceMappingURL=customers.service.js.map