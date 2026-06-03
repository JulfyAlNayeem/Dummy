/**
 * User Module
 * Handles user management, profile updates, and presence events
 * 
 * Endpoints: POST /user/*, GET /user/*, etc.
 * WebSocket: user:online, user:offline, user:status
 */

export { default as userRoutes } from './user.routes.js'
export * as userController from './user.controller.js'
export { UserGateway, onlineUsers } from './user.gateway.js'
