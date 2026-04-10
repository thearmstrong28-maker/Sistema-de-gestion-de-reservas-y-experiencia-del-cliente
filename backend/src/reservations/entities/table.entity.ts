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
import { TableCategory } from '../enums/table-category.enum';
import { TableAvailabilityStatus } from '../enums/table-availability-status.enum';

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

  @Column({
    name: 'category',
    type: 'enum',
    enum: TableCategory,
    enumName: 'table_category',
    default: TableCategory.Normal,
  })
  category: TableCategory;

  @Column({
    name: 'availability_status',
    type: 'enum',
    enum: TableAvailabilityStatus,
    default: TableAvailabilityStatus.Disponible,
  })
  availabilityStatus: TableAvailabilityStatus;

  @Column({ name: 'pos_x', type: 'int', nullable: true })
  posX?: number | null;

  @Column({ name: 'pos_y', type: 'int', nullable: true })
  posY?: number | null;

  @Column({ name: 'layout_label', type: 'text', nullable: true })
  layoutLabel?: string | null;

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
