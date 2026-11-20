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
import { Employee } from './employee.entity.js';
import { User } from './user.entity.js';

export enum RevisionReason {
  JOINING = 'JOINING',
  PROMOTION = 'PROMOTION',
  APPRAISAL = 'APPRAISAL',
  CORRECTION = 'CORRECTION',
  MARKET_CORRECTION = 'MARKET_CORRECTION',
}

@Entity('salary_structures')
@Index('idx_sal_emp_effective', ['employeeId', 'effectiveFrom'])
export class SalaryStructure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, (emp) => emp.salaryStructures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Relation<Employee>;

  @Column({ name: 'annual_ctc', type: 'numeric', precision: 14, scale: 2 })
  annualCtc: number;

  @Column({ name: 'monthly_ctc', type: 'numeric', precision: 12, scale: 2 })
  monthlyCtc: number;

  // Monthly Earnings Breakdown
  @Column({ name: 'basic_monthly', type: 'numeric', precision: 10, scale: 2 })
  basicMonthly: number;

  @Column({ name: 'hra_monthly', type: 'numeric', precision: 10, scale: 2 })
  hraMonthly: number;

  @Column({ name: 'lta_monthly', type: 'numeric', precision: 10, scale: 2, default: 0 })
  ltaMonthly: number;

  @Column({ name: 'special_allowance', type: 'numeric', precision: 10, scale: 2, default: 0 })
  specialAllowance: number;

  @Column({ name: 'other_allowances', type: 'numeric', precision: 10, scale: 2, default: 0 })
  otherAllowances: number;

  // Employer Contributions (part of CTC, not in hand)
  @Column({ name: 'employer_pf_monthly', type: 'numeric', precision: 10, scale: 2, default: 0 })
  employerPfMonthly: number;

  @Column({ name: 'gratuity_monthly', type: 'numeric', precision: 10, scale: 2, default: 0 })
  gratuityMonthly: number;

  // SCD Type 2 fields
  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({
    name: 'revision_reason',
    type: 'enum',
    enum: RevisionReason,
    default: RevisionReason.JOINING,
  })
  revisionReason: RevisionReason;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: Relation<User> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
