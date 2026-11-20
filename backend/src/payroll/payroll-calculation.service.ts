import { Injectable } from '@nestjs/common';
import { Employee, TaxRegime } from '../entities/employee.entity.js';
import { SalaryStructure } from '../entities/salary-structure.entity.js';
import { PayslipItemType } from '../entities/payslip-item.entity.js';
import { METRO_CITIES } from '../common/salary-calculator.util.js';

export interface PayslipLineItemData {
  itemType: PayslipItemType;
  itemName: string;
  amount: number;
  sortOrder: number;
}

export interface PayslipCalculationResult {
  // Earnings
  basicMonthly: number;
  hraMonthly: number;
  ltaMonthly: number;
  specialAllowance: number;
  otherAllowances: number;
  grossEarnings: number;

  // Deductions
  employeePf: number;
  employeeEsi: number;
  professionalTax: number;
  tds: number;
  totalDeductions: number;

  // Net Pay
  netPay: number;

  // Employer Retirals & Contributions
  employerPf: number;
  employerEsi: number;
  gratuityProv: number;
  monthlyCtc: number;

  // Line items
  items: PayslipLineItemData[];
}

@Injectable()
export class PayrollCalculationService {
  /**
   * Professional Tax (PT) Calculation
   * Monthly Gross based, varies by State, Gender, and Month (Feb ₹300 adjustment).
   */
  calculateProfessionalTax(
    state: string,
    gender: string,
    grossMonthly: number,
    month: number,
  ): number {
    const cleanState = (state || '').trim().toUpperCase();
    const cleanGender = (gender || '').trim().toUpperCase();
    const isFeb = month === 2;

    switch (cleanState) {
      case 'MAHARASHTRA': {
        // Female employees earning <= 25,000 are exempt from PT in Maharashtra
        if (cleanGender === 'FEMALE' && grossMonthly <= 25000) {
          return 0;
        }
        if (grossMonthly <= 7500) {
          return 0;
        }
        if (grossMonthly <= 10000) {
          return 175;
        }
        return isFeb ? 300 : 200;
      }

      case 'KARNATAKA': {
        if (grossMonthly < 25000) {
          return 0;
        }
        return isFeb ? 300 : 200;
      }

      case 'TAMIL NADU': {
        if (grossMonthly <= 21000) {
          return 0;
        }
        return 208; // ₹2,500 / 12 ≈ 208
      }

      case 'DELHI':
      case 'HARYANA':
      case 'UTTAR PRADESH':
      case 'UP':
        return 0;

      default:
        // Default slab for other states having PT
        if (grossMonthly > 20000) {
          return isFeb ? 300 : 200;
        }
        return 0;
    }
  }

  /**
   * New Tax Regime TDS (Default under FY 2024-25 / Budget 2024)
   * Standard deduction: ₹75,000
   * Rebate under 87A: Zero tax if taxable income <= ₹7,00,000
   */
  calculateTaxNewRegime(annualCtc: number): { annualTax: number; monthlyTds: number } {
    const standardDeduction = 75000;
    const taxableIncome = Math.max(0, annualCtc - standardDeduction);

    if (taxableIncome <= 700000) {
      // Full rebate under Section 87A
      return { annualTax: 0, monthlyTds: 0 };
    }

    let tax = 0;

    // Slabs:
    // 0 - 3,00,000: 0%
    // 3,00,001 - 7,00,000: 5% (400,000 * 0.05 = 20,000)
    // 7,00,001 - 10,00,000: 10% (300,000 * 0.10 = 30,000)
    // 10,00,001 - 12,00,000: 15% (200,000 * 0.15 = 30,000)
    // 12,00,001 - 15,00,000: 20% (300,000 * 0.20 = 60,000)
    // Above 15,00,000: 30%

    if (taxableIncome > 1500000) {
      tax += (taxableIncome - 1500000) * 0.30;
      tax += 300000 * 0.20; // 12L - 15L
      tax += 200000 * 0.15; // 10L - 12L
      tax += 300000 * 0.10; // 7L - 10L
      tax += 400000 * 0.05; // 3L - 7L
    } else if (taxableIncome > 1200000) {
      tax += (taxableIncome - 1200000) * 0.20;
      tax += 200000 * 0.15;
      tax += 300000 * 0.10;
      tax += 400000 * 0.05;
    } else if (taxableIncome > 1000000) {
      tax += (taxableIncome - 1000000) * 0.15;
      tax += 300000 * 0.10;
      tax += 400000 * 0.05;
    } else if (taxableIncome > 700000) {
      tax += (taxableIncome - 700000) * 0.10;
      tax += 400000 * 0.05;
    }

    // Health and Education Cess: 4%
    const cess = tax * 0.04;
    const totalAnnualTax = Math.round(tax + cess);
    const monthlyTds = Math.round(totalAnnualTax / 12);

    return { annualTax: totalAnnualTax, monthlyTds };
  }

