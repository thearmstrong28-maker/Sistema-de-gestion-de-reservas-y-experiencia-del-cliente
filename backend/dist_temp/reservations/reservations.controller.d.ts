import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { AssignTableDto } from './dto/assign-table.dto';
import { ListReservationsQueryDto } from './dto/list-reservations.query';
import { ReservationsService } from './reservations.service';
export declare class ReservationsController {
    private readonly reservationsService;
    constructor(reservationsService: ReservationsService);
    create(createReservationDto: CreateReservationDto, request: Request & {
        user: AuthenticatedUser;
    }): Promise<import("./entities/reservation.entity").ReservationEntity>;
    update(id: string, updateReservationDto: UpdateReservationDto): Promise<import("./entities/reservation.entity").ReservationEntity>;
    updateStatus(id: string, updateReservationStatusDto: UpdateReservationStatusDto): Promise<import("./entities/reservation.entity").ReservationEntity>;
    cancel(id: string, cancelReservationDto: CancelReservationDto): Promise<import("./entities/reservation.entity").ReservationEntity>;
    noShow(id: string): Promise<import("./entities/reservation.entity").ReservationEntity>;
    assignTable(id: string, assignTableDto: AssignTableDto): Promise<import("./entities/reservation.entity").ReservationEntity>;
    availability(query: CheckAvailabilityDto): Promise<{
        shiftId: string;
        startsAt: Date;
        endsAt: Date;
        partySize: number;
        available: boolean;
        recommendedTableId: string | null;
        availableTables: Array<{
            id: string;
            tableNumber: number;
            capacity: number;
            area: string | null;
        }>;
    }>;
    tables(): Promise<import("./entities/table.entity").RestaurantTableEntity[]>;
    list(query: ListReservationsQueryDto): Promise<import("./entities/reservation.entity").ReservationEntity[]>;
}
