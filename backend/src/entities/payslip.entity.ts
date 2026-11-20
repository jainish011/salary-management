import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
  type Relation,
} from 'typeorm';
import { Employee } from './employee.entity.js';
import { PayrollPeriod } from './payroll-period.entity.js';
import { SalaryStructure } from './salary-structure.entity.js';
import { PayslipItem } from './payslip-item.entity.js';

@Entity('payslips')
@Unique(['employeeId', 'periodId'])
@Index('idx_payslip_period', ['periodId'])
@Index('idx_payslip_employee', ['employeeId'])
@Index('idx_payslip_period_emp', ['periodId', 'employeeId'])
export class Payslip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, (emp) => emp.payslips, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee: Relation<Employee>;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @ManyToOne(() => PayrollPeriod, (period) => period.payslips, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: Relation<PayrollPeriod>;

  // Snapshotted financial summaries
  @Column({ name: 'gross_earnings', type: 'numeric', precision: 12, scale: 2 })
  grossEarnings: number;

  @Column({ name: 'total_deductions', type: 'numeric', precision: 12, scale: 2 })
  totalDeductions: number;

  @Column({ name: 'net_pay', type: 'numeric', precision: 12, scale: 2 })
  netPay: number;

  // Deduction breakdown snapshot
  @Column({ name: 'employee_pf', type: 'numeric', precision: 10, scale: 2, default: 0 })
  employeePf: number;

  @Column({ name: 'employee_esi', type: 'numeric', precision: 10, scale: 2, default: 0 })
  employeeEsi: number;

  @Column({ name: 'professional_tax', type: 'numeric', precision: 8, scale: 2, default: 0 })
  professionalTax: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  tds: number;

  // Employer contributions snapshot (for CTC review)
  @Column({ name: 'employer_pf', type: 'numeric', precision: 10, scale: 2, default: 0 })
  employerPf: number;

  @Column({ name: 'gratuity_prov', type: 'numeric', precision: 10, scale: 2, default: 0 })
  gratuityProv: number;

  @Column({ name: 'monthly_ctc', type: 'numeric', precision: 12, scale: 2, nullable: true })
  monthlyCtc: number | null;

  @Column({ name: 'salary_structure_id', type: 'uuid', nullable: true })
  salaryStructureId: string | null;

  @ManyToOne(() => SalaryStructure, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'salary_structure_id' })
  salaryStructure: Relation<SalaryStructure> | null;

  @OneToMany(() => PayslipItem, (item) => item.payslip, { cascade: true })
  items: Relation<PayslipItem>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
