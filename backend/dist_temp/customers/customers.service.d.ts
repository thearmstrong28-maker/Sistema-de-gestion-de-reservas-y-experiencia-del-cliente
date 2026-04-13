import { Repository } from 'typeorm';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerEntity } from './entities/customer.entity';
import { WaitlistEntryEntity } from '../waitlist/entities/waitlist-entry.entity';
export interface CustomerWithMetrics extends CustomerEntity {
    reservationsCount: number;
    attendedCount: number;
    cancelledCount: number;
    noShowCount: number;
}
export declare class CustomersService {
    private readonly customerRepository;
    private readonly reservationRepository;
    private readonly waitlistEntryRepository;
    constructor(customerRepository: Repository<CustomerEntity>, reservationRepository: Repository<ReservationEntity>, waitlistEntryRepository: Repository<WaitlistEntryEntity>);
    create(createCustomerDto: CreateCustomerDto): Promise<CustomerEntity>;
    list(query: ListCustomersQueryDto): Promise<CustomerEntity[]>;
    update(customerId: string, updateCustomerDto: UpdateCustomerDto): Promise<CustomerEntity>;
    remove(customerId: string): Promise<CustomerEntity>;
    listWithMetrics(query: ListCustomersQueryDto): Promise<CustomerWithMetrics[]>;
    getVisitHistory(customerId: string): Promise<ReservationEntity[]>;
    private normalizeEmail;
    private normalizePhone;
    private ensureCustomerHasContactMethod;
    private ensureCustomerDoesNotDuplicate;
}
