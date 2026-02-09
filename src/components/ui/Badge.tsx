import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  tone?: Tone;
  className?: string;
}

export function Badge({ tone = 'info', className, children }: PropsWithChildren<BadgeProps>) {
  const toneClass: Record<Tone, string> = {
    success: 'bg-green-500/20 text-green-200',
    warning: 'bg-amber-500/20 text-amber-200',
    danger: 'bg-red-500/20 text-red-200',
    info: 'bg-sky-500/20 text-sky-200',
  };
  return <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold', toneClass[tone], className)}>{children}</span>;
}
