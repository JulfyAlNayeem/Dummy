/**
 * Comprehensive Seed Script - Auto-populates database with diverse initial data
 *
 * This script creates a rich dataset including:
 * - Multiple user types (superadmin, admin, moderator, teacher, students)
 * - Various conversation types (private, groups, classrooms)
 * - Friendships with different statuses
 * - Class join requests (pending, approved, rejected)
 * - Messages of different types (text, media, system)
 * - Attendance logs for classes
 * - Assignment submissions with grading
 * - Alertness sessions and responses
 * - Quick lessons with multiple parts
 * - Notifications for various events
 * - Reports and moderation actions
 * - Admin settings and configurations
 *
 * Usage:
 *   node scripts/seed.js
 *   or add to package.json: "seed": "node scripts/seed.js"
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import AdminSettings from "../models/adminSettingsModel.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import Friendship from "../models/friendshipModel.js";
import JoinRequest from "../models/joinRequestModel.js";
import AttendanceLog from "../models/attendanceLogModel.js";
import Session from "../models/sessionModel.js";
import AssignmentSubmission from "../models/assignmentSubmissionModel.js";
import AlertnessSession from "../models/alertnessSessionModel.js";
import QuickLesson from "../models/quickLessonModel.js";
import Notification from "../models/notificationModel.js";
import Report from "../models/reportModel.js";

// Database connection options (matching connectdb.js)
const DB_OPTIONS = {
  dbName: process.env.DB_NAME,
  autoIndex: false,
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Sample data arrays
const SAMPLE_USERS = [
  // Superadmin
  {
    name: "Super Admin",
    email: "superadmin@chatapp.com",
    password: "Admin@123!",
    gender: "male",
    role: "superadmin",
    is_active: true,
    bio: "System Administrator",
    themeIndex: 0,
    fileSendingAllowed: true,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  // Admins
  {
    name: "Admin Sarah",
    email: "admin.sarah@chatapp.com",
    password: "Admin@123!",
    gender: "female",
    role: "admin",
    is_active: true,
    bio: "Platform Administrator",
    themeIndex: 1,
    fileSendingAllowed: true,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Admin Mike",
    email: "admin.mike@chatapp.com",
    password: "Admin@123!",
    gender: "male",
    role: "admin",
    is_active: true,
    bio: "Content Moderator",
    themeIndex: 2,
    fileSendingAllowed: true,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  // Moderators
  {
    name: "Moderator Alex",
    email: "mod.alex@chatapp.com",
    password: "Mod@123!",
    gender: "male",
    role: "moderator",
    is_active: true,
    bio: "Community Moderator",
    themeIndex: 3,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Moderator Lisa",
    email: "mod.lisa@chatapp.com",
    password: "Mod@123!",
    gender: "female",
    role: "moderator",
    is_active: true,
    bio: "Safety Moderator",
    themeIndex: 4,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  // Teachers
  {
    name: "Dr. Johnson",
    email: "dr.johnson@university.edu",
    password: "Teacher@123!",
    gender: "male",
    role: "teacher",
    is_active: true,
    bio: "Professor of Computer Science",
    themeIndex: 0,
    fileSendingAllowed: true,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Prof. Martinez",
    email: "prof.martinez@university.edu",
    password: "Teacher@123!",
    gender: "female",
    role: "teacher",
    is_active: true,
    bio: "Mathematics Professor",
    themeIndex: 1,
    fileSendingAllowed: true,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Ms. Davis",
    email: "ms.davis@university.edu",
    password: "Teacher@123!",
    gender: "female",
    role: "teacher",
    is_active: true,
    bio: "English Literature Teacher",
    themeIndex: 2,
    fileSendingAllowed: true,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  // Students
  {
    name: "Alice Chen",
    email: "alice.chen@student.edu",
    password: "Student@123!",
    gender: "female",
    role: "user",
    is_active: true,
    bio: "Computer Science Student",
    themeIndex: 3,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Bob Wilson",
    email: "bob.wilson@student.edu",
    password: "Student@123!",
    gender: "male",
    role: "user",
    is_active: true,
    bio: "Mathematics Major",
    themeIndex: 4,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Charlie Brown",
    email: "charlie.brown@student.edu",
    password: "Student@123!",
    gender: "male",
    role: "user",
    is_active: true,
    bio: "Engineering Student",
    themeIndex: 0,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Diana Prince",
    email: "diana.prince@student.edu",
    password: "Student@123!",
    gender: "female",
    role: "user",
    is_active: true,
    bio: "Literature Student",
    themeIndex: 1,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Ethan Hunt",
    email: "ethan.hunt@student.edu",
    password: "Student@123!",
    gender: "male",
    role: "user",
    is_active: true,
    bio: "Business Administration",
    themeIndex: 2,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Fiona Green",
    email: "fiona.green@student.edu",
    password: "Student@123!",
    gender: "female",
    role: "user",
    is_active: true,
    bio: "Art History Student",
    themeIndex: 3,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "George Lucas",
    email: "george.lucas@student.edu",
    password: "Student@123!",
    gender: "male",
    role: "user",
    is_active: true,
    bio: "Film Studies",
    themeIndex: 4,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Hannah Montana",
    email: "hannah.montana@student.edu",
    password: "Student@123!",
    gender: "female",
    role: "user",
    is_active: true,
    bio: "Music Performance",
    themeIndex: 0,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
];

const SAMPLE_CONVERSATIONS = [
  // Private conversations
  {
    type: "private",
    participants: [], // Will be filled with user IDs
    status: "accepted",
    visibility: "private",
  },
  {
    type: "private",
    participants: [], // Will be filled with user IDs
    status: "accepted",
    visibility: "private",
  },
  // Groups
  {
    type: "group",
    participants: [], // Will be filled with user IDs
    status: "accepted",
    visibility: "public",
    group: {
      is_group: true,
      type: "group",
      name: "Study Group Alpha",
      intro: "Advanced Computer Science Study Group",
      admins: [], // Will be filled with user IDs
      fileSendingAllowed: true,
    },
  },
  {
    type: "group",
    participants: [], // Will be filled with user IDs
    status: "accepted",
    visibility: "private",
    group: {
      is_group: true,
      type: "group",
      name: "Math Helpers",
      intro: "Get help with mathematics problems",
      admins: [], // Will be filled with user IDs
      fileSendingAllowed: false,
    },
  },
  // Classrooms
  {
    type: "classroom",
    participants: [], // Will be filled with user IDs
    status: "accepted",
    visibility: "private",
    group: {
      is_group: true,
      type: "classroom",
      name: "CS101 - Introduction to Programming",
      intro: "Learn the basics of programming with Python",
      admins: [], // Will be filled with user IDs
      moderators: [], // Will be filled with user IDs
      classType: "weekly",
      fileSendingAllowed: true,
      startTime: "09:00",
      cutoffTime: "09:15",
      checkInterval: 15,
      selectedDays: [1, 3, 5], // Monday, Wednesday, Friday
    },
  },
  {
    type: "classroom",
    participants: [], // Will be filled with user IDs
    status: "accepted",
    visibility: "private",
    group: {
      is_group: true,
      type: "classroom",
      name: "MATH201 - Calculus II",
      intro: "Advanced calculus concepts and applications",
      admins: [], // Will be filled with user IDs
      moderators: [], // Will be filled with user IDs
      classType: "multi-weekly",
      fileSendingAllowed: true,
      startTime: "10:00",
      cutoffTime: "10:15",
      checkInterval: 15,
      selectedDays: [2, 4], // Tuesday, Thursday
    },
  },
  {
    type: "classroom",
    participants: [], // Will be filled with user IDs
    status: "pending",
    visibility: "private",
    group: {
      is_group: true,
      type: "classroom",
      name: "ENG301 - Shakespeare Studies",
      intro: "Explore the works of William Shakespeare",
      admins: [], // Will be filled with user IDs
      classType: "regular",
      fileSendingAllowed: true,
      startTime: "14:00",
      cutoffTime: "14:15",
      checkInterval: 15,
    },
  },
];

const SAMPLE_MESSAGES = [
  // Text messages
  {
    text: "Hello everyone! Welcome to the class.",
    messageType: "text",
    status: "delivered",
  },
  {
    text: "Hi! I'm excited to learn programming.",
    messageType: "text",
    status: "delivered",
  },
  {
    text: "Can someone help me with this math problem?",
    messageType: "text",
    status: "delivered",
  },
  // System messages
  {
    text: "Alice Chen joined the conversation",
    messageType: "system",
    status: "delivered",
  },
  {
    text: "Bob Wilson was added to the group",
    messageType: "system",
    status: "delivered",
  },
  // Media messages
  {
    text: "Here's the assignment file",
    messageType: "file",
    media: [{
      url: "/uploads/assignment1.pdf",
      type: "file",
      filename: "assignment1.pdf",
      size: 2048000,
    }],
    status: "delivered",
  },
  {
    text: "Check out this diagram",
    messageType: "image",
    media: [{
      url: "/uploads/diagram.png",
      type: "image",
      filename: "diagram.png",
      size: 512000,
    }],
    status: "delivered",
  },
];

const SAMPLE_QUICK_LESSONS = [
  {
    lessonName: "Introduction to Variables",
    lessonParts: [
      "Variables are containers for storing data values.",
      "In Python, you create a variable by assigning a value: x = 5",
      "Variable names must start with a letter or underscore.",
      "Python has no command for declaring a variable.",
    ],
  },
  {
    lessonName: "Basic Calculus Concepts",
    lessonParts: [
      "Limits describe the behavior of a function as it approaches a value.",
      "Derivatives measure the rate of change of a function.",
      "The fundamental theorem connects differentiation and integration.",
      "Integration finds the area under a curve.",
    ],
  },
  {
    lessonName: "Shakespeare's Sonnets",
    lessonParts: [
      "Shakespeare wrote 154 sonnets in his lifetime.",
      "Sonnets follow a specific rhyme scheme: ABAB CDCD EFEF GG",
      "They explore themes of love, beauty, and time.",
      "Sonnet 18 compares the beloved to a summer's day.",
    ],
  },
];

const SAMPLE_ASSIGNMENTS = [
  {
    assignmentTitle: "Programming Exercise 1",
    assignmentDescription: "Write a Python program that calculates the factorial of a number using recursion.",
    status: "submitted",
  },
  {
    assignmentTitle: "Calculus Problem Set",
    assignmentDescription: "Solve the following derivatives and integrals. Show all work.",
    status: "graded",
    mark: 85,
    feedback: "Good work! Just missed a few points on the integration by parts.",
  },
  {
    assignmentTitle: "Essay: Hamlet Analysis",
    assignmentDescription: "Write a 1000-word essay analyzing Hamlet's character development.",
    status: "pending",
  },
];

/**
 * Connect to MongoDB
 */
