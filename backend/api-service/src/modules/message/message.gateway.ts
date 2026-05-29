import { Server, Socket } from 'socket.io';
import logger from '../../common/utils/logger.js';

/**
 * Message gateway has been moved to message-service.
 * This compatibility gateway intentionally no-ops in api-service.
 */
export class MessageGateway {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  handleConnection(_socket: Socket) {
    // no-op: message events are handled by message-service (/message-socket)
  }

  handleDisconnect(_socket: Socket, _reason: string) {
    logger.debug('api-service MessageGateway disconnect (compat mode)');
  }
}
