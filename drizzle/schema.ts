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
  gerarContratoAutomaticamente: boolean("gerar_contrato_automaticamente").notNull().default(false),
  googleCalendarRefreshToken: text("google_calendar_refresh_token"),
  googleCalendarConnectedAt: timestamp("google_calendar_connected_at"),
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
  status: mysqlEnum("status", ["orcamento", "confirmado", "cobranca", "pagamento", "concluido"])
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


