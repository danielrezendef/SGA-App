import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  tipoMomentoId: z.number().int().positive("Selecione o tipo do momento."),
  nome: z.string().trim().min(1, "Nome do momento é obrigatório.").max(255),
  observacoes: z.string().trim().max(5000).optional(),
});

type FormData = z.infer<typeof schema>;
type TipoMomento = { id: number; codigo: string; nome: string };
type Momento = {
  id: number;
  tipoMomentoId: number;
  nome: string;
  observacoes?: string | null;
};

export default function RepertorioMomentoModal({
  open,
  onClose,
  onSuccess,
  repertorioId,
  tipos,
  momento,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  repertorioId: number;
  tipos: TipoMomento[];
  momento?: Momento | null;
}) {
  const isEdit = Boolean(momento);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    reset(
      momento
        ? {
            tipoMomentoId: momento.tipoMomentoId,
            nome: momento.nome,
            observacoes: momento.observacoes ?? "",
          }
        : {
            tipoMomentoId: undefined as unknown as number,
            nome: "",
            observacoes: "",
          }
    );
  }, [momento, open, reset]);

  const finish = () => {
    toast.success(
      isEdit
        ? "Momento atualizado com sucesso!"
        : "Momento adicionado com sucesso!"
    );
    onSuccess();
    onClose();
  };
  const createMutation = trpc.repertorio.criarMomento.useMutation({
    onSuccess: finish,
    onError: error => toast.error(error.message),
  });
  const updateMutation = trpc.repertorio.atualizarMomento.useMutation({
    onSuccess: finish,
    onError: error => toast.error(error.message),
  });
  const pending = createMutation.isPending || updateMutation.isPending;
  const selectedType = watch("tipoMomentoId");

  const submit = (data: FormData) => {
    const payload = { ...data, observacoes: data.observacoes || null };
    if (momento) updateMutation.mutate({ momentoId: momento.id, ...payload });
    else createMutation.mutate({ repertorioId, ...payload });
  };

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar momento" : "Adicionar momento"}
          </DialogTitle>
          <DialogDescription>
            Defina o tipo normalizado e o nome que será exibido no repertório.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Tipo do momento *</Label>
            <Select
              value={selectedType ? String(selectedType) : ""}
              onValueChange={value => {
                const id = Number(value);
                setValue("tipoMomentoId", id, { shouldValidate: true });
                const tipo = tipos.find(item => item.id === id);
                if (tipo && (!isEdit || !watch("nome").trim()))
                  setValue("nome", tipo.nome, { shouldValidate: true });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                {tipos.map(tipo => (
                  <SelectItem key={tipo.id} value={String(tipo.id)}>
                    {tipo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipoMomentoId && (
              <p className="text-xs text-destructive">
                {errors.tipoMomentoId.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="momento-nome">Nome exibido *</Label>
            <Input
              id="momento-nome"
              placeholder="Ex: Entrada Especial da Noiva"
              {...register("nome")}
            />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="momento-observacoes">Observações</Label>
            <Textarea
              id="momento-observacoes"
              rows={3}
              {...register("observacoes")}
            />
          </div>
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
      </DialogContent>
    </Dialog>
  );
}
