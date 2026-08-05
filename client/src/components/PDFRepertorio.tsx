import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatDateSafe } from "@shared/dateUtils";
import logoImg from "@/assets/logo.png";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingRight: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#fbf7ef",
    color: "#2b2018",
    fontSize: 10,
  },
  headerRow: {
    position: "relative",
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  logo: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 96,
    height: 56,
    objectFit: "contain",
  },
  headerTitle: {
    width: "100%",
    paddingHorizontal: 100,
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#8f6c35",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#76572f",
    marginBottom: 14,
    textAlign: "center",
  },
  eventDetails: {
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  notesBox: {
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 75, fontWeight: "bold", color: "#76572f" },
  value: { flex: 1 },
  moment: {
    marginBottom: 13,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5d1a3",
  },
  lastMoment: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  momentTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#8f6c35",
    marginBottom: 5,
  },
  music: { marginLeft: 10, marginBottom: 5 },
  musicTitle: { fontSize: 10, fontWeight: "bold" },
  detail: { fontSize: 9, color: "#5d4633", marginTop: 1 },
  notes: { fontSize: 9, color: "#5d4633", marginTop: 5, fontStyle: "italic" },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5d1a3",
    paddingTop: 6,
    textAlign: "center",
    color: "#8f6c35",
    fontSize: 8,
  },
});

export function PDFRepertorio({
  agendamento,
  repertorio,
}: {
  agendamento: any;
  repertorio: any;
}) {
  return (
    <Document title={`Repertório - ${agendamento.descricao}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <Image src={logoImg} style={styles.logo} />
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Repertório da Cerimônia</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{agendamento.descricao}</Text>
        <View style={styles.eventDetails}>
          <Info
            label="Data"
            value={formatDateSafe(
              agendamento.dataEvento,
              "dd 'de' MMMM 'de' yyyy"
            )}
          />
          <Info
            label="Horário"
            value={agendamento.horario?.slice(0, 5) ?? "-"}
          />
          <Info label="Local" value={agendamento.enderecoCerimonia} />
        </View>
        {repertorio.momentos.map((momento: any, index: number) => (
          <View
            key={momento.id}
            style={[
              styles.moment,
              index === repertorio.momentos.length - 1
                ? styles.lastMoment
                : {},
            ]}
            wrap={false}
          >
            <Text style={styles.momentTitle}>
              {index + 1}. {momento.nome}
            </Text>
            {momento.musicas.length ? (
              momento.musicas.map((musica: any, musicIndex: number) => (
                <View key={musica.id} style={styles.music}>
                  <Text style={styles.musicTitle}>
                    {musicIndex + 1}. {musica.titulo}
                  </Text>
                  {(musica.artista || musica.tonalidade) && (
                    <Text style={styles.detail}>
                      {[
                        musica.artista,
                        musica.tonalidade && `Tom: ${musica.tonalidade}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  )}
                  {musica.observacoes && (
                    <Text style={styles.notes}>{musica.observacoes}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.detail}>Nenhuma música definida.</Text>
            )}
            {momento.observacoes && (
              <Text style={styles.notes}>
                Observações: {momento.observacoes}
              </Text>
            )}
          </View>
        ))}
        {repertorio.observacoes && (
          <View style={styles.notesBox}>
            <Text style={styles.musicTitle}>Observações gerais</Text>
            <Text style={styles.notes}>{repertorio.observacoes}</Text>
          </View>
        )}
        <Text style={styles.footer} fixed>
          SGA App · Repertório da cerimônia · Página{" "}
        </Text>
      </Page>
    </Document>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
