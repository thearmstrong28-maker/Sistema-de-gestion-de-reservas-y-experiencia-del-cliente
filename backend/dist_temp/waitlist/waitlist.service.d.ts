import { Repository } from 'typeorm';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ShiftEntity } from '../shifts/entities/shift.entity';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { ListWaitlistQueryDto } from './dto/list-waitlist.query';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { WaitlistEntryEntity } from './entities/waitlist-entry.entity';
export declare class WaitlistService {
    private readonly waitlistRepository;
    private readonly customerRepository;
    private readonly shiftRepository;
    constructor(waitlistRepository: Repository<WaitlistEntryEntity>, customerRepository: Repository<CustomerEntity>, shiftRepository: Repository<ShiftEntity>);
    create(createWaitlistEntryDto: CreateWaitlistEntryDto): Promise<WaitlistEntryEntity>;
    list(query: ListWaitlistQueryDto): Promise<WaitlistEntryEntity[]>;
    update(id: string, updateWaitlistEntryDto: UpdateWaitlistEntryDto): Promise<WaitlistEntryEntity>;
    private ensureCustomerExists;
    private resolveShift;
    private getNextPosition;
    private findExistingWaitingEntry;
    private saveWaitlistEntry;
    private isPostgresConstraintError;
}