const connectDatabase = async () => {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("🔌 Connecting to MongoDB...");

  await mongoose.connect(DATABASE_URL, DB_OPTIONS);
  console.log("✅ Connected to MongoDB successfully");

  return mongoose.connection;
};

/**
 * Disconnect from MongoDB
 */
const disconnectDatabase = async () => {
  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
};

/**
 * Check if any users exist in the database
 */
const hasUsers = async () => {
  const userCount = await User.countDocuments();
  return userCount > 0;
};

/**
 * Hash password utility
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

/**
 * Create users with hashed passwords
 */
const createUsers = async () => {
  console.log("👥 Creating users...");

  const users = [];
  for (const userData of SAMPLE_USERS) {
    const hashedPassword = await hashPassword(userData.password);
    const user = new User({
      ...userData,
      password: hashedPassword,
    });
    await user.save();
    users.push(user);
    console.log(`   ✅ Created ${user.role}: ${user.name}`);
  }

  console.log(`✅ Created ${users.length} users successfully`);
  return users;
};

/**
 * Create friendships between users
 */
const createFriendships = async (users) => {
  console.log("🤝 Creating friendships...");

  const friendships = [];
  const students = users.filter(u => u.role === "user");
  const teachers = users.filter(u => u.role === "teacher");

  // Students befriending each other
  for (let i = 0; i < students.length - 1; i++) {
    const friendship = new Friendship({
      requester: students[i]._id,
      recipient: students[i + 1]._id,
      status: i % 3 === 0 ? "pending" : i % 3 === 1 ? "accepted" : "declined",
    });
    await friendship.save();
    friendships.push(friendship);
  }

  // Teachers befriending each other
  for (const teacher of teachers) {
    for (const otherTeacher of teachers) {
      if (teacher._id.toString() !== otherTeacher._id.toString()) {
        const friendship = new Friendship({
          requester: teacher._id,
          recipient: otherTeacher._id,
          status: "accepted",
        });
        await friendship.save();
        friendships.push(friendship);
      }
    }
  }

  console.log(`✅ Created ${friendships.length} friendships`);
  return friendships;
};

