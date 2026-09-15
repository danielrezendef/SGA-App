import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { resolveDocumentLogo } from "@/lib/documentLogo";

export type AgendaAppointment = {
  id: number;
  descricao: string;
  dataEvento: string | Date;
  horario: string;
  enderecoCerimonia: string;
  observacoes?: string | null;
  status: string;
};

const COLORS = {
  text: "#222222",
  secondary: "#6E6A62",
  gold: "#A88242",
  goldDark: "#7A5A27",
  line: "#D9CBAE",
} as const;

const A4_PAGE_HEIGHT = 841.89;
const A4_PAGE_SIZE = { width: 595.28, height: A4_PAGE_HEIGHT } as const;
// Keep a small layout reserve so the renderer never carries a date group into
// the following explicit page, even with font-metric differences at runtime.
const AGENDA_CONTENT_HEIGHT = A4_PAGE_HEIGHT - 48 - 24;

const styles = StyleSheet.create({
  page: {
    paddingTop: 8,
    paddingRight: 40,
    paddingBottom: 24,
    paddingLeft: 40,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.text,
    backgroundColor: "#FFFFFF",
  },
  continuationPage: {
    paddingTop: 18,
  },
  header: {
    position: "relative",
    height: 36,
    marginBottom: 4,
  },
  logo: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 68,
    height: 30,
    objectFit: "contain",
  },
  title: {
    width: "100%",
    paddingTop: 4,
    textAlign: "center",
    fontSize: 21,
    fontWeight: "bold",
    color: COLORS.text,
  },
  dayHeading: {
    paddingBottom: 4,
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.line,
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: COLORS.goldDark,
  },
  event: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 10,
  },
  completedEvent: {
    opacity: 0.58,
  },
  time: {
    width: 54,
    paddingTop: 1,
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.goldDark,
  },
  eventBody: { flex: 1, minWidth: 0 },
  eventHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  eventName: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.2,
    fontWeight: "bold",
    color: COLORS.text,
  },
  detail: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 1.35,
    color: COLORS.secondary,
  },
  detailLabel: { fontWeight: "bold", color: COLORS.goldDark },
  statusBadge: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 6.8, fontWeight: "bold" },
  empty: {
    paddingTop: 30,
    textAlign: "center",
    fontSize: 9,
    color: COLORS.secondary,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 7,
    paddingTop: 4,
    borderTopWidth: 0.6,
    borderTopColor: COLORS.line,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.secondary,
  },
  measurePage: {
    paddingTop: 48,
    paddingRight: 40,
    paddingBottom: 24,
    paddingLeft: 40,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.text,
    backgroundColor: "#FFFFFF",
  },
});

function localDate(value: string | Date) {
  const datePart =
    typeof value === "string"
      ? value.slice(0, 10)
      : value.toISOString().slice(0, 10);
  return new Date(`${datePart}T12:00:00`);
}

