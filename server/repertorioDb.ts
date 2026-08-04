import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
import {
  agendamentos,
  momentosRepertorio,
  musicasMomento,
  repertorios,
  tiposMomento,
} from "../drizzle/schema";
import { getDb } from "./db";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Executor = Database | Transaction;

const MODELO_PADRAO = [
  "ENTRADA_NOIVO",
  "ENTRADA_NOIVA",
  "SALMO",
  "ACLAMACAO",
  "ALIANCAS",
  "COMUNHAO",
  "FOTOS_ASSINATURAS",
  "SAIDA_NOIVOS",
] as const;

export class RepertorioDbError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "CONFLICT"
      | "BAD_REQUEST",
    message: string
  ) {
    super(message);
  }
}

function requireDb(db: Database | null): Database {
  if (!db) throw new Error("Database not available");
  return db;
}

async function assertAgendamento(
  db: Executor,
  userId: number,
  agendamentoId: number
) {
  const [agendamento] = await db
    .select()
    .from(agendamentos)
    .where(eq(agendamentos.id, agendamentoId))
    .limit(1);
  if (!agendamento)
    throw new RepertorioDbError("NOT_FOUND", "Agendamento não encontrado.");
  if (agendamento.userId !== userId) {
    throw new RepertorioDbError(
      "FORBIDDEN",
      "Você não tem permissão para acessar este agendamento."
    );
  }
  return agendamento;
}

async function assertRepertorio(
  db: Executor,
  userId: number,
  repertorioId: number
) {
  const [row] = await db
    .select({ repertorio: repertorios, agendamento: agendamentos })
    .from(repertorios)
    .innerJoin(agendamentos, eq(repertorios.agendamentoId, agendamentos.id))
    .where(eq(repertorios.id, repertorioId))
    .limit(1);
  if (!row)
    throw new RepertorioDbError("NOT_FOUND", "Repertório não encontrado.");
  if (row.agendamento.userId !== userId) {
    throw new RepertorioDbError(
      "FORBIDDEN",
      "Você não tem permissão para acessar este repertório."
    );
  }
  return row;
}

async function assertMomento(db: Executor, userId: number, momentoId: number) {
  const [row] = await db
    .select({
      momento: momentosRepertorio,
      repertorio: repertorios,
      agendamento: agendamentos,
    })
    .from(momentosRepertorio)
    .innerJoin(repertorios, eq(momentosRepertorio.repertorioId, repertorios.id))
    .innerJoin(agendamentos, eq(repertorios.agendamentoId, agendamentos.id))
    .where(eq(momentosRepertorio.id, momentoId))
    .limit(1);
  if (!row) throw new RepertorioDbError("NOT_FOUND", "Momento não encontrado.");
  if (row.agendamento.userId !== userId) {
    throw new RepertorioDbError(
      "FORBIDDEN",
      "Você não tem permissão para acessar este momento."
    );
  }
  return row;
}

async function assertMusica(db: Executor, userId: number, musicaId: number) {
  const [row] = await db
    .select({
      musica: musicasMomento,
      momento: momentosRepertorio,
      repertorio: repertorios,
      agendamento: agendamentos,
    })
    .from(musicasMomento)
    .innerJoin(
      momentosRepertorio,
      eq(musicasMomento.momentoId, momentosRepertorio.id)
    )
    .innerJoin(repertorios, eq(momentosRepertorio.repertorioId, repertorios.id))
    .innerJoin(agendamentos, eq(repertorios.agendamentoId, agendamentos.id))
    .where(eq(musicasMomento.id, musicaId))
    .limit(1);
  if (!row) throw new RepertorioDbError("NOT_FOUND", "Música não encontrada.");
  if (row.agendamento.userId !== userId) {
    throw new RepertorioDbError(
      "FORBIDDEN",
      "Você não tem permissão para acessar esta música."
    );
  }
  return row;
}

function assertEditable(status: string) {
  if (status === "FINALIZADO") {
    throw new RepertorioDbError(
      "BAD_REQUEST",
      "Reabra o repertório antes de editar seu conteúdo."
    );
  }
}