/**
 * Create conversations with participants
 */
const createConversations = async (users) => {
  console.log("💬 Creating conversations...");

  const conversations = [];
  const students = users.filter(u => u.role === "user");
  const teachers = users.filter(u => u.role === "teacher");
  const admins = users.filter(u => u.role === "admin" || u.role === "superadmin");

  // Private conversations
  const private1 = new Conversation({
    ...SAMPLE_CONVERSATIONS[0],
    participants: [students[0]._id, students[1]._id],
  });
  await private1.save();
  conversations.push(private1);

  const private2 = new Conversation({
    ...SAMPLE_CONVERSATIONS[1],
    participants: [teachers[0]._id, admins[0]._id],
  });
  await private2.save();
  conversations.push(private2);

  // Group conversations
  const group1 = new Conversation({
    ...SAMPLE_CONVERSATIONS[2],
    participants: [teachers[0]._id, students[0]._id, students[1]._id, students[2]._id],
    group: {
      ...SAMPLE_CONVERSATIONS[2].group,
      admins: [teachers[0]._id],
    },
  });
  await group1.save();
  conversations.push(group1);

  const group2 = new Conversation({
    ...SAMPLE_CONVERSATIONS[3],
    participants: [teachers[1]._id, students[3]._id, students[4]._id],
    group: {
      ...SAMPLE_CONVERSATIONS[3].group,
      admins: [teachers[1]._id],
    },
  });
  await group2.save();
  conversations.push(group2);

  // Classroom conversations
  const classroom1 = new Conversation({
    ...SAMPLE_CONVERSATIONS[4],
    participants: [teachers[0]._id, students[0]._id, students[1]._id, students[2]._id, students[3]._id],
    group: {
      ...SAMPLE_CONVERSATIONS[4].group,
      admins: [teachers[0]._id],
      moderators: [admins[0]._id],
    },
  });
  await classroom1.save();
  conversations.push(classroom1);

  const classroom2 = new Conversation({
    ...SAMPLE_CONVERSATIONS[5],
    participants: [teachers[1]._id, students[4]._id, students[5]._id, students[6]._id],
    group: {
      ...SAMPLE_CONVERSATIONS[5].group,
      admins: [teachers[1]._id],
      moderators: [admins[1]._id],
    },
  });
  await classroom2.save();
  conversations.push(classroom2);

  const classroom3 = new Conversation({
    ...SAMPLE_CONVERSATIONS[6],
    participants: [teachers[2]._id],
    group: {
      ...SAMPLE_CONVERSATIONS[6].group,
      admins: [teachers[2]._id],
    },
  });
  await classroom3.save();
  conversations.push(classroom3);

  console.log(`✅ Created ${conversations.length} conversations`);
  return conversations;
};

