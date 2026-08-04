CREATE TABLE `momentos_repertorio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repertorioId` int NOT NULL,
	`tipoMomentoId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`ordem` int NOT NULL,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `momentos_repertorio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `musicas_momento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`momentoId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`artista` varchar(255),
	`tonalidade` varchar(64),
	`linkReferencia` text,
	`observacoes` text,
	`ordem` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `musicas_momento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repertorios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int NOT NULL,
	`status` enum('RASCUNHO','EM_DEFINICAO','FINALIZADO') NOT NULL DEFAULT 'RASCUNHO',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `repertorios_id` PRIMARY KEY(`id`),
	CONSTRAINT `repertorios_agendamentoId_unique` UNIQUE(`agendamentoId`)
);
--> statement-breakpoint
CREATE TABLE `tipos_momento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`ordemPadrao` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tipos_momento_id` PRIMARY KEY(`id`),
	CONSTRAINT `tipos_momento_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
ALTER TABLE `momentos_repertorio` ADD CONSTRAINT `momentos_repertorio_repertorioId_repertorios_id_fk` FOREIGN KEY (`repertorioId`) REFERENCES `repertorios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `momentos_repertorio` ADD CONSTRAINT `momentos_repertorio_tipoMomentoId_tipos_momento_id_fk` FOREIGN KEY (`tipoMomentoId`) REFERENCES `tipos_momento`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `musicas_momento` ADD CONSTRAINT `musicas_momento_momentoId_momentos_repertorio_id_fk` FOREIGN KEY (`momentoId`) REFERENCES `momentos_repertorio`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `repertorios` ADD CONSTRAINT `repertorios_agendamentoId_agendamentos_id_fk` FOREIGN KEY (`agendamentoId`) REFERENCES `agendamentos`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO `tipos_momento` (`codigo`, `nome`, `ordemPadrao`) VALUES
  ('ENTRADA_NOIVO', 'Entrada do Noivo', 1),
  ('ENTRADA_NOIVA', 'Entrada da Noiva', 2),
  ('SALMO', 'Salmo', 3),
  ('ACLAMACAO', 'Aclamação', 4),
  ('ALIANCAS', 'Alianças', 5),
  ('COMUNHAO', 'Comunhão', 6),
  ('FOTOS_ASSINATURAS', 'Fotos e Assinaturas', 7),
  ('SAIDA_NOIVOS', 'Saída dos Noivos', 8),
  ('OUTRO', 'Outro', 9);
