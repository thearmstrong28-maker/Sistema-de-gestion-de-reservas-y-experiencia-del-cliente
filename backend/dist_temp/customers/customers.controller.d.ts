import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(createCustomerDto: CreateCustomerDto): Promise<import("./entities/customer.entity").CustomerEntity>;
    update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<import("./entities/customer.entity").CustomerEntity>;
    remove(id: string): Promise<import("./entities/customer.entity").CustomerEntity>;
    getVisitHistory(id: string): Promise<import("../reservations/entities/reservation.entity").ReservationEntity[]>;
    list(query: ListCustomersQueryDto): Promise<import("./entities/customer.entity").CustomerEntity[]>;
    listWithMetrics(query: ListCustomersQueryDto): Promise<import("./customers.service").CustomerWithMetrics[]>;
}
