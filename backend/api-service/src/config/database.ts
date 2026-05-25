import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = process.env.DATABASE_URL || '';

const adapter = new PrismaMariaDb(connectionString);

const prisma = new PrismaClient({
  adapter,
  // Avoid verbose SQL/query logs in the console. Keep only warnings/errors in development.
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
