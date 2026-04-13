import { ShiftsService } from './shifts.service';
export declare class ShiftsController {
    private readonly shiftsService;
    constructor(shiftsService: ShiftsService);
    list(): Promise<import("./entities/shift.entity").ShiftEntity[]>;
}
