import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import clsx from 'clsx';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className, ...props }, ref) => (
  <label className="flex flex-col gap-1 text-sm text-gray-200">
    {label && <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>}
    <input ref={ref} className={clsx('w-full', error && 'border-danger focus:ring-danger', className)} {...props} />
    {error && <span className="text-danger text-xs">{error}</span>}
  </label>
));

Input.displayName = 'Input';
