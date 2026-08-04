import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  RepertorioDbError,
  alterarStatusRepertorio,
  atualizarMomento,
  atualizarMusica,
  atualizarObservacoesRepertorio,
  buscarSugestoes,
  copiarRepertorio,
  criarMomento,
  criarMusica,
  criarRepertorio,
  duplicarMomento,
  getRepertorioPorAgendamento,
  moverMomento,
  moverMusica,
  pesquisarAgendamentosSemRepertorio,
  pesquisarRepertorios,
  removerMomento,
  removerMusica,
} from "./repertorioDb";

const idSchema = z.number().int().positive();
const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} é obrigatório.`).max(255);
const optionalText = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .nullable()
  .transform(value => value || null);
const optionalShortText = z
  .string()
  .trim()
  .max(255)
  .optional()
  .nullable()
  .transform(value => value || null);
const optionalUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    value => !value || z.url().safeParse(value).success,
    "Informe um link válido."
  )
  .transform(value => value || null);

const momentoData = z.object({
  tipoMomentoId: idSchema,
  nome: requiredText("Nome do momento"),
  observacoes: optionalText,
});

const musicaData = z.object({
  titulo: requiredText("Título"),
  artista: optionalShortText,
  tonalidade: z
    .string()
    .trim()
    .max(64)
    .optional()
    .nullable()
    .transform(value => value || null),
  linkReferencia: optionalUrl,
  observacoes: optionalText,
});

function withDbErrors<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
) {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof RepertorioDbError) {
        throw new TRPCError({ code: error.code, message: error.message });
      }
      throw error;
    }
  };
}

export const repertorioRouter = router({
  porAgendamento: protectedProcedure
    .input(z.object({ agendamentoId: idSchema }))
    .query(({ ctx, input }) =>
      withDbErrors(getRepertorioPorAgendamento)(
        ctx.user.id,
        input.agendamentoId
      )
    ),

  criarModeloPadrao: protectedProcedure
    .input(z.object({ agendamentoId: idSchema }))
    .mutation(({ ctx, input }) =>
      withDbErrors(criarRepertorio)(ctx.user.id, input.agendamentoId, true)
    ),

  criarVazio: protectedProcedure
    .input(z.object({ agendamentoId: idSchema }))
    .mutation(({ ctx, input }) =>
      withDbErrors(criarRepertorio)(ctx.user.id, input.agendamentoId, false)
    ),

  copiar: protectedProcedure
    .input(
      z.object({ sourceRepertorioId: idSchema, targetAgendamentoId: idSchema })
    )
    .mutation(({ ctx, input }) =>
      withDbErrors(copiarRepertorio)(
        ctx.user.id,
        input.sourceRepertorioId,
        input.targetAgendamentoId
      )
    ),

  pesquisarFontes: protectedProcedure
    .input(
      z.object({
        busca: z.string().trim().max(255).default(""),
        excluirAgendamentoId: idSchema.optional(),
      })
    )
    .query(({ ctx, input }) =>
      withDbErrors(pesquisarRepertorios)(
        ctx.user.id,
        input.busca,
        input.excluirAgendamentoId
      )
    ),

  pesquisarDestinos: protectedProcedure
    .input(
      z.object({
        busca: z.string().trim().max(255).default(""),
        excluirAgendamentoId: idSchema.optional(),
      })
    )
    .query(({ ctx, input }) =>
      withDbErrors(pesquisarAgendamentosSemRepertorio)(
        ctx.user.id,
        input.busca,
        input.excluirAgendamentoId
      )
    ),

  atualizarObservacoes: protectedProcedure
    .input(z.object({ repertorioId: idSchema, observacoes: optionalText }))
    .mutation(({ ctx, input }) =>
      withDbErrors(atualizarObservacoesRepertorio)(
        ctx.user.id,
        input.repertorioId,
        input.observacoes
      )
    ),

  alterarStatus: protectedProcedure
    .input(
      z.object({
        repertorioId: idSchema,
        status: z.enum(["RASCUNHO", "EM_DEFINICAO", "FINALIZADO"]),
      })
    )
    .mutation(({ ctx, input }) =>
      withDbErrors(alterarStatusRepertorio)(
        ctx.user.id,
        input.repertorioId,
        input.status
      )
    ),

  criarMomento: protectedProcedure
    .input(momentoData.extend({ repertorioId: idSchema }))
    .mutation(({ ctx, input }) => {
      const { repertorioId, ...data } = input;
      return withDbErrors(criarMomento)(ctx.user.id, repertorioId, data);
    }),

  atualizarMomento: protectedProcedure
    .input(momentoData.extend({ momentoId: idSchema }))
    .mutation(({ ctx, input }) => {
      const { momentoId, ...data } = input;
      return withDbErrors(atualizarMomento)(ctx.user.id, momentoId, data);
    }),

  duplicarMomento: protectedProcedure
    .input(z.object({ momentoId: idSchema }))
    .mutation(({ ctx, input }) =>
      withDbErrors(duplicarMomento)(ctx.user.id, input.momentoId)
    ),

  removerMomento: protectedProcedure
    .input(z.object({ momentoId: idSchema }))
    .mutation(({ ctx, input }) =>
      withDbErrors(removerMomento)(ctx.user.id, input.momentoId)
    ),

  moverMomento: protectedProcedure
    .input(
      z.object({ momentoId: idSchema, direcao: z.enum(["cima", "baixo"]) })
    )
    .mutation(({ ctx, input }) =>
      withDbErrors(moverMomento)(ctx.user.id, input.momentoId, input.direcao)
    ),

  criarMusica: protectedProcedure
    .input(musicaData.extend({ momentoId: idSchema }))
    .mutation(({ ctx, input }) => {
      const { momentoId, ...data } = input;
      return withDbErrors(criarMusica)(ctx.user.id, momentoId, data);
    }),

  atualizarMusica: protectedProcedure
    .input(musicaData.extend({ musicaId: idSchema }))
    .mutation(({ ctx, input }) => {
      const { musicaId, ...data } = input;
      return withDbErrors(atualizarMusica)(ctx.user.id, musicaId, data);
    }),

  removerMusica: protectedProcedure
    .input(z.object({ musicaId: idSchema }))
    .mutation(({ ctx, input }) =>
      withDbErrors(removerMusica)(ctx.user.id, input.musicaId)
    ),

  moverMusica: protectedProcedure
    .input(z.object({ musicaId: idSchema, direcao: z.enum(["cima", "baixo"]) }))
    .mutation(({ ctx, input }) =>
      withDbErrors(moverMusica)(ctx.user.id, input.musicaId, input.direcao)
    ),

  sugestoes: protectedProcedure
    .input(
      z.object({
        momentoId: idSchema,
        busca: z.string().trim().max(255).default(""),
      })
    )
    .query(({ ctx, input }) =>
      withDbErrors(buscarSugestoes)(ctx.user.id, input.momentoId, input.busca)
    ),
});
