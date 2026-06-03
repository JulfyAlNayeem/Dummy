/**
 * Conversation Module
 * Handles conversations and real-time events
 * 
 * Endpoints: GET /conversations, POST /conversations, etc.
 * WebSocket: conversation:join, conversation:leave, etc.
 */

export { default as conversationRoutes } from './conversation.routes.js'
export * as conversationController from './conversation.controller.js'
export { ConversationGateway } from './conversation.gateway.js'
