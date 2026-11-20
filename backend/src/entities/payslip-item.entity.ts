import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { Payslip } from './payslip.entity.js';

export enum PayslipItemType {
  EARNING = 'EARNING',
  DEDUCTION = 'DEDUCTION',
  EMPLOYER_CONTRIB = 'EMPLOYER_CONTRIB',
}

@Entity('payslip_items')
@Index('idx_items_payslip', ['payslipId'])
export class PayslipItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payslip_id', type: 'uuid' })
  payslipId: string;

  @ManyToOne(() => Payslip, (payslip) => payslip.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payslip_id' })
  payslip: Relation<Payslip>;

  @Column({
    name: 'item_type',
    type: 'enum',
    enum: PayslipItemType,
  })
  itemType: PayslipItemType;

  @Column({ name: 'item_name', type: 'varchar', length: 100 })
  itemName: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
