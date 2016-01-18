DROP DATABASE IF EXISTS `ceilia`;
CREATE DATABASE IF NOT EXISTS `ceilia` DEFAULT CHARACTER SET utf8 DEFAULT COLLATE utf8_bin;

USE `ceilia`;

SET default_storage_engine=INNODB;

CREATE TABLE IF NOT EXISTS `hash`(
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `k` VARCHAR(16) UNIQUE KEY
);

CREATE TABLE IF NOT EXISTS `user`(
    `id` SERIAL PRIMARY KEY,
    `un` VARCHAR(16) NOT NULL,
    `sess` VARCHAR(32) NOT NULL,
    `status` TINYINT UNSIGNED DEFAULT 1,
    `updatedBy` BIGINT UNSIGNED,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `createdBy` BIGINT UNSIGNED NOT NULL,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (`un`),
    KEY (`sess`),
    KEY (`updatedAt`),
    KEY (`createdBy`)
);

CREATE TABLE IF NOT EXISTS `userMap`(
    `id` SERIAL PRIMARY KEY,
    `userId` BIGINT UNSIGNED NOT NULL,
    `k` INT NOT NULL,
    `v` TEXT,
    `updatedBy` BIGINT UNSIGNED,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `createdBy` BIGINT UNSIGNED NOT NULL,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (`userId`, `k`)
);

CREATE TABLE IF NOT EXISTS `userMapInt`(
    `id` SERIAL PRIMARY KEY,
    `userId` BIGINT UNSIGNED NOT NULL,
    `k` INT NOT NULL,
    `v` INT,
    `updatedBy` BIGINT UNSIGNED,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `createdBy` BIGINT UNSIGNED NOT NULL,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (`userId`, `k`)
);

CREATE TABLE `userRef1`(
    `id` SERIAL PRIMARY KEY,
    `userId` BIGINT UNSIGNED NOT NULL,
    `ref1Id` BIGINT UNSIGNED NOT NULL,
    `k` INT NOT NULL,
    `v` TEXT NOT NULL,
    `status` TINYINT UNSIGNED DEFAULT 1,
    `updatedBy` BIGINT UNSIGNED,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `createdBy` BIGINT UNSIGNED NOT NULL,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY (`userId`,`k`,`updatedAt`),
    UNIQUE KEY (`ref1Id`,`userId`,`k`)
);

CREATE TABLE IF NOT EXISTS `domain`(
    `id` SERIAL PRIMARY KEY,
    `name` VARCHAR(32) NOT NULL,
    `status` TINYINT UNSIGNED DEFAULT 1,
    `updatedBy` BIGINT UNSIGNED,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `createdBy` BIGINT UNSIGNED NOT NULL,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (`name`),
    KEY (`updatedAt`),
    KEY (`createdBy`)
);

CREATE TABLE IF NOT EXISTS `domainMap`(
    `id` SERIAL PRIMARY KEY,
    `domainId` BIGINT UNSIGNED NOT NULL,
    `k` INT NOT NULL,
    `v` TEXT,
    `updatedBy` BIGINT UNSIGNED,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `createdBy` BIGINT UNSIGNED NOT NULL,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (`domainId`, `k`)
);

CREATE TABLE `domainRef1`(
    `id` SERIAL PRIMARY KEY,
    `domainId` BIGINT UNSIGNED NOT NULL,
    `ref1Id` BIGINT UNSIGNED NOT NULL,
    `k` INT NOT NULL,
    `v` TEXT NOT NULL,
    `status` TINYINT UNSIGNED DEFAULT 1,
    `updatedBy` BIGINT UNSIGNED,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `createdBy` BIGINT UNSIGNED NOT NULL,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY (`domainId`,`k`,`updatedAt`),
    UNIQUE KEY (`ref1Id`,`domainId`,`k`)
);
