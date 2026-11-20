import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { Department } from './department.entity.js';
import { SalaryStructure } from './salary-structure.entity.js';
import { Payslip } from './payslip.entity.js';

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
}

export enum TaxRegime {
  OLD = 'OLD',
  NEW = 'NEW',
}

@Entity('employees')
@Index('idx_emp_dept_status_grade', ['departmentId', 'employmentStatus', 'grade'])
@Index('idx_emp_state', ['workState'])
@Index('idx_emp_city', ['workCity'])
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_code', type: 'varchar', unique: true, length: 20 })
  employeeCode: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', unique: true, length: 255 })
  email: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string;

  @Column({ name: 'pan_number', type: 'varchar', length: 20, nullable: true })
  panNumber: string;

  @Column({ name: 'uan_number', type: 'varchar', length: 30, nullable: true })
  uanNumber: string;

  @Column({ name: 'date_of_joining', type: 'date' })
  dateOfJoining: string;

  @Column({ name: 'date_of_leaving', type: 'date', nullable: true })
  dateOfLeaving: string | null;

  @Column({
    name: 'employment_status',
    type: 'enum',
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
  })
  employmentStatus: EmploymentStatus;

  @Column({
    name: 'employment_type',
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  employmentType: EmploymentType;

  @Column({ type: 'varchar', length: 150, nullable: true })
  designation: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  grade: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, (dept) => dept.employees, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Relation<Department>;

  @Column({ name: 'work_city', type: 'varchar', length: 100, nullable: true })
  workCity: string;

  @Column({ name: 'work_state', type: 'varchar', length: 100, nullable: true })
  workState: string;

  @Column({
    name: 'tax_regime',
    type: 'enum',
    enum: TaxRegime,
    default: TaxRegime.NEW,
  })
  taxRegime: TaxRegime;

  @OneToMany(() => SalaryStructure, (salary) => salary.employee)
  salaryStructures: Relation<SalaryStructure>[];

  @OneToMany(() => Payslip, (payslip) => payslip.employee)
  payslips: Relation<Payslip>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
