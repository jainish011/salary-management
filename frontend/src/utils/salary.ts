export const METRO_CITIES = new Set([
  'BANGALORE',
  'BENGALURU',
  'MUMBAI',
  'DELHI',
  'HYDERABAD',
  'CHENNAI',
  'KOLKATA',
]);

export const INDIAN_CITIES_AND_STATES: Record<string, string> = {
  'Bengaluru': 'Karnataka',
  'Bangalore': 'Karnataka',
  'Mumbai': 'Maharashtra',
  'Pune': 'Maharashtra',
  'Delhi': 'Delhi',
  'New Delhi': 'Delhi',
  'Noida': 'Uttar Pradesh',
  'Gurugram': 'Haryana',
  'Hyderabad': 'Telangana',
  'Chennai': 'Tamil Nadu',
  'Kolkata': 'West Bengal',
  'Ahmedabad': 'Gujarat',
  'Jaipur': 'Rajasthan',
  'Chandigarh': 'Punjab',
  'Kochi': 'Kerala',
  'Indore': 'Madhya Pradesh',
};

export interface SalaryBreakup {
  annualCtc: number;
  monthlyCtc: number;
  basicMonthly: number;
  hraMonthly: number;
  ltaMonthly: number;
  specialAllowance: number;
  otherAllowances: number;
  employerPfMonthly: number;
  gratuityMonthly: number;
}

export function calculateSalaryBreakup(
  annualCtc: number,
  city?: string | null,
): SalaryBreakup {
  const isMetro = city ? METRO_CITIES.has(city.trim().toUpperCase()) : false;
  const monthlyCtc = Math.round(annualCtc / 12);
  const basicMonthly = Math.round(monthlyCtc * 0.40);
  const hraMonthly = Math.round(basicMonthly * (isMetro ? 0.50 : 0.40));
  const ltaMonthly = Math.round((annualCtc / 12) * 0.0167);
  const employerPfMonthly = Math.round(Math.min(basicMonthly, 15000) * 0.12);
  const gratuityMonthly = Math.round(basicMonthly * 0.0481);

  const specialAllowance = Math.max(
    0,
    monthlyCtc - (basicMonthly + hraMonthly + ltaMonthly + employerPfMonthly + gratuityMonthly),
  );

  return {
    annualCtc,
    monthlyCtc,
    basicMonthly,
    hraMonthly,
    ltaMonthly,
    specialAllowance,
    otherAllowances: 0,
    employerPfMonthly,
    gratuityMonthly,
  };
}

export interface TakeHomeEstimate {
  grossMonthly: number;
  employeePf: number;
  professionalTax: number;
  estimatedTdsMonthly: number;
  totalDeductions: number;
  netTakeHomeMonthly: number;
}

export function estimateTakeHome(
  breakup: SalaryBreakup,
  taxRegime: 'NEW' | 'OLD' = 'NEW',
): TakeHomeEstimate {
  const grossMonthly = breakup.basicMonthly + breakup.hraMonthly + breakup.ltaMonthly + breakup.specialAllowance;
  // Employee PF is 12% of basic up to 15k ceiling
  const employeePf = Math.round(Math.min(breakup.basicMonthly, 15000) * 0.12);
  // Standard average PT ₹200/mo
  const professionalTax = 200;

  // Simplified monthly TDS estimate for preview purposes
  // Standard deduction 75,000 for New Regime
  const annualGross = grossMonthly * 12;
  const taxableIncome = Math.max(0, annualGross - (taxRegime === 'NEW' ? 75000 : 50000));
  
  let annualTax = 0;
  if (taxRegime === 'NEW') {
    if (taxableIncome > 1500000) {
      annualTax = (taxableIncome - 1500000) * 0.30 + 150000;
    } else if (taxableIncome > 1200000) {
      annualTax = (taxableIncome - 1200000) * 0.20 + 90000;
    } else if (taxableIncome > 1000000) {
      annualTax = (taxableIncome - 1000000) * 0.15 + 60000;
    } else if (taxableIncome > 700000) {
      annualTax = (taxableIncome - 700000) * 0.10 + 30000;
    } else if (taxableIncome > 300000) {
      annualTax = (taxableIncome - 300000) * 0.05;
    }
    // Section 87A rebate for taxable income <= 7L
    if (taxableIncome <= 700000) {
      annualTax = 0;
    }
  } else {
    // Old regime standard estimate
    if (taxableIncome > 1000000) {
      annualTax = (taxableIncome - 1000000) * 0.30 + 112500;
    } else if (taxableIncome > 500000) {
      annualTax = (taxableIncome - 500000) * 0.20 + 12500;
    } else if (taxableIncome > 250000) {
      annualTax = (taxableIncome - 250000) * 0.05;
    }
    if (taxableIncome <= 500000) {
      annualTax = 0;
    }
  }

  // Add 4% Health & Education cess
  annualTax = Math.round(annualTax * 1.04);
  const estimatedTdsMonthly = Math.round(annualTax / 12);

  const totalDeductions = employeePf + professionalTax + estimatedTdsMonthly;
  const netTakeHomeMonthly = Math.max(0, grossMonthly - totalDeductions);

  return {
    grossMonthly,
    employeePf,
    professionalTax,
    estimatedTdsMonthly,
    totalDeductions,
    netTakeHomeMonthly,
  };
}
