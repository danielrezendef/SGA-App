import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/assets/logo.png", async () => {
  const { readFileSync } = await import("node:fs");
  return {
    default: `data:image/png;base64,${readFileSync("client/src/assets/logo.png").toString("base64")}`,
  };
});

import { formatAgendaDate, PDFAgenda } from "../client/src/components/PDFAgenda";

describe("PDFAgenda", () => {
  it("usa a data compacta em português", () => {
    expect(formatAgendaDate("2026-09-16")).toBe("16 SET 2026 · QUARTA");
  });

  it("gera uma agenda paginada, com cada evento sem quebra interna", async () => {
    let layout: any;
    const appointments = Array.from({ length: 24 }, (_, index) => ({
      id: index + 1,
      descricao: `Evento ${index + 1} com título suficientemente longo para testar a composição`,
      dataEvento: `2026-09-${String((index % 12) + 1).padStart(2, "0")}`,
      horario: "16:00:00",
      enderecoCerimonia: "Local com endereço longo para validar quebras de linha sem separar o agendamento.",
      observacoes: index % 2 ? "Observação detalhada do evento, preservada no relatório." : null,
      status: index % 3 ? "confirmado" : "orcamento",
    }));
    const document = PDFAgenda({
      appointments,
      generatedAt: new Date("2026-09-15T14:25:00"),
    });
    const buffer = await renderToBuffer(
      React.cloneElement(document, {
        onRender: (result: any) => {
          layout = result._INTERNAL__LAYOUT__DATA_;
        },
      })
    );

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(layout.children.length).toBeGreaterThan(1);

    const eventNodes: any[] = [];
    const visit = (node: any) => {
      if (node.style?.flexDirection === "row" && node.style?.paddingTop === 8)
        eventNodes.push(node);
      node.children?.forEach(visit);
    };
    visit(layout);
    expect(eventNodes).toHaveLength(appointments.length);
  });
});
