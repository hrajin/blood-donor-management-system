import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'Use at least 32 characters'),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(6, 'Use at least 6 characters'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = envSchema.safeParse(env);
  if (result.success) return result.data;

  const problems = result.error.issues.map(
    (issue) => `- ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(`Invalid environment variables:\n${problems.join('\n')}`);
}
