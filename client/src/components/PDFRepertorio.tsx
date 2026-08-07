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
    overflow: "hidden",
    paddingTop: 28,
    paddingRight: 34,
    paddingBottom: 36,
    paddingLeft: 34,
    fontFamily: "Helvetica",
    backgroundColor: "#fbf7ef",
    color: "#2b2018",
    fontSize: 9,
  },
  headerRow: {
    position: "relative",
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d9b97c",
    paddingBottom: 8,
    marginBottom: 18,
  },
  logo: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 92,
    height: 50,
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
  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  column: {
    flex: 1,
  },
  leftColumn: {
    paddingRight: 12,
    borderRightWidth: 0.5,
    borderRightColor: "#e5d1a3",
  },
  rightColumn: {
    paddingLeft: 12,
  },
  moment: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d9b97c",
  },
  momentHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  momentNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#9a702b",
    color: "#fbf7ef",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 4,
    marginRight: 7,
  },
  momentTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "bold",
    color: "#8f6728",
  },
  music: {
    marginLeft: 25,
    marginBottom: 4,
  },
  musicTitle: {
    fontSize: 9.2,
    fontWeight: "bold",
  },
  detail: {
    fontSize: 8.2,
    color: "#5d4633",
    marginTop: 1,
  },
  notes: {
    fontSize: 8,
    color: "#5d4633",
    marginTop: 2,
    fontStyle: "italic",
  },
  generalNotes: {
    marginTop: 2,
    paddingTop: 6,
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

function momentWeight(moment: any) {
  const songs = momentoSongs(moment);
  const songNotes = songs.reduce(
    (weight: number, music: any) => weight + (music.observacoes ? 0.8 : 0),
    0
  );

  return 2.5 + songs.length * 2 + songNotes + (moment.observacoes ? 1 : 0);
}

function momentoSongs(moment: any): any[] {
  return Array.isArray(moment.musicas) ? moment.musicas : [];
}

function splitMoments(moments: any[]) {
  if (moments.length < 2) return [moments, []] as const;

  const weights = moments.map(momentWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let leftWeight = 0;
  let splitIndex = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;

  for (let index = 1; index < moments.length; index += 1) {
    leftWeight += weights[index - 1];
    const difference = Math.abs(total - leftWeight * 2);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      splitIndex = index;
    }
  }

  return [moments.slice(0, splitIndex), moments.slice(splitIndex)] as const;
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
  const [leftMoments, rightMoments] = splitMoments(moments);

  return (
    <Document title={title}>
      <Page
        size={A4_PAGE_SIZE}
        orientation="portrait"
        style={styles.page}
        wrap={false}
      >
        <View style={styles.headerRow}>
          <Image src={logoImg} style={styles.logo} />
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { fontSize: titleFontSize(title) }]}>
              {title}
            </Text>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={[styles.column, styles.leftColumn]}>
            {leftMoments.map((moment: any, index: number) => (
              <Moment
                key={moment.id}
                moment={moment}
                number={index + 1}
              />
            ))}
          </View>

          <View style={[styles.column, styles.rightColumn]}>
            {rightMoments.map((moment: any, index: number) => (
              <Moment
                key={moment.id}
                moment={moment}
                number={leftMoments.length + index + 1}
              />
            ))}

            {repertorio.observacoes && (
              <View style={styles.generalNotes}>
                <Text style={styles.musicTitle}>Observações gerais</Text>
                <Text style={styles.notes}>{repertorio.observacoes}</Text>
              </View>
            )}
          </View>
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
        <Text style={[styles.detail, { marginLeft: 25 }]}>
          Nenhuma música definida.
        </Text>
      )}

      {moment.observacoes && (
        <Text style={[styles.notes, { marginLeft: 25 }]}>
          Observações: {moment.observacoes}
        </Text>
      )}
    </View>
  );
}