/**
 * Create join requests for classrooms
 */
const createJoinRequests = async (users, conversations) => {
  console.log("📝 Creating join requests...");

  const joinRequests = [];
  const students = users.filter(u => u.role === "user");
  const classrooms = conversations.filter(c => c.group?.type === "classroom");

  // Students requesting to join pending classroom
  const pendingClassroom = classrooms.find(c => c.status === "pending");
  if (pendingClassroom) {
    for (let i = 0; i < 3; i++) {
      const joinRequest = new JoinRequest({
        classId: pendingClassroom._id,
        userId: students[i]._id,
        status: i === 0 ? "pending" : i === 1 ? "approved" : "rejected",
        processedBy: i > 0 ? pendingClassroom.group.admins[0] : null,
        processedAt: i > 0 ? new Date() : null,
      });
      await joinRequest.save();
      joinRequests.push(joinRequest);
    }
  }

  // Add approved students to the classroom
  if (pendingClassroom) {
    const approvedStudents = joinRequests.filter(jr => jr.status === "approved");
    for (const jr of approvedStudents) {
      pendingClassroom.participants.push(jr.userId);
    }
    await pendingClassroom.save();
  }

  console.log(`✅ Created ${joinRequests.length} join requests`);
  return joinRequests;
};

/**
 * Create messages for conversations
 */
