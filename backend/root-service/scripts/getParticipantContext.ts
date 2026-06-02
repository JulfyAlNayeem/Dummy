import prisma from '../src/config/database.js';

async function main() {
  const rows = await prisma.$queryRaw<Array<{ userId: string; conversationId: string; email: string | null }>>`
    SELECT cp.userId AS userId, cp.conversationId AS conversationId, u.email AS email
    FROM conversation_participants cp
    LEFT JOIN users u ON u.id = cp.userId
    LIMIT 20
  `;

  if (!rows.length) {
    console.log('NO_PARTICIPANTS');
    return;
  }

  const first = rows.find((r) => !!r.email) ?? rows[0];
  console.log(`CONVERSATION_ID=${first.conversationId}`);
  console.log(`USER_ID=${first.userId}`);
  console.log(`EMAIL=${first.email ?? ''}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
