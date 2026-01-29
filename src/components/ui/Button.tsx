import clsx from 'clsx';
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  const base =
    'rounded-xl font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary';
  const variants: Record<Variant, string> = {
    primary: 'bg-primary text-white hover:bg-sky-500',
    secondary: 'bg-white/10 text-white hover:bg-white/20',
    ghost: 'bg-transparent text-white hover:bg-white/10',
    danger: 'bg-danger text-white hover:bg-red-500',
  };
  const sizes: Record<Size, string> = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-5 py-4 text-base',
  };
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  );
}
