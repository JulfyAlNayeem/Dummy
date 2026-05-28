-- CreateTable
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL DEFAULT '/images/avatar/default-avatar.svg',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calls` (
    `id` VARCHAR(191) NOT NULL,
    `caller_id` VARCHAR(191) NOT NULL,
    `call_type` ENUM('audio', 'video') NOT NULL,
    `is_group` BOOLEAN NOT NULL DEFAULT false,
    `conversation_id` VARCHAR(191) NULL,
    `status` ENUM('initiated', 'ringing', 'ongoing', 'ended', 'missed', 'declined', 'failed') NOT NULL DEFAULT 'initiated',
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,
    `duration` INTEGER NOT NULL DEFAULT 0,
    `end_reason` ENUM('normal', 'missed', 'declined', 'busy', 'failed', 'network_error', 'timeout') NULL,
    `room_id` VARCHAR(191) NULL,
    `quality_avg_bitrate` DOUBLE NULL,
    `quality_packet_loss` DOUBLE NULL,
    `quality_latency` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `calls_caller_id_created_at_idx`(`caller_id`, `created_at` DESC),
    INDEX `calls_conversation_id_created_at_idx`(`conversation_id`, `created_at` DESC),
    INDEX `calls_status_idx`(`status`),
    INDEX `calls_room_id_idx`(`room_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `call_participants` (
    `id` VARCHAR(191) NOT NULL,
    `call_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `status` ENUM('ringing', 'accepted', 'declined', 'missed', 'busy', 'left', 'removed') NOT NULL DEFAULT 'ringing',
    `joined_at` DATETIME(3) NULL,
    `left_at` DATETIME(3) NULL,
    `has_audio` BOOLEAN NOT NULL DEFAULT true,
    `has_video` BOOLEAN NOT NULL DEFAULT false,

    INDEX `call_participants_user_id_call_id_idx`(`user_id`, `call_id`),
    UNIQUE INDEX `call_participants_call_id_user_id_key`(`call_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `calls` ADD CONSTRAINT `calls_caller_id_fkey` FOREIGN KEY (`caller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `call_participants` ADD CONSTRAINT `call_participants_call_id_fkey` FOREIGN KEY (`call_id`) REFERENCES `calls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `call_participants` ADD CONSTRAINT `call_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
