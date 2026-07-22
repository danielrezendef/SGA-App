import { and, asc, count, desc, eq, gte, ilike, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { parseDateSafe } from "../shared/dateUtils";
import { agendamentos, cobrancas, contratos, InsertUser, users, Contrato, InsertContrato } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    password: data.password,
    loginMethod: "local",
    role: data.role ?? "user",
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function createUserFromSocial(data: {
  name: string;
  email: string;
  profilePhoto?: string;
  loginMethod: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `${data.loginMethod}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    profilePhoto: data.profilePhoto ?? null,
    loginMethod: data.loginMethod,
    role: "user",
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function updateUserProfilePhoto(userId: number, photoUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ profilePhoto: photoUrl }).where(eq(users.id, userId));
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string; profilePhoto?: string; gerarContratoAutomaticamente?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.profilePhoto !== undefined) updates.profilePhoto = data.profilePhoto;
  if (data.gerarContratoAutomaticamente !== undefined) updates.gerarContratoAutomaticamente = data.gerarContratoAutomaticamente ? 1 : 0;
  if (Object.keys(updates).length === 0) return;
  await db.update(users).set(updates).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ password: passwordHash }).where(eq(users.id, userId));
}

export async function saveGoogleCalendarConnection(
  userId: number,
  encryptedRefreshToken: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({
      googleCalendarRefreshToken: encryptedRefreshToken,
      googleCalendarConnectedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function removeGoogleCalendarConnection(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({
      googleCalendarRefreshToken: null,
      googleCalendarConnectedAt: null,
    })
    .where(eq(users.id, userId));
}

// ─── Agendamentos ─────────────────────────────────────────────────────────────
export type AgendamentoFilters = {
  userId?: number;
  status?: "orcamento" | "confirmado" | "pagamento" | "concluido";
  descricao?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  pageSize?: number;
};

export async function listAgendamentos(filters: AgendamentoFilters = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  await completePastAgendamentos();

  const { page = 1, pageSize = 10 } = filters;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.userId) conditions.push(eq(agendamentos.userId, filters.userId));
  if (filters.status) conditions.push(eq(agendamentos.status, filters.status));
  if (filters.descricao) conditions.push(like(agendamentos.descricao, `%${filters.descricao}%`));
  if (filters.dataInicio) {
    const startDate = parseDateSafe(filters.dataInicio);
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
      conditions.push(gte(agendamentos.dataEvento, startDate));
    }
  }
  if (filters.dataFim) {
    const endDate = parseDateSafe(filters.dataFim);
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(agendamentos.dataEvento, endDate));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(agendamentos)
      .where(where)
      .orderBy(asc(agendamentos.dataEvento))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(agendamentos).where(where),
  ]);

  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function getAgendamentoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await completePastAgendamentos();
  const result = await db.select().from(agendamentos).where(eq(agendamentos.id, id)).limit(1);
  return result[0];
}

/**
 * Mantém como concluídos todos os eventos anteriores ao dia atual em São Paulo.
 * Eventos marcados para hoje só serão concluídos a partir do dia seguinte.
 */
export async function completePastAgendamentos(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const datePart = (type: "year" | "month" | "day") =>
    parts.find(part => part.type === type)?.value ?? "";
  const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;

  await db
    .update(agendamentos)
    .set({ status: "concluido" })
    .where(
      and(
        sql`${agendamentos.dataEvento} < ${today}`,
        sql`${agendamentos.status} <> 'concluido'`
      )
    );
}

export async function createAgendamento(data: {
  userId: number;
  descricao: string;
  dataEvento: string | Date;
  horario: string;
  enderecoCerimonia: string;
  valorServico: string;
  observacoes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(agendamentos).values({ ...data, status: "orcamento" } as any);
  const result = await db
    .select()
    .from(agendamentos)
    .where(
      and(eq(agendamentos.userId, data.userId), eq(agendamentos.descricao, data.descricao))
    )
    .orderBy(desc(agendamentos.createdAt))
    .limit(1);
  return result[0];
}

export async function updateAgendamento(
  id: number,
  data: Partial<{
    descricao: string;
    dataEvento: string | Date;
    horario: string;
    enderecoCerimonia: string;
    valorServico: string;
    status: "orcamento" | "confirmado" | "pagamento" | "concluido";
    observacoes: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(agendamentos).set(data as Parameters<typeof db.update>[0] extends never ? never : any).where(eq(agendamentos.id, id));
  return getAgendamentoById(id);
}

export async function updateAgendamentoGoogleCalendarSync(
  id: number,
  data: {
    eventId?: string | null;
    syncedAt?: Date | null;
    error?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(agendamentos)
    .set({
      googleCalendarEventId: data.eventId,
      googleCalendarSyncedAt: data.syncedAt,
      googleCalendarSyncError: data.error,
    })
    .where(eq(agendamentos.id, id));
}

export async function deleteAgendamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related cobranca first
  await db.delete(cobrancas).where(eq(cobrancas.agendamentoId, id));
  await db.delete(agendamentos).where(eq(agendamentos.id, id));
}

// ─── Cobranças ────────────────────────────────────────────────────────────────
export async function getCobrancaByAgendamentoId(agendamentoId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(cobrancas)
    .where(eq(cobrancas.agendamentoId, agendamentoId))
    .limit(1);
  return result[0];
}

export async function createCobranca(data: any, nextStatus: "confirmado" | "pagamento" = "confirmado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cobrancas).values(data);
  // Update agendamento status to confirmado
  await db
    .update(agendamentos)
    .set({ status: nextStatus })
    .where(eq(agendamentos.id, data.agendamentoId));
  return getCobrancaByAgendamentoId(data.agendamentoId);
}

export async function updateCobranca(
  agendamentoId: number,
  data: any
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cobrancas).set(data).where(eq(cobrancas.agendamentoId, agendamentoId));
  return getCobrancaByAgendamentoId(agendamentoId);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export async function getDashboardStats(userId?: number) {
  const db = await getDb();
  if (!db) return null;

  await completePastAgendamentos();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const userCondition = userId ? eq(agendamentos.userId, userId) : undefined;

  const [
    totalAno,
    totalMes,
    porStatus,
    proximosEventos,
    valorOrcamento,
    porMes,
  ] = await Promise.all([
    // Total por ano
    db
      .select({ count: count() })
      .from(agendamentos)
      .where(
        and(
          userCondition,
          sql`YEAR(${agendamentos.dataEvento}) = ${year}`
        )
      ),
    // Total por mês atual
    db
      .select({ count: count() })
      .from(agendamentos)
      .where(
        and(
          userCondition,
          sql`YEAR(${agendamentos.dataEvento}) = ${year}`,
          sql`MONTH(${agendamentos.dataEvento}) = ${month}`
        )
      ),
    // Por status
    db
      .select({ status: agendamentos.status, count: count() })
      .from(agendamentos)
      .where(userCondition)
      .groupBy(agendamentos.status),
    // Próximos eventos (próximos 30 dias)
    db
      .select()
      .from(agendamentos)
      .where(
        and(
          userCondition,
          gte(agendamentos.dataEvento, sql`CURDATE()`),
          lte(agendamentos.dataEvento, sql`DATE_ADD(CURDATE(), INTERVAL 60 DAY)`)
        )
      )
      .orderBy(asc(agendamentos.dataEvento))
      .limit(5),
    // Valor total dos Orcamento
    db
      .select({ total: sql<string>`COALESCE(SUM(${agendamentos.valorServico}), 0)` })
    .from(agendamentos)
    .where(
      and(
        userCondition,
        sql`${agendamentos.status} = 'orcamento'`
      )
      ),
    // Agendamentos por mês (últimos 6 meses) - busca bruta para agrupar no JS
    db
      .select({ dataEvento: agendamentos.dataEvento })
      .from(agendamentos)
      .where(
        and(
          userCondition,
          gte(agendamentos.dataEvento, sql`DATE_SUB(CURDATE(), INTERVAL 6 MONTH)`)
        )
      ),
  ]);

  // A receber: agendamentos confirmados ou aguardando pagamento.
  // Orçamentos e eventos já concluídos não entram neste total.
  const valorAReceber = await db
    .select({ total: sql<string>`COALESCE(SUM(${agendamentos.valorServico}), 0)` })
    .from(agendamentos)
    .where(
      and(
        userCondition,
        sql`${agendamentos.status} IN ('confirmado', 'pagamento')`
      )
    );

  // Agrupar por mês no JavaScript
  const porMesMap = new Map<string, number>();
  for (const r of porMes) {
    if (!r.dataEvento) continue;
    const d = parseDateSafe(r.dataEvento);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    porMesMap.set(key, (porMesMap.get(key) ?? 0) + 1);
  }
  const porMesFormatted = Array.from(porMesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, count]) => ({ mes, count }));

  return {
    totalAno: totalAno[0]?.count ?? 0,
    totalMes: totalMes[0]?.count ?? 0,
    porStatus,
    proximosEventos,
    valorOrcamento: parseFloat(valorOrcamento[0]?.total ?? "0"),
    valorConfirmado: parseFloat(valorAReceber[0]?.total ?? "0"),
    porMes: porMesFormatted,
  };
}

// ─── Contratos ────────────────────────────────────────────────────────────────
export async function listContratos(userId?: number) {
  const db = await getDb();
  if (!db) return [];

  const query = userId
    ? db.select().from(contratos).where(eq(contratos.userId, userId)).orderBy(desc(contratos.createdAt))
    : db.select().from(contratos).orderBy(desc(contratos.createdAt));

  return query;
}

export async function getLatestContratoByUserId(userId: number): Promise<Contrato | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(contratos)
    .where(eq(contratos.userId, userId))
    .orderBy(desc(contratos.isDefault), desc(contratos.createdAt))
    .limit(1);

  return result[0];
}

export async function getContratoById(id: number): Promise<Contrato | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(contratos).where(eq(contratos.id, id));
  return result[0];
}

export async function createContrato(data: InsertContrato): Promise<Contrato> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const id = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: contratos.id })
      .from(contratos)
      .where(eq(contratos.userId, data.userId))
      .limit(1);

    const shouldBeDefault = data.isDefault === true || existing.length === 0;
    if (shouldBeDefault && existing.length > 0) {
      await tx
        .update(contratos)
        .set({ isDefault: false })
        .where(eq(contratos.userId, data.userId));
    }

    const result = await tx
      .insert(contratos)
      .values({ ...data, isDefault: shouldBeDefault });
    return result[0].insertId as number;
  });

  const created = await getContratoById(id);
  if (!created) throw new Error("Failed to create contrato");
  return created;
}

export async function updateContrato(
  id: number,
  data: Partial<InsertContrato>
): Promise<Contrato | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(contratos).set(data).where(eq(contratos.id, id));
  return getContratoById(id);
}

export async function deleteContrato(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.transaction(async (tx) => {
    const current = await tx.select().from(contratos).where(eq(contratos.id, id)).limit(1);
    const contrato = current[0];
    if (!contrato) return;

    await tx.delete(contratos).where(eq(contratos.id, id));

    if (contrato.isDefault) {
      const replacement = await tx
        .select({ id: contratos.id })
        .from(contratos)
        .where(eq(contratos.userId, contrato.userId))
        .orderBy(desc(contratos.createdAt))
        .limit(1);

      if (replacement[0]) {
        await tx
          .update(contratos)
          .set({ isDefault: true })
          .where(eq(contratos.id, replacement[0].id));
      }
    }
  });
}

export async function setDefaultContrato(userId: number, id: number): Promise<Contrato | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.transaction(async (tx) => {
    await tx
      .update(contratos)
      .set({ isDefault: false })
      .where(eq(contratos.userId, userId));
    await tx
      .update(contratos)
      .set({ isDefault: true })
      .where(and(eq(contratos.id, id), eq(contratos.userId, userId)));
  });

  return getContratoById(id);
}
