import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { ShiftEntity } from '../../shifts/entities/shift.entity';
import { WaitlistStatus } from '../enums/waitlist-status.enum';

@Entity({ name: 'waitlist_entries' })
@Index(['requestedDate', 'requestedShiftId', 'status'])
export class WaitlistEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, (customer) => customer.waitlistEntries, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity;

  @Column({ name: 'requested_shift_id', type: 'uuid', nullable: true })
  requestedShiftId?: string | null;

  @ManyToOne(() => ShiftEntity, (shift) => shift.waitlistEntries, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'requested_shift_id' })
  requestedShift?: ShiftEntity | null;

  @Column({ name: 'requested_date', type: 'date' })
  requestedDate: string;

  @Column({ name: 'party_size', type: 'int' })
  partySize: number;

  @Column({
    type: 'enum',
    enum: WaitlistStatus,
    enumName: 'waitlist_status',
    default: WaitlistStatus.Waiting,
  })
  status: WaitlistStatus;

  @Column({ type: 'int', nullable: true })
  position?: number | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
