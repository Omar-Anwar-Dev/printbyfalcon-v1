'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<InputProps, 'type'> & {
  /** Localized aria-label for the toggle button — required for a11y. */
  showLabel: string;
  hideLabel: string;
};

/**
 * Password input with a show/hide-password eye toggle on the end side.
 * Visual state lives locally; the underlying `<input>` flips between
 * `type="password"` and `type="text"`.
 *
 * Logical positioning (`end-2`) so the eye sits on the visual end —
 * left in RTL, right in LTR — matching the storefront convention.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showLabel, hideLabel, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const Icon = visible ? EyeOff : Eye;
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pe-10', className)}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="absolute end-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-paper-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
