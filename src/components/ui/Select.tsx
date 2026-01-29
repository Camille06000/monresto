import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import clsx from 'clsx';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(({ label, error, className, children, ...props }, ref) => (
  <label className="flex flex-col gap-1 text-sm text-gray-200">
    {label && <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>}
    <select ref={ref} className={clsx('w-full', error && 'border-danger focus:ring-danger', className)} {...props}>
      {children}
    </select>
    {error && <span className="text-danger text-xs">{error}</span>}
  </label>
));

Select.displayName = 'Select';
