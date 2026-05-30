import prisma from '../src/config/database.js';

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    throw new Error('userId argument is required');
  }

  const existing = await prisma.conversationParticipant.findFirst({
    where: { userId },
    select: { conversationId: true },
  });

  let conversationId = existing?.conversationId;

  if (!conversationId) {
    const other = await prisma.user.findFirst({
      where: { id: { not: userId } },
      select: { id: true },
    });

    if (!other) {
      throw new Error('No secondary user found to create conversation');
    }

    const created = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: other.id }],
        },
      } as any,
      select: { id: true },
    });

    conversationId = created.id;
  }

  console.log(`CONVERSATION_ID=${conversationId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
