import { z } from 'zod';

export const EnvSchemaType = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url('DATABASE_URL deve ser uma URL válida'),
  REDIS_URL: z.url('REDIS_URL deve ser uma URL válida'),
  FRANKFURTER_API_URL: z.url('FRANKFURTER_API_URL deve ser uma URL válida'),
  BULL_BOARD_USER: z.string().min(1, 'BULL_BOARD_USER é obrigatória'),
  BULL_BOARD_PASS: z.string().min(1, 'BULL_BOARD_PASS é obrigatória'),
});

export type Env = z.infer<typeof EnvSchemaType>;

export function validateEnv(): Env {
  const result = EnvSchemaType.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Verifique suas variáveis de ambiente:\n${errors}`);
  }

  return result.data;
}
