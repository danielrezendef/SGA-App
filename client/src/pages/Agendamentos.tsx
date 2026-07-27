import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  X,
} from "lucide-react";
import { formatDateSafe } from "@shared/dateUtils";
import StatusBadge, { getStatusAccentClass } from "@/components/StatusBadge";
import AgendamentoModal from "@/components/AgendamentoModal";

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export default function Agendamentos() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryInput = useMemo(() => ({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    descricao: search && search ? search : undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [statusFilter, search, dataInicio, dataFim, page]);

  const { data, isLoading } = trpc.agendamentos.list.useQuery(queryInput);

  const deleteMutation = trpc.agendamentos.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento excluído com sucesso");
      utils.agendamentos.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  const hasFilters = search || statusFilter !== "all" || dataInicio || dataFim;

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data?.total ?? 0} {(data?.total ?? 0) === 1 ? "registro encontrado" : "registros encontrados"}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Incluir Agendamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição do agendamento..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="orcamento">Orçamento</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="pagamento">Pagamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
                className="w-36"
                title="Data inicial"
              />
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
                className="w-36"
                title="Data final"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        {isLoading ? (
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </CardContent>
        ) : data?.items.length === 0 ? (
          <CardContent className="py-16 text-center">
            <CheckSquare className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">Nenhum agendamento encontrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {hasFilters ? "Tente ajustar os filtros" : "Clique em \"Novo agendamento\" para começar"}
            </p>
          </CardContent>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Agendamento</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Data & Hora</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Local</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Valor</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((ag) => (
                    <tr
                      key={ag.id}
                      className="border-b border-border/30 hover:bg-accent/20 transition-colors group"
                    >
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-sm">{ag.descricao}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">#{ag.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            {formatDateSafe(ag.dataEvento)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {ag.horario?.slice(0, 5)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <span className="text-sm text-muted-foreground truncate block" title={ag.enderecoCerimonia}>
                          {ag.enderecoCerimonia}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium">{formatCurrency(ag.valorServico)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={ag.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/agendamentos/${ag.id}`)}
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditItem(ag)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(ag.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/30">
              {data?.items.map((ag) => (
                <div
                  key={ag.id}
                  className="p-4 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${getStatusAccentClass(ag.status)}`}>{ag.descricao}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateSafe(ag.dataEvento)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ag.horario?.slice(0, 5)}
                        </span>
                        <span className="text-xs font-medium text-primary">{formatCurrency(ag.valorServico)}</span>
                      </div>
                    </div>
                    <StatusBadge status={ag.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => navigate(`/agendamentos/${ag.id}`)}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => setEditItem(ag)}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(ag.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border/50 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modals */}
      <AgendamentoModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => utils.agendamentos.list.invalidate()}
      />

      <AgendamentoModal
        open={!!editItem}
        agendamento={editItem}
        onClose={() => setEditItem(null)}
        onSuccess={() => utils.agendamentos.list.invalidate()}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o agendamento e todos os dados de cobrança vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
