import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1),
  CLIENT_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Set to false only to try a production build over plain HTTP on your own machine.
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // Outside the app and any container, so uploaded files survive redeploys.
  UPLOAD_DIR: z.string().default('/file/dali'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  // e.g. smtps://user:password@smtp.example.com:465
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('Dali <no-reply@localhost>'),
});

const parsed = schema
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && value.JWT_ACCESS_SECRET.includes('change-me')) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'Replace the example JWT_ACCESS_SECRET with a long random value',
      });
    }
  })
  .safeParse(process.env);
if (!parsed.success) {
  // The logger depends on this module, so report configuration errors directly.
  console.error('Invalid environment configuration:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
