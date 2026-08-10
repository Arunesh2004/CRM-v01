'use client';

import { useFormStatus } from 'react-dom';
import { Button } from './button';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loadingText?: string;
  variant?: "default" | "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SubmitButton({ children, loadingText = "Saving...", variant = "default", size = "default", className, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      disabled={pending || props.disabled} 
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? loadingText : children}
    </Button>
  );
}