function eventDateKey(value: string | Date) {
  return typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

export function formatAgendaDate(value: string | Date) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(localDate(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? "";
  const month = part("month").replace(/\.$/, "");
  return `${part("day")} ${month} ${part("year")} · ${part("weekday").replace(/-feira$/i, "")}`.toUpperCase();
}

function displayStatus(status: string) {
  const labels: Record<string, string> = {
    orcamento: "ORÇAMENTO",
    confirmado: "CONFIRMADO",
    concluido: "CONCLUÍDO",
    pendente: "PENDENTE",
    em_andamento: "EM ANDAMENTO",
    cancelado: "CANCELADO",
  };
  return labels[status] ?? status.replaceAll("_", " ").toUpperCase();
}

function statusStyle(status: string) {
  switch (status) {
    // RGB equivalents of the shared .status-* palette in index.css.
    case "orcamento":
      return { backgroundColor: "#B9EFFF", color: "#00556A", borderColor: "#6CCDEA" };
    case "confirmado":
      return { backgroundColor: "#CDF0CD", color: "#005A22", borderColor: "#7BC27E" };
    case "concluido":
      return { backgroundColor: "#EEE6E4", color: "#372A28", borderColor: "#CAB9B6" };
    case "cancelado":
      return { backgroundColor: "#FCE9E8", color: "#963C36", borderColor: "#F0BEBB" };
    default:
      return { backgroundColor: "#F6EEDC", color: COLORS.goldDark, borderColor: "#E3CF9E" };
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text> {value}
    </Text>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = statusStyle(status);
  return (
    <View style={[styles.statusBadge, {
      backgroundColor: colors.backgroundColor,
      borderWidth: 0.7,
      borderColor: colors.borderColor,
    }]}>
      <Text style={[styles.statusText, { color: colors.color }]}>
        {displayStatus(status)}
      </Text>
    </View>
  );
}

function AgendaEvent({ appointment }: { appointment: AgendaAppointment }) {
  return (
    <View
      style={appointment.status === "concluido" ? [styles.event, styles.completedEvent] : styles.event}
    >
      <Text style={styles.time}>{appointment.horario?.slice(0, 5)}</Text>
      <View style={styles.eventBody}>
        <View style={styles.eventHeading}>
          <Text style={styles.eventName}>{appointment.descricao}</Text>
          <StatusBadge status={appointment.status} />
        </View>
        {appointment.enderecoCerimonia && (
          <Detail label="Local ·" value={appointment.enderecoCerimonia} />
        )}
      </View>
    </View>
  );
}

function AgendaDay({ appointments }: { appointments: AgendaAppointment[] }) {
  const [first, ...remaining] = appointments;
  if (!first) return null;
  return (
    <View>
      <View style={styles.dayHeading}>
        <Text style={styles.dayLabel}>{formatAgendaDate(first.dataEvento)}</Text>
      </View>
      <AgendaEvent appointment={first} />
      {remaining.map(appointment => (
        <AgendaEvent key={appointment.id} appointment={appointment} />
      ))}
    </View>
  );
}

function groupAppointments(appointments: AgendaAppointment[]) {
  const groups = new Map<string, AgendaAppointment[]>();
  for (const appointment of appointments) {
    const key = eventDateKey(appointment.dataEvento);
    groups.set(key, [...(groups.get(key) ?? []), appointment]);
  }
  return Array.from(groups.values());
}

export function distributeAgenda(heights: number[]) {
  const sheets: number[][] = [[]];
  let usedHeight = 0;
  for (let index = 0; index < heights.length; index++) {
    const height = heights[index];
    if (sheets.at(-1)!.length && usedHeight + height > AGENDA_CONTENT_HEIGHT) {
      sheets.push([]);
      usedHeight = 0;
    }
    sheets.at(-1)!.push(index);
    usedHeight += height;
  }
  return sheets;
}

type LayoutNode = {
  type?: string;
  box?: { height: number; marginTop?: number; marginBottom?: number };
  children?: LayoutNode[];
};

function findGroupsContainer(node: LayoutNode, count: number): LayoutNode | undefined {
  if (node.type === "VIEW" && node.children?.length === count) return node;
  return node.children?.map(child => findGroupsContainer(child, count)).find(Boolean);
}

export async function preparePDFAgenda(props: {
  appointments: AgendaAppointment[];
  logo?: string | null;
  generatedAt?: Date;
}) {
  const groups = groupAppointments(props.appointments);
  if (!groups.length) return <PDFAgenda {...props} sheets={[[]]} />;

  let heights: number[] | undefined;
  const { pdf } = await import("@react-pdf/renderer");
  await pdf(
    <Document
      onRender={result => {
        const layout = (result as { _INTERNAL__LAYOUT__DATA_?: LayoutNode })
          ._INTERNAL__LAYOUT__DATA_;
        const container = layout && findGroupsContainer(layout, groups.length);
        heights = container?.children?.map(
          node =>
            (node.box?.height ?? 0) +
            (node.box?.marginTop ?? 0) +
            (node.box?.marginBottom ?? 0)
        );
      }}
    >
      <Page size={A4_PAGE_SIZE} style={{ ...styles.measurePage, height: A4_PAGE_HEIGHT }} wrap={false}>
        <View>{groups.map(group => <AgendaDay key={eventDateKey(group[0].dataEvento)} appointments={group} />)}</View>
      </Page>
    </Document>
  ).toBlob();

  if (!heights || heights.length !== groups.length || heights.some(height => !Number.isFinite(height) || height <= 0))
    throw new Error("Não foi possível medir os agendamentos para paginação.");
  return <PDFAgenda {...props} sheets={distributeAgenda(heights)} />;
}

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function PDFAgenda({
  appointments,
  logo,
  generatedAt = new Date(),
  sheets,
}: {
  appointments: AgendaAppointment[];
  logo?: string | null;
  generatedAt?: Date;
  sheets?: number[][];
}) {
  const groups = groupAppointments(appointments);
  const generatedLabel = formatGeneratedAt(generatedAt);

  return (
    <Document title="Agenda" author="SGA App">
      {(sheets ?? [groups.map((_, index) => index)]).map((sheet, pageIndex) => (
      <Page
        key={pageIndex}
        size={A4_PAGE_SIZE}
        orientation="portrait"
        style={{
          ...(pageIndex === 0 ? styles.page : { ...styles.page, ...styles.continuationPage }),
          height: A4_PAGE_HEIGHT,
        }}
        wrap
      >
        {pageIndex === 0 && (
          <View style={styles.header}>
            <Image style={styles.logo} src={resolveDocumentLogo(logo)} />
            <Text style={styles.title}>AGENDA</Text>
          </View>
        )}

        {sheet.map(index => (
          <AgendaDay key={eventDateKey(groups[index][0].dataEvento)} appointments={groups[index]} />
        ))}
        {!appointments.length && (
          <Text style={styles.empty}>Nenhum agendamento foi encontrado para os filtros selecionados.</Text>
        )}

        <View style={styles.footer} fixed>
          <Text>SGA App - Atualizado em {generatedLabel}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
      ))}
    </Document>
  );
}
