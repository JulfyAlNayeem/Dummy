-- Add social profile fields to users table
-- These columns are used by social-service for user profiles (cover image, website, location)

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `cover_image` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `website` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `location` VARCHAR(191) NULL;
