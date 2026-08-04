import { useState } from "react";
import { Calendar, Copy, Loader2, MapPin, Search } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateSafe } from "@shared/dateUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (targetAgendamentoId: number) => void;
  mode: "source" | "target";
  currentAgendamentoId: number;
  currentRepertorioId?: number;
};

export default function RepertorioCopiarModal(props: Props) {
  const [busca, setBusca] = useState("");
  const sources = trpc.repertorio.pesquisarFontes.useQuery(
    { busca, excluirAgendamentoId: props.currentAgendamentoId },
    { enabled: props.open && props.mode === "source" }
  );
  const targets = trpc.repertorio.pesquisarDestinos.useQuery(
    { busca, excluirAgendamentoId: props.currentAgendamentoId },
    { enabled: props.open && props.mode === "target" }
  );
  const copyMutation = trpc.repertorio.copiar.useMutation({
    onSuccess: (_data, variables) => {
      toast.success("Repertório copiado com sucesso!");
      props.onSuccess(variables.targetAgendamentoId);
      props.onClose();
    },
    onError: error => toast.error(error.message),
  });
  const items = props.mode === "source" ? sources.data : targets.data;
  const loading =
    props.mode === "source" ? sources.isLoading : targets.isLoading;

  return (
    <Dialog open={props.open} onOpenChange={value => !value && props.onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {props.mode === "source"
              ? "Copiar repertório existente"
              : "Copiar para outro agendamento"}
          </DialogTitle>
          <DialogDescription>
            {props.mode === "source"
              ? "Pesquise por casal, data ou local. A cópia será independente e iniciará como rascunho."
              : "Selecione um agendamento sem repertório para receber uma cópia independente."}
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={busca}
            onChange={event => setBusca(event.target.value)}
            placeholder="Pesquisar casal, data ou local"
          />
        </div>
        <ScrollArea className="h-[360px] pr-3">
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : items?.length ? (
            <div className="space-y-2 py-2">
              {items.map(item => {
                const sourceRepertorioId =
                  props.mode === "source"
                    ? (item as unknown as { repertorioId: number }).repertorioId
                    : props.currentRepertorioId!;
                const targetId = item.agendamentoId;
                return (
                  <div
                    key={targetId}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-card p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{item.descricao}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateSafe(item.dataEvento, "dd/MM/yyyy")}
                        </span>
                        <span className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.local}</span>
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={copyMutation.isPending}
                      onClick={() =>
                        copyMutation.mutate({
                          sourceRepertorioId,
                          targetAgendamentoId:
                            props.mode === "source"
                              ? props.currentAgendamentoId
                              : targetId,
                        })
                      }
                    >
                      {copyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-14 text-muted-foreground">
              <Copy className="w-9 h-9 mx-auto mb-3 opacity-30" />
              <p>Nenhum resultado disponível</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
