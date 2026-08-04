import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./repertorioDb", async () => {
  const actual =
    await vi.importActual<typeof import("./repertorioDb")>("./repertorioDb");
  return {
    ...actual,
    getRepertorioPorAgendamento: vi.fn(),
    criarRepertorio: vi.fn(),
    copiarRepertorio: vi.fn(),
    pesquisarRepertorios: vi.fn(),
    pesquisarAgendamentosSemRepertorio: vi.fn(),
    atualizarObservacoesRepertorio: vi.fn(),
    alterarStatusRepertorio: vi.fn(),
    criarMomento: vi.fn(),
    atualizarMomento: vi.fn(),
    duplicarMomento: vi.fn(),
    removerMomento: vi.fn(),
    moverMomento: vi.fn(),
    criarMusica: vi.fn(),
    atualizarMusica: vi.fn(),
    removerMusica: vi.fn(),
    moverMusica: vi.fn(),
    buscarSugestoes: vi.fn(),
  };
});

import { appRouter } from "./routers";
import * as repertorioDb from "./repertorioDb";

function makeCtx(userId: number | null): TrpcContext {
  return {
    user: userId
      ? {
          id: userId,
          openId: `user-${userId}`,
          name: "Usuário",
          email: "user@example.com",
          password: null,
          loginMethod: "local",
          profilePhoto: null,
          role: "user",
          gerarContratoAutomaticamente: false,
          googleCalendarRefreshToken: null,
          googleCalendarConnectedAt: null,
          googleCalendarId: null,
          googleCalendarName: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

beforeEach(() => vi.clearAllMocks());

describe("repertorio router", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.repertorio.porAgendamento({ agendamentoId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("always scopes reads to the authenticated user", async () => {
    vi.mocked(repertorioDb.getRepertorioPorAgendamento).mockResolvedValue(
      {} as never
    );
    const caller = appRouter.createCaller(makeCtx(42));
    await caller.repertorio.porAgendamento({ agendamentoId: 9 });
    expect(repertorioDb.getRepertorioPorAgendamento).toHaveBeenCalledWith(
      42,
      9
    );
  });

  it("trims moment input and converts empty observations to null", async () => {
    vi.mocked(repertorioDb.criarMomento).mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(makeCtx(7));
    await caller.repertorio.criarMomento({
      repertorioId: 3,
      tipoMomentoId: 2,
      nome: "  Entrada especial  ",
      observacoes: "  ",
    });
    expect(repertorioDb.criarMomento).toHaveBeenCalledWith(7, 3, {
      tipoMomentoId: 2,
      nome: "Entrada especial",
      observacoes: null,
    });
  });

  it("rejects an invalid music reference URL before accessing the database", async () => {
    const caller = appRouter.createCaller(makeCtx(7));
    await expect(
      caller.repertorio.criarMusica({
        momentoId: 4,
        titulo: "Ave Maria",
        linkReferencia: "link inválido",
      })
    ).rejects.toThrow("Informe um link válido");
    expect(repertorioDb.criarMusica).not.toHaveBeenCalled();
  });

  it("copies using only ids scoped by the authenticated user", async () => {
    vi.mocked(repertorioDb.copiarRepertorio).mockResolvedValue({} as never);
    const caller = appRouter.createCaller(makeCtx(12));
    await caller.repertorio.copiar({
      sourceRepertorioId: 5,
      targetAgendamentoId: 8,
    });
    expect(repertorioDb.copiarRepertorio).toHaveBeenCalledWith(12, 5, 8);
  });

  it("maps ownership errors without leaking records", async () => {
    vi.mocked(repertorioDb.removerMusica).mockRejectedValue(
      new repertorioDb.RepertorioDbError("FORBIDDEN", "Sem acesso.")
    );
    const caller = appRouter.createCaller(makeCtx(12));
    await expect(
      caller.repertorio.removerMusica({ musicaId: 99 })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "Sem acesso." });
  });
});