const createMessages = async (users, conversations) => {
  console.log("💭 Creating messages...");

  const messages = [];
  const students = users.filter(u => u.role === "user");
  const teachers = users.filter(u => u.role === "teacher");

  for (const conversation of conversations) {
    const participants = conversation.participants;
    if (participants.length === 0) continue;

    // Create various types of messages
    for (let i = 0; i < SAMPLE_MESSAGES.length && i < participants.length; i++) {
      const messageData = SAMPLE_MESSAGES[i];
      const sender = participants[i % participants.length];

      const message = new Message({
        ...messageData,
        conversation: conversation._id,
        sender: sender,
        receiver: conversation.group?.is_group ? null : participants.find(p => p.toString() !== sender.toString()),
      });

      // Add read receipts for some messages
      if (i % 2 === 0) {
        message.readBy = participants
          .filter(p => p.toString() !== sender.toString())
          .slice(0, 2)
          .map(userId => ({
            user: userId,
            readAt: new Date(Date.now() - Math.random() * 86400000), // Random time within last 24h
          }));
      }

      await message.save();
      messages.push(message);

      // Update conversation's last message
      conversation.last_message = {
        message: message.text || "Media message",
        sender: message.sender,
        timestamp: message.createdAt,
      };
      await conversation.save();
    }
  }

  console.log(`✅ Created ${messages.length} messages`);
  return messages;
};

/**
 * Create sessions for classrooms
 */
const createSessions = async (conversations) => {
  console.log("📅 Creating class sessions...");

  const sessions = [];
  const classrooms = conversations.filter(c => c.group?.type === "classroom");

  for (const classroom of classrooms) {
    // Create sessions for the past week
    for (let i = 0; i < 7; i++) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - i);

      const session = new Session({
        classId: classroom._id,
        date: sessionDate.toISOString().split('T')[0],
        startTime: classroom.group.startTime,
        type: "auto",
        status: i === 0 ? "ongoing" : i < 3 ? "completed" : "scheduled",
        cutoffTime: classroom.group.cutoffTime,
        duration: 70,
      });

      await session.save();
      sessions.push(session);
    }
  }

  console.log(`✅ Created ${sessions.length} sessions`);
  return sessions;
};

/**
 * Create attendance logs
 */
const createAttendanceLogs = async (users, conversations, sessions) => {
  console.log("📊 Creating attendance logs...");

  const attendanceLogs = [];
  const classrooms = conversations.filter(c => c.group?.type === "classroom");
  const students = users.filter(u => u.role === "user");

  for (const classroom of classrooms) {
    const classSessions = sessions.filter(s => s.classId.toString() === classroom._id.toString());
    const classStudents = classroom.participants.filter(p =>
      students.some(s => s._id.toString() === p.toString())
    );

    for (const session of classSessions) {
      for (const studentId of classStudents) {
        const attendanceStatus = Math.random() > 0.2 ? "present" : Math.random() > 0.5 ? "late" : "absent";

        const attendanceLog = new AttendanceLog({
          sessionId: session._id,
          classId: classroom._id,
          userId: studentId,
          status: attendanceStatus,
          enteredAt: attendanceStatus !== "absent" ? new Date(session.createdAt.getTime() + Math.random() * 600000) : null,
          leftAt: attendanceStatus !== "absent" ? new Date(session.createdAt.getTime() + 4200000 + Math.random() * 600000) : null,
          duration: attendanceStatus !== "absent" ? 70 : 0,
          sessionDate: session.date,
        });

        await attendanceLog.save();
        attendanceLogs.push(attendanceLog);
      }
    }
  }

  console.log(`✅ Created ${attendanceLogs.length} attendance logs`);
  return attendanceLogs;
};

