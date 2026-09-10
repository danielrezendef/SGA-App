import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { saveUserDocumentLogo, getUserDocumentLogo } from "./db";
import { validateDocumentLogo } from "./documentLogo";
import { DOCUMENT_LOGO_MAX_BYTES } from "../shared/documentLogo";

export const documentLogoRouter = router({
  save: protectedProcedure
    .input(
      z.object({
        data: z
          .string()
          .min(1)
          .max(Math.ceil(DOCUMENT_LOGO_MAX_BYTES / 3) * 4)
          .regex(
            /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
          ),
        contentType: z.literal("image/png"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let data: Buffer;
      try {
        data = validateDocumentLogo(Buffer.from(input.data, "base64"));
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Imagem inválida ou maior que o limite permitido.",
        });
      }
      const key = randomUUID();
      const logoData = `data:image/png;base64,${data.toString("base64")}`;
      // The image and its cache version are committed in the same UPDATE.
      // MySQL persists both across Railway restarts/deploys without local files.
      await saveUserDocumentLogo(ctx.user.id, key, logoData);
      return { documentLogoKey: key, logoData };
    }),
  remove: protectedProcedure.mutation(async ({ ctx }) => {
    await saveUserDocumentLogo(ctx.user.id, null, null);
    return { documentLogoKey: null };
  }),
  get: protectedProcedure
    .input(z.object({ key: z.string().max(255) }))
    .query(async ({ ctx, input }) => {
      // The input versions the cache, never grants access to another user's logo.
      if (!ctx.user.documentLogoKey || input.key !== ctx.user.documentLogoKey)
        return null;
      try {
        const stored = await getUserDocumentLogo(ctx.user.id, input.key);
        if (
          !stored?.startsWith("data:image/png;base64,") ||
          stored.length > Math.ceil(DOCUMENT_LOGO_MAX_BYTES / 3) * 4 + 22
        )
          return null;
        const data = validateDocumentLogo(
          Buffer.from(stored.slice(22), "base64")
        );
        return `data:image/png;base64,${data.toString("base64")}`;
      } catch {
        return null;
      }
    }),
});
