import { io } from 'socket.io-client';

const token = process.argv[2];
const conversationId = process.argv[3];

if (!token || !conversationId) {
  console.error('Usage: pnpm exec tsx scripts/verifySocketKey.ts <token> <conversationId>');
  process.exit(1);
}

async function main() {
  const socket = io('http://localhost:3014', {
    path: '/message-socket',
    transports: ['websocket'],
    auth: { token },
    timeout: 10000,
  });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Socket connect timeout')), 12000);

    socket.on('connect', () => {
      clearTimeout(t);
      resolve();
    });

    socket.on('connect_error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });

  const verifyResult = await new Promise<unknown>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('verify-key callback timeout')), 12000);

    socket.emit(
      'encryption:verify-key',
      {
        conversationId,
        publicKey: 'socket-smoke-key-1',
      },
      (response: unknown) => {
        clearTimeout(t);
        resolve(response);
      }
    );
  });

  console.log(JSON.stringify(verifyResult));
  socket.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
