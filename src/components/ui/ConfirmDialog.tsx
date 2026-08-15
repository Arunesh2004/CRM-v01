'use client';

import { useState } from 'react';
import { Button } from './button';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  trigger: React.ReactNode;
  confirmText?: string;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  title,
  description,
  onConfirm,
  trigger,
  confirmText = "Confirm",
  variant = "danger"
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger}
      </div>

      {isOpen && (
        /* Nexus CRM modal-backdrop + glass-panel */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(7,11,24,.55)", backdropFilter: "blur(4px)" }}
            onClick={() => !isLoading && setIsOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-[1.25rem] p-6 animate-in border border-white/[.08]"
            style={{
              background: "linear-gradient(180deg, rgba(27,35,64,.9), rgba(13,19,38,.9))",
              boxShadow: "0 24px 64px rgba(0,0,0,.6)",
              backdropFilter: "blur(24px)",
            }}
          >
            <div className="flex gap-4">
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: variant === 'danger' ? "rgba(244,63,94,.12)" : "rgba(124,92,252,.12)",
                  color: variant === 'danger' ? "#F43F5E" : "#7C5CFC",
                }}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>

              {/* Content */}
              <div>
                <h3 className="font-display font-bold text-lg text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "#8891B0" }}>
                  {description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant={variant}
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Processing…' : confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