async function normalizeMomentos(db: Executor, repertorioId: number) {
  const rows = await db
    .select({ id: momentosRepertorio.id })
    .from(momentosRepertorio)
    .where(eq(momentosRepertorio.repertorioId, repertorioId))
    .orderBy(asc(momentosRepertorio.ordem), asc(momentosRepertorio.id));
  for (let index = 0; index < rows.length; index += 1) {
    await db
      .update(momentosRepertorio)
      .set({ ordem: index + 1 })
      .where(eq(momentosRepertorio.id, rows[index].id));
  }
}

async function normalizeMusicas(db: Executor, momentoId: number) {
  const rows = await db
    .select({ id: musicasMomento.id })
    .from(musicasMomento)
    .where(eq(musicasMomento.momentoId, momentoId))
    .orderBy(asc(musicasMomento.ordem), asc(musicasMomento.id));
  for (let index = 0; index < rows.length; index += 1) {
    await db
      .update(musicasMomento)
      .set({ ordem: index + 1 })
      .where(eq(musicasMomento.id, rows[index].id));
  }
}

async function markInDefinition(db: Executor, repertorioId: number) {
  await db
    .update(repertorios)
    .set({ status: "EM_DEFINICAO" })
    .where(
      and(eq(repertorios.id, repertorioId), eq(repertorios.status, "RASCUNHO"))
    );
}

export async function getRepertorioPorAgendamento(
  userId: number,
  agendamentoId: number
) {
  const db = requireDb(await getDb());
  const agendamento = await assertAgendamento(db, userId, agendamentoId);
  const tipos = await db
    .select()
    .from(tiposMomento)
    .where(eq(tiposMomento.ativo, true))
    .orderBy(asc(tiposMomento.ordemPadrao), asc(tiposMomento.nome));
  const [repertorio] = await db
    .select()
    .from(repertorios)
    .where(eq(repertorios.agendamentoId, agendamentoId))
    .limit(1);
  if (!repertorio)
    return { agendamento, repertorio: null, tiposMomento: tipos };

  const momentos = await db
    .select({
      id: momentosRepertorio.id,
      repertorioId: momentosRepertorio.repertorioId,
      tipoMomentoId: momentosRepertorio.tipoMomentoId,
      tipoCodigo: tiposMomento.codigo,
      tipoNome: tiposMomento.nome,
      nome: momentosRepertorio.nome,
      ordem: momentosRepertorio.ordem,
      observacoes: momentosRepertorio.observacoes,
      createdAt: momentosRepertorio.createdAt,
      updatedAt: momentosRepertorio.updatedAt,
    })
    .from(momentosRepertorio)
    .innerJoin(
      tiposMomento,
      eq(momentosRepertorio.tipoMomentoId, tiposMomento.id)
    )
    .where(eq(momentosRepertorio.repertorioId, repertorio.id))
    .orderBy(asc(momentosRepertorio.ordem), asc(momentosRepertorio.id));

  const musicas = momentos.length
    ? await db
        .select()
        .from(musicasMomento)
        .where(
          inArray(
            musicasMomento.momentoId,
            momentos.map(momento => momento.id)
          )
        )
        .orderBy(asc(musicasMomento.ordem), asc(musicasMomento.id))
    : [];

  return {
    agendamento,
    tiposMomento: tipos,
    repertorio: {
      ...repertorio,
      momentos: momentos.map(momento => ({
        ...momento,
        musicas: musicas.filter(musica => musica.momentoId === momento.id),
      })),
    },
  };
}

export async function criarRepertorio(
  userId: number,
  agendamentoId: number,
  comModelo: boolean
) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    await assertAgendamento(tx, userId, agendamentoId);
    const [existing] = await tx
      .select({ id: repertorios.id })
      .from(repertorios)
      .where(eq(repertorios.agendamentoId, agendamentoId))
      .limit(1);
    if (existing)
      throw new RepertorioDbError(
        "CONFLICT",
        "Este agendamento já possui repertório."
      );

    const insertResult = await tx.insert(repertorios).values({ agendamentoId });
    const repertorioId = insertResult[0].insertId as number;
    if (!comModelo) return;

    const tipos = await tx
      .select()
      .from(tiposMomento)
      .where(inArray(tiposMomento.codigo, [...MODELO_PADRAO]));
    const porCodigo = new Map(tipos.map(tipo => [tipo.codigo, tipo]));
    if (tipos.length !== MODELO_PADRAO.length) {
      throw new RepertorioDbError(
        "BAD_REQUEST",
        "Os tipos do modelo padrão ainda não foram cadastrados."
      );
    }
    await tx.insert(momentosRepertorio).values(
      MODELO_PADRAO.map((codigo, index) => ({
        repertorioId,
        tipoMomentoId: porCodigo.get(codigo)!.id,
        nome: porCodigo.get(codigo)!.nome,
        ordem: index + 1,
      }))
    );
  });
  return getRepertorioPorAgendamento(userId, agendamentoId);
}

