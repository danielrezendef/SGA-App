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

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingRight: 40,
    paddingBottom: 48,
    paddingLeft: 40,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.text,
    backgroundColor: "#FFFFFF",
  },
  header: {
    position: "relative",
    height: 45,
    marginBottom: 10,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
  },
  logo: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 72,
    height: 34,
    objectFit: "contain",
  },
  title: {
    width: "100%",
    paddingTop: 7,
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
    bottom: 20,
    paddingTop: 7,
    borderTopWidth: 0.6,
    borderTopColor: COLORS.line,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.secondary,
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
    case "confirmado":
    case "concluido":
      return { backgroundColor: "#E8F3EC", color: "#3B6B4D" };
    case "cancelado":
      return { backgroundColor: "#FCE9E8", color: "#963C36" };
    default:
      return { backgroundColor: "#F6EEDC", color: COLORS.goldDark };
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
    <View style={[styles.statusBadge, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.statusText, { color: colors.color }]}>
        {displayStatus(status)}
      </Text>
    </View>
  );
}

function AgendaEvent({ appointment }: { appointment: AgendaAppointment }) {
  return (
    <View style={styles.event} wrap={false}>
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
    <>
      <View wrap={false}>
        <View style={styles.dayHeading}>
          <Text style={styles.dayLabel}>{formatAgendaDate(first.dataEvento)}</Text>
        </View>
        <AgendaEvent appointment={first} />
      </View>
      {remaining.map(appointment => (
        <AgendaEvent key={appointment.id} appointment={appointment} />
      ))}
    </>
  );
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
}: {
  appointments: AgendaAppointment[];
  logo?: string | null;
  generatedAt?: Date;
}) {
  const groups = new Map<string, AgendaAppointment[]>();
  for (const appointment of appointments) {
    const key = eventDateKey(appointment.dataEvento);
    groups.set(key, [...(groups.get(key) ?? []), appointment]);
  }
  const generatedLabel = formatGeneratedAt(generatedAt);

  return (
    <Document title="Agenda" author="SGA App">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Image style={styles.logo} src={resolveDocumentLogo(logo)} />
          <Text style={styles.title}>AGENDA</Text>
        </View>

        {Array.from(groups.values()).map(day => (
          <AgendaDay key={eventDateKey(day[0].dataEvento)} appointments={day} />
        ))}
        {!appointments.length && (
          <Text style={styles.empty}>Nenhum agendamento foi encontrado para os filtros selecionados.</Text>
        )}

        <View style={styles.footer} fixed>
          <Text>SGA App - Atualizado em {generatedLabel}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
