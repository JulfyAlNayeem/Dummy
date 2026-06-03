/**
 * Message Module
 * Handles messaging features and real-time events
 * 
 * Endpoints: GET /messages, POST /messages, etc.
 * WebSocket: message:send, message:typing, message:read, etc.
 */

export { default as messageRoutes } from './message.routes.js'
export * as messageController from './message.controller.js'
export { MessageGateway } from './message.gateway.js'