  /**
   * Old Tax Regime TDS
   * Standard deduction: ₹50,000
   * 80C Deduction: up to ₹1,50,000
   * HRA Exemption: min(actual HRA, rent - 10% basic, 50%/40% basic)
   * 87A rebate: zero tax if taxable <= ₹5,00,000
   */
  calculateTaxOldRegime(
    annualCtc: number,
    basicMonthly: number,
    hraMonthly: number,
    city?: string,
  ): { annualTax: number; monthlyTds: number } {
    const isMetro = city ? METRO_CITIES.has(city.trim().toUpperCase()) : false;
    const annualBasic = basicMonthly * 12;
    const annualHra = hraMonthly * 12;

    const standardDeduction = 50000;
    const sec80C = 150000; // Standard 80C assumption

    // HRA Exemption under Sec 10(13A):
    // Assume rent paid is equal to 50% basic in metro, 40% in non-metro
    const assumedRentPaid = annualBasic * (isMetro ? 0.50 : 0.40);
    const rentMinus10PercentBasic = Math.max(0, assumedRentPaid - (0.10 * annualBasic));
    const metroPercentBasic = annualBasic * (isMetro ? 0.50 : 0.40);
    const hraExemption = Math.min(annualHra, rentMinus10PercentBasic, metroPercentBasic);

    const totalDeductions = standardDeduction + sec80C + hraExemption;
    const taxableIncome = Math.max(0, annualCtc - totalDeductions);

    if (taxableIncome <= 500000) {
      return { annualTax: 0, monthlyTds: 0 };
    }

    let tax = 0;
    // Slabs:
    // 0 - 2,50,000: 0%
    // 2,50,001 - 5,00,000: 5% (2,50,000 * 0.05 = 12,500)
    // 5,00,001 - 10,00,000: 20%
    // Above 10,00,000: 30%

    if (taxableIncome > 1000000) {
      tax += (taxableIncome - 1000000) * 0.30;
      tax += 500000 * 0.20; // 5L - 10L
      tax += 250000 * 0.05; // 2.5L - 5L
    } else if (taxableIncome > 500000) {
      tax += (taxableIncome - 500000) * 0.20;
      tax += 250000 * 0.05;
    }

    const cess = tax * 0.04;
    const totalAnnualTax = Math.round(tax + cess);
    const monthlyTds = Math.round(totalAnnualTax / 12);

    return { annualTax: totalAnnualTax, monthlyTds };
  }

  /**
   * End-to-end Payroll Calculation for a single employee for a payroll period
   */
  calculateForEmployee(
    employee: Employee,
    salaryStructure: SalaryStructure,
    payrollPeriod: { month: number; year: number },
  ): PayslipCalculationResult {
    // 1. Monthly Earnings
    const basicMonthly = Math.round(Number(salaryStructure.basicMonthly));
    const hraMonthly = Math.round(Number(salaryStructure.hraMonthly));
    const ltaMonthly = Math.round(Number(salaryStructure.ltaMonthly || 0));
    const specialAllowance = Math.round(Number(salaryStructure.specialAllowance || 0));
    const otherAllowances = Math.round(Number(salaryStructure.otherAllowances || 0));

    const grossEarnings =
      basicMonthly + hraMonthly + ltaMonthly + specialAllowance + otherAllowances;

    // 2. Statutory Deductions
    // Employee PF: 12% of min(basic, 15,000)
    const pfCeiling = 15000;
    const pfWage = Math.min(basicMonthly, pfCeiling);
    const employeePf = Math.round(pfWage * 0.12);
    const employerPf = employeePf;

    // ESI: 0.75% employee, 3.25% employer if Gross <= 21,000
    let employeeEsi = 0;
    let employerEsi = 0;
    if (grossEarnings <= 21000) {
      employeeEsi = Math.ceil(grossEarnings * 0.0075);
      employerEsi = Math.ceil(grossEarnings * 0.0325);
    }

    // Professional Tax
    const professionalTax = this.calculateProfessionalTax(
      employee.workState,
      employee.gender,
      grossEarnings,
      payrollPeriod.month,
    );

    // TDS
    let tds = 0;
    if (employee.taxRegime === TaxRegime.OLD) {
      tds = this.calculateTaxOldRegime(
        Number(salaryStructure.annualCtc),
        basicMonthly,
        hraMonthly,
        employee.workCity,
      ).monthlyTds;
    } else {
      tds = this.calculateTaxNewRegime(Number(salaryStructure.annualCtc)).monthlyTds;
    }

    const totalDeductions = employeePf + employeeEsi + professionalTax + tds;
    const netPay = grossEarnings - totalDeductions;

    // Employer Gratuity Provision: ~4.81% of Basic
    const gratuityProv = Math.round(basicMonthly * 0.0481);
    const monthlyCtc =
      grossEarnings + employerPf + employerEsi + gratuityProv;

    const result: PayslipCalculationResult = {
      basicMonthly,
      hraMonthly,
      ltaMonthly,
      specialAllowance,
      otherAllowances,
      grossEarnings,
      employeePf,
      employeeEsi,
      professionalTax,
      tds,
      totalDeductions,
      netPay,
      employerPf,
      employerEsi,
      gratuityProv,
      monthlyCtc,
      items: [],
    };

    result.items = this.buildLineItems(result);
    return result;
  }