/**
 * Create assignment submissions
 */
const createAssignmentSubmissions = async (users, conversations) => {
  console.log("📝 Creating assignment submissions...");

  const submissions = [];
  const classrooms = conversations.filter(c => c.group?.type === "classroom");
  const students = users.filter(u => u.role === "user");
  const teachers = users.filter(u => u.role === "teacher");

  for (const classroom of classrooms) {
    const classStudents = classroom.participants.filter(p =>
      students.some(s => s._id.toString() === p.toString())
    );

    for (let i = 0; i < SAMPLE_ASSIGNMENTS.length; i++) {
      const assignment = SAMPLE_ASSIGNMENTS[i];

      for (const studentId of classStudents.slice(0, 3)) { // Only first 3 students per assignment
        const submission = new AssignmentSubmission({
          classId: classroom._id,
          userId: studentId,
          assignmentTitle: assignment.assignmentTitle,
          assignmentDescription: assignment.assignmentDescription,
          status: assignment.status,
          file: {
            url: `/uploads/submission_${studentId}_${i + 1}.pdf`,
            name: `submission_${i + 1}.pdf`,
            size: Math.floor(Math.random() * 5000000) + 1000000,
            type: "application/pdf",
          },
          mark: assignment.mark || null,
          markedBy: assignment.mark ? teachers[0]._id : null,
          markedAt: assignment.mark ? new Date() : null,
          feedback: assignment.feedback || "",
          submittedAt: new Date(Date.now() - Math.random() * 604800000), // Random within last week
        });

        await submission.save();
        submissions.push(submission);
      }
    }
  }

  console.log(`✅ Created ${submissions.length} assignment submissions`);
  return submissions;
};

/**
 * Create alertness sessions
 */
const createAlertnessSessions = async (users, conversations) => {
  console.log("🚨 Creating alertness sessions...");

  const alertnessSessions = [];
  const classrooms = conversations.filter(c => c.group?.type === "classroom");
  const teachers = users.filter(u => u.role === "teacher");

  for (const classroom of classrooms) {
    // Create a few alertness sessions per classroom
    for (let i = 0; i < 3; i++) {
      const startTime = new Date(Date.now() - Math.random() * 86400000); // Random within last 24h
      const duration = 30000; // 30 seconds

      const session = new AlertnessSession({
        classId: classroom._id,
        startedBy: teachers[0]._id,
        duration: duration,
        startTime: startTime,
        endTime: new Date(startTime.getTime() + duration),
        isActive: i === 0, // Only first one is active
        totalParticipants: classroom.participants.length,
        responseRate: Math.floor(Math.random() * 100),
      });

      // Add some responses
      const participants = classroom.participants.slice(0, Math.floor(Math.random() * classroom.participants.length) + 1);
      session.responses = participants.map(participantId => ({
        userId: participantId,
        respondedAt: new Date(startTime.getTime() + Math.random() * duration),
        responseTime: Math.floor(Math.random() * duration),
      }));

      await session.save();
      alertnessSessions.push(session);
    }
  }

  console.log(`✅ Created ${alertnessSessions.length} alertness sessions`);
  return alertnessSessions;
};

/**
 * Create quick lessons
 */
const createQuickLessons = async (users, conversations) => {
  console.log("📚 Creating quick lessons...");

  const quickLessons = [];
  const classrooms = conversations.filter(c => c.group?.type === "classroom");
  const teachers = users.filter(u => u.role === "teacher");

  for (const classroom of classrooms) {
    for (const lessonData of SAMPLE_QUICK_LESSONS) {
      const quickLesson = new QuickLesson({
        user: teachers[0]._id,
        conversationId: classroom._id,
        lessonName: lessonData.lessonName,
        lessonParts: lessonData.lessonParts,
      });

      await quickLesson.save();
      quickLessons.push(quickLesson);
    }
  }

  console.log(`✅ Created ${quickLessons.length} quick lessons`);
  return quickLessons;
};

