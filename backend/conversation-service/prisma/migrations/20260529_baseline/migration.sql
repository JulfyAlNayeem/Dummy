-- CreateTable
CREATE TABLE `conversations` (
	`id` VARCHAR(191) NOT NULL,
	`status` ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
	`visibility` ENUM('public', 'private') NOT NULL DEFAULT 'public',
	`is_group` BOOLEAN NOT NULL DEFAULT false,
	`group_type` ENUM('group', 'classroom') NULL,
	`group_name` VARCHAR(191) NULL,
	`group_intro` TEXT NULL,
	`group_image` VARCHAR(191) NOT NULL DEFAULT '/images/cover/default-cover.jpg',
	`perm_text` BOOLEAN NOT NULL DEFAULT true,
	`perm_image` BOOLEAN NOT NULL DEFAULT true,
	`perm_voice` BOOLEAN NOT NULL DEFAULT false,
	`perm_video` BOOLEAN NOT NULL DEFAULT false,
	`perm_file` BOOLEAN NOT NULL DEFAULT false,
	`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` DATETIME(3) NOT NULL,

	INDEX `conversations_visibility_idx`(`visibility`),
	INDEX `conversations_group_type_idx`(`group_type`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_profiles` (
	`id` VARCHAR(191) NOT NULL,
	`conversationId` VARCHAR(191) NOT NULL,
	`class_type` ENUM('regular', 'weekly', 'multi-weekly', 'monthly', 'exam') NOT NULL DEFAULT 'regular',
	`file_sending_allowed` BOOLEAN NOT NULL DEFAULT false,
	`start_time` VARCHAR(191) NOT NULL DEFAULT '09:00',
	`cutoff_time` VARCHAR(191) NOT NULL DEFAULT '09:15',
	`check_interval` INTEGER NOT NULL DEFAULT 15,
	`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` DATETIME(3) NOT NULL,

	UNIQUE INDEX `class_profiles_conversationId_key`(`conversationId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_participants` (
	`id` VARCHAR(191) NOT NULL,
	`conversationId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,

	INDEX `conversation_participants_userId_idx`(`userId`),
	UNIQUE INDEX `conversation_participants_conversationId_userId_key`(`conversationId`, `userId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_admins` (
	`id` VARCHAR(191) NOT NULL,
	`conversationId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,

	UNIQUE INDEX `conversation_admins_conversationId_userId_key`(`conversationId`, `userId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_moderators` (
	`id` VARCHAR(191) NOT NULL,
	`conversationId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,

	UNIQUE INDEX `conversation_moderators_conversationId_userId_key`(`conversationId`, `userId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_selected_days` (
	`id` VARCHAR(191) NOT NULL,
	`conversationId` VARCHAR(191) NOT NULL,
	`day` INTEGER NOT NULL,

	UNIQUE INDEX `conversation_selected_days_conversationId_day_key`(`conversationId`, `day`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `join_requests` (
	`id` VARCHAR(191) NOT NULL,
	`classId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,
	`status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
	`requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`processedAt` DATETIME(3) NULL,
	`processedById` VARCHAR(191) NULL,
	`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` DATETIME(3) NOT NULL,

	INDEX `join_requests_status_idx`(`status`),
	UNIQUE INDEX `join_requests_classId_userId_key`(`classId`, `userId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
	`id` VARCHAR(191) NOT NULL,
	`classId` VARCHAR(191) NOT NULL,
	`date` VARCHAR(191) NOT NULL,
	`startTime` VARCHAR(191) NOT NULL,
	`type` ENUM('auto', 'manual') NOT NULL DEFAULT 'auto',
	`createdById` VARCHAR(191) NULL,
	`status` ENUM('scheduled', 'ongoing', 'completed') NOT NULL DEFAULT 'scheduled',
	`duration` INTEGER NOT NULL DEFAULT 70,
	`cutoffTime` VARCHAR(191) NULL,
	`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` DATETIME(3) NOT NULL,

	INDEX `sessions_status_idx`(`status`),
	UNIQUE INDEX `sessions_classId_date_startTime_key`(`classId`, `date`, `startTime`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alertness_sessions` (
	`id` VARCHAR(191) NOT NULL,
	`classId` VARCHAR(191) NOT NULL,
	`startedById` VARCHAR(191) NULL,
	`duration` INTEGER NOT NULL,
	`startTime` DATETIME(3) NOT NULL,
	`endTime` DATETIME(3) NULL,
	`isActive` BOOLEAN NOT NULL DEFAULT true,
	`totalParticipants` INTEGER NOT NULL DEFAULT 0,
	`responseRate` DOUBLE NOT NULL DEFAULT 0,
	`responses` JSON NULL,
	`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` DATETIME(3) NOT NULL,

	INDEX `alertness_sessions_classId_startTime_idx`(`classId`, `startTime`),
	INDEX `alertness_sessions_isActive_idx`(`isActive`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_logs` (
	`id` VARCHAR(191) NOT NULL,
	`sessionId` VARCHAR(191) NOT NULL,
	`classId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,
	`status` ENUM('present', 'late', 'absent', 'excused') NOT NULL DEFAULT 'absent',
	`enteredAt` DATETIME(3) NULL,
	`leftAt` DATETIME(3) NULL,
	`duration` INTEGER NULL,
	`sessionDate` VARCHAR(191) NOT NULL,
	`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` DATETIME(3) NOT NULL,

	INDEX `attendance_logs_enteredAt_idx`(`enteredAt`),
	UNIQUE INDEX `attendance_logs_sessionId_userId_sessionDate_key`(`sessionId`, `userId`, `sessionDate`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignment_submissions` (
	`id` VARCHAR(191) NOT NULL,
	`classId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,
	`assignmentTitle` VARCHAR(191) NOT NULL,
	`assignmentDescription` TEXT NOT NULL,
	`status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
	`fileUrl` VARCHAR(191) NULL,
	`fileName` VARCHAR(191) NULL,
	`fileSize` INTEGER NULL,
	`fileType` VARCHAR(191) NULL,
	`mark` INTEGER NULL,
	`feedback` TEXT NULL,
	`markedById` VARCHAR(191) NULL,
	`markedAt` DATETIME(3) NULL,
	`submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` DATETIME(3) NOT NULL,

	INDEX `assignment_submissions_classId_userId_idx`(`classId`, `userId`),
	INDEX `assignment_submissions_submittedAt_idx`(`submittedAt`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `class_profiles` ADD CONSTRAINT `class_profiles_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_admins` ADD CONSTRAINT `conversation_admins_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_admins` ADD CONSTRAINT `conversation_admins_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_moderators` ADD CONSTRAINT `conversation_moderators_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_moderators` ADD CONSTRAINT `conversation_moderators_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_selected_days` ADD CONSTRAINT `conversation_selected_days_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `join_requests` ADD CONSTRAINT `join_requests_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `join_requests` ADD CONSTRAINT `join_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `join_requests` ADD CONSTRAINT `join_requests_processedById_fkey` FOREIGN KEY (`processedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertness_sessions` ADD CONSTRAINT `alertness_sessions_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertness_sessions` ADD CONSTRAINT `alertness_sessions_startedById_fkey` FOREIGN KEY (`startedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_logs` ADD CONSTRAINT `attendance_logs_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_logs` ADD CONSTRAINT `attendance_logs_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_logs` ADD CONSTRAINT `attendance_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_markedById_fkey` FOREIGN KEY (`markedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
