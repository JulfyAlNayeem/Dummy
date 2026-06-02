import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const databaseUrl = process.env.DATABASE_URL || '';
const connectionString = databaseUrl.replace(/^mysql:\/\//, 'mariadb://');

if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Set it in the repo root .env or backend/root-service/.env.');
}

const adapter = new PrismaMariaDb(connectionString);

const prisma: any = new PrismaClient({
  adapter,
  // Avoid verbose SQL/query logs in the console. Keep only warnings/errors in development.
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
