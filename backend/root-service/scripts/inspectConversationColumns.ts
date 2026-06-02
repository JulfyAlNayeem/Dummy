import prisma from '../src/config/database.js';

async function main() {
  const columns = await prisma.$queryRaw<Array<Record<string, unknown>> >`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'conversations'
    ORDER BY ordinal_position
  `;

  console.log(JSON.stringify(columns, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
