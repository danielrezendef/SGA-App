import { describe, expect, it } from "vitest";
import { buildGoogleCalendarDescription } from "./googleCalendar";

describe("buildGoogleCalendarDescription", () => {
  const agendamento = {
    id: 27,
    descricao: "Casamento Ana e João",
    valorServico: "3500.00",
    observacoes: "Chegar com 30 minutos de antecedência.",
  };

  it("coloca a descrição antes do identificador e usa o valor do contrato", () => {
    expect(buildGoogleCalendarDescription(agendamento, "4200.00")).toBe(
      [
        "Casamento Ana e João",
        "Agendamento SGA #27",
        "Valor do serviço: R$ 4.200,00",
        "Observações:",
        "Chegar com 30 minutos de antecedência.",
      ].join("\n")
    );
  });

  it("usa o valor do agendamento como fallback quando ainda não há contrato", () => {
    expect(
      buildGoogleCalendarDescription({ ...agendamento, observacoes: null })
    ).toBe(
      [
        "Casamento Ana e João",
        "Agendamento SGA #27",
        "Valor do serviço: R$ 3.500,00",
      ].join("\n")
    );
  });
});
