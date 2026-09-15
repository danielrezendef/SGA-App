type AgendamentoRelatorio = {
  id: number;
  descricao: string;
  dataEvento: string | Date;
  horario: string;
  enderecoCerimonia: string;
  observacoes?: string | null;
  status: string;
};

type FiltrosRelatorio = {
  descricao?: string;
  dataInicio?: string;
  dataFim?: string;
  statusFilter: string;
};

const STATUS_LABELS: Record<string, string> = {
  orcamento: "Orçamento",
  confirmado: "Confirmado",
  concluido: "Concluído",
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toLocalDate(value: string | Date) {
  const datePart = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return new Date(`${datePart}T12:00:00`);
}

function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", options).format(toLocalDate(value));
}

function periodLabel(filters: FiltrosRelatorio) {
  const start = filters.dataInicio
    ? formatDate(filters.dataInicio, { day: "2-digit", month: "long", year: "numeric" })
    : undefined;
  const end = filters.dataFim
    ? formatDate(filters.dataFim, { day: "2-digit", month: "long", year: "numeric" })
    : undefined;

  if (start && end) return `Período: ${start} a ${end}`;
  if (start) return `A partir de ${start}`;
  if (end) return `Até ${end}`;
  return "Todos os agendamentos";
}

function filterLabel(filters: FiltrosRelatorio) {
  const details: string[] = [];
  if (filters.statusFilter !== "all") {
    details.push(filters.statusFilter === "em_andamento" ? "Em andamento" : STATUS_LABELS[filters.statusFilter]);
  }
  if (filters.descricao) details.push(`Busca: ${filters.descricao}`);
  return details.filter(Boolean).join(" · ");
}

export function writeAgendaReport(
  reportWindow: Window,
  agendamentos: AgendamentoRelatorio[],
  filters: FiltrosRelatorio
) {
  const groups = new Map<string, AgendamentoRelatorio[]>();
  for (const agendamento of agendamentos) {
    const key = typeof agendamento.dataEvento === "string"
      ? agendamento.dataEvento.slice(0, 10)
      : agendamento.dataEvento.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), agendamento]);
  }

  const content = Array.from(groups.values()).map(items => {
    const date = items[0].dataEvento;
    const heading = formatDate(date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const rows = items.map(agendamento => `
      <article class="appointment">
        <div class="time">${escapeHtml(agendamento.horario?.slice(0, 5))}</div>
        <div class="appointment-body">
          <div class="appointment-heading">
            <h2>${escapeHtml(agendamento.descricao)}</h2>
            <span>${escapeHtml(STATUS_LABELS[agendamento.status] ?? agendamento.status)}</span>
          </div>
          <p class="location">${escapeHtml(agendamento.enderecoCerimonia)}</p>
          ${agendamento.observacoes?.trim() ? `<p class="notes"><strong>Observação</strong>${escapeHtml(agendamento.observacoes)}</p>` : ""}
        </div>
      </article>
    `).join("");
    return `<section class="day-group"><h1>${escapeHtml(heading)}</h1>${rows}</section>`;
  }).join("");

  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  reportWindow.document.open();
  reportWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Programação de Agendamentos</title>
  <style>
    @page { size: A4; margin: 14mm 13mm 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #2b2018; background: #fbf7ef; font-family: Arial, sans-serif; font-size: 10pt; }
    .sheet { max-width: 190mm; margin: 0 auto; padding: 15mm 13mm 18mm; background: #fffdf8; }
    .masthead { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #b9934f; }
    .eyebrow { margin: 0 0 5px; color: #8f6c35; font-size: 8pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
    h1, h2, p { margin: 0; }
    .title { font-family: Georgia, serif; font-size: 25pt; font-weight: 500; letter-spacing: -.4px; }
    .metadata { color: #76572f; font-size: 9pt; line-height: 1.55; text-align: right; }
    .summary { display: flex; justify-content: space-between; gap: 14px; margin: 16px 0 22px; padding: 10px 12px; border-left: 3px solid #b9934f; background: #f2eadb; color: #5d4633; font-size: 9pt; }
    .summary strong { color: #2b2018; }
    .day-group { break-inside: avoid; margin-top: 22px; }
    .day-group > h1 { margin-bottom: 8px; color: #8f6c35; font-size: 9pt; font-weight: 700; letter-spacing: 1.15px; text-transform: uppercase; }
    .appointment { display: grid; grid-template-columns: 56px 1fr; break-inside: avoid; border-top: 1px solid #e5d1a3; padding: 11px 0; }
    .time { padding-top: 2px; color: #8f6c35; font-family: Georgia, serif; font-size: 15pt; font-weight: 700; letter-spacing: -.3px; }
    .appointment-body { min-width: 0; }
    .appointment-heading { display: flex; gap: 12px; align-items: baseline; justify-content: space-between; }
    .appointment-heading h2 { color: #2b2018; font-size: 11pt; font-weight: 700; }
    .appointment-heading span { flex: none; color: #76572f; font-size: 7.5pt; font-weight: 700; letter-spacing: .65px; text-transform: uppercase; }
    .location { margin-top: 3px; color: #5d4633; line-height: 1.4; }
    .location::before { content: "Local · "; color: #8f6c35; font-weight: 700; }
    .notes { margin-top: 8px; padding: 7px 9px; border-left: 2px solid #d7bd79; background: #fbf7ef; color: #5d4633; font-size: 9pt; line-height: 1.45; white-space: pre-line; }
    .notes strong { display: block; margin-bottom: 2px; color: #8f6c35; font-size: 7.5pt; letter-spacing: .6px; text-transform: uppercase; }
    .empty { padding: 42px 20px; border: 1px dashed #d7bd79; color: #76572f; text-align: center; }
    .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e5d1a3; color: #76572f; font-size: 8pt; text-align: center; }
    @media screen { body { padding: 24px; } .sheet { box-shadow: 0 12px 36px rgba(43, 32, 24, .12); } }
    @media print { body { background: #fff; } .sheet { max-width: none; margin: 0; padding: 0; box-shadow: none; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="masthead">
      <div><p class="eyebrow">SGA App</p><p class="title">Programação de Agendamentos</p></div>
      <p class="metadata">${escapeHtml(periodLabel(filters))}<br/>Gerado em ${escapeHtml(generatedAt)}</p>
    </header>
    <div class="summary"><span><strong>${agendamentos.length}</strong> ${agendamentos.length === 1 ? "agendamento listado" : "agendamentos listados"}</span><span>${escapeHtml(filterLabel(filters))}</span></div>
    ${content || '<div class="empty">Nenhum agendamento foi encontrado para os filtros selecionados.</div>'}
    <footer class="footer">SGA App · Programação organizada por data e horário</footer>
  </main>
</body>
</html>`);
  reportWindow.document.close();
  window.setTimeout(() => {
    reportWindow.focus();
    reportWindow.print();
  }, 250);
}
