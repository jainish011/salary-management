import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { Payslip } from './payslip.entity.js';
import { User } from './user.entity.js';

export enum PayrollPeriodStatus {
  OPEN = 'OPEN',
  PROCESSING = 'PROCESSING',
  LOCKED = 'LOCKED',
}

@Entity('payroll_periods')
@Index('idx_period_status', ['status'])
@Index('idx_period_date', ['year', 'month'])
export class PayrollPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_name', type: 'varchar', length: 50 })
  periodName: string;

  @Column({ name: 'fiscal_year', type: 'varchar', length: 10 })
  fiscalYear: string;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'pay_date', type: 'date', nullable: true })
  payDate: string | null;

  @Column({
    type: 'enum',
    enum: PayrollPeriodStatus,
    default: PayrollPeriodStatus.OPEN,
  })
  status: PayrollPeriodStatus;

  @Column({ name: 'total_employees', type: 'int', nullable: true })
  totalEmployees: number | null;

  @Column({ name: 'total_gross', type: 'numeric', precision: 16, scale: 2, nullable: true })
  totalGross: number | null;

  @Column({ name: 'total_net', type: 'numeric', precision: 16, scale: 2, nullable: true })
  totalNet: number | null;

  @Column({ name: 'total_pf', type: 'numeric', precision: 14, scale: 2, nullable: true })
  totalPf: number | null;

  @Column({ name: 'total_tds', type: 'numeric', precision: 14, scale: 2, nullable: true })
  totalTds: number | null;

  @Column({ name: 'run_at', type: 'timestamptz', nullable: true })
  runAt: Date | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: Relation<User> | null;

  @OneToMany(() => Payslip, (payslip) => payslip.period)
  payslips: Relation<Payslip>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
