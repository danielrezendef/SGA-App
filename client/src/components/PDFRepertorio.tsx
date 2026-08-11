import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import logoImg from "@/assets/logo.png";

const A4_PAGE_SIZE = {
  width: 595.28,
  height: 841.89,
} as const;

const styles = StyleSheet.create({
  page: {
    width: A4_PAGE_SIZE.width,
    height: A4_PAGE_SIZE.height,
    paddingTop: 22,
    paddingRight: 34,
    paddingBottom: 32,
    paddingLeft: 34,
    fontFamily: "Helvetica",
    backgroundColor: "#fbf7ef",
    color: "#2b2018",
    fontSize: 9,
  },
  headerRow: {
    position: "relative",
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d9b97c",
    paddingBottom: 6,
    marginBottom: 10,
  },
  logo: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 82,
    height: 44,
    objectFit: "contain",
  },
  headerTitle: {
    width: "100%",
    textAlign: "center",
  },
  title: {
    fontWeight: "bold",
    color: "#8f6728",
    textAlign: "center",
  },
  singleColumn: {
    width: "100%",
  },
  moment: {
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d9b97c",
  },
  momentHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  momentNumber: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#9a702b",
    color: "#fbf7ef",
    fontSize: 7.5,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 3,
    marginRight: 7,
  },
  momentTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "bold",
    color: "#8f6728",
  },
  music: {
    marginLeft: 23,
    marginBottom: 2.5,
  },
  musicTitle: {
    fontSize: 9,
    fontWeight: "bold",
  },
  detail: {
    fontSize: 8,
    color: "#5d4633",
    marginTop: 1,
  },
  notes: {
    fontSize: 7.8,
    color: "#5d4633",
    marginTop: 2,
    fontStyle: "italic",
  },
  generalNotes: {
    marginTop: 1,
    paddingTop: 3,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 20,
    textAlign: "center",
    color: "#8f6728",
    fontSize: 7.5,
  },
});

function appointmentName(description: string) {
  return description.trim().replace(/^cerim[oô]nia\s+/i, "");
}

function momentoSongs(moment: any): any[] {
  return Array.isArray(moment.musicas) ? moment.musicas : [];
}

function titleFontSize(title: string) {
  return Math.max(7, Math.min(20, 680 / Math.max(title.length, 1)));
}

export function PDFRepertorio({
  agendamento,
  repertorio,
}: {
  agendamento: any;
  repertorio: any;
}) {
  const title = `Repertório ${appointmentName(agendamento.descricao ?? "")}`;
  const moments = Array.isArray(repertorio.momentos)
    ? repertorio.momentos
    : [];

  return (
    <Document title={title}>
      <Page
        size={A4_PAGE_SIZE}
        orientation="portrait"
        style={styles.page}
        wrap
      >
        <View style={styles.headerRow}>
          <Image src={logoImg} style={styles.logo} />
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { fontSize: titleFontSize(title) }]}>
              {title}
            </Text>
          </View>
        </View>

        <View style={styles.singleColumn}>
          {moments.map((moment: any, index: number) => (
            <Moment key={moment.id} moment={moment} number={index + 1} />
          ))}

          {repertorio.observacoes && (
            <View style={styles.generalNotes}>
              <Text style={styles.musicTitle}>Observações gerais</Text>
              <Text style={styles.notes}>{repertorio.observacoes}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer} fixed>
          SGA App Todos os Direitos reservados
        </Text>
      </Page>
    </Document>
  );
}

function Moment({ moment, number }: { moment: any; number: number }) {
  const songs = momentoSongs(moment);

  return (
    <View style={styles.moment} wrap={false}>
      <View style={styles.momentHeading}>
        <Text style={styles.momentNumber}>{number}</Text>
        <Text style={styles.momentTitle}>{moment.nome}</Text>
      </View>

      {songs.length ? (
        songs.map((music: any, musicIndex: number) => (
          <View key={music.id} style={styles.music}>
            <Text style={styles.musicTitle}>
              {musicIndex + 1}. {music.titulo}
            </Text>
            {(music.artista || music.tonalidade) && (
              <Text style={styles.detail}>
                {[
                  music.artista,
                  music.tonalidade && `Tom: ${music.tonalidade}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
            {music.observacoes && (
              <Text style={styles.notes}>{music.observacoes}</Text>
            )}
          </View>
        ))
      ) : (
        <Text style={[styles.detail, { marginLeft: 23 }]}>
          Nenhuma música definida.
        </Text>
      )}

      {moment.observacoes && (
        <Text style={[styles.notes, { marginLeft: 23 }]}>
          Observações: {moment.observacoes}
        </Text>
      )}
    </View>
  );
}
