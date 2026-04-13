import { Repository } from 'typeorm';
import { ShiftEntity } from './entities/shift.entity';
export declare class ShiftsService {
    private readonly shiftRepository;
    constructor(shiftRepository: Repository<ShiftEntity>);
    listActive(): Promise<ShiftEntity[]>;
}
