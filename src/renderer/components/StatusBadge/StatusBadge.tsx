import React from 'react';

interface StatusBadgeProps {
  state: 'nominal' | 'warning' | 'critical' | 'info';
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, children }) => {
  const base = 'px-2 py-0.5 text-xs uppercase ob-label';
  switch (state) {
    case 'nominal':
      return (
        <span className={`${base} ob-status-nominal bg-ob-success/8`}>{children || 'NOMINAL'}</span>
      );
    case 'warning':
      return (
        <span className={`${base} ob-status-warning bg-ob-amber/8`}>{children || 'WARN'}</span>
      );
    case 'critical':
      return (
        <span className={`${base} ob-status-critical bg-ob-danger/8`}>{children || 'CRIT'}</span>
      );
    default:
      return <span className={`${base} text-ob-cyan bg-ob-cyan/6`}>{children || 'INFO'}</span>;
  }
};

export default StatusBadge;
