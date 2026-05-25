import os from 'os';

// Dynamic import for mediasoup (it requires native binaries)
let mediasoup: typeof import('mediasoup') | null = null;
try {
  mediasoup = await import('mediasoup');
} catch (e) {
  console.warn('⚠️  mediasoup not available - group SFU calls disabled. P2P 1:1 calls still work.');
  console.warn('   To enable SFU: install Python3, Visual Studio Build Tools, then run npm install');
}

/**
 * Mediasoup configuration for SFU-based group calls.
 * Uses one worker per CPU core for optimal performance.
 */
const mediasoupConfig = {
  numWorkers: Math.min(os.cpus()?.length || 2, 4),

  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: 'warn' as const,
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'] as any[],
  },

  router: {
    mediaCodecs: [
      {
        kind: 'audio' as const,
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video' as const,
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 2,
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      },
    ] as any[],
  },

  webRtcTransport: {
    listenIps: [
      {
        ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
      },
    ],
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    maxIncomingBitrate: 1500000,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
};

// Store workers
const workers: any[] = [];
let nextWorkerIndex = 0;

/**
 * Initialize mediasoup workers
 */
export const initializeMediasoup = async (): Promise<any[]> => {
  if (!mediasoup) {
    console.warn('⚠️  Skipping mediasoup initialization (not installed)');
    return [];
  }

  const numWorkers = parseInt(process.env.MEDIASOUP_WORKERS || '2', 10);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: mediasoupConfig.worker.logLevel,
      logTags: mediasoupConfig.worker.logTags,
      rtcMinPort: mediasoupConfig.worker.rtcMinPort,
      rtcMaxPort: mediasoupConfig.worker.rtcMaxPort,
    });

    worker.on('died', () => {
      console.error(`mediasoup Worker died [pid:${worker.pid}]`);
      // Restart worker after a delay
      setTimeout(async () => {
        const idx = workers.indexOf(worker);
        if (idx !== -1 && mediasoup) {
          const newWorker = await mediasoup.createWorker({
            logLevel: mediasoupConfig.worker.logLevel,
            logTags: mediasoupConfig.worker.logTags,
            rtcMinPort: mediasoupConfig.worker.rtcMinPort,
            rtcMaxPort: mediasoupConfig.worker.rtcMaxPort,
          });
          workers[idx] = newWorker;
        }
      }, 2000);
    });

    workers.push(worker);
  }

  return workers;
};

/**
 * Get next mediasoup worker (round-robin)
 */
export const getNextWorker = (): any => {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
};

/**
 * Create a new Router for a call room
 */
export const createRouter = async (): Promise<any> => {
  if (workers.length === 0) {
    throw new Error('No mediasoup workers available. Install mediasoup for group SFU calls.');
  }
  const worker = getNextWorker();
  return worker.createRouter({ mediaCodecs: mediasoupConfig.router.mediaCodecs });
};

/**
 * Create a WebRTC transport within a router
 */
export const createWebRtcTransport = async (router: any): Promise<{
  transport: any;
  params: {
    id: string;
    iceParameters: any;
    iceCandidates: any;
    dtlsParameters: any;
    sctpParameters: any;
  };
}> => {
  const transport = await router.createWebRtcTransport(mediasoupConfig.webRtcTransport);

  transport.on('dtlsstatechange', (dtlsState: string) => {
    if (dtlsState === 'closed') {
      transport.close();
    }
  });

  transport.on('@close', () => {
    console.log('Transport closed');
  });

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    },
  };
};

export { mediasoupConfig };
