import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

interface Props {
  title?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function Card({ title, actions, className, children }: PropsWithChildren<Props>) {
  return (
    <div className={clsx('card p-4', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
