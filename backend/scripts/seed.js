/**
 * Seed Script - Auto-populates database with initial data if empty
 * 
 * This script checks if the database has any users. If not, it creates:
 * - A superadmin user
 * - Default admin settings
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

// Database connection options (matching connectdb.js)
const DB_OPTIONS = {
  dbName: process.env.DB_NAME,
  autoIndex: false,
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Default superadmin user configuration
const DEFAULT_SUPERADMIN = {
  name: "Super Admin",
  email: "admin@chatapp.com",
  password: "Admin@123!",  // Change this in production!
  gender: "male",
  role: "superadmin",
  is_active: true,
  image: "/images/avatar/default-avatar.svg",
  bio: "System Administrator",
  themeIndex: 0,
  fileSendingAllowed: true,
  notification_settings: {
    new_message: true,
    mention: true,
    sound: true,
  },
  device_tokens: [],
  two_factor_auth: {
    enabled: false,
    secret: null,
  },
};

// Default admin settings configuration
const DEFAULT_ADMIN_SETTINGS = {
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
    blocked_words: [],
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
};

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
 * Check if admin settings exist
 */
const hasAdminSettings = async () => {
  const settingsCount = await AdminSettings.countDocuments();
  return settingsCount > 0;
};

/**
 * Create the superadmin user
 */
const createSuperAdmin = async () => {
  console.log("👤 Creating superadmin user...");

  // Hash the password
  const hashedPassword = await bcrypt.hash(DEFAULT_SUPERADMIN.password, 10);

  const superadmin = new User({
    ...DEFAULT_SUPERADMIN,
    password: hashedPassword,
  });

  await superadmin.save();

  console.log("✅ Superadmin user created successfully!");
  console.log("   📧 Email:", DEFAULT_SUPERADMIN.email);
  console.log("   🔐 Password:", DEFAULT_SUPERADMIN.password);
  console.log("   ⚠️  Please change the password after first login!");

  return superadmin;
};

/**
 * Create default admin settings
 */
const createAdminSettings = async (adminUserId) => {
  console.log("⚙️  Creating default admin settings...");

  const adminSettings = new AdminSettings({
    ...DEFAULT_ADMIN_SETTINGS,
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
  console.log("\n" + "=".repeat(60));
  console.log("🌱 Database Seed Script");
  console.log("=".repeat(60) + "\n");

  try {
    // Connect to database
    await connectDatabase();

    // Check if users already exist
    const usersExist = await hasUsers();
    
    if (usersExist) {
      console.log("ℹ️  Users already exist in the database.");
      console.log("   Skipping user seeding to prevent duplicates.");
      
      // Check if admin settings exist
      const settingsExist = await hasAdminSettings();
      
      if (!settingsExist) {
        console.log("\n⚠️  No admin settings found. Creating default settings...");
        
        // Find superadmin to link settings
        const superadmin = await User.findOne({ role: "superadmin" });
        
        if (superadmin) {
          await createAdminSettings(superadmin._id);
        } else {
          // Find any admin user
          const anyAdmin = await User.findOne({ 
            role: { $in: ["superadmin", "admin"] } 
          });
          
          if (anyAdmin) {
            await createAdminSettings(anyAdmin._id);
          } else {
            console.log("⚠️  No admin user found. Cannot create admin settings.");
          }
        }
      } else {
        console.log("ℹ️  Admin settings already exist.");
      }
      
    } else {
      console.log("📭 No users found in the database.");
      console.log("   Starting initial data seeding...\n");

      // Create superadmin user
      const superadmin = await createSuperAdmin();

      // Create admin settings
      await createAdminSettings(superadmin._id);

      console.log("\n" + "=".repeat(60));
      console.log("🎉 Database seeding completed successfully!");
      console.log("=".repeat(60));
      console.log("\n📝 Summary:");
      console.log("   - Created 1 superadmin user");
      console.log("   - Created default admin settings");
      console.log("\n🚀 You can now start the application and login with:");
      console.log(`   Email: ${DEFAULT_SUPERADMIN.email}`);
      console.log(`   Password: ${DEFAULT_SUPERADMIN.password}`);
      console.log("\n⚠️  Remember to change the default password!\n");
    }

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
 * Usage: node scripts/seed.js --force
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