async function copiarDentroDaTransacao(
  tx: Transaction,
  userId: number,
  sourceRepertorioId: number,
  targetAgendamentoId: number
) {
  await assertAgendamento(tx, userId, targetAgendamentoId);
  const source = await assertRepertorio(tx, userId, sourceRepertorioId);
  if (source.repertorio.agendamentoId === targetAgendamentoId) {
    throw new RepertorioDbError(
      "BAD_REQUEST",
      "Selecione outro agendamento para receber a cópia."
    );
  }
  const [existing] = await tx
    .select({ id: repertorios.id })
    .from(repertorios)
    .where(eq(repertorios.agendamentoId, targetAgendamentoId))
    .limit(1);
  if (existing)
    throw new RepertorioDbError(
      "CONFLICT",
      "O agendamento de destino já possui repertório."
    );

  const inserted = await tx.insert(repertorios).values({
    agendamentoId: targetAgendamentoId,
    status: "RASCUNHO",
    observacoes: source.repertorio.observacoes,
  });
  const targetRepertorioId = inserted[0].insertId as number;
  const sourceMomentos = await tx
    .select()
    .from(momentosRepertorio)
    .where(eq(momentosRepertorio.repertorioId, sourceRepertorioId))
    .orderBy(asc(momentosRepertorio.ordem));
  for (
    let momentoIndex = 0;
    momentoIndex < sourceMomentos.length;
    momentoIndex += 1
  ) {
    const momento = sourceMomentos[momentoIndex];
    const momentoResult = await tx.insert(momentosRepertorio).values({
      repertorioId: targetRepertorioId,
      tipoMomentoId: momento.tipoMomentoId,
      nome: momento.nome,
      ordem: momentoIndex + 1,
      observacoes: momento.observacoes,
    });
    const targetMomentoId = momentoResult[0].insertId as number;
    const sourceMusicas = await tx
      .select()
      .from(musicasMomento)
      .where(eq(musicasMomento.momentoId, momento.id))
      .orderBy(asc(musicasMomento.ordem));
    if (sourceMusicas.length) {
      await tx.insert(musicasMomento).values(
        sourceMusicas.map((musica, musicaIndex) => ({
          momentoId: targetMomentoId,
          titulo: musica.titulo,
          artista: musica.artista,
          tonalidade: musica.tonalidade,
          linkReferencia: musica.linkReferencia,
          observacoes: musica.observacoes,
          ordem: musicaIndex + 1,
        }))
      );
    }
  }
}

export async function copiarRepertorio(
  userId: number,
  sourceRepertorioId: number,
  targetAgendamentoId: number
) {
  const db = requireDb(await getDb());
  await db.transaction(tx =>
    copiarDentroDaTransacao(tx, userId, sourceRepertorioId, targetAgendamentoId)
  );
  return getRepertorioPorAgendamento(userId, targetAgendamentoId);
}

export async function pesquisarRepertorios(
  userId: number,
  busca: string,
  excluirAgendamentoId?: number
) {
  const db = requireDb(await getDb());
  const termo = `%${busca.trim()}%`;
  const conditions = [eq(agendamentos.userId, userId)];
  if (excluirAgendamentoId)
    conditions.push(sql`${agendamentos.id} <> ${excluirAgendamentoId}`);
  if (busca.trim()) {
    conditions.push(
      or(
        like(agendamentos.descricao, termo),
        like(agendamentos.enderecoCerimonia, termo),
        sql`DATE_FORMAT(${agendamentos.dataEvento}, '%d/%m/%Y') LIKE ${termo}`,
        sql`DATE_FORMAT(${agendamentos.dataEvento}, '%Y-%m-%d') LIKE ${termo}`
      )!
    );
  }
  return db
    .select({
      repertorioId: repertorios.id,
      agendamentoId: agendamentos.id,
      descricao: agendamentos.descricao,
      dataEvento: agendamentos.dataEvento,
      horario: agendamentos.horario,
      local: agendamentos.enderecoCerimonia,
      status: repertorios.status,
    })
    .from(repertorios)
    .innerJoin(agendamentos, eq(repertorios.agendamentoId, agendamentos.id))
    .where(and(...conditions))
    .orderBy(desc(agendamentos.dataEvento))
    .limit(30);
}

