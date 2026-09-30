import type { z } from 'zod';

export class DataError extends Error {}

/** Checks `raw` against `schema`; on failure throws a DataError listing every problem with its field path. */
export function validateData<T>(fileName: string, schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => {
    const where = issue.path.length > 0 ? issue.path.join('.') : '(whole file)';
    return `  - ${where}: ${issue.message}`;
  });
  throw new DataError(`Problem in ${fileName}:\n${problems.join('\n')}`);
}