/**
 * Create notifications
 */
const createNotifications = async (users) => {
  console.log("🔔 Creating notifications...");

  const notifications = [];
  const students = users.filter(u => u.role === "user");
  const teachers = users.filter(u => u.role === "teacher");

  // Assignment notifications
  for (const student of students.slice(0, 3)) {
    const notification = new Notification({
      recipient: student._id,
      sender: teachers[0]._id,
      type: "assignment",
      title: "New Assignment Posted",
      message: "A new programming assignment has been posted in CS101",
      data: { classId: "cs101", assignmentId: "assign1" },
      isRead: Math.random() > 0.5,
    });
    await notification.save();
    notifications.push(notification);
  }

  // Grade notifications
  for (const student of students.slice(1, 4)) {
    const notification = new Notification({
      recipient: student._id,
      sender: teachers[1]._id,
      type: "grade",
      title: "Assignment Graded",
      message: "Your calculus assignment has been graded",
      data: { classId: "math201", assignmentId: "calc1", grade: 85 },
      isRead: false,
    });
    await notification.save();
    notifications.push(notification);
  }

  // Join request notifications
  for (const teacher of teachers) {
    const notification = new Notification({
      recipient: teacher._id,
      sender: students[0]._id,
      type: "join_request",
      title: "New Join Request",
      message: "Alice Chen wants to join your English class",
      data: { classId: "eng301", userId: students[0]._id },
      isRead: Math.random() > 0.5,
    });
    await notification.save();
    notifications.push(notification);
  }

  console.log(`✅ Created ${notifications.length} notifications`);
  return notifications;
};

/**
 * Create reports
 */
