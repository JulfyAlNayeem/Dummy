/**
 * User Seed Script
 * Seeds one user for every role: superadmin, admin, moderator, teacher, developer, user
 *
 * Usage:
 *   node scripts/seed.js
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/common/models/userModel.js";
import SiteSecurityMessage from "../src/modules/siteSecurity/models/siteSecurityMessageModel.js";

const connectDatabase = async () => {
  await mongoose.connect(process.env.DATABASE_URL, {
    dbName: process.env.DB_NAME,
    autoIndex: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  console.log("✅ Connected to database");
};

const disconnectDatabase = async () => {
  await mongoose.disconnect();
  console.log("🔌 Disconnected from database");
};

// One user per role
const SEED_USERS =  [
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
    name: "Admin Ahmed",
    email: "admin.ahmed@chatapp.com",
    password: "Admin@123!",
    gender: "male",
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
    name: "Moderator Ali",
    email: "mod.ali@chatapp.com",
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
    name: "Moderator Omar",
    email: "mod.omar@chatapp.com",
    password: "Mod@123!",
    gender: "male",
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
    name: "Prof. Muhammad",
    email: "prof.muhammad@university.edu",
    password: "Teacher@123!",
    gender: "male",
    role: "teacher",
    is_active: true,
    bio: "Mathematics Professor",
    themeIndex: 1,
    fileSendingAllowed: true,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  {
    name: "Mr. Hassan",
    email: "mr.hassan@university.edu",
    password: "Teacher@123!",
    gender: "male",
    role: "teacher",
    is_active: true,
    bio: "English Literature Teacher",
    themeIndex: 2,
    fileSendingAllowed: true,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
  // Students
  {
    name: "Ahmed Chen",
    email: "ahmed.chen@student.edu",
    password: "Student@123!",
    gender: "male",
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
    name: "Hassan Prince",
    email: "hassan.prince@student.edu",
    password: "Student@123!",
    gender: "male",
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
    name: "Ismail Green",
    email: "ismail.green@student.edu",
    password: "Student@123!",
    gender: "male",
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
    name: "Hussein Montana",
    email: "hussein.montana@student.edu",
    password: "Student@123!",
    gender: "male",
    role: "user",
    is_active: true,
    bio: "Music Performance",
    themeIndex: 0,
    fileSendingAllowed: false,
    notification_settings: { new_message: true, mention: true, sound: true },
  },
];

const seedSiteSecurityMessage = async () => {
  console.log("🔐 Seeding site security message...");

  const existing = await SiteSecurityMessage.findOne();
  if (existing) {
    console.log("⚠️  Skipping — site security message already exists");
    return existing;
  }

  const doc = await SiteSecurityMessage.create({
    goodMessage: "assalam",
    badMessage: "goodmorning",
  });
  console.log("   ✅ Created site security message (good: 'assalam', bad: 'goodmorning')");
  return doc;
};

const seedUsers = async () => {
  console.log("👥 Seeding users...");

  const saltRounds = 10;
  const createdUsers = [];

  for (const userData of SEED_USERS) {
    // Skip if user with this email already exists
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`⚠️  Skipping [${userData.role}] — already exists: ${userData.email}`);
      createdUsers.push(existing);
      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    const user = await User.create({ ...userData, password: hashedPassword });
    console.log(`   ✅ Created [${user.role}]: ${user.email}`);
    createdUsers.push(user);
  }

  return createdUsers;
};

const seed = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🌱 User Seed Script");
  console.log("=".repeat(60) + "\n");

  try {
    await connectDatabase();

    const users = await seedUsers();
    await seedSiteSecurityMessage();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Seeding complete!");
    console.log("=".repeat(60));
    console.log("\n🔐 Login Credentials:");
    console.log("   superadmin  → superadmin@chatapp.com       / Admin@123!");
    console.log("   admin       → admin.ahmed@chatapp.com      / Admin@123!");
    console.log("   moderator   → mod.ali@chatapp.com          / Mod@123!");
    console.log("   teacher     → dr.johnson@university.edu    / Teacher@123!");
    console.log("   user        → ahmed.chen@student.edu       / Student@123!");
    console.log("\n🔐 Site Security:");
    console.log("   Good message: 'assalam'     (allows access)");
    console.log("   Bad message:  'goodmorning' (denies access)");
    console.log("\n⚠️  Change default passwords before going to production!\n");
  } catch (error) {
    console.error("\n❌ Seed Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
};

// Run the seed
seed();