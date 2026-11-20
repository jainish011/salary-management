import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading...',
  size = 'md',
  fullHeight = false,
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 ${
        fullHeight ? 'min-h-[400px]' : ''
      }`}
    >
      <div
        className={`${sizeClasses} border-indigo-600 border-t-transparent rounded-full animate-spin`}
      />
      {label && <p className="text-xs font-medium text-slate-500 mt-3">{label}</p>}
    </div>
  );
};
