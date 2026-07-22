import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAppAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  MapPin,
  Receipt,
} from "lucide-react";
import { useLocation } from "wouter";
import StatusBadge from "@/components/StatusBadge";
import { formatDateSafe } from "@shared/dateUtils";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function Dashboard() {
  const { user, isAdmin } = useAppAuth();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const [, navigate] = useLocation();

  const chartData = useMemo(() => {
    if (!stats?.porMes) return [];
    return stats.porMes.map((item: { mes: string; count: number }) => {
      const [year, month] = item.mes.split("-");
      return {
        name: MONTH_NAMES[parseInt(month) - 1],
        total: item.count,
      };
    });
  }, [stats]);

  const statusMap: Record<string, { label: string; color: string }> = {
    orcamento: { label: "Orçamento", color: "oklch(0.55 0.10 220)" },
    confirmado: { label: "Confirmado", color: "oklch(0.55 0.15 145)" },
    pagamento: { label: "Pagamento", color: "oklch(0.60 0.15 60)" },
    concluido: { label: "Concluído", color: "oklch(0.45 0.02 30)" },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user?.name?.split(" ")[0]} 
          <span className="ml-2 text-primary">✦</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aqui está um resumo dos seus agendamentos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Este mês</p>
                <p className="text-3xl font-bold mt-1">{stats?.totalMes ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Agendamentos</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Este ano</p>
                <p className="text-3xl font-bold mt-1">{stats?.totalAno ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Agendamentos</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-champagne/40">
                <TrendingUp className="w-5 h-5 text-gold" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">A receber</p>
                <p className="text-2xl font-bold mt-1 text-gold">
                  {formatCurrency(stats?.valorConfirmado ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Valor total confirmados a receber</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gold/10">
                <DollarSign className="w-5 h-5 text-gold" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Orçamento</p>
                <p className="text-2xl font-bold mt-1 text-umber">
                  {formatCurrency(stats?.valorOrcamento ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Receita em orçamento</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-umber/10">
                <Receipt className="w-5 h-5 text-umber" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Agendamentos por mês</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: "12px" }}
                    formatter={(v) => [v, "Agendamentos"]}
                  />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Por status</CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.porStatus && stats.porStatus.length > 0 ? (
              stats.porStatus.map((item: { status: string; count: number }) => {
                const info = statusMap[item.status] ?? { label: item.status, color: "var(--muted-foreground)" };
                const total = stats.porStatus.reduce((a: number, b: { count: number }) => a + b.count, 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{info.label}</span>
                      <span className="text-muted-foreground">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: info.color }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximos eventos */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Próximos eventos</CardTitle>
              <CardDescription>Agendamentos nos próximos 60 dias</CardDescription>
            </div>
            <button
              onClick={() => navigate("/agendamentos")}
              className="text-xs text-primary hover:underline font-medium"
            >
              Ver todos
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.proximosEventos && stats.proximosEventos.length > 0 ? (
            <div className="space-y-3">
              {stats.proximosEventos.map((ev: any) => (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/agendamentos/${ev.id}`)}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 bg-primary/8 border border-primary/15">
                    <span className="text-[10px] font-medium text-primary uppercase">
                      {formatDateSafe(ev.dataEvento, "MMM")}
                    </span>
                    <span className="text-lg font-bold text-primary leading-none">
                      {formatDateSafe(ev.dataEvento, "dd")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {ev.descricao}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ev.horario?.slice(0, 5)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ev.enderecoCerimonia}</span>
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={ev.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum evento nos próximos 60 dias</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
