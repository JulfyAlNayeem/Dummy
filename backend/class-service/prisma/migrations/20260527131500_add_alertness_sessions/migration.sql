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

-- AddForeignKey
ALTER TABLE `alertness_sessions` ADD CONSTRAINT `alertness_sessions_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertness_sessions` ADD CONSTRAINT `alertness_sessions_startedById_fkey` FOREIGN KEY (`startedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
