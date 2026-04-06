import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReservationEntity } from './reservation.entity';

@Entity({ name: 'restaurant_tables' })
@Index(['tableNumber'], { unique: true })
export class RestaurantTableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'table_number', type: 'int' })
  tableNumber: number;

  @Column({ type: 'text', nullable: true })
  area?: string | null;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => ReservationEntity, (reservation) => reservation.table)
  reservations?: ReservationEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

export { RestaurantTableEntity as TableEntity };
