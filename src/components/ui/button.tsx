import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'default';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', isLoading, children, ...props }, ref) => {
    // Base styles match Nexus CRM reference button patterns
    const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: [
        'text-white rounded-[.7rem] px-[1.1rem] py-[.6rem]',
        'bg-gradient-to-br from-[#7C5CFC] to-[#9B7BFF]',
        'shadow-[0_6px_18px_rgba(124,92,252,.35)]',
        'hover:brightness-110 hover:-translate-y-px',
      ].join(' '),

      default: [
        'text-white rounded-[.7rem] px-[1.1rem] py-[.6rem]',
        'bg-gradient-to-br from-[#7C5CFC] to-[#9B7BFF]',
        'shadow-[0_6px_18px_rgba(124,92,252,.35)]',
        'hover:brightness-110 hover:-translate-y-px',
      ].join(' '),

      secondary: [
        'rounded-[.7rem] px-[1.1rem] py-[.6rem]',
        'bg-[rgba(20,27,51,.55)] backdrop-blur-[20px]',
        'border border-white/[.08]',
        'text-[#E7EAF5] font-medium',
        'hover:bg-[rgba(124,92,252,.08)] hover:border-[#7C5CFC]',
      ].join(' '),

      ghost: [
        'rounded-[.7rem] px-[1.1rem] py-[.6rem]',
        'border border-white/[.08]',
        'text-[#E7EAF5] font-medium',
        'hover:bg-[rgba(124,92,252,.08)] hover:border-[#7C5CFC]',
      ].join(' '),

      outline: [
        'rounded-[.7rem] px-[1.1rem] py-[.6rem]',
        'border border-white/[.08]',
        'text-[#E7EAF5] font-medium',
        'hover:bg-[rgba(124,92,252,.08)] hover:border-[#7C5CFC]',
      ].join(' '),

      danger: [
        'text-white rounded-[.7rem] px-[1.1rem] py-[.6rem]',
        'bg-[#F43F5E] hover:bg-[#F43F5E]/90',
        'shadow-[0_6px_18px_rgba(244,63,94,.3)]',
      ].join(' '),
    };

    const sizes = {
      default: 'text-sm',
      sm: 'text-xs px-3 py-[.45rem]',
      lg: 'text-base px-5 py-3',
      icon: 'w-9 h-9 p-0 rounded-[.7rem]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size || 'default'], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
