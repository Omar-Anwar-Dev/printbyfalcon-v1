/**
 * Maps zod issues to i18n message keys. Server produces keys; UI resolves them
 * via next-intl so Arabic/English messages match the user's locale.
 *
 * If a schema attaches a custom `message` (like "phone.invalid_eg"), we pass it
 * through unchanged. Otherwise we synthesize one from the zod issue code.
 */
import type { ZodError, ZodIssue } from 'zod';

type Localized = {
  path: (string | number)[];
  key: string;
  params?: Record<string, string | number>;
};

export function toLocalizedIssues(error: ZodError): Localized[] {
  return error.issues.map(issueToLocalized);
}

function issueToLocalized(issue: ZodIssue): Localized {
  const { path, code, message } = issue;

  // Custom message already a translation key (convention: dot-separated, no spaces)
  if (message && /^[a-z][a-z0-9._]*$/.test(message)) {
    return { path, key: `validation.${message}` };
  }

  switch (code) {
    case 'invalid_type':
      return { path, key: 'validation.required' };
    case 'too_small':
      return {
        path,
        key: 'validation.too_short',
        params: { min: (issue as { minimum?: number }).minimum ?? 0 },
      };
    case 'too_big':
      return {
        path,
        key: 'validation.too_long',
        params: { max: (issue as { maximum?: number }).maximum ?? 0 },
      };
    case 'invalid_string':
      return { path, key: 'validation.invalid_format' };
    default:
      return { path, key: 'validation.invalid' };
  }
}
