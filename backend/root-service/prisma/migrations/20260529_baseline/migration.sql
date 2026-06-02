-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL DEFAULT '/images/avatar/default-avatar.png',
    `bio` VARCHAR(150) NULL,
    `role` ENUM('user', 'admin', 'superadmin', 'moderator', 'teacher', 'developer') NOT NULL DEFAULT 'user',
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `last_seen` DATETIME(3) NULL,
    `themeIndex` INTEGER NOT NULL DEFAULT 0,
    `fileSendingAllowed` BOOLEAN NOT NULL DEFAULT false,
    `cover_image` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `notif_new_message` BOOLEAN NULL,
    `notif_mention` BOOLEAN NULL,
    `notif_sound` BOOLEAN NULL,
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `two_factor_secret` VARCHAR(191) NULL,
    `is_email_verified` BOOLEAN NOT NULL DEFAULT false,
    `email_verification_token` VARCHAR(191) NULL,
    `password_reset_token` VARCHAR(191) NULL,
    `password_reset_expires` DATETIME(3) NULL,
    `refresh_token` TEXT NULL,
    `blocked_at` DATETIME(3) NULL,
    `block_reason` VARCHAR(191) NULL,
    `block_duration` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_name_key`(`name`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blocks` (
    `id` VARCHAR(191) NOT NULL,
    `blockerId` VARCHAR(191) NOT NULL,
    `blockedId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `blocks_blockerId_blockedId_key`(`blockerId`, `blockedId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminders` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `datetime` DATETIME(3) NOT NULL,
    `repeat` ENUM('one-time', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'one-time',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `notified` BOOLEAN NOT NULL DEFAULT false,
    `notifiedAt` DATETIME(3) NULL,
    `visibleTo` ENUM('creator', 'both') NOT NULL DEFAULT 'creator',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reminders_datetime_notified_enabled_idx`(`datetime`, `notified`, `enabled`),
    INDEX `reminders_userId_datetime_idx`(`userId`, `datetime`),
    INDEX `reminders_conversationId_datetime_idx`(`conversationId`, `datetime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `rejectionReason` TEXT NULL,
    `approvalNotes` TEXT NULL,
    `user_agent` VARCHAR(191) NULL,
    `registration_source` VARCHAR(191) NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `phone_verified` BOOLEAN NOT NULL DEFAULT false,
    `riskScore` INTEGER NOT NULL DEFAULT 0,
    `autoApproved` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_approvals_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_deletion_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `scheduledFor` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NOT NULL DEFAULT 'Inactive for 7+ months',
    `status` ENUM('scheduled', 'prevented', 'deleted', 'cancelled') NOT NULL DEFAULT 'scheduled',
    `preventedById` VARCHAR(191) NULL,
    `preventedAt` DATETIME(3) NULL,
    `preventionReason` TEXT NULL,
    `lastActivity` DATETIME(3) NULL,
    `notificationSent` BOOLEAN NOT NULL DEFAULT false,
    `finalWarningSent` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` ENUM('user', 'conversation', 'message', 'settings', 'system') NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `user_agent` VARCHAR(191) NULL,
    `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_settings` (
    `id` VARCHAR(191) NOT NULL,
    `feat_voice_messages` BOOLEAN NOT NULL DEFAULT true,
    `feat_sms_notif` BOOLEAN NOT NULL DEFAULT true,
    `feat_image_sharing` BOOLEAN NOT NULL DEFAULT true,
    `feat_video_sharing` BOOLEAN NOT NULL DEFAULT true,
    `feat_file_sharing` BOOLEAN NOT NULL DEFAULT true,
    `feat_voice_calling` BOOLEAN NOT NULL DEFAULT true,
    `feat_video_calling` BOOLEAN NOT NULL DEFAULT true,
    `feat_group_creation` BOOLEAN NOT NULL DEFAULT true,
    `feat_user_registration` BOOLEAN NOT NULL DEFAULT true,
    `sec_require_admin_approval` BOOLEAN NOT NULL DEFAULT true,
    `sec_auto_approve_after_hours` INTEGER NOT NULL DEFAULT 24,
    `sec_max_file_size_mb` INTEGER NOT NULL DEFAULT 50,
    `sec_message_encryption` BOOLEAN NOT NULL DEFAULT true,
    `sec_two_factor_required` BOOLEAN NOT NULL DEFAULT false,
    `sec_session_timeout_minutes` INTEGER NOT NULL DEFAULT 60,
    `mod_auto_moderate` BOOLEAN NOT NULL DEFAULT false,
    `mod_max_message_length` INTEGER NOT NULL DEFAULT 1000,
    `mod_spam_detection` BOOLEAN NOT NULL DEFAULT true,
    `mod_image_content_filter` BOOLEAN NOT NULL DEFAULT false,
    `rl_messages_per_minute` INTEGER NOT NULL DEFAULT 30,
    `rl_files_per_hour` INTEGER NOT NULL DEFAULT 10,
    `rl_friend_requests_per_day` INTEGER NOT NULL DEFAULT 20,
    `rl_group_creation_per_day` INTEGER NOT NULL DEFAULT 5,
    `notif_admin_email_alerts` BOOLEAN NOT NULL DEFAULT true,
    `notif_new_user_notifications` BOOLEAN NOT NULL DEFAULT true,
    `notif_suspicious_activity_alerts` BOOLEAN NOT NULL DEFAULT true,
    `notif_system_maintenance_mode` BOOLEAN NOT NULL DEFAULT false,
    `updatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_settings_allowed_file_types` (
    `id` VARCHAR(191) NOT NULL,
    `adminSettingsId` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_settings_blocked_words` (
    `id` VARCHAR(191) NOT NULL,
    `adminSettingsId` VARCHAR(191) NOT NULL,
    `word` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimetype` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `files_uploadedById_idx`(`uploadedById`),
    INDEX `files_classId_idx`(`classId`),
    INDEX `files_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notices` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `targetAudience` ENUM('all', 'user', 'admin', 'superadmin', 'moderator', 'teacher') NOT NULL,
    `eventType` ENUM('general', 'holiday', 'exam', 'meeting', 'special', 'announcement') NOT NULL DEFAULT 'general',
    `creatorId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `eventDate` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notices_creatorId_idx`(`creatorId`),
    INDEX `notices_createdAt_idx`(`createdAt`),
    INDEX `notices_eventType_idx`(`eventType`),
    INDEX `notices_targetAudience_idx`(`targetAudience`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notice_likes` (
    `id` VARCHAR(191) NOT NULL,
    `noticeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `notice_likes_noticeId_userId_key`(`noticeId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notice_reads` (
    `id` VARCHAR(191) NOT NULL,
    `noticeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `notice_reads_noticeId_userId_key`(`noticeId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notice_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `noticeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `notice_recipients_noticeId_userId_key`(`noticeId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NULL,
    `type` ENUM('assignment', 'grade', 'class_invite', 'join_request', 'message', 'system', 'notice', 'friend_request', 'friend_accept', 'like', 'mention', 'comment', 'admin_alert', 'role_change', 'account_action', 'reminder', 'attendance', 'form', 'permission', 'report') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `data` JSON NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notifications_recipientId_isRead_idx`(`recipientId`, `isRead`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_requests` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `requesterId` VARCHAR(191) NOT NULL,
    `permissionType` ENUM('text', 'image', 'voice', 'video', 'file', 'sticker', 'gif') NOT NULL,
    `reason` VARCHAR(500) NOT NULL DEFAULT '',
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` VARCHAR(500) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `permission_requests_conversationId_requesterId_status_idx`(`conversationId`, `requesterId`, `status`),
    INDEX `permission_requests_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quick_messages` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `reportedUserId` VARCHAR(191) NULL,
    `conversationId` VARCHAR(191) NULL,
    `reportType` ENUM('user_report', 'bug_report') NOT NULL DEFAULT 'user_report',
    `reason` ENUM('spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'false_info', 'impersonation', 'other', 'ui_bug', 'crash', 'performance', 'data_loss', 'security_issue', 'feature_request') NOT NULL,
    `details` VARCHAR(2000) NOT NULL DEFAULT '',
    `status` ENUM('pending', 'reviewed', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `resolution` VARCHAR(500) NOT NULL DEFAULT '',
    `actionTaken` ENUM('none', 'warning', 'temporary_ban', 'permanent_ban', 'content_removed') NOT NULL DEFAULT 'none',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reports_reporterId_conversationId_idx`(`reporterId`, `conversationId`),
    INDEX `reports_reportedUserId_idx`(`reportedUserId`),
    INDEX `reports_status_idx`(`status`),
    INDEX `reports_reportType_idx`(`reportType`),
    INDEX `reports_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_security_messages` (
    `id` VARCHAR(191) NOT NULL,
    `goodMessage` TEXT NOT NULL,
    `badMessage` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_blockerId_fkey` FOREIGN KEY (`blockerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_blockedId_fkey` FOREIGN KEY (`blockedId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_approvals` ADD CONSTRAINT `user_approvals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_approvals` ADD CONSTRAINT `user_approvals_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_deletion_schedules` ADD CONSTRAINT `user_deletion_schedules_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_deletion_schedules` ADD CONSTRAINT `user_deletion_schedules_preventedById_fkey` FOREIGN KEY (`preventedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_activity_logs` ADD CONSTRAINT `admin_activity_logs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_settings` ADD CONSTRAINT `admin_settings_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_settings_allowed_file_types` ADD CONSTRAINT `admin_settings_allowed_file_types_adminSettingsId_fkey` FOREIGN KEY (`adminSettingsId`) REFERENCES `admin_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_settings_blocked_words` ADD CONSTRAINT `admin_settings_blocked_words_adminSettingsId_fkey` FOREIGN KEY (`adminSettingsId`) REFERENCES `admin_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notices` ADD CONSTRAINT `notices_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_likes` ADD CONSTRAINT `notice_likes_noticeId_fkey` FOREIGN KEY (`noticeId`) REFERENCES `notices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_likes` ADD CONSTRAINT `notice_likes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_reads` ADD CONSTRAINT `notice_reads_noticeId_fkey` FOREIGN KEY (`noticeId`) REFERENCES `notices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_reads` ADD CONSTRAINT `notice_reads_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_recipients` ADD CONSTRAINT `notice_recipients_noticeId_fkey` FOREIGN KEY (`noticeId`) REFERENCES `notices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_recipients` ADD CONSTRAINT `notice_recipients_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quick_messages` ADD CONSTRAINT `quick_messages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