export async function pesquisarAgendamentosSemRepertorio(
  userId: number,
  busca: string,
  excluirAgendamentoId?: number
) {
  const db = requireDb(await getDb());
  const termo = `%${busca.trim()}%`;
  const conditions = [eq(agendamentos.userId, userId), isNull(repertorios.id)];
  if (excluirAgendamentoId)
    conditions.push(sql`${agendamentos.id} <> ${excluirAgendamentoId}`);
  if (busca.trim()) {
    conditions.push(
      or(
        like(agendamentos.descricao, termo),
        like(agendamentos.enderecoCerimonia, termo)
      )!
    );
  }
  return db
    .select({
      agendamentoId: agendamentos.id,
      descricao: agendamentos.descricao,
      dataEvento: agendamentos.dataEvento,
      local: agendamentos.enderecoCerimonia,
    })
    .from(agendamentos)
    .leftJoin(repertorios, eq(repertorios.agendamentoId, agendamentos.id))
    .where(and(...conditions))
    .orderBy(desc(agendamentos.dataEvento))
    .limit(30);
}

export async function atualizarObservacoesRepertorio(
  userId: number,
  repertorioId: number,
  observacoes: string | null
) {
  const db = requireDb(await getDb());
  const row = await assertRepertorio(db, userId, repertorioId);
  assertEditable(row.repertorio.status);
  await db
    .update(repertorios)
    .set({ observacoes })
    .where(eq(repertorios.id, repertorioId));
  return { success: true };
}

export async function alterarStatusRepertorio(
  userId: number,
  repertorioId: number,
  status: "RASCUNHO" | "EM_DEFINICAO" | "FINALIZADO"
) {
  const db = requireDb(await getDb());
  const row = await assertRepertorio(db, userId, repertorioId);
  if (status === "FINALIZADO") {
    const [momento] = await db
      .select({ id: momentosRepertorio.id })
      .from(momentosRepertorio)
      .where(eq(momentosRepertorio.repertorioId, repertorioId))
      .limit(1);
    if (!momento)
      throw new RepertorioDbError(
        "BAD_REQUEST",
        "Adicione ao menos um momento antes de finalizar."
      );
  }
  if (row.repertorio.status === "FINALIZADO" && status === "FINALIZADO")
    return { success: true };
  await db
    .update(repertorios)
    .set({ status })
    .where(eq(repertorios.id, repertorioId));
  return { success: true };
}

export async function criarMomento(
  userId: number,
  repertorioId: number,
  data: { tipoMomentoId: number; nome: string; observacoes: string | null }
) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    const row = await assertRepertorio(tx, userId, repertorioId);
    assertEditable(row.repertorio.status);
    const [tipo] = await tx
      .select()
      .from(tiposMomento)
      .where(
        and(
          eq(tiposMomento.id, data.tipoMomentoId),
          eq(tiposMomento.ativo, true)
        )
      )
      .limit(1);
    if (!tipo)
      throw new RepertorioDbError("BAD_REQUEST", "Tipo de momento inválido.");
    const [{ quantidade }] = await tx
      .select({ quantidade: sql<number>`count(*)` })
      .from(momentosRepertorio)
      .where(eq(momentosRepertorio.repertorioId, repertorioId));
    await tx
      .insert(momentosRepertorio)
      .values({ ...data, repertorioId, ordem: Number(quantidade) + 1 });
    await markInDefinition(tx, repertorioId);
  });
  return { success: true };
}

export async function atualizarMomento(
  userId: number,
  momentoId: number,
  data: { tipoMomentoId: number; nome: string; observacoes: string | null }
) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    const row = await assertMomento(tx, userId, momentoId);
    assertEditable(row.repertorio.status);
    const [tipo] = await tx
      .select({ id: tiposMomento.id })
      .from(tiposMomento)
      .where(
        and(
          eq(tiposMomento.id, data.tipoMomentoId),
          eq(tiposMomento.ativo, true)
        )
      )
      .limit(1);
    if (!tipo)
      throw new RepertorioDbError("BAD_REQUEST", "Tipo de momento inválido.");
    await tx
      .update(momentosRepertorio)
      .set(data)
      .where(eq(momentosRepertorio.id, momentoId));
    await markInDefinition(tx, row.repertorio.id);
  });
  return { success: true };
}

