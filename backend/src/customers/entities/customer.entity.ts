import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { ReservationEntity } from '../../reservations/entities/reservation.entity';
import { WaitlistEntryEntity } from '../../waitlist/entities/waitlist-entry.entity';

@Entity({ name: 'customers' })
@Index(['email'], { unique: true })
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true })
  userId?: string | null;

  @OneToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  preferences: Record<string, unknown>;

  @Column({ name: 'visit_count', type: 'int', default: 0 })
  visitCount: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => ReservationEntity, (reservation) => reservation.customer)
  reservations?: ReservationEntity[];

  @OneToMany(() => WaitlistEntryEntity, (entry) => entry.customer)
  waitlistEntries?: WaitlistEntryEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
