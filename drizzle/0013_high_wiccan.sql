ALTER TABLE `contratos` ADD `isDefault` boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `contratos` AS `contrato`
INNER JOIN (
	SELECT `userId`, MAX(`id`) AS `id`
	FROM `contratos`
	GROUP BY `userId`
) AS `mais_recente` ON `mais_recente`.`id` = `contrato`.`id`
SET `contrato`.`isDefault` = true;
