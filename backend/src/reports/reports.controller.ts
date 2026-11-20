import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.reportsService.getDashboard();
  }

  @Get('department-summary')
  async getDepartmentSummary() {
    return this.reportsService.getDepartmentSummary();
  }

  @Get('salary-distribution')
  async getSalaryDistribution() {
    return this.reportsService.getSalaryDistribution();
  }

  @Get('payroll-trend')
  async getPayrollTrend(@Query('months') months?: string) {
    const limit = months ? parseInt(months, 10) : 6;
    return this.reportsService.getPayrollTrend(limit);
  }

  @Get('grade-summary')
  async getGradeSummary() {
    return this.reportsService.getGradeSummary();
  }

  @Get('headcount-by-city')
  async getHeadcountByCity() {
    return this.reportsService.getHeadcountByCity();
  }

  @Get('export')
  async exportCsv(@Res() res: Response) {
    const csvData = await this.reportsService.exportEmployeesCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="employees-salary-report.csv"',
    );
    return res.status(200).send(csvData);
  }
}