  /**
   * Build ordered line items for the payslip breakdown
   */
  buildLineItems(res: PayslipCalculationResult): PayslipLineItemData[] {
    const items: PayslipLineItemData[] = [];
    let sortOrder = 1;

    // Earnings
    items.push({
      itemType: PayslipItemType.EARNING,
      itemName: 'Basic Salary',
      amount: res.basicMonthly,
      sortOrder: sortOrder++,
    });
    items.push({
      itemType: PayslipItemType.EARNING,
      itemName: 'House Rent Allowance (HRA)',
      amount: res.hraMonthly,
      sortOrder: sortOrder++,
    });
    if (res.ltaMonthly > 0) {
      items.push({
        itemType: PayslipItemType.EARNING,
        itemName: 'Leave Travel Allowance (LTA)',
        amount: res.ltaMonthly,
        sortOrder: sortOrder++,
      });
    }
    if (res.specialAllowance > 0) {
      items.push({
        itemType: PayslipItemType.EARNING,
        itemName: 'Special Allowance',
        amount: res.specialAllowance,
        sortOrder: sortOrder++,
      });
    }
    if (res.otherAllowances > 0) {
      items.push({
        itemType: PayslipItemType.EARNING,
        itemName: 'Other Allowances',
        amount: res.otherAllowances,
        sortOrder: sortOrder++,
      });
    }

    // Deductions
    items.push({
      itemType: PayslipItemType.DEDUCTION,
      itemName: 'Provident Fund (EPF)',
      amount: res.employeePf,
      sortOrder: sortOrder++,
    });
    if (res.employeeEsi > 0) {
      items.push({
        itemType: PayslipItemType.DEDUCTION,
        itemName: 'Employee State Insurance (ESI)',
        amount: res.employeeEsi,
        sortOrder: sortOrder++,
      });
    }
    if (res.professionalTax > 0) {
      items.push({
        itemType: PayslipItemType.DEDUCTION,
        itemName: 'Professional Tax (PT)',
        amount: res.professionalTax,
        sortOrder: sortOrder++,
      });
    }
    if (res.tds > 0) {
      items.push({
        itemType: PayslipItemType.DEDUCTION,
        itemName: 'Tax Deducted at Source (TDS)',
        amount: res.tds,
        sortOrder: sortOrder++,
      });
    }

    // Employer Contributions
    items.push({
      itemType: PayslipItemType.EMPLOYER_CONTRIB,
      itemName: 'Employer Provident Fund (PF)',
      amount: res.employerPf,
      sortOrder: sortOrder++,
    });
    if (res.employerEsi > 0) {
      items.push({
        itemType: PayslipItemType.EMPLOYER_CONTRIB,
        itemName: 'Employer ESI',
        amount: res.employerEsi,
        sortOrder: sortOrder++,
      });
    }
    items.push({
      itemType: PayslipItemType.EMPLOYER_CONTRIB,
      itemName: 'Gratuity Provision',
      amount: res.gratuityProv,
      sortOrder: sortOrder++,
    });

    return items;
  }
}
