import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/assets/logo.png", async () => {
  const { readFileSync } = await import("node:fs");
  return {
    default: `data:image/png;base64,${readFileSync("client/src/assets/logo.png").toString("base64")}`,
  };
});

import {
  PDFRepertorio,
  preparePDFRepertorio,
  distributeRepertorio,
} from "../client/src/components/PDFRepertorio";

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

    const document = await preparePDFRepertorio({
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

describe("fluxo de colunas do repertório", () => {
  const available = 841.89 - 22 - 60 - 32;
  it("mantém repertório pequeno somente na esquerda", () => {
    expect(distributeRepertorio([40, 60])).toEqual([{ columns: [[0, 1], []] }]);
  });
  it("move Fotos inteiro quando não cabe, sem balancear itens", () => {
    expect(distributeRepertorio([300, 300, 180, 50])).toEqual([
      {
        columns: [
          [0, 1],
          [2, 3],
        ],
      },
    ]);
  });
  it("usa exatamente duas colunas antes de abrir a página seguinte", () => {
    expect(distributeRepertorio([available, available])).toHaveLength(1);
    expect(distributeRepertorio([available, available, 20])).toEqual([
      { columns: [[0], [1]] },
      { columns: [[2], []] },
    ]);
  });
  it("preserva um bloco maior que a coluna em página dedicada", () => {
    expect(distributeRepertorio([50, available + 1, 20])).toEqual([
      { columns: [[0], []] },
      { columns: [[1]], oversized: true },
      { columns: [[2], []] },
    ]);
  });
});

async function renderLayout(momentos: any[], observacoes?: string) {
  const prepared = await preparePDFRepertorio({
    agendamento: { descricao: "Cerimônia Joice e Victor" },
    repertorio: { momentos, observacoes },
  });
  let layout: any;
  const buffer = await renderToBuffer(
    React.cloneElement(PDFRepertorio(prepared.props), {
      onRender: (result: any) => {
        layout = result._INTERNAL__LAYOUT__DATA_;
      },
    })
  );
  return { layout, buffer };
}

function checkBounds(layout: any) {
  for (const page of layout.children) {
    expect(page.box.height).toBeCloseTo(841.89, 1);
    const columns = page.children[1];
    for (const column of columns.children) {
      for (const block of column.children) {
        const top = columns.box.top + column.box.top + block.box.top;
        expect(top).toBeGreaterThanOrEqual(81.99);
        expect(top + block.box.height).toBeLessThanOrEqual(809.9);
      }
    }
  }
}

it("renderiza Joice e Victor em uma A4, com Fotos inteiro e textos na ordem", async () => {
  const names = [
    "Entrada da Bíblia",
    "Entrada dos Padrinhos",
    "Entrada do Noivo",
    "Entrada da Noiva",
    "Aclamação",
    "Votos",
    "Alianças",
    "Benção das Alianças",
    "Momento de Oração",
    "Assinatura",
    "Beijo dos Noivos",
    "Fotos",
    "Saída dos Padrinhos",
    "Saída dos Noivos",
  ];
  const songs = [
    ["Yeshua"],
    ["Dia Especial"],
    ["Um Amor Puro"],
    ["Marcha Nupcial", "So Nos Dois"],
    ["Aleluia"],
    ["Tu És"],
    ["Pra sonhar"],
    ["Ave Maria (Tradicional)"],
    ["Pai Nosso"],
    ["Turning Page"],
    ["Beija Eu"],
    [
      "Quando Bate Aquela Saudade",
      "Sentir",
      "Escolhi Te Esperar",
      "Partilhar",
      "A Primeira Vista",
      "Lisboa",
    ],
    ["Golden Hour"],
    ["Alianças"],
  ];
  const { layout, buffer } = await renderLayout(
    names.map((nome, id) => ({
      id,
      nome,
      musicas: songs[id].map((titulo, id) => ({ id, titulo })),
    }))
  );
  expect(layout.children).toHaveLength(1);
  checkBounds(layout);
  const columns = layout.children[0].children[1].children;
  // Without artist/details, this example may fit entirely in the left column.
  expect(columns[0].children.length).toBeGreaterThan(0);
  expect(columns.flatMap((c: any) => c.children)).toHaveLength(14);
  const fotos = columns
    .flatMap((c: any) => c.children)
    .find((b: any) => b.children[0].children[1].children[0].value === "Fotos");
  expect(fotos.children).toHaveLength(7);
  if (process.env.PDF_QA_OUTPUT) {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync("tmp/pdfs", { recursive: true });
    writeFileSync("tmp/pdfs/joice-victor.pdf", buffer);
  }
});

it("mede quebras de linha, detalhes e observações e continua em novas páginas", async () => {
  const { layout } = await renderLayout(
    Array.from({ length: 22 }, (_, id) => ({
      id,
      nome: `Momento ${id + 1}`,
      observacoes: "Observações do momento. ".repeat(3),
      musicas: [
        {
          id,
          titulo: "Nome de música muito comprido ".repeat(4),
          artista: "Artista com nome comprido ".repeat(4),
          tonalidade: "F#",
          observacoes: "Instrumental. Observação extensa. ".repeat(4),
        },
      ],
    })),
    "Observações gerais preservadas."
  );
  expect(layout.children.length).toBeGreaterThan(1);
  checkBounds(layout);
  const blocks = layout.children.flatMap((p: any) =>
    p.children[1].children.flatMap((c: any) => c.children)
  );
  expect(blocks).toHaveLength(23);
});

it("move um momento de várias músicas inteiro para a direita pela altura real", async () => {
  const momentos = Array.from({ length: 14 }, (_, id) => ({
    id,
    nome: id === 11 ? "Fotos" : `Momento ${id + 1}`,
    musicas: Array.from({ length: id === 11 ? 6 : 1 }, (_, song) => ({
      id: song,
      titulo: `Música ${song + 1}`,
      artista: "Artista",
      tonalidade: "C",
    })),
  }));
  const { layout, buffer } = await renderLayout(momentos);
  if (process.env.PDF_QA_OUTPUT) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync("tmp/pdfs/two-columns.pdf", buffer);
  }
  expect(layout.children).toHaveLength(1);
  checkBounds(layout);
  const columns = layout.children[0].children[1].children;
  expect(columns[1].children.length).toBeGreaterThan(0);
  const allBlocks = columns.flatMap((c: any) => c.children);
  expect(allBlocks).toHaveLength(14);
  expect(allBlocks[11].children).toHaveLength(7);
  const left = columns[0].children;
  const used = left.reduce(
    (sum: number, b: any) => sum + b.box.height + b.box.marginBottom,
    0
  );
  expect(used + columns[1].children[0].box.height).toBeGreaterThan(727.89);
});

it("preserva conteúdo e limites quando um único momento excede uma página", async () => {
  const { layout } = await renderLayout([
    {
      id: 1,
      nome: "Fotos",
      musicas: Array.from({ length: 100 }, (_, id) => ({
        id,
        titulo: `Música ${id + 1}`,
        artista: "Artista",
      })),
    },
  ]);
  expect(layout.children.length).toBeGreaterThan(1);
  // Native overflow must keep the page footer and all songs.
  const values: string[] = [];
  function visit(node: any) {
    if (node.value) values.push(node.value);
    node.children?.forEach(visit);
  }
  visit(layout);
  for (let index = 1; index <= 100; index++)
    expect(values).toContain(`Música ${index}`);
});
