import jwt from "jsonwebtoken";
import User from "../src/common/models/userModel.js";
import Conversation from "../src/common/models/conversationModel.js";
import Session from "../src/common/models/sessionModel.js";

console.log('🚀 [roleMiddleware] Module loaded at:', new Date().toISOString());

// Require Teacher (or higher)
export const requireTeacher = async (req, res, next) => {
  try {
    // First try to get token from cookies (preferred, more secure)
    let token = req.cookies?.accessToken || req.cookies?.access_token;
    
    // Debug logging
    console.log('🔍 [requireTeacher] Cookie token:', token ? 'EXISTS' : 'MISSING');
    console.log('🔍 [requireTeacher] All cookies:', req.cookies);
    
    // Fallback to Authorization header for backwards compatibility
    if (!token) {
      const authHeader = req.headers["authorization"];
      console.log('🔍 [requireTeacher] Auth header:', authHeader ? 'EXISTS' : 'MISSING');
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
        console.log('🔍 [requireTeacher] Using token from Authorization header');
      }
    }

    if (!token) {
      console.log('❌ [requireTeacher] No token found in cookies or headers');
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log('✅ [requireTeacher] Token decoded, user ID:', decoded.id);

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('❌ [requireTeacher] User not found in database');
      return res.status(401).json({ message: "User not found" });
    }

    console.log('✅ [requireTeacher] User found:', user.email, 'Role:', user.role);

    if (!["teacher", "admin", "superadmin"].includes(user.role)) {
      console.log('❌ [requireTeacher] User role not authorized:', user.role);
      return res
        .status(403)
        .json({ message: "Access denied. Teacher role required." });
    }

    console.log('✅ [requireTeacher] Authorization successful');
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ [requireTeacher] Error:', error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Require Auth (any logged-in user)
export const requireAuth = async (req, res, next) => {
  try {
      // First try to get token from cookies (preferred, more secure)
    let token = req.cookies?.accessToken || req.cookies?.access_token;
    
    // Debug logging
    console.log('🔍 [requireAuth] Cookie token:', token ? 'EXISTS' : 'MISSING');
    console.log('🔍 [requireAuth] All cookies:', req.cookies);
    console.log('🔍 [requireAuth] Request path:', req.path);
    
    // Fallback to Authorization header for backwards compatibility
    if (!token) {
      const authHeader = req.headers["authorization"];
      console.log('🔍 [requireAuth] Auth header:', authHeader ? 'EXISTS' : 'MISSING');
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
        console.log('🔍 [requireAuth] Using token from Authorization header');
      }
    }

    if (!token) {
      console.log('❌ [requireAuth] No token found in cookies or headers');
      return res.status(401).json({ message: "Unauthorized: No token provided." });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log('✅ [requireAuth] Token decoded, user ID:', decoded.id);

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('❌ [requireAuth] User not found in database');
      return res.status(401).json({ message: "User not found" });
    }

    console.log('✅ [requireAuth] User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ [requireAuth] Error:', error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Require Conversation Admin
export const requireConversationAdmin = async (req, res, next) => {
  try {
    let { classId } = req.params;
    const userId = req.user._id.toString();

    // If classId isn't provided but a sessionId is, resolve the classId from the session
    if (!classId && req.params?.sessionId) {
      const session = await Session.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found." });
      }
      // session.classId may be an ObjectId or populated object
      classId = session.classId?._id ? session.classId._id.toString() : session.classId?.toString();
    }

    if (!classId) {
      return res.status(400).json({ message: "classId is required." });
    }

    const classGroup = await Conversation.findById(classId);
    if (!classGroup || !classGroup.group.is_group) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const isAdmin = classGroup.group.admins.some(
      (admin) => admin.toString() === userId
    );

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Class admin privileges required." });
    }

    req.classGroup = classGroup;
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
