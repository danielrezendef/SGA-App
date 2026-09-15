UPDATE `agendamentos`
SET `status` = 'confirmado'
WHERE `status` = 'pagamento';
--> statement-breakpoint
ALTER TABLE `agendamentos`
MODIFY COLUMN `status` enum('orcamento','confirmado','cobranca','concluido') NOT NULL DEFAULT 'orcamento';
