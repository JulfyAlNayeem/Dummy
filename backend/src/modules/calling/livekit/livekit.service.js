/**
 * LiveKit Service
 * Handles room creation, token generation, and room deletion.
 * 
 * Install: npm install livekit-server-sdk
 * 
 * Required .env:
 *   LIVEKIT_URL=ws://your-vps-ip:7880
 *   LIVEKIT_API_KEY=your_api_key
 *   LIVEKIT_API_SECRET=your_api_secret
 */

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import logger from "../../../common/utils/logger.js";

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

// Single RoomServiceClient instance
const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);

/**
 * Create a LiveKit room for a call.
 * Room is identified by callId so it's unique per call.
 * 
 * LiveKit auto-creates rooms on first participant join,
 * but we create explicitly so we can set maxParticipants.
 */
export const createRoom = async (callId, { maxParticipants = 50, emptyTimeoutSeconds = 300 } = {}) => {
  try {
    const room = await roomService.createRoom({
      name: callId,                          // room name = callId
      emptyTimeout: emptyTimeoutSeconds,     // delete room after N seconds empty
      maxParticipants,                       // hard cap
    });

    logger.info({ callId, roomName: room.name }, "✅ LiveKit room created");
    return room;
  } catch (error) {
    // Room may already exist — that's fine
    if (error.message?.includes("already exists")) {
      logger.warn({ callId }, "LiveKit room already exists — continuing");
      return { name: callId };
    }
    logger.error({ error: error.message, callId }, "❌ Failed to create LiveKit room");
    throw error;
  }
};

/**
 * Generate a LiveKit access token for a participant.
 * This token is sent to the frontend so it can join the room.
 * 
 * @param {string} callId    - used as room name
 * @param {string} userId    - participant identity (must be unique per room)
 * @param {string} userName  - display name shown to other participants
 * @param {object} grants    - override default permissions
 */
export const generateToken = async (callId, userId, userName, grants = {}) => {
  try {
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: userId,    // unique identifier for this participant
      name: userName,      // display name
      ttl: "4h",           // token valid for 4 hours
    });

    at.addGrant({
      roomJoin: true,
      room: callId,        // which room they can join
      canPublish: true,    // can send audio/video
      canSubscribe: true,  // can receive others' audio/video
      canPublishData: true, // can send data messages
      ...grants,           // allow overrides (e.g. canPublish: false for viewers)
    });

    const token = await at.toJwt();
    logger.info({ callId, userId }, "✅ LiveKit token generated");
    return token;
  } catch (error) {
    logger.error({ error: error.message, callId, userId }, "❌ Failed to generate LiveKit token");
    throw error;
  }
};

/**
 * Delete a LiveKit room when the call ends.
 * All participants are kicked out automatically.
 */
export const deleteRoom = async (callId) => {
  try {
    await roomService.deleteRoom(callId);
    logger.info({ callId }, "✅ LiveKit room deleted");
  } catch (error) {
    // Room may already be gone — not a fatal error
    logger.warn({ error: error.message, callId }, "LiveKit room delete warning");
  }
};

/**
 * List participants currently in a room.
 * Useful for checking who is still connected.
 */
export const listParticipants = async (callId) => {
  try {
    const participants = await roomService.listParticipants(callId);
    return participants;
  } catch (error) {
    logger.warn({ error: error.message, callId }, "Failed to list LiveKit participants");
    return [];
  }
};

/**
 * Remove a specific participant from a room.
 * Used when admin kicks someone or for moderation.
 */
export const removeParticipant = async (callId, userId) => {
  try {
    await roomService.removeParticipant(callId, userId);
    logger.info({ callId, userId }, "✅ Participant removed from LiveKit room");
  } catch (error) {
    logger.warn({ error: error.message, callId, userId }, "Failed to remove LiveKit participant");
  }
};
