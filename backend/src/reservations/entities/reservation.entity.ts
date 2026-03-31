import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReservationStatus } from '../enums/reservation-status.enum';

@Entity({ name: 'reservations' })
@Index(['tableId', 'startAt', 'endAt', 'status'])
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  customerName: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  customerRef?: string | null;

  @Column({ type: 'int' })
  partySize: number;

  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Column({ type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'timestamptz' })
  arrivalDeadlineAt: Date;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.Confirmed,
  })
  status: ReservationStatus;

  @Column({ type: 'uuid' })
  tableId: string;

  @Column({ type: 'varchar', length: 120 })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
