import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  listUsers: vi.fn(),
  updateUserRole: vi.fn(),
  deleteUser: vi.fn(),
  listAgendamentos: vi.fn(),
  getAgendamentoById: vi.fn(),
  createAgendamento: vi.fn(),
  updateAgendamento: vi.fn(),
  deleteAgendamento: vi.fn(),
  getCobrancaByAgendamentoId: vi.fn(),
  createCobranca: vi.fn(),
  updateCobranca: vi.fn(),
  createContrato: vi.fn(),
  getDashboardStats: vi.fn(),
}));

import * as db from "./db";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Context helpers ──────────────────────────────────────────────────────────
function makeCtx(user?: Partial<TrpcContext["user"]>): TrpcContext {
  const cookies: Record<string, unknown> = {};
  return {
    user: user
      ? {
          id: 1,
          openId: "test",
          name: "Test User",
          email: "test@example.com",
          loginMethod: "local",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
          password: null,
          ...user,
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: unknown, opts: unknown) => { cookies[name] = value; },
      clearCookie: (name: string) => { delete cookies[name]; },
    } as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth.register", () => {
  it("creates a new user and returns success", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.createUser).mockResolvedValue({
      id: 1,
      openId: "local_123",
      name: "Maria Silva",
      email: "maria@test.com",
      password: "hashed",
      loginMethod: "local",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.register({
      name: "Maria Silva",
      email: "maria@test.com",
      password: "senha123",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("maria@test.com");
    expect(result.user.role).toBe("user");
  });

  it("throws CONFLICT if email already exists", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      openId: "existing",
      name: "Existing",
      email: "existing@test.com",
      password: "hash",
      loginMethod: "local",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.auth.register({ name: "Test", email: "existing@test.com", password: "senha123" })
    ).rejects.toThrow("E-mail já cadastrado");
  });
});

describe("auth.logout", () => {
  it("clears cookie and returns success", async () => {
    const ctx = makeCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ─── Agendamentos tests ───────────────────────────────────────────────────────
describe("agendamentos.list", () => {
  it("returns agendamentos for authenticated user", async () => {
    vi.mocked(db.listAgendamentos).mockResolvedValue({
      items: [
        {
          id: 1,
          userId: 1,
          descricao: "Casamento Ana e João",
          dataEvento: new Date("2026-06-15"),
          horario: "16:00:00",
          enderecoCerimonia: "Igreja São Paulo",
          valorServico: "5000.00",
          status: "orcamento",
          observacoes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    });

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    const result = await caller.agendamentos.list({});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].descricao).toBe("Casamento Ana e João");
    expect(result.total).toBe(1);
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.agendamentos.list({})).rejects.toThrow();
  });
});

describe("agendamentos.create", () => {
  it("creates agendamento with status orcamento", async () => {
    const mockAg = {
      id: 1,
      userId: 1,
      descricao: "Casamento Carla e Pedro",
      dataEvento: new Date("2026-08-20"),
      horario: "17:00:00",
      enderecoCerimonia: "Fazenda Boa Vista",
      valorServico: "8000.00",
      status: "orcamento" as const,
      observacoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.createAgendamento).mockResolvedValue(mockAg);

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    const result = await caller.agendamentos.create({
      descricao: "Casamento Carla e Pedro",
      dataEvento: "2026-08-20",
      horario: "17:00",
      enderecoCerimonia: "Fazenda Boa Vista",
      valorServico: "8000.00",
    });

    expect(result?.status).toBe("orcamento");
    expect(result?.descricao).toBe("Casamento Carla e Pedro");
  });
});

describe("agendamentos.delete", () => {
  it("allows admin to delete agendamento", async () => {
    vi.mocked(db.getAgendamentoById).mockResolvedValue({
      id: 1,
      userId: 2,
      descricao: "Test",
      dataEvento: new Date(),
      horario: "10:00:00",
      enderecoCerimonia: "Test",
      valorServico: "1000.00",
      status: "orcamento",
      observacoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.deleteAgendamento).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "admin" }));
    const result = await caller.agendamentos.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("forbids non-admin from deleting", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    await expect(caller.agendamentos.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("agendamentos.updateStatus", () => {
  it("allows admin to mark agendamento as concluido", async () => {
    vi.mocked(db.getAgendamentoById).mockResolvedValue({
      id: 1,
      userId: 2,
      descricao: "Casamento concluído",
      dataEvento: new Date(),
      horario: "10:00:00",
      enderecoCerimonia: "Igreja",
      valorServico: "1000.00",
      status: "pagamento",
      observacoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.updateAgendamento).mockResolvedValue({
      id: 1,
      userId: 2,
      descricao: "Casamento concluído",
      dataEvento: new Date(),
      horario: "10:00:00",
      enderecoCerimonia: "Igreja",
      valorServico: "1000.00",
      status: "concluido",
      observacoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "admin" }));
    const result = await caller.agendamentos.updateStatus({ id: 1, status: "concluido" });

    expect(db.updateAgendamento).toHaveBeenCalledWith(1, { status: "concluido" });
    expect(result?.status).toBe("concluido");
  });
});

// ─── Cobranças tests ──────────────────────────────────────────────────────────
describe("cobrancas.create", () => {
  it("creates cobranca and updates status to pagamento when automatic contract is disabled", async () => {
    vi.mocked(db.getAgendamentoById).mockResolvedValue({
      id: 1,
      userId: 1,
      descricao: "Casamento Ana e João",
      dataEvento: new Date(),
      horario: "16:00:00",
      enderecoCerimonia: "Igreja",
      valorServico: "5000.00",
      status: "orcamento",
      observacoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.getCobrancaByAgendamentoId).mockResolvedValueOnce(undefined);
    vi.mocked(db.createCobranca).mockResolvedValue({
      id: 1,
      agendamentoId: 1,
      nomeResponsavel: "João Silva",
      cpf: "123.456.789-00",
      cep: "35680-000",
      rua: "Rua A",
      numero: "123",
      complemento: null,
      bairro: "Centro",
      cidade: "Itaúna",
      estado: "MG",
      valor: "5000.00",
      condicaoPagamento: "50% entrada",
      formaPagamento: "pix",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    const result = await caller.cobrancas.create({
      agendamentoId: 1,
      nomeResponsavel: "João Silva",
      cpf: "123.456.789-00",
      cep: "35680-000",
      rua: "Rua A",
      numero: "123",
      bairro: "Centro",
      cidade: "Itaúna",
      estado: "MG",
      valor: "5000.00",
      condicaoPagamento: "50% entrada",
      formaPagamento: "pix",
    });

    expect(result?.nomeResponsavel).toBe("João Silva");
    expect(db.createCobranca).toHaveBeenCalledWith(
      expect.objectContaining({ agendamentoId: 1, formaPagamento: "pix" }),
      "pagamento"
    );
  });
});

// ─── Dashboard tests ──────────────────────────────────────────────────────────
describe("dashboard.stats", () => {
  it("returns stats for authenticated user", async () => {
    vi.mocked(db.getDashboardStats).mockResolvedValue({
      totalAno: 10,
      totalMes: 3,
      porStatus: [{ status: "orcamento", count: 5 }],
      proximosEventos: [],
      valorConfirmados: 15000,
      valorReceber: 25000,
      porMes: [],
    });

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    const result = await caller.dashboard.stats();
    expect(result?.totalAno).toBe(10);
    expect(result?.totalMes).toBe(3);
    expect(result?.valorReceber).toBe(25000);
  });
});
