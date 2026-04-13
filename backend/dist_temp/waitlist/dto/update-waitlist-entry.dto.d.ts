import { WaitlistStatus } from '../enums/waitlist-status.enum';
export declare class UpdateWaitlistEntryDto {
    status?: WaitlistStatus;
    position?: number;
    notes?: string;
}
