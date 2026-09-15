import React from "react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import type { TrpcContext } from "./_core/context";
import { validateDocumentLogo } from "./documentLogo";
import {
  DOCUMENT_LOGO_MAX_BYTES,
  detectLogoType,
} from "../shared/documentLogo";

vi.mock("./db", () => ({
  saveUserDocumentLogo: vi.fn(),
  getUserDocumentLogo: vi.fn(),
}));
vi.mock("@/assets/logo.png", async () => {
  const { readFileSync } = await import("node:fs");
  return {
    default: `data:image/png;base64,${readFileSync("client/src/assets/logo.png").toString("base64")}`,
  };
});

import { documentLogoRouter } from "./documentLogoRouter";
import { saveUserDocumentLogo, getUserDocumentLogo } from "./db";
import {
  resolveDocumentLogo,
  prepareDocumentLogo,
} from "../client/src/lib/documentLogo";
import {
  PDFRepertorio,
  preparePDFRepertorio,
} from "../client/src/components/PDFRepertorio";
import { PDFRecibo } from "../client/src/components/PDFRecibo";

const encoded =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAICAYAAADwdn+XAAAAGklEQVR4nGPcYpPyn4ECwESJ5lEDIGDgAxEAxMgCY0x9XJoAAAAASUVORK5CYII=";
const png = Buffer.from(encoded, "base64");
const custom = `data:image/png;base64,${encoded}`;
const key = "document-logos/7/sample.png";
function caller(logoKey: string | null = key, authenticated = true) {
  return documentLogoRouter.createCaller({
    user: authenticated ? { id: 7, documentLogoKey: logoKey } : null,
  } as TrpcContext);
}
beforeEach(() => vi.clearAllMocks());

describe("logotipo: persistência e validação", () => {
  it("valida PNG real e rejeita conteúdo vazio, corrompido, scripts e excesso de tamanho", () => {
    expect(validateDocumentLogo(png)).toEqual(png);
    const corrupt = Buffer.from(png);
    corrupt[45] ^= 1;
    for (const invalid of [
      Buffer.alloc(0),
      Buffer.from("<svg onload='alert(1)'/>"),
      corrupt,
      png.subarray(0, 40),
      Buffer.concat([png, Buffer.from("<script/>")]),
      Buffer.alloc(DOCUMENT_LOGO_MAX_BYTES + 1),
    ])
      expect(() => validateDocumentLogo(invalid)).toThrow();
  });
  it("reconhece PNG/JPEG/WEBP pelos bytes", () => {
    expect(detectLogoType(png)).toBe("image/png");
    expect(detectLogoType(Uint8Array.from([255, 216, 255, 224]))).toBe(
      "image/jpeg"
    );
    expect(detectLogoType(Buffer.from("RIFFxxxxWEBP"))).toBe("image/webp");
    expect(detectLogoType(Buffer.from("<html/>"))).toBeNull();
  });
  it("rejeita arquivo renomeado e vazio antes de usar o navegador", async () => {
    await expect(
      prepareDocumentLogo(
        new File(["<script/>"], "logo.png", { type: "image/png" })
      )
    ).rejects.toThrow();
    await expect(
      prepareDocumentLogo(new File([], "logo.png", { type: "image/png" }))
    ).rejects.toThrow();
    await expect(
      prepareDocumentLogo(new File([png], "logo.jpg", { type: "image/jpeg" }))
    ).rejects.toThrow();
  });
  it("persiste imagem e versão juntas apenas no usuário autenticado", async () => {
    const saved = await caller().save({
      data: encoded,
      contentType: "image/png",
    });
    expect(saved.documentLogoKey).toMatch(/^[a-f0-9-]{36}$/);
    expect(saveUserDocumentLogo).toHaveBeenCalledWith(
      7,
      saved.documentLogoKey,
      custom
    );
    expect(saved.logoData).toBe(custom);
  });
  it("não persiste arquivo inválido e informa falha de gravação", async () => {
    await expect(
      caller().save({
        data: Buffer.from("fake").toString("base64"),
        contentType: "image/png",
      })
    ).rejects.toThrow();
    expect(saveUserDocumentLogo).not.toHaveBeenCalled();
    vi.mocked(saveUserDocumentLogo).mockRejectedValueOnce(new Error("offline"));
    await expect(
      caller().save({ data: encoded, contentType: "image/png" })
    ).rejects.toThrow();
  });
  it("remove imagem e versão com NULL e exige autenticação", async () => {
    expect(await caller().remove()).toEqual({ documentLogoKey: null });
    expect(saveUserDocumentLogo).toHaveBeenCalledWith(7, null, null);
    await expect(caller(null, false).remove()).rejects.toThrow();
    await expect(
      caller(null, false).save({ data: encoded, contentType: "image/png" })
    ).rejects.toThrow();
    await expect(caller(null, false).get({ key })).rejects.toThrow();
  });
  it("recupera a imagem persistida em uma nova requisição", async () => {
    const saved = await caller().save({
      data: encoded,
      contentType: "image/png",
    });
    vi.mocked(getUserDocumentLogo).mockResolvedValue(saved.logoData);
    expect(
      await caller(saved.documentLogoKey).get({ key: saved.documentLogoKey })
    ).toBe(custom);
    expect(getUserDocumentLogo).toHaveBeenCalledWith(7, saved.documentLogoKey);
  });
  it("invalida a versão anterior ao substituir a imagem", async () => {
    const first = await caller().save({
      data: encoded,
      contentType: "image/png",
    });
    const second = await caller().save({
      data: encoded,
      contentType: "image/png",
    });
    expect(first.documentLogoKey).not.toBe(second.documentLogoKey);
    expect(
      await caller(second.documentLogoKey).get({ key: first.documentLogoKey })
    ).toBeNull();
    expect(getUserDocumentLogo).not.toHaveBeenCalled();
  });
  it("isola usuários e retorna fallback para NULL, falha ou corrupção", async () => {
    expect(await caller().get({ key: "another-user-key" })).toBeNull();
    expect(await caller(null).get({ key })).toBeNull();
    expect(getUserDocumentLogo).not.toHaveBeenCalled();
    vi.mocked(getUserDocumentLogo).mockRejectedValueOnce(new Error("offline"));
    expect(await caller().get({ key })).toBeNull();
    vi.mocked(getUserDocumentLogo).mockResolvedValue(
      "data:image/png;base64,aW52YWxpZA=="
    );
    expect(await caller().get({ key })).toBeNull();
  });
});

