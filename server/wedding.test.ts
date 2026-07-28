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
  listContratos: vi.fn(),
  getLatestContratoByUserId: vi.fn(),
  getContratoById: vi.fn(),
  updateContrato: vi.fn(),
  deleteContrato: vi.fn(),
  setDefaultContrato: vi.fn(),
  getDashboardStats: vi.fn(),
}));

vi.mock("./googleCalendar", () => ({
  createGoogleCalendarAuthorizationUrl: vi.fn(),
  disconnectGoogleCalendar: vi.fn(),
  isGoogleCalendarConfigured: vi.fn(() => true),
  listGoogleCalendars: vi.fn(),
  selectGoogleCalendar: vi.fn(),
  syncAgendamentoToGoogleCalendar: vi.fn(() => Promise.resolve({ status: "skipped" })),
}));

import * as db from "./db";
import * as googleCalendar from "./googleCalendar";

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

  it("forwards the filter that excludes completed appointments", async () => {
    vi.mocked(db.listAgendamentos).mockResolvedValue({ items: [], total: 0 });

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    await caller.agendamentos.list({ excluirConcluidos: true });

    expect(db.listAgendamentos).toHaveBeenCalledWith({
      excluirConcluidos: true,
      page: 1,
      pageSize: 10,
      userId: 1,
    });
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

  it("rejects a non-numeric service value", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));

    await expect(caller.agendamentos.create({
      descricao: "Casamento Carla e Pedro",
      dataEvento: "2026-08-20",
      horario: "17:00",
      enderecoCerimonia: "Fazenda Boa Vista",
      valorServico: "R$ 8.000,00",
    })).rejects.toThrow("Valor do serviço deve conter somente números");
  });
});

describe("agendamentos.update", () => {
  const existingAgendamento = {
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

  it("updates the status sent by the edit modal used in list and detail pages", async () => {
    const updatedAgendamento = { ...existingAgendamento, status: "confirmado" as const };
    vi.mocked(db.getAgendamentoById).mockResolvedValue(existingAgendamento);
    vi.mocked(db.updateAgendamento).mockResolvedValue(updatedAgendamento);

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    const result = await caller.agendamentos.update({
      id: 1,
      descricao: existingAgendamento.descricao,
      dataEvento: "2026-08-20",
      horario: "17:00",
      enderecoCerimonia: existingAgendamento.enderecoCerimonia,
      valorServico: existingAgendamento.valorServico,
      status: "confirmado",
      observacoes: "Atualizado pelo modal",
    });

    expect(db.updateAgendamento).toHaveBeenCalledWith(1, {
      descricao: existingAgendamento.descricao,
      dataEvento: "2026-08-20",
      horario: "17:00",
      enderecoCerimonia: existingAgendamento.enderecoCerimonia,
      valorServico: existingAgendamento.valorServico,
      status: "confirmado",
      observacoes: "Atualizado pelo modal",
    });
    expect(result?.status).toBe("confirmado");
    expect(googleCalendar.syncAgendamentoToGoogleCalendar).toHaveBeenCalledWith(updatedAgendamento);
  });

  it("does not allow editing another user's appointment", async () => {
    vi.mocked(db.getAgendamentoById).mockResolvedValue({ ...existingAgendamento, userId: 2 });

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));

    await expect(caller.agendamentos.update({
      id: 1,
      status: "concluido",
    })).rejects.toThrow();
    expect(db.updateAgendamento).not.toHaveBeenCalled();
  });
});

