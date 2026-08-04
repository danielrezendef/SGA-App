import {
  int,
  boolean,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  date,
  time,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  password: varchar("password", { length: 255 }), // bcrypt hash for custom auth
  loginMethod: varchar("loginMethod", { length: 64 }),
  profilePhoto: text("profilePhoto"), // URL da foto de perfil
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  gerarContratoAutomaticamente: boolean("gerar_contrato_automaticamente")
    .notNull()
    .default(false),
  googleCalendarRefreshToken: text("google_calendar_refresh_token"),
  googleCalendarConnectedAt: timestamp("google_calendar_connected_at"),
  googleCalendarId: varchar("google_calendar_id", { length: 1024 }),
  googleCalendarName: varchar("google_calendar_name", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Agendamentos ─────────────────────────────────────────────────────────────
export const agendamentos = mysqlTable("agendamentos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // owner
  descricao: text("descricao").notNull(),
  dataEvento: date("dataEvento").notNull(),
  horario: time("horario").notNull(),
  enderecoCerimonia: text("enderecoCerimonia").notNull(),
  valorServico: decimal("valorServico", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", [
    "orcamento",
    "confirmado",
    "cobranca",
    "pagamento",
    "concluido",
  ])
    .default("orcamento")
    .notNull(),
  observacoes: text("observacoes"),
  googleCalendarEventId: varchar("google_calendar_event_id", { length: 255 }),
  googleCalendarSyncedAt: timestamp("google_calendar_synced_at"),
  googleCalendarSyncError: text("google_calendar_sync_error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agendamento = typeof agendamentos.$inferSelect;
export type InsertAgendamento = typeof agendamentos.$inferInsert;

// Repertórios de agendamentos
export const tiposMomento = mysqlTable("tipos_momento", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 64 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  ordemPadrao: int("ordemPadrao").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const repertorios = mysqlTable("repertorios", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId")
    .notNull()
    .unique()
    .references(() => agendamentos.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["RASCUNHO", "EM_DEFINICAO", "FINALIZADO"])
    .default("RASCUNHO")
    .notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const momentosRepertorio = mysqlTable("momentos_repertorio", {
  id: int("id").autoincrement().primaryKey(),
  repertorioId: int("repertorioId")
    .notNull()
    .references(() => repertorios.id, { onDelete: "cascade" }),
  tipoMomentoId: int("tipoMomentoId")
    .notNull()
    .references(() => tiposMomento.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  ordem: int("ordem").notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const musicasMomento = mysqlTable("musicas_momento", {
  id: int("id").autoincrement().primaryKey(),
  momentoId: int("momentoId")
    .notNull()
    .references(() => momentosRepertorio.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  artista: varchar("artista", { length: 255 }),
  tonalidade: varchar("tonalidade", { length: 64 }),
  linkReferencia: text("linkReferencia"),
  observacoes: text("observacoes"),
  ordem: int("ordem").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TipoMomento = typeof tiposMomento.$inferSelect;
export type Repertorio = typeof repertorios.$inferSelect;
export type MomentoRepertorio = typeof momentosRepertorio.$inferSelect;
export type MusicaMomento = typeof musicasMomento.$inferSelect;

// ─── Cobranças ────────────────────────────────────────────────────────────────
export const cobrancas = mysqlTable("cobrancas", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId").notNull().unique(), // 1:1 com agendamento
  nomeResponsavel: varchar("nomeResponsavel", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  cep: varchar("cep", { length: 9 }),
  rua: varchar("rua", { length: 255 }).notNull(),
  numero: varchar("numero", { length: 20 }).notNull(),
  complemento: varchar("complemento", { length: 255 }),
  bairro: varchar("bairro", { length: 100 }).notNull(),
  cidade: varchar("cidade", { length: 100 }).notNull(),
  estado: varchar("estado", { length: 2 }).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  condicaoPagamento: varchar("condicaoPagamento", { length: 255 }).notNull(),
  formaPagamento: mysqlEnum("formaPagamento", [
    "pix",
    "dinheiro",
    "cartao_credito",
    "cartao_debito",
    "transferencia",
    "boleto",
  ]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cobranca = typeof cobrancas.$inferSelect;
export type InsertCobranca = typeof cobrancas.$inferInsert;

// ─── Contratos ────────────────────────────────────────────────────────────────
export const contratos = mysqlTable("contratos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // owner
  nomeCompleto: varchar("nomeCompleto", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  cep: varchar("cep", { length: 9 }),
  rua: varchar("rua", { length: 255 }).notNull(),
  numero: varchar("numero", { length: 20 }).notNull(),
  complemento: varchar("complemento", { length: 255 }),
  bairro: varchar("bairro", { length: 100 }).notNull(),
  cidade: varchar("cidade", { length: 100 }).notNull(),
  estado: varchar("estado", { length: 2 }).notNull(),
  isDefault: boolean("isDefault").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contrato = typeof contratos.$inferSelect;
export type InsertContrato = typeof contratos.$inferInsert;
