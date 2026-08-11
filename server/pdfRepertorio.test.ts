import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/assets/logo.png", () => ({
  default:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
}));

import { PDFRepertorio } from "../client/src/components/PDFRepertorio";

describe("PDFRepertorio", () => {
  it("gera um PDF paginado com caracteres #", async () => {
    const momentos = Array.from({ length: 18 }, (_, momentIndex) => ({
      id: momentIndex + 1,
      nome: `Momento #${momentIndex + 1}`,
      observacoes: "Executar conforme combinado.",
      musicas: Array.from({ length: 4 }, (_, musicIndex) => ({
        id: momentIndex * 10 + musicIndex + 1,
        titulo: `Música #${musicIndex + 1}`,
        artista: "Artista #1",
        tonalidade: "F#",
        observacoes: "Observação com # preservado.",
      })),
    }));

    const document = React.createElement(PDFRepertorio, {
      agendamento: { descricao: "Cerimônia Casal #1" },
      repertorio: {
        momentos,
        observacoes: "Observações gerais do repertório #1.",
      },
    });
    const buffer = await renderToBuffer(document);

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1_000);
  });
});
