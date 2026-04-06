import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerEntity } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerEntity> {
    const customer = this.customerRepository.create({
      fullName: createCustomerDto.fullName.trim(),
      email: createCustomerDto.email?.trim().toLowerCase(),
      phone: createCustomerDto.phone,
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
        ? updateCustomerDto.email.trim().toLowerCase()
        : customer.email;
    customer.phone = updateCustomerDto.phone ?? customer.phone;
    customer.preferences =
      updateCustomerDto.preferences ?? customer.preferences;
    customer.notes = updateCustomerDto.notes ?? customer.notes;

    return this.customerRepository.save(customer);
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
}
