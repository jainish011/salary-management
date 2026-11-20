import React from 'react';

interface InrAmountProps {
  amount: number | string | null | undefined;
  compact?: boolean;
  className?: string;
  showZero?: boolean;
}

export const formatINR = (val: number, compact = false): string => {
  if (compact) {
    if (Math.abs(val) >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(val) >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    if (Math.abs(val) >= 1000) {
      return `₹${(val / 1000).toFixed(1)}k`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const InrAmount: React.FC<InrAmountProps> = ({
  amount,
  compact = false,
  className = '',
  showZero = true,
}) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (num === null || num === undefined || isNaN(num)) {
    return <span className={className}>—</span>;
  }

  if (num === 0 && !showZero) {
    return <span className={className}>₹0</span>;
  }

  return <span className={className}>{formatINR(num, compact)}</span>;
};
