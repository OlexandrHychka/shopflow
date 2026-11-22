import process from 'node:process';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const config = {
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? '3001'),
  databaseUrl: requireEnv('DATABASE_URL'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  appEnv: process.env.APP_ENV ?? 'development',
};
