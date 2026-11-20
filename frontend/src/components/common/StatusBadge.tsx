import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (!status) return null;

  const s = status.toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (s === 'ACTIVE' || s === 'LOCKED') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (s === 'PROCESSING' || s === 'ON_LEAVE' || s === 'OPEN') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (s === 'TERMINATED' || s === 'REJECTED' || s === 'FAILED') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
