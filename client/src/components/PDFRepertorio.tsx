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
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#fbf7ef",
    color: "#2b2018",
    fontSize: 10,
  },
  logo: { width: 150, height: 70, objectFit: "contain", marginBottom: 8 },
  title: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#8f6c35",
    marginBottom: 5,
  },
  subtitle: { fontSize: 12, color: "#76572f", marginBottom: 18 },
  eventBox: {
    borderWidth: 1,
    borderColor: "#e5d1a3",
    borderRadius: 6,
    padding: 12,
    marginBottom: 18,
    backgroundColor: "#fffdf8",
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
  momentTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#8f6c35",
    marginBottom: 5,
  },
  type: {
    fontSize: 8,
    color: "#76572f",
    marginBottom: 6,
    textTransform: "uppercase",
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
        <Image src={logoImg} style={styles.logo} />
        <Text style={styles.title}>Repertório da Cerimônia</Text>
        <Text style={styles.subtitle}>{agendamento.descricao}</Text>
        <View style={styles.eventBox}>
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
          <View key={momento.id} style={styles.moment} wrap={false}>
            <Text style={styles.momentTitle}>
              {index + 1}. {momento.nome}
            </Text>
            <Text style={styles.type}>{momento.tipoNome}</Text>
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
          <View style={styles.eventBox}>
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
