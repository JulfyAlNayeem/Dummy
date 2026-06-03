/**
 * Auth Module
 * Handles authentication and user authorization
 * 
 * Endpoints:
 * - POST /user/register - Register new user
 * - POST /user/login - Login user
 * - POST /user/logout - Logout user
 * - POST /user/refresh-token - Refresh access token
 * - POST /user/verify-email - Verify email
 * - POST /user/resend-verification - Resend verification email
 * - POST /user/forgot-password - Request password reset
 * - POST /user/reset-password - Reset password
 * - GET /user/me - Get current user
 */

export { default as authRoutes } from './auth.routes.js'
export * as authController from './auth.controller.js'