const createReports = async (users) => {
  console.log("🚨 Creating reports...");

  const reports = [];
  const students = users.filter(u => u.role === "user");
  const moderators = users.filter(u => u.role === "moderator");

  const reasons = ["spam", "harassment", "hate_speech", "false_info", "other"];
  const statuses = ["pending", "reviewed", "resolved", "dismissed"];

  for (let i = 0; i < 5; i++) {
    const reporter = students[Math.floor(Math.random() * students.length)];
    const reportedUser = students.find(s => s._id.toString() !== reporter._id.toString());

    if (reportedUser) {
      const report = new Report({
        reporter: reporter._id,
        reportedUser: reportedUser._id,
        conversation: null, // Would need conversation ID in real scenario
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        details: `Inappropriate behavior in class discussion ${i + 1}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        reviewedBy: Math.random() > 0.5 ? moderators[0]._id : null,
        reviewedAt: Math.random() > 0.5 ? new Date() : null,
        resolution: Math.random() > 0.5 ? "User warned about community guidelines" : "",
        actionTaken: Math.random() > 0.3 ? "warning" : "none",
      });

      await report.save();
      reports.push(report);
    }
  }

  console.log(`✅ Created ${reports.length} reports`);
  return reports;
};

/**
 * Create default admin settings
 */
const createAdminSettings = async (adminUserId) => {
  console.log("⚙️  Creating default admin settings...");

  const adminSettings = new AdminSettings({
    features: {
      voice_messages: true,
      sms_notifications: true,
      image_sharing: true,
      video_sharing: true,
      file_sharing: true,
      voice_calling: true,
      video_calling: true,
      group_creation: true,
      user_registration: true,
    },
    security: {
      require_admin_approval: true,
      auto_approve_after_hours: 24,
      max_file_size_mb: 50,
      allowed_file_types: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "mp3", "mp4", "webp", "svg"],
      message_encryption: true,
      two_factor_required: false,
      session_timeout_minutes: 60,
    },
    moderation: {
      auto_moderate_messages: false,
      blocked_words: ["spam", "inappropriate", "banned"],
      max_message_length: 5000,
      spam_detection: true,
      image_content_filter: false,
    },
    rate_limits: {
      messages_per_minute: 30,
      files_per_hour: 10,
      friend_requests_per_day: 20,
      group_creation_per_day: 5,
    },
    notifications: {
      admin_email_alerts: true,
      new_user_notifications: true,
      suspicious_activity_alerts: true,
      system_maintenance_mode: false,
    },
    updated_by: adminUserId,
  });

  await adminSettings.save();

  console.log("✅ Admin settings created successfully!");
  return adminSettings;
};

/**
 * Main seed function
 */
const seed = async () => {
  console.log("\n" + "=".repeat(80));
  console.log("🌱 Comprehensive Database Seed Script");
  console.log("=".repeat(80) + "\n");

  try {
    // Connect to database
    await connectDatabase();

    // Check if users already exist
    const usersExist = await hasUsers();

    if (usersExist) {
      console.log("ℹ️  Users already exist in the database.");
      console.log("   Skipping seeding to prevent duplicates.");
      console.log("   Use --force flag to reset (not implemented for safety).");
      return;
    }

    console.log("📭 No users found in the database.");
    console.log("   Starting comprehensive data seeding...\n");

    // Create all data in order
    const users = await createUsers();
    const friendships = await createFriendships(users);
    const conversations = await createConversations(users);
    const joinRequests = await createJoinRequests(users, conversations);
    const messages = await createMessages(users, conversations);
    const sessions = await createSessions(conversations);
    const attendanceLogs = await createAttendanceLogs(users, conversations, sessions);
    const submissions = await createAssignmentSubmissions(users, conversations);
    const alertnessSessions = await createAlertnessSessions(users, conversations);
    const quickLessons = await createQuickLessons(users, conversations);
    const notifications = await createNotifications(users);
    const reports = await createReports(users);

    // Create admin settings
    const superadmin = users.find(u => u.role === "superadmin");
    await createAdminSettings(superadmin._id);

    console.log("\n" + "=".repeat(80));
    console.log("🎉 Database seeding completed successfully!");
    console.log("=".repeat(80));
    console.log("\n📊 Summary:");
    console.log(`   👥 Users: ${users.length} (${users.filter(u => u.role === "superadmin").length} superadmin, ${users.filter(u => u.role === "admin").length} admins, ${users.filter(u => u.role === "moderator").length} moderators, ${users.filter(u => u.role === "teacher").length} teachers, ${users.filter(u => u.role === "user").length} students)`);
    console.log(`   🤝 Friendships: ${friendships.length}`);
    console.log(`   💬 Conversations: ${conversations.length} (${conversations.filter(c => c.group?.type === "classroom").length} classrooms, ${conversations.filter(c => c.group?.type === "group").length} groups, ${conversations.filter(c => !c.group?.is_group).length} private)`);
    console.log(`   📝 Join Requests: ${joinRequests.length}`);
    console.log(`   💭 Messages: ${messages.length}`);
    console.log(`   📅 Sessions: ${sessions.length}`);
    console.log(`   📊 Attendance Logs: ${attendanceLogs.length}`);
    console.log(`   📝 Assignment Submissions: ${submissions.length}`);
    console.log(`   🚨 Alertness Sessions: ${alertnessSessions.length}`);
    console.log(`   📚 Quick Lessons: ${quickLessons.length}`);
    console.log(`   🔔 Notifications: ${notifications.length}`);
    console.log(`   🚨 Reports: ${reports.length}`);
    console.log("\n🔐 Login Credentials:");
    console.log("   Super Admin: superadmin@chatapp.com / Admin@123!");
    console.log("   Admin: admin.sarah@chatapp.com / Admin@123!");
    console.log("   Teacher: dr.johnson@university.edu / Teacher@123!");
    console.log("   Student: alice.chen@student.edu / Student@123!");
    console.log("   Moderator: mod.alex@chatapp.com / Mod@123!");
    console.log("\n⚠️  Remember to change default passwords in production!\n");
  } catch (error) {
    console.error("\n❌ Seed Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
};

/**
 * Run seed with optional force flag
 */
const runSeed = async () => {
  const args = process.argv.slice(2);
  const forceFlag = args.includes("--force") || args.includes("-f");

  if (forceFlag) {
    console.log("⚠️  Force flag detected. This will reset all users!");
    console.log("   This feature is disabled by default for safety.");
    console.log("   If you really want to reset, manually delete users first.\n");
  }

  await seed();
};

// Run the seed script
runSeed();
