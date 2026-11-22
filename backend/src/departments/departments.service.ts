import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';

export interface DepartmentWithStats extends Department {
  headcount: number;
  avgMonthlyCtc: number;
  totalMonthlyCtc: number;
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async findAll(): Promise<DepartmentWithStats[]> {
    const rawData = await this.departmentRepository
      .createQueryBuilder('dept')
      .leftJoin(
        'dept.employees',
        'emp',
        'emp.employmentStatus = :status',
        { status: 'ACTIVE' },
      )
      .leftJoin(
        'emp.salaryStructures',
        'ss',
        'ss.effectiveTo IS NULL',
      )
      .select([
        'dept.id AS id',
        'dept.name AS name',
        'dept.description AS description',
        'dept.createdAt AS "createdAt"',
        'dept.updatedAt AS "updatedAt"',
        'COUNT(DISTINCT CASE WHEN emp.employmentStatus = :status THEN emp.id END) AS headcount',
        'COALESCE(AVG(CASE WHEN emp.employmentStatus = :status THEN ss.monthlyCtc END), 0) AS "avgMonthlyCtc"',
        'COALESCE(SUM(CASE WHEN emp.employmentStatus = :status THEN ss.monthlyCtc END), 0) AS "totalMonthlyCtc"',
      ])
      .groupBy('dept.id')
      .addGroupBy('dept.name')
      .addGroupBy('dept.description')
      .addGroupBy('dept.createdAt')
      .addGroupBy('dept.updatedAt')
      .orderBy('dept.name', 'ASC')
      .getRawMany();

    return rawData.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      employees: [],
      headcount: parseInt(row.headcount, 10) || 0,
      avgMonthlyCtc: Math.round(parseFloat(row.avgMonthlyCtc) || 0),
      totalMonthlyCtc: Math.round(parseFloat(row.totalMonthlyCtc) || 0),
    }));
  }

  async findOne(id: string): Promise<Department> {
    const dept = await this.departmentRepository.findOne({
      where: { id },
    });

    if (!dept) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    return dept;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.departmentRepository.findOne({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Department with name "${dto.name}" already exists`,
      );
    }

    const dept = this.departmentRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
    });

    return this.departmentRepository.save(dept);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.findOne(id);

    if (dto.name && dto.name.trim() !== dept.name) {
      const conflict = await this.departmentRepository.findOne({
        where: { name: dto.name.trim() },
      });

      if (conflict) {
        throw new ConflictException(
          `Department with name "${dto.name}" already exists`,
        );
      }

      dept.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      dept.description = dto.description?.trim() ?? null;
    }

    return this.departmentRepository.save(dept);
  }
}
