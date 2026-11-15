import type { ZodError } from 'zod';

export function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    fields[issue.path.join('.')] ??= issue.message;
  }
  return fields;
}
