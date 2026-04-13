import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { ListWaitlistQueryDto } from './dto/list-waitlist.query';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { WaitlistService } from './waitlist.service';
export declare class WaitlistController {
    private readonly waitlistService;
    constructor(waitlistService: WaitlistService);
    create(createWaitlistEntryDto: CreateWaitlistEntryDto): Promise<import("./entities/waitlist-entry.entity").WaitlistEntryEntity>;
    list(query: ListWaitlistQueryDto): Promise<import("./entities/waitlist-entry.entity").WaitlistEntryEntity[]>;
    update(id: string, updateWaitlistEntryDto: UpdateWaitlistEntryDto): Promise<import("./entities/waitlist-entry.entity").WaitlistEntryEntity>;
}
