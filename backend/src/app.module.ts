import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import {
  User,
  Department,
  Employee,
  SalaryStructure,
  PayrollPeriod,
  Payslip,
  PayslipItem,
  AuditLog,
} from './entities/index.js';
import { AuthModule } from './auth/auth.module.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AuditModule } from './audit/audit.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'jainish'),
        database: configService.get<string>('DB_NAME', 'acme_salary'),
        entities: [
          User,
          Department,
          Employee,
          SalaryStructure,
          PayrollPeriod,
          Payslip,
          PayslipItem,
          AuditLog,
        ],
        autoLoadEntities: true,
        synchronize: true,
        extra: {
          max: 20,
          min: 5,
          idleTimeoutMillis: 30000,
        },
      }),
    }),
    AuthModule,
    DepartmentsModule,
    EmployeesModule,
    PayrollModule,
    ReportsModule,
    AuditModule,
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
