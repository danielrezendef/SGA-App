import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlertCircle
} from "lucide-react";
import AgendamentoModal from "@/components/AgendamentoModal";
import { formatDateSafe, toISODateString } from "@shared/dateUtils";
import StatusBadge, { getStatusAccentClass, getStatusFillClass } from "@/components/StatusBadge";

type ViewType = "month" | "week" | "day";

function isPastEvent(dataEvento: string | Date, horario?: string | null) {
  const dateKey = toISODateString(dataEvento);
  if (!dateKey) return false;

  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours = 23, minutes = 59] = (horario || "23:59").slice(0, 5).split(":").map(Number);
  const eventDate = new Date(year, month - 1, day, hours, minutes);

  return eventDate.getTime() < Date.now();
}

export default function Calendario() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | null>(null);
  const [view, setView] = useState<ViewType>("month");
  const utils = trpc.useUtils();
  
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  });

  // Cálculo do intervalo de datas visível para filtrar no servidor
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (view === "month") {
      // Pega do dia 1 ao último dia do mês
      const start = new Date(year, month, 1, 12, 0, 0);
      const end = new Date(year, month + 1, 0, 12, 0, 0);
      return { start: toISODateString(start), end: toISODateString(end) };
    } else if (view === "week") {
      // Pega o início e fim da semana
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: toISODateString(start), end: toISODateString(end) };
    } else {
      // Apenas o dia atual
      const dayStr = toISODateString(currentDate);
      return { start: dayStr, end: dayStr };
    }
  }, [currentDate, view]);

  // Busca agendamentos filtrados pelo período visível
  // Isso garante que mesmo com o limite de 50 por página, os eventos do mês/semana apareçam
  const { data, isLoading, error, refetch } = trpc.agendamentos.list.useQuery({
    dataInicio: dateRange.start,
    dataFim: dateRange.end,
    pageSize: 50, 
  }, {
    staleTime: 1000 * 60 * 2,
  });

  // Agrupamento de eventos por data (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    if (!data?.items) return grouped;
    
    data.items.forEach((ag) => {
      // Sempre usar toISODateString para garantir consistência
      const dateKey = toISODateString(ag.dataEvento);

      if (dateKey) {
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(ag);
      }
    });
    return grouped;
  }, [data]);

  const handlePrev = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() - 1);
      else if (view === "week") d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return d;
    });
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + 1);
      else if (view === "week") d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return d;
    });
  }, [view]);

  const handleToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
  }, []);

  // --- RENDERIZAÇÃO MÊS ---
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIdx = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = toISODateString(new Date());
    const cells = [];

    for (let i = 0; i < firstDayIdx; i++) {
      cells.push(<div key={`p-${i}`} className="h-24 sm:h-32 bg-muted/5 border border-border/10" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d, 12, 0, 0);
      const dateStr = toISODateString(date);
      const events = eventsByDate[dateStr] || [];
      const isToday = dateStr === todayStr;

      cells.push(
        <div
          key={dateStr}
          className={`h-24 sm:h-32 p-1 sm:p-2 border border-border/40 transition-all hover:bg-accent/30 cursor-pointer flex flex-col overflow-hidden ${
            isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "bg-background"
          }`}
          onClick={() => {
            setCurrentDate(date);
            setView("day");
          }}
        >
          <span className={`text-xs font-bold mb-1 ${isToday ? "text-primary" : "text-muted-foreground/70"}`}>
            {d}
          </span>
          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
            {events.map(ev => {
              const pastEvent = isPastEvent(ev.dataEvento, ev.horario);

              return (
              <div
                key={ev.id}
                className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded border truncate font-semibold ${
                  pastEvent
                    ? "bg-foreground/15 text-foreground/60 border-foreground/10"
                    : "bg-primary/10 text-primary border-primary/10"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/agendamentos/${ev.id}`);
                }}
              >
                {ev.horario?.slice(0, 5)} {ev.descricao}
              </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-border/30 border border-border/30 rounded-xl overflow-hidden shadow-sm">
        {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map(day => (
          <div key={day} className="bg-muted/20 py-2 text-center text-[10px] font-black text-muted-foreground/60 tracking-tighter">
            {day}
          </div>
        ))}
        {cells}
      </div>
    );
  };

  // --- RENDERIZAÇÃO SEMANA ---
  const renderWeekView = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    const todayStr = toISODateString(new Date());

    return (
      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          const dateStr = toISODateString(date);
          const events = eventsByDate[dateStr] || [];
          const isToday = dateStr === todayStr;

          return (
            <div key={dateStr} className="space-y-3">
              <div className={`text-center p-3 rounded-xl border transition-all ${
                isToday ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-muted/30 border-border/50"
              }`}>
                <div className="text-[10px] font-black uppercase opacity-70 tracking-widest">{formatDateSafe(date, "EEE")}</div>
                <div className="text-xl font-black">{date.getDate()}</div>
              </div>
              <div className="space-y-2">
                {events.map(ev => {
                  const pastEvent = isPastEvent(ev.dataEvento, ev.horario);

                  return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                      pastEvent
                        ? "border-border bg-muted/70 text-muted-foreground hover:border-foreground/30 hover:bg-muted"
                        : "border-border/50 bg-card hover:border-primary/40 hover:shadow-md"
                    }`}
                    onClick={() => navigate(`/agendamentos/${ev.id}`)}
                  >
                    <div className={`flex items-center gap-1 text-[10px] font-black mb-1 ${pastEvent ? "text-foreground/60" : "text-primary"}`}>
                      <Clock className="w-3 h-3" />
                      {ev.horario?.slice(0, 5)}
                    </div>
                    <div className={`text-xs font-bold leading-tight line-clamp-2 transition-colors ${pastEvent ? "text-muted-foreground" : "group-hover:text-primary"}`}>
                      {ev.descricao}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- RENDERIZAÇÃO DIA ---
  const renderDayView = () => {
    const dateStr = toISODateString(currentDate);
    const events = (eventsByDate[dateStr] || []).sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs font-black text-primary uppercase tracking-[0.2em]">
            {formatDateSafe(currentDate, "EEEE")}
          </div>
          <div className="text-4xl font-black tracking-tight">
            {formatDateSafe(currentDate, "dd 'de' MMMM")}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed rounded-3xl border-border/40 bg-muted/5">
            <CalendarIcon className="w-16 h-16 text-muted-foreground/10 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold text-lg">Nenhum compromisso para hoje</p>
            <Button variant="outline" onClick={() => {
              setSelectedDateForCreate(currentDate);
              setShowCreate(true);
            }} className="mt-4 font-bold rounded-full">
              Agendar agora
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(ev => {
              const pastEvent = isPastEvent(ev.dataEvento, ev.horario);

              return (
              <Card
                key={ev.id}
                className={`group transition-all cursor-pointer overflow-hidden rounded-2xl border-border/60 ${
                  pastEvent
                    ? "opacity-70 text-muted-foreground hover:opacity-90"
                    : "hover:shadow-xl"
                }`}
                onClick={() => navigate(`/agendamentos/${ev.id}`)}
              >
                <CardContent className="p-0 flex">
                  <div className={`w-2 transition-opacity ${getStatusFillClass(ev.status)} ${pastEvent ? "opacity-40" : "opacity-70 group-hover:opacity-100"}`} />
                  <div className="p-5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className={`text-2xl font-black tabular-nums tracking-tighter ${pastEvent ? "text-foreground/60" : getStatusAccentClass(ev.status)}`}>
                        {ev.horario?.slice(0, 5)}
                      </div>
                      <div className="space-y-1">
                        <div className={`font-black text-lg leading-none ${pastEvent ? "text-muted-foreground" : ""}`}>{ev.descricao}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <MapPin className="w-3 h-3" />
                          {ev.enderecoCerimonia}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className={`text-sm font-black ${pastEvent ? "text-muted-foreground" : "text-foreground/80"}`}>
                        R$ {Number(ev.valorServico).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <StatusBadge status={ev.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 page-enter max-w-[1400px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Calendário</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/40 shadow-inner">
            {(["month", "week", "day"] as const).map((v) => (
              <Button
                key={v}
                variant={view === v ? "default" : "ghost"}
                size="sm"
                className={`h-9 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  view === v ? "shadow-lg" : "hover:bg-primary/5"
                }`}
                onClick={() => setView(v)}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </Button>
            ))}
          </div>
          <Button onClick={() => setShowCreate(true)} className="h-12 px-8 gap-2 font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
            <Plus className="w-5 h-5" />
            <span>NOVO EVENTO</span>
          </Button>
        </div>
      </div>

      {/* Erro de Carregamento */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <div className="flex-1 text-sm font-bold">Erro ao carregar agendamentos: {error.message}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 font-black text-[10px] uppercase">Tentar novamente</Button>
        </div>
      )}

      {/* Toolbar de Navegação */}
      <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm p-3 rounded-2xl border border-border/40 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} className="h-10 w-10 rounded-xl border-border/40 hover:bg-primary/5">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-10 px-6 font-black text-[10px] uppercase tracking-widest rounded-xl border-border/40 hover:bg-primary/5">
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} className="h-10 w-10 rounded-xl border-border/40 hover:bg-primary/5">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-sm font-black text-foreground/70 tracking-widest px-4 uppercase">
          {formatDateSafe(currentDate, "MMMM yyyy")}
        </div>
      </div>

      {/* Área Principal */}
      <div className="min-h-[650px]">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-[600px] w-full rounded-3xl" />
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border/40 shadow-2xl p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-500">
            {view === "month" && renderMonthView()}
            {view === "week" && renderWeekView()}
            {view === "day" && renderDayView()}
          </div>
        )}
      </div>

      {showCreate && (
        <AgendamentoModal 
          open={showCreate} 
          onClose={() => {
            setShowCreate(false);
            setSelectedDateForCreate(null);
          }} 
          onSuccess={() => {
            utils.agendamentos.list.invalidate();
            refetch();
            setSelectedDateForCreate(null);
          }}
          dataInicial={selectedDateForCreate || undefined}
        />
      )}
    </div>
  );
}
