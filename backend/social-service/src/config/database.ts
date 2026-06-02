import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = (process.env.DATABASE_URL || '').replace(/^mysql:\/\//, 'mariadb://');
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });
export default prisma;
