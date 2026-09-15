import React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/assets/logo.png", async () => {
  const { readFileSync } = await import("node:fs");
  return {
    default: `data:image/png;base64,${readFileSync("client/src/assets/logo.png").toString("base64")}`,
  };
});

import { formatAgendaDate, preparePDFAgenda } from "../client/src/components/PDFAgenda";

describe("PDFAgenda", () => {
  it("usa a data compacta em português", () => {
    expect(formatAgendaDate("2026-09-16")).toBe("16 SET 2026 · QUARTA");
  });

  it("gera uma agenda paginada, com cada evento sem quebra interna", async () => {
    const appointments = Array.from({ length: 24 }, (_, index) => ({
      id: index + 1,
      descricao: `Evento ${index + 1} com título suficientemente longo para testar a composição`,
      dataEvento: `2026-09-${String((index % 12) + 1).padStart(2, "0")}`,
      horario: "16:00:00",
      enderecoCerimonia: "Local com endereço longo para validar quebras de linha sem separar o agendamento.",
      observacoes: index % 2 ? "Observação que não deve ser exibida no PDF." : null,
      status: ["orcamento", "confirmado", "concluido"][index % 3],
    }));
    const document = await preparePDFAgenda({
      appointments,
      generatedAt: new Date("2026-09-15T14:25:00"),
    });
    const buffer = await renderToBuffer(document);

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.PDF_QA_OUTPUT) {
      mkdirSync("output/pdf", { recursive: true });
      writeFileSync("output/pdf/agenda-preview.pdf", buffer);
    }
    expect((document.props as { sheets?: number[][] }).sheets).toHaveLength(2);
  });
});