export async function duplicarMomento(userId: number, momentoId: number) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    const row = await assertMomento(tx, userId, momentoId);
    assertEditable(row.repertorio.status);
    const momentos = await tx
      .select()
      .from(momentosRepertorio)
      .where(eq(momentosRepertorio.repertorioId, row.repertorio.id))
      .orderBy(asc(momentosRepertorio.ordem));
    for (const momento of momentos.filter(
      item => item.ordem > row.momento.ordem
    )) {
      await tx
        .update(momentosRepertorio)
        .set({ ordem: momento.ordem + 1 })
        .where(eq(momentosRepertorio.id, momento.id));
    }
    const inserted = await tx.insert(momentosRepertorio).values({
      repertorioId: row.repertorio.id,
      tipoMomentoId: row.momento.tipoMomentoId,
      nome: `${row.momento.nome} (cópia)`,
      ordem: row.momento.ordem + 1,
      observacoes: row.momento.observacoes,
    });
    const targetMomentoId = inserted[0].insertId as number;
    const musicas = await tx
      .select()
      .from(musicasMomento)
      .where(eq(musicasMomento.momentoId, momentoId))
      .orderBy(asc(musicasMomento.ordem));
    if (musicas.length) {
      await tx.insert(musicasMomento).values(
        musicas.map((musica, index) => ({
          momentoId: targetMomentoId,
          titulo: musica.titulo,
          artista: musica.artista,
          tonalidade: musica.tonalidade,
          linkReferencia: musica.linkReferencia,
          observacoes: musica.observacoes,
          ordem: index + 1,
        }))
      );
    }
    await normalizeMomentos(tx, row.repertorio.id);
  });
  return { success: true };
}

export async function removerMomento(userId: number, momentoId: number) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    const row = await assertMomento(tx, userId, momentoId);
    assertEditable(row.repertorio.status);
    await tx
      .delete(momentosRepertorio)
      .where(eq(momentosRepertorio.id, momentoId));
    await normalizeMomentos(tx, row.repertorio.id);
  });
  return { success: true };
}

export async function moverMomento(
  userId: number,
  momentoId: number,
  direcao: "cima" | "baixo"
) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    const row = await assertMomento(tx, userId, momentoId);
    assertEditable(row.repertorio.status);
    const alvoOrdem = row.momento.ordem + (direcao === "cima" ? -1 : 1);
    const [alvo] = await tx
      .select()
      .from(momentosRepertorio)
      .where(
        and(
          eq(momentosRepertorio.repertorioId, row.repertorio.id),
          eq(momentosRepertorio.ordem, alvoOrdem)
        )
      )
      .limit(1);
    if (!alvo) return;
    await tx
      .update(momentosRepertorio)
      .set({ ordem: 0 })
      .where(eq(momentosRepertorio.id, row.momento.id));
    await tx
      .update(momentosRepertorio)
      .set({ ordem: row.momento.ordem })
      .where(eq(momentosRepertorio.id, alvo.id));
    await tx
      .update(momentosRepertorio)
      .set({ ordem: alvoOrdem })
      .where(eq(momentosRepertorio.id, row.momento.id));
    await normalizeMomentos(tx, row.repertorio.id);
  });
  return { success: true };
}

export async function criarMusica(
  userId: number,
  momentoId: number,
  data: {
    titulo: string;
    artista: string | null;
    tonalidade: string | null;
    linkReferencia: string | null;
    observacoes: string | null;
  }
) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    const row = await assertMomento(tx, userId, momentoId);
    assertEditable(row.repertorio.status);
    const [{ quantidade }] = await tx
      .select({ quantidade: sql<number>`count(*)` })
      .from(musicasMomento)
      .where(eq(musicasMomento.momentoId, momentoId));
    await tx
      .insert(musicasMomento)
      .values({ ...data, momentoId, ordem: Number(quantidade) + 1 });
    await markInDefinition(tx, row.repertorio.id);
  });
  return { success: true };
}

