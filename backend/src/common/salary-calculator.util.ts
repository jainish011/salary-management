export const METRO_CITIES = new Set([
  'BANGALORE',
  'MUMBAI',
  'DELHI',
  'HYDERABAD',
  'CHENNAI',
  'KOLKATA',
]);

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
