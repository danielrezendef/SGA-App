import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileMusic,
  FilePlus2,
  Loader2,
  MapPin,
  Music2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDateSafe } from "@shared/dateUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import RepertorioCopiarModal from "@/components/RepertorioCopiarModal";
import RepertorioMomentoModal from "@/components/RepertorioMomentoModal";
import RepertorioMusicaModal from "@/components/RepertorioMusicaModal";

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_DEFINICAO: "Em definição",
  FINALIZADO: "Finalizado",
};

type Confirmation = {
  title: string;
  description: string;
  action: () => void;
} | null;

export default function RepertorioAgendamento() {
  const params = useParams<{ id: string }>();
  const agendamentoId = Number.parseInt(params.id ?? "", 10);
  const validId = Number.isFinite(agendamentoId) && agendamentoId > 0;
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const query = trpc.repertorio.porAgendamento.useQuery(
    { agendamentoId },
    { enabled: validId }
  );
  const [observacoes, setObservacoes] = useState("");
  const [momentoModal, setMomentoModal] = useState<{
    open: boolean;
    momento: any | null;
  }>({ open: false, momento: null });
  const [musicaModal, setMusicaModal] = useState<{
    open: boolean;
    momento: any | null;
    musica: any | null;
  }>({ open: false, momento: null, musica: null });
  const [copyMode, setCopyMode] = useState<"source" | "target" | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const refresh = () =>
    utils.repertorio.porAgendamento.invalidate({ agendamentoId });
  useEffect(
    () => setObservacoes(query.data?.repertorio?.observacoes ?? ""),
    [query.data?.repertorio?.observacoes]
  );

  const createModel = trpc.repertorio.criarModeloPadrao.useMutation({
    onSuccess: () => {
      toast.success("Repertório criado com o modelo padrão!");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const createEmpty = trpc.repertorio.criarVazio.useMutation({
    onSuccess: () => {
      toast.success("Repertório vazio criado!");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const saveNotes = trpc.repertorio.atualizarObservacoes.useMutation({
    onSuccess: () => {
      toast.success("Observações salvas automaticamente!");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const changeStatus = trpc.repertorio.alterarStatus.useMutation({
    onSuccess: () => {
      toast.success("Status do repertório atualizado!");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const duplicateMoment = trpc.repertorio.duplicarMomento.useMutation({
    onSuccess: () => {
      toast.success("Momento duplicado!");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const removeMoment = trpc.repertorio.removerMomento.useMutation({
    onSuccess: () => {
      toast.success("Momento removido!");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const moveMoment = trpc.repertorio.moverMomento.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });
  const removeMusic = trpc.repertorio.removerMusica.useMutation({
    onSuccess: () => {
      toast.success("Música removida!");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const moveMusic = trpc.repertorio.moverMusica.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });

  if (query.isLoading) return <LoadingState />;
  if (!validId || query.error || !query.data) {
    return (
      <div className="text-center py-16">
        <FileMusic className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
        <p className="font-medium">
          {query.error?.message || "Agendamento não encontrado"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/agendamentos")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const { agendamento, repertorio, tiposMomento } = query.data;
  if (!repertorio) {
    const pending = createModel.isPending || createEmpty.isPending;
    return (
      <div className="space-y-6 page-enter">
        <PageHeader
          agendamento={agendamento}
          onBack={() => navigate(`/agendamentos/${agendamentoId}`)}
        />
        <Card className="border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-2">
              <FileMusic className="w-7 h-7 text-primary" />
            </div>
            <CardTitle>Este agendamento ainda não possui repertório</CardTitle>
            <CardDescription>
              Escolha como deseja começar. Todas as opções poderão ser editadas
              depois.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <EmptyOption
              icon={<FilePlus2 />}
              title="Modelo padrão"
              description="Cria os oito momentos principais da cerimônia."
              disabled={pending}
              onClick={() => createModel.mutate({ agendamentoId })}
            />
            <EmptyOption
              icon={<Music2 />}
              title="Repertório vazio"
              description="Comece do zero e adicione somente os momentos necessários."
              disabled={pending}
              onClick={() => createEmpty.mutate({ agendamentoId })}
            />
            <EmptyOption
              icon={<Copy />}
              title="Copiar existente"
              description="Pesquise repertórios anteriores por casal, data ou local."
              disabled={pending}
              onClick={() => setCopyMode("source")}
            />
          </CardContent>
        </Card>
        <RepertorioCopiarModal
          open={copyMode === "source"}
          onClose={() => setCopyMode(null)}
          onSuccess={() => refresh()}
          mode="source"
          currentAgendamentoId={agendamentoId}
        />
      </div>
    );
  }

  const finalized = repertorio.status === "FINALIZADO";
  const busy =
    duplicateMoment.isPending ||
    removeMoment.isPending ||
    moveMoment.isPending ||
    removeMusic.isPending ||
    moveMusic.isPending;

  const downloadPdf = async () => {
    try {
      setGeneratingPdf(true);
      const [{ PDFRepertorio }, { pdf }] = await Promise.all([
        import("@/components/PDFRepertorio"),
        import("@react-pdf/renderer"),
      ]);
      const blob = await pdf(
        <PDFRepertorio agendamento={agendamento} repertorio={repertorio} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const name = agendamento.descricao
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
        .replace(/\s+/g, " ");
      link.href = url;
      link.download = `Repertorio ${name}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF do repertório gerado!");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF do repertório.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-5 page-enter">
      <PageHeader
        agendamento={agendamento}
        status={repertorio.status}
        onBack={() => navigate(`/agendamentos/${agendamentoId}`)}
      />
      <div className="flex flex-wrap gap-2">
        {!finalized ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setConfirmation({
                  title: "Finalizar repertório?",
                  description:
                    "O repertório ficará em modo de visualização até ser reaberto.",
                  action: () =>
                    changeStatus.mutate({
                      repertorioId: repertorio.id,
                      status: "FINALIZADO",
                    }),
                })
              }
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Finalizar repertório
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setConfirmation({
                title: "Reabrir repertório?",
                description:
                  "O repertório voltará ao estado Em definição e poderá ser editado.",
                action: () =>
                  changeStatus.mutate({
                    repertorioId: repertorio.id,
                    status: "EM_DEFINICAO",
                  }),
              })
            }
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reabrir repertório
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={downloadPdf}
          disabled={generatingPdf}
        >
          {generatingPdf ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Gerar PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCopyMode("target")}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copiar repertório
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/agendamentos/${agendamentoId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao agendamento
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Momentos da cerimônia</h2>
          <p className="text-sm text-muted-foreground">
            {repertorio.momentos.length} momento(s) cadastrado(s)
          </p>
        </div>
        {!finalized && (
          <Button
            size="sm"
            onClick={() => setMomentoModal({ open: true, momento: null })}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar momento
          </Button>
        )}
      </div>

      {repertorio.momentos.length ? (
        <div className="space-y-2">
          {repertorio.momentos.map((momento: any, index: number) => (
            <Card key={momento.id} className="gap-0 border-border/50 py-0 overflow-hidden">
              <CardHeader className="px-3 py-1.5 bg-muted/25">
                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base break-words">
                      {momento.nome}
                    </CardTitle>
                  </div>
                  {!finalized && (
                    <div className="flex flex-wrap gap-1">
                      <IconButton
                        label="Mover para cima"
                        disabled={index === 0 || busy}
                        onClick={() =>
                          moveMoment.mutate({
                            momentoId: momento.id,
                            direcao: "cima",
                          })
                        }
                      >
                        <ArrowUp />
                      </IconButton>
                      <IconButton
                        label="Mover para baixo"
                        disabled={
                          index === repertorio.momentos.length - 1 || busy
                        }
                        onClick={() =>
                          moveMoment.mutate({
                            momentoId: momento.id,
                            direcao: "baixo",
                          })
                        }
                      >
                        <ArrowDown />
                      </IconButton>
                      <IconButton
                        label="Adicionar música"
                        highlighted
                        disabled={busy}
                        onClick={() =>
                          setMusicaModal({ open: true, momento, musica: null })
                        }
                      >
                        <Plus />
                      </IconButton>
                      <IconButton
                        label="Editar momento"
                        disabled={busy}
                        onClick={() => setMomentoModal({ open: true, momento })}
                      >
                        <Pencil />
                      </IconButton>
                      <IconButton
                        label="Duplicar momento"
                        disabled={busy}
                        onClick={() =>
                          duplicateMoment.mutate({ momentoId: momento.id })
                        }
                      >
                        <Copy />
                      </IconButton>
                      <IconButton
                        label="Remover momento"
                        destructive
                        disabled={busy}
                        onClick={() =>
                          setConfirmation({
                            title: "Remover momento?",
                            description: `“${momento.nome}” e todas as suas músicas serão excluídos.`,
                            action: () =>
                              removeMoment.mutate({ momentoId: momento.id }),
                          })
                        }
                      >
                        <Trash2 />
                      </IconButton>
                    </div>
                  )}
                </div>
                {momento.observacoes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {momento.observacoes}
                  </p>
                )}
              </CardHeader>
              <CardContent className="px-3 pt-1.5 pb-2 space-y-1.5">
                {momento.musicas.length ? (
                  momento.musicas.map((musica: any, musicIndex: number) => (
                    <div
                      key={musica.id}
                      className="flex items-start gap-2 rounded-lg border bg-card p-2"
                    >
                      <Music2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm break-words">
                          {musicIndex + 1}. {musica.titulo}
                        </p>
                        {(musica.artista || musica.tonalidade) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[
                              musica.artista,
                              musica.tonalidade && `Tom: ${musica.tonalidade}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        {musica.linkReferencia && (
                          <a
                            className="text-xs text-primary underline break-all"
                            href={musica.linkReferencia}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir referência
                          </a>
                        )}
                        {musica.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {musica.observacoes}
                          </p>
                        )}
                      </div>
                      {!finalized && (
                        <div className="flex flex-wrap justify-end gap-1">
                          <IconButton
                            label="Mover música para cima"
                            disabled={musicIndex === 0 || busy}
                            onClick={() =>
                              moveMusic.mutate({
                                musicaId: musica.id,
                                direcao: "cima",
                              })
                            }
                          >
                            <ArrowUp />
                          </IconButton>
                          <IconButton
                            label="Mover música para baixo"
                            disabled={
                              musicIndex === momento.musicas.length - 1 || busy
                            }
                            onClick={() =>
                              moveMusic.mutate({
                                musicaId: musica.id,
                                direcao: "baixo",
                              })
                            }
                          >
                            <ArrowDown />
                          </IconButton>
                          <IconButton
                            label="Editar música"
                            disabled={busy}
                            onClick={() =>
                              setMusicaModal({ open: true, momento, musica })
                            }
                          >
                            <Pencil />
                          </IconButton>
                          <IconButton
                            label="Remover música"
                            destructive
                            disabled={busy}
                            onClick={() =>
                              setConfirmation({
                                title: "Remover música?",
                                description: `“${musica.titulo}” será excluída deste momento.`,
                                action: () =>
                                  removeMusic.mutate({ musicaId: musica.id }),
                              })
                            }
                          >
                            <Trash2 />
                          </IconButton>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-muted-foreground">
                    <Music2 className="w-7 h-7 mx-auto mb-2 opacity-25" />
                    <p className="text-sm">Nenhuma música cadastrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Music2 className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
            <p className="font-medium">Nenhum momento cadastrado</p>
            {!finalized && (
              <Button
                className="mt-4"
                size="sm"
                onClick={() => setMomentoModal({ open: true, momento: null })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeiro momento
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-base">Observações gerais</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Textarea
            rows={3}
            value={observacoes}
            onChange={event => setObservacoes(event.target.value)}
            onBlur={() => {
              if (observacoes !== (repertorio.observacoes ?? "")) {
                saveNotes.mutate({
                  repertorioId: repertorio.id,
                  observacoes: observacoes || null,
                });
              }
            }}
            disabled={finalized}
            placeholder="Orientações gerais para o repertório..."
          />
          {!finalized && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {saveNotes.isPending
                ? "Salvando observações..."
                : "As alterações são salvas automaticamente."}
            </p>
          )}
        </CardContent>
      </Card>

      <RepertorioMomentoModal
        open={momentoModal.open}
        onClose={() => setMomentoModal({ open: false, momento: null })}
        onSuccess={refresh}
        repertorioId={repertorio.id}
        tipos={tiposMomento}
        momento={momentoModal.momento}
      />
      {musicaModal.momento && (
        <RepertorioMusicaModal
          open={musicaModal.open}
          onClose={() =>
            setMusicaModal({ open: false, momento: null, musica: null })
          }
          onSuccess={refresh}
          momentoId={musicaModal.momento.id}
          momentoNome={musicaModal.momento.nome}
          musica={musicaModal.musica}
        />
      )}
      <RepertorioCopiarModal
        open={copyMode === "target"}
        onClose={() => setCopyMode(null)}
        onSuccess={targetId => navigate(`/agendamentos/${targetId}/repertorio`)}
        mode="target"
        currentAgendamentoId={agendamentoId}
        currentRepertorioId={repertorio.id}
      />
      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={value => !value && setConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmation?.action();
                setConfirmation(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PageHeader({
  agendamento,
  status,
  onBack,
}: {
  agendamento: any;
  status?: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold break-words">
            Repertório · {agendamento.descricao}
          </h1>
          {status && (
            <Badge variant={status === "FINALIZADO" ? "default" : "secondary"}>
              {STATUS_LABELS[status] ?? status}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDateSafe(agendamento.dataEvento, "dd/MM/yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {agendamento.horario?.slice(0, 5)}
          </span>
          <span className="flex items-center gap-1 min-w-0">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{agendamento.enderecoCerimonia}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyOption({
  icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="text-left rounded-xl border bg-card p-5 hover:border-primary hover:shadow-sm transition-all disabled:opacity-50"
    >
      <span className="block w-10 h-10 rounded-lg bg-muted text-primary p-2 mb-3 [&>svg]:w-full [&>svg]:h-full">
        {icon}
      </span>
      <span className="font-semibold block">{title}</span>
      <span className="text-sm text-muted-foreground mt-1 block">
        {description}
      </span>
    </button>
  );
}

function IconButton({
  label,
  destructive,
  highlighted,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  destructive?: boolean;
  highlighted?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={destructive ? "destructive" : "ghost"}
      size="icon"
      className={`h-8 w-8 [&_svg]:w-3.5 [&_svg]:h-3.5 ${
        highlighted
          ? "border border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
          : ""
      }`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </Button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
