-- Message service support tables only.
-- Core message tables (`messages`, `message_media`, `unread_messages`) are
-- owned by backend/api-service in the shared schema.

-- CreateTable
CREATE TABLE `message_read_by` (
	`id` VARCHAR(191) NOT NULL,
	`messageId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,
	`readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	UNIQUE INDEX `message_read_by_messageId_userId_key`(`messageId`, `userId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_deleted_by` (
	`id` VARCHAR(191) NOT NULL,
	`messageId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,

	UNIQUE INDEX `message_deleted_by_messageId_userId_key`(`messageId`, `userId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_edit_history` (
	`id` VARCHAR(191) NOT NULL,
	`messageId` VARCHAR(191) NOT NULL,
	`oldText` TEXT NOT NULL,
	`editedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_reactions` (
	`id` VARCHAR(191) NOT NULL,
	`messageId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,
	`type` VARCHAR(191) NOT NULL,
	`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	UNIQUE INDEX `message_reactions_messageId_userId_key`(`messageId`, `userId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_unreads` (
	`id` VARCHAR(191) NOT NULL,
	`conversationId` VARCHAR(191) NOT NULL,
	`userId` VARCHAR(191) NOT NULL,
	`count` INTEGER NOT NULL DEFAULT 0,

	UNIQUE INDEX `conversation_unreads_conversationId_userId_key`(`conversationId`, `userId`),
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `message_read_by` ADD CONSTRAINT `message_read_by_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_read_by` ADD CONSTRAINT `message_read_by_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_deleted_by` ADD CONSTRAINT `message_deleted_by_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_deleted_by` ADD CONSTRAINT `message_deleted_by_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_edit_history` ADD CONSTRAINT `message_edit_history_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_reactions` ADD CONSTRAINT `message_reactions_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_reactions` ADD CONSTRAINT `message_reactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_unreads` ADD CONSTRAINT `conversation_unreads_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
