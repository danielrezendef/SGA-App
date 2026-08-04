import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { History, Loader2, Music2, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { formatDateSafe } from "@shared/dateUtils";

const schema = z.object({
  titulo: z.string().trim().min(1, "Título é obrigatório.").max(255),
  artista: z.string().trim().max(255).optional(),
  tonalidade: z.string().trim().max(64).optional(),
  linkReferencia: z
    .string()
    .trim()
    .optional()
    .refine(
      value => !value || z.url().safeParse(value).success,
      "Informe um link válido."
    ),
  observacoes: z.string().trim().max(5000).optional(),
});
type FormData = z.infer<typeof schema>;
type Musica = {
  id: number;
  titulo: string;
  artista?: string | null;
  tonalidade?: string | null;
  linkReferencia?: string | null;
  observacoes?: string | null;
};

export default function RepertorioMusicaModal({
  open,
  onClose,
  onSuccess,
  momentoId,
  momentoNome,
  musica,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  momentoId: number;
  momentoNome: string;
  musica?: Musica | null;
}) {
  const [busca, setBusca] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  useEffect(() => {
    reset(
      musica
        ? {
            titulo: musica.titulo,
            artista: musica.artista ?? "",
            tonalidade: musica.tonalidade ?? "",
            linkReferencia: musica.linkReferencia ?? "",
            observacoes: musica.observacoes ?? "",
          }
        : {
            titulo: "",
            artista: "",
            tonalidade: "",
            linkReferencia: "",
            observacoes: "",
          }
    );
    setBusca("");
  }, [musica, open, reset]);

  const suggestions = trpc.repertorio.sugestoes.useQuery(
    { momentoId, busca },
    { enabled: open && momentoId > 0 }
  );
  const finish = () => {
    toast.success(
      musica
        ? "Música atualizada com sucesso!"
        : "Música adicionada com sucesso!"
    );
    onSuccess();
    onClose();
  };
  const createMutation = trpc.repertorio.criarMusica.useMutation({
    onSuccess: finish,
    onError: error => toast.error(error.message),
  });
  const updateMutation = trpc.repertorio.atualizarMusica.useMutation({
    onSuccess: finish,
    onError: error => toast.error(error.message),
  });
  const pending = createMutation.isPending || updateMutation.isPending;
  const submit = (data: FormData) => {
    const payload = {
      titulo: data.titulo,
      artista: data.artista || null,
      tonalidade: data.tonalidade || null,
      linkReferencia: data.linkReferencia || null,
      observacoes: data.observacoes || null,
    };
    if (musica) updateMutation.mutate({ musicaId: musica.id, ...payload });
    else createMutation.mutate({ momentoId, ...payload });
  };

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {musica ? "Editar música" : "Adicionar música"}
          </DialogTitle>
          <DialogDescription>
            Momento: {momentoNome}. Consulte o histórico do mesmo tipo para
            preencher mais rápido.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
          <form onSubmit={handleSubmit(submit)} className="space-y-4">
            <Field label="Título *" error={errors.titulo?.message}>
              <Input {...register("titulo")} />
            </Field>
            <Field label="Artista" error={errors.artista?.message}>
              <Input {...register("artista")} />
            </Field>
            <Field label="Tonalidade" error={errors.tonalidade?.message}>
              <Input placeholder="Ex: G, Am" {...register("tonalidade")} />
            </Field>
            <Field
              label="Link de referência"
              error={errors.linkReferencia?.message}
            >
              <Input
                type="url"
                placeholder="https://..."
                {...register("linkReferencia")}
              />
            </Field>
            <Field label="Observações" error={errors.observacoes?.message}>
              <Textarea rows={3} {...register("observacoes")} />
            </Field>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
          <div className="rounded-xl border bg-muted/20 p-3 min-w-0">
            <Label className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4" /> Sugestões e histórico
            </Label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={busca}
                onChange={event => setBusca(event.target.value)}
                placeholder="Pesquisar título ou artista"
              />
            </div>
            <ScrollArea className="h-72 pr-3">
              {suggestions.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : suggestions.data?.length ? (
                <div className="space-y-2">
                  {suggestions.data.map((item, index) => (
                    <button
                      type="button"
                      key={`${item.titulo}-${item.artista}-${index}`}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-primary transition-colors"
                      onClick={() => {
                        setValue("titulo", item.titulo, {
                          shouldValidate: true,
                        });
                        setValue("artista", item.artista ?? "");
                        setValue("tonalidade", item.tonalidade ?? "");
                        setValue("linkReferencia", item.linkReferencia ?? "");
                      }}
                    >
                      <p className="font-medium text-sm truncate">
                        {item.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.artista || "Artista não informado"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {item.quantidade} uso(s) · último em{" "}
                        {formatDateSafe(item.ultimaUtilizacao, "dd/MM/yyyy")}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Music2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma sugestão encontrada</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
