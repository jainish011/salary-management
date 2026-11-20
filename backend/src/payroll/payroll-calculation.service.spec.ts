import { describe, it, expect, beforeEach } from 'vitest';
import { PayrollCalculationService } from './payroll-calculation.service.js';
import { EmploymentStatus, TaxRegime } from '../entities/employee.entity.js';
import { PayslipItemType } from '../entities/payslip-item.entity.js';

describe('PayrollCalculationService', () => {
  let service: PayrollCalculationService;

  beforeEach(() => {
    service = new PayrollCalculationService();
  });

  describe('Professional Tax (PT)', () => {
    it('should calculate PT = ₹0 for employee in Delhi (any salary)', () => {
      const pt = service.calculateProfessionalTax('Delhi', 'MALE', 80000, 5);
      expect(pt).toBe(0);
    });

    it('should calculate PT = ₹200 for Karnataka employee earning ₹30,000 in March', () => {
      const pt = service.calculateProfessionalTax('Karnataka', 'MALE', 30000, 3);
      expect(pt).toBe(200);
    });

    it('should calculate PT = ₹300 for Karnataka employee earning ₹30,000 in February', () => {
      const pt = service.calculateProfessionalTax('Karnataka', 'MALE', 30000, 2);
      expect(pt).toBe(300);
    });

    it('should calculate PT = ₹0 for Maharashtra female employee earning ₹20,000', () => {
      const pt = service.calculateProfessionalTax('Maharashtra', 'FEMALE', 20000, 6);
      expect(pt).toBe(0);
    });

    it('should calculate PT = ₹175 for Maharashtra male employee earning ₹9,000', () => {
      const pt = service.calculateProfessionalTax('Maharashtra', 'MALE', 9000, 6);
      expect(pt).toBe(175);
    });
  });

  describe('TDS Calculations', () => {
    it('should calculate TDS = ₹0 for New Regime employee with annual CTC ₹7,00,000 (87A rebate applies)', () => {
      const result = service.calculateTaxNewRegime(700000);
      expect(result.annualTax).toBe(0);
      expect(result.monthlyTds).toBe(0);
    });

    it('should calculate TDS correctly for New Regime employee with annual CTC ₹10,00,000', () => {
      const result = service.calculateTaxNewRegime(1000000);
      // Taxable: 9,25,000
      // 0 - 3L: 0
      // 3L - 7L (4L @ 5%): 20,000
      // 7L - 9.25L (2.25L @ 10%): 22,500
      // Total tax: 42,500 + 4% cess (1,700) = 44,200
      // Monthly TDS: round(44,200 / 12) = 3683
      expect(result.annualTax).toBe(44200);
      expect(result.monthlyTds).toBe(3683);
    });

    it('should calculate TDS correctly for Old Regime employee with annual CTC ₹10,00,000', () => {
      // Annual Basic = 400,000 (monthly 33,333), HRA = 200,000 (monthly 16,667)
      const result = service.calculateTaxOldRegime(1000000, 33333, 16667, 'Bengaluru');
      // Standard deduction = 50,000, 80C = 150,000
      // Assumed rent paid = 50% * 400,000 = 200,000
      // HRA exemption = min(200k, 200k - 40k = 160k, 200k) = 160,000
      // Total deductions = 260,000
      // Taxable = 1,000,000 - 360,000 = 640,000
      // Slabs: 0-2.5L: 0, 2.5L-5L: 12,500, 5L-6.4L (1.4L @ 20%): 28,000 => 40,500 + 4% (1,620) = 42,120
      // Monthly TDS = 42,120 / 12 = 3510
      expect(result.annualTax).toBe(42120);
      expect(result.monthlyTds).toBe(3510);
    });
  });

  describe('Statutory Contributions & End-to-End Calculation', () => {
    it('should deduct ESI for employee with Gross ₹18,000', () => {
      const mockEmployee: any = {
        workState: 'Delhi',
        gender: 'MALE',
        workCity: 'Delhi',
        taxRegime: TaxRegime.NEW,
      };
      const mockSalary: any = {
        annualCtc: 240000,
        basicMonthly: 12000,
        hraMonthly: 4800,
        ltaMonthly: 0,
        specialAllowance: 1200,
        otherAllowances: 0,
      };

      const result = service.calculateForEmployee(mockEmployee, mockSalary, { month: 4, year: 2024 });

      expect(result.grossEarnings).toBe(18000);
      // ESI: 18,000 * 0.0075 = 135
      expect(result.employeeEsi).toBe(135);
      expect(result.employerEsi).toBe(585); // 18,000 * 0.0325 = 585
    });

    it('should have ESI = ₹0 for employee with Gross ₹25,000', () => {
      const mockEmployee: any = {
        workState: 'Delhi',
        gender: 'MALE',
        workCity: 'Delhi',
        taxRegime: TaxRegime.NEW,
      };
      const mockSalary: any = {
        annualCtc: 360000,
        basicMonthly: 15000,
        hraMonthly: 6000,
        ltaMonthly: 0,
        specialAllowance: 4000,
        otherAllowances: 0,
      };

      const result = service.calculateForEmployee(mockEmployee, mockSalary, { month: 4, year: 2024 });

      expect(result.grossEarnings).toBe(25000);
      expect(result.employeeEsi).toBe(0);
      expect(result.employerEsi).toBe(0);
    });

    it('should cap PF at ₹15,000 Basic wage ceiling', () => {
      const mockEmployee: any = {
        workState: 'Delhi',
        gender: 'MALE',
        workCity: 'Delhi',
        taxRegime: TaxRegime.NEW,
      };
      const mockSalary: any = {
        annualCtc: 1200000,
        basicMonthly: 40000, // Higher than 15,000 ceiling
        hraMonthly: 20000,
        ltaMonthly: 1670,
        specialAllowance: 34506,
        otherAllowances: 0,
      };

      const result = service.calculateForEmployee(mockEmployee, mockSalary, { month: 4, year: 2024 });

      // Capped at 15,000 * 0.12 = 1,800
      expect(result.employeePf).toBe(1800);
      expect(result.employerPf).toBe(1800);
    });

    it('should calculate Net Pay = Gross − all deductions (end-to-end calculation)', () => {
      const mockEmployee: any = {
        workState: 'Karnataka',
        gender: 'MALE',
        workCity: 'Bengaluru',
        taxRegime: TaxRegime.NEW,
      };
      const mockSalary: any = {
        annualCtc: 1000000,
        basicMonthly: 33333,
        hraMonthly: 16667,
        ltaMonthly: 1392,
        specialAllowance: 27991,
        otherAllowances: 0,
      };

      const result = service.calculateForEmployee(mockEmployee, mockSalary, { month: 5, year: 2024 });

      expect(result.totalDeductions).toBe(
        result.employeePf + result.employeeEsi + result.professionalTax + result.tds,
      );
      expect(result.netPay).toBe(result.grossEarnings - result.totalDeductions);
    });

    it('should verify payslip line items count and sort order are correct', () => {
      const mockEmployee: any = {
        workState: 'Karnataka',
        gender: 'MALE',
        workCity: 'Bengaluru',
        taxRegime: TaxRegime.NEW,
      };
      const mockSalary: any = {
        annualCtc: 1000000,
        basicMonthly: 33333,
        hraMonthly: 16667,
        ltaMonthly: 1392,
        specialAllowance: 27991,
        otherAllowances: 0,
      };

      const result = service.calculateForEmployee(mockEmployee, mockSalary, { month: 5, year: 2024 });

      expect(result.items.length).toBeGreaterThan(5);

      // Verify sort orders are strictly sequential (1, 2, 3...)
      result.items.forEach((item, index) => {
        expect(item.sortOrder).toBe(index + 1);
      });

      // Verify groupings: Earnings come first, then Deductions, then Employer Contributions
      const earningItems = result.items.filter((i) => i.itemType === PayslipItemType.EARNING);
      const deductionItems = result.items.filter((i) => i.itemType === PayslipItemType.DEDUCTION);
      const employerItems = result.items.filter(
        (i) => i.itemType === PayslipItemType.EMPLOYER_CONTRIB,
      );

      expect(earningItems.length).toBeGreaterThan(0);
      expect(deductionItems.length).toBeGreaterThan(0);
      expect(employerItems.length).toBeGreaterThan(0);

      // All earnings sortOrder < all deductions sortOrder
      const maxEarningSort = Math.max(...earningItems.map((i) => i.sortOrder));
      const minDeductionSort = Math.min(...deductionItems.map((i) => i.sortOrder));
      expect(maxEarningSort).toBeLessThan(minDeductionSort);
    });
  });
});
