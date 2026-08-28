import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import { formatDateSafe } from "@shared/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CalendarDays,
  ExternalLink,
  FileMusic,
  Lightbulb,
  ListMusic,
  Music2,
  Search,
  Tags,
  X,
} from "lucide-react";

type SuggestionRow =
  inferRouterOutputs<AppRouter>["repertorio"]["bibliotecaSugestoes"][number];

type MusicSummary = SuggestionRow & {
  quantidade: number;
  momentos: string[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function musicKey(row: Pick<SuggestionRow, "titulo" | "artista">) {
  return `${normalize(row.titulo)}|${normalize(row.artista)}`;
}

function summarizeMusic(rows: SuggestionRow[]): MusicSummary[] {
  const songs = new Map<string, MusicSummary>();

  rows.forEach(row => {
    const key = musicKey(row);
    const existing = songs.get(key);
    if (existing) {
      existing.quantidade += 1;
      if (!existing.momentos.includes(row.tipoMomentoNome)) {
        existing.momentos.push(row.tipoMomentoNome);
      }
      return;
    }
    songs.set(key, { ...row, quantidade: 1, momentos: [row.tipoMomentoNome] });
  });

  return Array.from(songs.values()).sort(
    (a, b) =>
      b.quantidade - a.quantidade || a.titulo.localeCompare(b.titulo, "pt-BR")
  );
}

function MusicList({ songs }: { songs: MusicSummary[] }) {
  return (
    <div className="divide-y divide-border/60">
      {songs.map(song => (
        <div
          key={musicKey(song)}
          className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Music2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium leading-tight">{song.titulo}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {song.artista || "Artista não informado"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {song.tonalidade && (
                  <Badge variant="outline">Tom {song.tonalidade}</Badge>
                )}
                <Badge variant="secondary">
                  {song.quantidade} {song.quantidade === 1 ? "uso" : "usos"}
                </Badge>
                {song.momentos.slice(0, 2).map(moment => (
                  <Badge key={moment} variant="outline" className="font-normal">
                    {moment}
                  </Badge>
                ))}
                {song.momentos.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{song.momentos.length - 2} momentos
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 pl-12 sm:pl-0">
            <span className="text-xs text-muted-foreground">
              Último uso: {formatDateSafe(song.dataEvento)}
            </span>
            {song.linkReferencia && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="Abrir referência"
              >
                <a href={song.linkReferencia} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  <span className="sr-only">
                    Abrir referência de {song.titulo}
                  </span>
                </a>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        {searching ? (
          <Search className="size-5 text-muted-foreground" />
        ) : (
          <Music2 className="size-5 text-muted-foreground" />
        )}
      </div>
      <p className="font-medium">
        {searching
          ? "Nenhuma música encontrada"
          : "Ainda não há músicas para sugerir"}
      </p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {searching
          ? "Tente buscar por outro título, artista, momento ou repertório."
          : "As músicas inseridas nos repertórios aparecerão automaticamente aqui."}
      </p>
    </div>
  );
}

export default function Sugestoes() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const {
    data = [],
    isLoading,
    isFetching,
  } = trpc.repertorio.bibliotecaSugestoes.useQuery();

  const filtered = useMemo(() => {
    const term = normalize(search);
    if (!term) return data;
    return data.filter(row =>
      [
        row.titulo,
        row.artista,
        row.momentoNome,
        row.tipoMomentoNome,
        row.agendamentoDescricao,
      ].some(value => normalize(value).includes(term))
    );
  }, [data, search]);

  const generalSongs = useMemo(() => summarizeMusic(filtered), [filtered]);

  const momentGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: number; name: string; rows: SuggestionRow[] }
    >();
    filtered.forEach(row => {
      const key = String(row.tipoMomentoId);
      const group = groups.get(key);
      if (group) group.rows.push(row);
      else
        groups.set(key, {
          id: row.tipoMomentoId,
          name: row.tipoMomentoNome,
          rows: [row],
        });
    });
    return Array.from(groups.values())
      .map(group => ({ ...group, songs: summarizeMusic(group.rows) }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [filtered]);

  const repertoireGroups = useMemo(() => {
    const groups = new Map<
      number,
      { row: SuggestionRow; rows: SuggestionRow[] }
    >();
    filtered.forEach(row => {
      const group = groups.get(row.repertorioId);
      if (group) group.rows.push(row);
      else groups.set(row.repertorioId, { row, rows: [row] });
    });
    return Array.from(groups.values()).sort((a, b) =>
      String(b.row.dataEvento).localeCompare(String(a.row.dataEvento))
    );
  }, [filtered]);

  const totalSongs = useMemo(() => summarizeMusic(data).length, [data]);
  const totalMoments = useMemo(
    () => new Set(data.map(row => row.tipoMomentoId)).size,
    [data]
  );
  const totalRepertoires = useMemo(
    () => new Set(data.map(row => row.repertorioId)).size,
    [data]
  );
  const hasResults = filtered.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 page-enter">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lightbulb className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sugestões</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Consulte e reutilize músicas que já fizeram parte dos seus
              repertórios.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Music2, value: totalSongs, label: "músicas diferentes" },
          { icon: Tags, value: totalMoments, label: "tipos de momento" },
          {
            icon: FileMusic,
            value: totalRepertoires,
            label: "repertórios consultados",
          },
        ].map(item => (
          <Card key={item.label} className="gap-0 py-0 border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <item.icon className="size-4" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="mb-1 h-5 w-10" />
                ) : (
                  <p className="text-xl font-semibold leading-none">
                    {item.value}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 py-0 border-border/50">
        <CardContent className="p-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por música, artista, momento ou repertório..."
              className="pl-9 pr-10"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 size-9 -translate-y-1/2"
                onClick={() => setSearch("")}
                title="Limpar busca"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="geral" className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit sm:min-w-[480px]">
          <TabsTrigger value="geral" className="gap-2">
            <ListMusic className="size-4" /> <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="momentos" className="gap-2">
            <Tags className="size-4" /> <span>Por momentos</span>
          </TabsTrigger>
          <TabsTrigger value="repertorios" className="gap-2">
            <FileMusic className="size-4" /> <span>Por repertórios</span>
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <Card className="gap-0 py-0 border-border/50">
            <CardContent className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="geral">
              <Card className="gap-0 overflow-hidden py-0 border-border/50">
                <CardHeader className="border-b py-4">
                  <CardTitle className="text-base">
                    {generalSongs.length}{" "}
                    {generalSongs.length === 1
                      ? "música encontrada"
                      : "músicas encontradas"}
                  </CardTitle>
                </CardHeader>
                {hasResults ? (
                  <MusicList songs={generalSongs} />
                ) : (
                  <EmptyState searching={Boolean(search)} />
                )}
              </Card>
            </TabsContent>

            <TabsContent value="momentos">
              <Card className="gap-0 overflow-hidden py-0 border-border/50">
                {hasResults ? (
                  <Accordion type="multiple" className="px-4">
                    {momentGroups.map(group => (
                      <AccordionItem key={group.id} value={String(group.id)}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Tags className="size-4" />
                            </div>
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-xs font-normal text-muted-foreground">
                                {group.songs.length}{" "}
                                {group.songs.length === 1
                                  ? "música"
                                  : "músicas"}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="overflow-hidden rounded-lg border">
                            <MusicList songs={group.songs} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <EmptyState searching={Boolean(search)} />
                )}
              </Card>
            </TabsContent>

            <TabsContent value="repertorios">
              <Card className="gap-0 overflow-hidden py-0 border-border/50">
                {hasResults ? (
                  <Accordion type="multiple" className="px-4">
                    {repertoireGroups.map(({ row, rows }) => (
                      <AccordionItem
                        key={row.repertorioId}
                        value={String(row.repertorioId)}
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex min-w-0 items-center gap-3 text-left">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileMusic className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {row.agendamentoDescricao}
                              </p>
                              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-normal text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="size-3" />{" "}
                                  {formatDateSafe(row.dataEvento)}
                                </span>
                                <span>•</span>
                                <span>
                                  {rows.length}{" "}
                                  {rows.length === 1 ? "música" : "músicas"}
                                </span>
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="space-y-3 rounded-lg border p-3">
                            {Array.from(
                              new Map(
                                rows.map(item => [item.momentoId, item])
                              ).values()
                            ).map(moment => {
                              const momentRows = rows.filter(
                                item => item.momentoId === moment.momentoId
                              );
                              return (
                                <div key={moment.momentoId}>
                                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {moment.momentoNome}
                                  </p>
                                  <div className="overflow-hidden rounded-lg border">
                                    <MusicList
                                      songs={summarizeMusic(momentRows)}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/agendamentos/${row.agendamentoId}/repertorio`
                                )
                              }
                            >
                              <ListMusic className="size-4" /> Abrir repertório
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <EmptyState searching={Boolean(search)} />
                )}
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {isFetching && !isLoading && (
        <p className="text-center text-xs text-muted-foreground">
          Atualizando sugestões…
        </p>
      )}
    </div>
  );
}