export async function atualizarMusica(
  userId: number,
  musicaId: number,
  data: {
    titulo: string;
    artista: string | null;
    tonalidade: string | null;
    linkReferencia: string | null;
    observacoes: string | null;
  }
) {
  const db = requireDb(await getDb());
  const row = await assertMusica(db, userId, musicaId);
  assertEditable(row.repertorio.status);
  await db
    .update(musicasMomento)
    .set(data)
    .where(eq(musicasMomento.id, musicaId));
  await markInDefinition(db, row.repertorio.id);
  return { success: true };
}

export async function removerMusica(userId: number, musicaId: number) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    const row = await assertMusica(tx, userId, musicaId);
    assertEditable(row.repertorio.status);
    await tx.delete(musicasMomento).where(eq(musicasMomento.id, musicaId));
    await normalizeMusicas(tx, row.momento.id);
  });
  return { success: true };
}

export async function moverMusica(
  userId: number,
  musicaId: number,
  direcao: "cima" | "baixo"
) {
  const db = requireDb(await getDb());
  await db.transaction(async tx => {
    const row = await assertMusica(tx, userId, musicaId);
    assertEditable(row.repertorio.status);
    const alvoOrdem = row.musica.ordem + (direcao === "cima" ? -1 : 1);
    const [alvo] = await tx
      .select()
      .from(musicasMomento)
      .where(
        and(
          eq(musicasMomento.momentoId, row.momento.id),
          eq(musicasMomento.ordem, alvoOrdem)
        )
      )
      .limit(1);
    if (!alvo) return;
    await tx
      .update(musicasMomento)
      .set({ ordem: 0 })
      .where(eq(musicasMomento.id, row.musica.id));
    await tx
      .update(musicasMomento)
      .set({ ordem: row.musica.ordem })
      .where(eq(musicasMomento.id, alvo.id));
    await tx
      .update(musicasMomento)
      .set({ ordem: alvoOrdem })
      .where(eq(musicasMomento.id, row.musica.id));
    await normalizeMusicas(tx, row.momento.id);
  });
  return { success: true };
}

function normalizeSuggestion(value: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export async function buscarSugestoes(
  userId: number,
  momentoId: number,
  busca: string
) {
  const db = requireDb(await getDb());
  const current = await assertMomento(db, userId, momentoId);
  const rows = await db
    .select({
      titulo: musicasMomento.titulo,
      artista: musicasMomento.artista,
      tonalidade: musicasMomento.tonalidade,
      linkReferencia: musicasMomento.linkReferencia,
      dataEvento: agendamentos.dataEvento,
    })
    .from(musicasMomento)
    .innerJoin(
      momentosRepertorio,
      eq(musicasMomento.momentoId, momentosRepertorio.id)
    )
    .innerJoin(repertorios, eq(momentosRepertorio.repertorioId, repertorios.id))
    .innerJoin(agendamentos, eq(repertorios.agendamentoId, agendamentos.id))
    .where(
      and(
        eq(agendamentos.userId, userId),
        eq(momentosRepertorio.tipoMomentoId, current.momento.tipoMomentoId)
      )
    )
    .orderBy(desc(agendamentos.dataEvento));

  const termo = normalizeSuggestion(busca);
  const agrupadas = new Map<
    string,
    {
      titulo: string;
      artista: string | null;
      tonalidade: string | null;
      linkReferencia: string | null;
      quantidade: number;
      ultimaUtilizacao: string | Date;
    }
  >();
  for (const row of rows) {
    const titulo = normalizeSuggestion(row.titulo);
    const artista = normalizeSuggestion(row.artista);
    if (termo && !titulo.includes(termo) && !artista.includes(termo)) continue;
    const key = `${titulo}|${artista}`;
    const existing = agrupadas.get(key);
    if (existing) existing.quantidade += 1;
    else
      agrupadas.set(key, {
        ...row,
        quantidade: 1,
        ultimaUtilizacao: row.dataEvento,
      });
  }
  return Array.from(agrupadas.values())
    .sort(
      (a, b) =>
        b.quantidade - a.quantidade ||
        String(b.ultimaUtilizacao).localeCompare(String(a.ultimaUtilizacao)) ||
        a.titulo.localeCompare(b.titulo, "pt-BR")
    )
    .slice(0, 20);
}