describe("agendamentos.delete", () => {
  it.each(["user", "admin"] as const)("allows %s to delete their own appointment", async (role) => {
    vi.mocked(db.getAgendamentoById).mockResolvedValue({
      id: 1,
      userId: 1,
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

    const caller = appRouter.createCaller(makeCtx({ id: 1, role }));
    const result = await caller.agendamentos.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it.each(["user", "admin"] as const)("forbids %s from deleting another user's appointment", async (role) => {
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

    const caller = appRouter.createCaller(makeCtx({ id: 1, role }));
    await expect(caller.agendamentos.delete({ id: 1 })).rejects.toThrow();
    expect(db.deleteAgendamento).not.toHaveBeenCalled();
  });
});

describe("agendamentos.updateStatus", () => {
  it.each(["user", "admin"] as const)("allows %s to change the status of their own appointment", async (role) => {
    vi.mocked(db.getAgendamentoById).mockResolvedValue({
      id: 1,
      userId: 1,
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
      userId: 1,
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

    const caller = appRouter.createCaller(makeCtx({ id: 1, role }));
    const result = await caller.agendamentos.updateStatus({ id: 1, status: "concluido" });

    expect(db.updateAgendamento).toHaveBeenCalledWith(1, { status: "concluido" });
    expect(result?.status).toBe("concluido");
  });

  it.each(["user", "admin"] as const)("forbids %s from changing another user's appointment status", async (role) => {
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

    const caller = appRouter.createCaller(makeCtx({ id: 1, role }));
    await expect(caller.agendamentos.updateStatus({ id: 1, status: "concluido" })).rejects.toThrow();
    expect(db.updateAgendamento).not.toHaveBeenCalled();
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
    expect(db.createContrato).not.toHaveBeenCalled();
  });

  it("does not register the customer as a contractor when automatic contract is enabled", async () => {
    vi.mocked(db.getAgendamentoById).mockResolvedValue({
      id: 1,
      userId: 1,
      descricao: "Casamento Ana e Joao",
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
    vi.mocked(db.getUserById).mockResolvedValue({
      ...makeCtx({ id: 1 }).user!,
      gerarContratoAutomaticamente: true,
    });
    vi.mocked(db.createCobranca).mockResolvedValue({
      id: 1,
      agendamentoId: 1,
      nomeResponsavel: "Cliente da Silva",
      cpf: "123.456.789-00",
      cep: "35680-000",
      rua: "Rua A",
      numero: "123",
      complemento: null,
      bairro: "Centro",
      cidade: "Itauna",
      estado: "MG",
      valor: "5000.00",
      condicaoPagamento: "50% entrada",
      formaPagamento: "pix",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));
    await caller.cobrancas.create({
      agendamentoId: 1,
      nomeResponsavel: "Cliente da Silva",
      cpf: "123.456.789-00",
      cep: "35680-000",
      rua: "Rua A",
      numero: "123",
      bairro: "Centro",
      cidade: "Itauna",
      estado: "MG",
      valor: "5000.00",
      condicaoPagamento: "50% entrada",
      formaPagamento: "pix",
    });

    expect(db.createCobranca).toHaveBeenCalledWith(
      expect.objectContaining({ nomeResponsavel: "Cliente da Silva" }),
      "confirmado"
    );
    expect(db.createContrato).not.toHaveBeenCalled();
  });
});

// ─── Dashboard tests ──────────────────────────────────────────────────────────
describe("users administration", () => {
  it("allows administrators to list, change the role of, and delete users", async () => {
    vi.mocked(db.listUsers).mockResolvedValue([]);

    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "admin" }));
    await expect(caller.users.list()).resolves.toEqual([]);
    await expect(caller.users.updateRole({ userId: 2, role: "admin" })).resolves.toEqual({ success: true });
    await expect(caller.users.delete({ userId: 2 })).resolves.toEqual({ success: true });

    expect(db.updateUserRole).toHaveBeenCalledWith(2, "admin");
    expect(db.deleteUser).toHaveBeenCalledWith(2);
  });

  it("forbids regular users from managing users", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 1, role: "user" }));

    await expect(caller.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.users.updateRole({ userId: 2, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.users.delete({ userId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(db.listUsers).not.toHaveBeenCalled();
    expect(db.updateUserRole).not.toHaveBeenCalled();
    expect(db.deleteUser).not.toHaveBeenCalled();
  });
});

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

// ─── Contratos tests ─────────────────────────────────────────────────────────
describe("contratos isolation", () => {
  it("always lists contracts using the authenticated user id", async () => {
    vi.mocked(db.listContratos).mockResolvedValue([]);

    const caller = appRouter.createCaller(makeCtx({ id: 42, role: "user" }));
    await caller.contratos.list();

    expect(db.listContratos).toHaveBeenCalledWith(42);
  });

  it("does not update a contract that does not belong to the authenticated user", async () => {
    vi.mocked(db.getContratoById).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx({ id: 42, role: "user" }));
    await expect(
      caller.contratos.update({ id: 99, nomeCompleto: "Outro usuário" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(db.getContratoById).toHaveBeenCalledWith(42, 99);
    expect(db.updateContrato).not.toHaveBeenCalled();
  });
});

describe("googleCalendar selection", () => {
  it("lists only the authenticated user's writable calendars", async () => {
    vi.mocked(googleCalendar.listGoogleCalendars).mockResolvedValue([
      { id: "agenda@test.com", name: "Agenda de eventos", primary: false },
    ]);

    const caller = appRouter.createCaller(makeCtx({ id: 42, role: "user" }));
    const result = await caller.googleCalendar.calendars();

    expect(googleCalendar.listGoogleCalendars).toHaveBeenCalledWith(42);
    expect(result[0]?.name).toBe("Agenda de eventos");
  });

  it("saves the selected calendar for the authenticated user", async () => {
    vi.mocked(googleCalendar.selectGoogleCalendar).mockResolvedValue({
      id: "agenda@test.com",
      name: "Agenda de eventos",
      primary: false,
    });

    const caller = appRouter.createCaller(makeCtx({ id: 42, role: "user" }));
    await caller.googleCalendar.selectCalendar({ calendarId: "agenda@test.com" });

    expect(googleCalendar.selectGoogleCalendar).toHaveBeenCalledWith(42, "agenda@test.com");
  });
});