function geometry(node: any): any {
  return {
    type: node.type,
    box: node.box,
    value: node.value,
    children: node.children?.map(geometry),
  };
}
async function render(document: React.ReactElement) {
  let layout: any;
  const bytes = await renderToBuffer(
    React.cloneElement(document, {
      onRender: (result: any) => {
        layout = result._INTERNAL__LAYOUT__DATA_;
      },
    } as any)
  );
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  return layout;
}
function images(node: any): any[] {
  return [
    ...(node.type === "IMAGE" ? [node] : []),
    ...(node.children ?? []).flatMap(images),
  ];
}

describe("logotipo: regressão de PDFs", () => {
  it("mantém o asset original como fallback", () => {
    const expected = `data:image/png;base64,${readFileSync("client/src/assets/logo.png").toString("base64")}`;
    for (const value of [
      null,
      undefined,
      "",
      "https://invalid.example/logo.png",
      "data:text/html,test",
    ])
      expect(resolveDocumentLogo(value)).toBe(expected);
    expect(resolveDocumentLogo(custom)).toBe(custom);
  });
  it("troca a imagem sem mudar geometria, conteúdo ou colunas do repertório", async () => {
    const props = {
      agendamento: { descricao: "Cerimônia Teste" },
      repertorio: {
        momentos: Array.from({ length: 18 }, (_, id) => ({
          id,
          nome: `Momento ${id}`,
          musicas: [{ id, titulo: "Canção", artista: "Artista" }],
        })),
      },
    };
    const original = await preparePDFRepertorio(props);
    const personalized = await preparePDFRepertorio({ ...props, logo: custom });
    const baseline = await render(PDFRepertorio(original.props));
    const changed = await render(PDFRepertorio(personalized.props));
    expect(geometry(changed)).toEqual(geometry(baseline));
    expect(images(changed)[0].props.src).toBe(custom);
  });
  it.each(["recibo", "contrato"] as const)(
    "preserva o %s e não adiciona logos onde não existem",
    async tipoDocumento => {
      const props = {
        tipoDocumento,
        nomeEmpresa: "SGA App",
        agendamento: {
          id: 1,
          descricao: "Casal",
          dataEvento: new Date("2026-10-10T12:00:00Z"),
          horario: "15:00",
          endereco: "Rua A",
          valorServico: 1500,
          status: "confirmado",
        },
        cobranca: {
          id: 2,
          responsavel: "Cliente",
          cpf: "123",
          endereco: "Rua B",
          valor: 1500,
          condicaoPagamento: "À vista",
          formaPagamento: "PIX",
          createdAt: new Date("2026-09-10T12:00:00Z"),
        },
        contratada: {
          nome: "Empresa",
          cpf: "123",
          endereco: "Rua C",
          cidadeAssinatura: "Itaúna",
          foro: "Itaúna",
        },
      };
      const baseline = await render(PDFRecibo(props) as React.ReactElement);
      const changed = await render(
        PDFRecibo({ ...props, logo: custom }) as React.ReactElement
      );
      expect(geometry(changed)).toEqual(geometry(baseline));
      expect(images(changed)).toHaveLength(tipoDocumento === "recibo" ? 1 : 0);
      if (tipoDocumento === "recibo")
        expect(images(changed)[0].props.src).toBe(custom);
    }
  );
});
