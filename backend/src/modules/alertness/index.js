/**
 * Alertness Module
 * Handles alertness sessions and real-time events
 * 
 * Endpoints: Alertness session operations
 * WebSocket: alertness:start, alertness:update, alertness:complete
 */

export { default as alertnessRoutes } from './alertness.routes.js'
export * as alertnessController from './alertness.controller.js'
export { AlertnessGateway } from './alertness.gateway.js'
