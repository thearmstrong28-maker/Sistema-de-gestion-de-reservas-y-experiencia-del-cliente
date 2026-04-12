import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerEntity } from './entities/customer.entity';

export interface CustomerWithMetrics extends CustomerEntity {
  reservationsCount: number;
  attendedCount: number;
  cancelledCount: number;
  noShowCount: number;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerEntity> {
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

  async list(query: ListCustomersQueryDto): Promise<CustomerEntity[]> {
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
        { fullName: ILike(pattern) },
        { email: ILike(pattern) },
        { phone: ILike(pattern) },
      ],
      order: { fullName: 'ASC', createdAt: 'DESC' },
      take: 100,
    });
  }

  async update(
    customerId: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
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

    this.ensureCustomerHasContactMethod(
      customer.fullName,
      customer.email ?? null,
      customer.phone ?? null,
    );
    await this.ensureCustomerDoesNotDuplicate({
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      customerIdToExclude: customer.id,
    });

    return this.customerRepository.save(customer);
  }

  async listWithMetrics(
    query: ListCustomersQueryDto,
  ): Promise<CustomerWithMetrics[]> {
    const customers = await this.list(query);
    if (!customers.length) {
      return [];
    }

    const customerIds = customers.map((customer) => customer.id);
    const metricsRows: Array<{
      customerId: string;
      reservationsCount: string;
      attendedCount: string;
      cancelledCount: string;
      noShowCount: string;
    }> = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('reservation.customerId', 'customerId')
      .addSelect('COUNT(reservation.id)::int', 'reservationsCount')
      .addSelect(
        "SUM(CASE WHEN reservation.status IN ('SEATED', 'COMPLETED') THEN 1 ELSE 0 END)::int",
        'attendedCount',
      )
      .addSelect(
        "SUM(CASE WHEN reservation.status = 'CANCELLED' THEN 1 ELSE 0 END)::int",
        'cancelledCount',
      )
      .addSelect(
        "SUM(CASE WHEN reservation.status = 'NO_SHOW' THEN 1 ELSE 0 END)::int",
        'noShowCount',
      )
      .where('reservation.customerId IN (:...customerIds)', { customerIds })
      .groupBy('reservation.customerId')
      .getRawMany();

    const metricsByCustomer = new Map(
      metricsRows.map((row) => [row.customerId, row]),
    );

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

  async getVisitHistory(customerId: string): Promise<ReservationEntity[]> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.reservationRepository.find({
      where: { customerId },
      relations: { table: true, shift: true },
      order: { startsAt: 'DESC' },
      take: 200,
    });
  }

  private normalizeEmail(email?: string): string | null {
    const normalized = email?.trim().toLowerCase();
    return normalized ? normalized : null;
  }

  private normalizePhone(phone?: string): string | null {
    const normalized = phone?.trim();
    return normalized ? normalized : null;
  }

  private ensureCustomerHasContactMethod(
    fullName: string,
    email: string | null,
    phone: string | null,
  ): void {
    if (!fullName.trim()) {
      throw new BadRequestException('El nombre del cliente es obligatorio');
    }

    if (!email && !phone) {
      throw new BadRequestException(
        'El cliente debe tener al menos un medio de contacto',
      );
    }
  }

  private async ensureCustomerDoesNotDuplicate({
    email,
    phone,
    customerIdToExclude,
  }: {
    email: string | null;
    phone: string | null;
    customerIdToExclude?: string;
  }): Promise<void> {
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

    const conflictingCustomer = matches.find(
      (customer) => customer.id !== customerIdToExclude,
    );

    if (conflictingCustomer) {
      throw new ConflictException(
        'Ya existe un cliente con ese correo o teléfono',
      );
    }
  }
}
