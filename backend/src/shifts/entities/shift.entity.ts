import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReservationEntity } from '../../reservations/entities/reservation.entity';
import { WaitlistEntryEntity } from '../../waitlist/entities/waitlist-entry.entity';

@Entity({ name: 'shifts' })
@Index(['shiftName'], { unique: true })
export class ShiftEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shift_name', type: 'text' })
  shiftName: string;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: string;

  @Column({ name: 'starts_at', type: 'time' })
  startsAt: string;

  @Column({ name: 'ends_at', type: 'time' })
  endsAt: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => ReservationEntity, (reservation) => reservation.shift)
  reservations?: ReservationEntity[];

  @OneToMany(() => WaitlistEntryEntity, (entry) => entry.requestedShift)
  waitlistEntries?: WaitlistEntryEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
