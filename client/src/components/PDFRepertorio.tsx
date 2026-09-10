import React from "react";
import {
  pdf,
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { resolveDocumentLogo } from "@/lib/documentLogo";

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
  columns: { flexDirection: "row", gap: 16 },
  column: { width: (A4_PAGE_SIZE.width - 68 - 16) / 2 },
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

type PDFProps = { agendamento: any; repertorio: any; logo?: string | null };
type Sheet = { columns: number[][]; oversized?: boolean };
type LayoutNode = {
  box: { height: number; marginBottom?: number; marginTop?: number };
  children?: LayoutNode[];
};
const COLUMN_HEIGHT = A4_PAGE_SIZE.height - 22 - 60 - 32;

function blocksFor(repertorio: any) {
  const moments = Array.isArray(repertorio.momentos) ? repertorio.momentos : [];
  const blocks = moments.map((moment: any, index: number) => (
    <Moment key={index} moment={moment} number={index + 1} />
  ));
  if (repertorio.observacoes)
    blocks.push(
      <View key="notes" style={styles.generalNotes} wrap={false}>
        <Text style={styles.musicTitle}>Observações gerais</Text>
        <Text style={styles.notes}>{repertorio.observacoes}</Text>
      </View>
    );
  return blocks as React.ReactElement[];
}

export function distributeRepertorio(heights: number[]): Sheet[] {
  const sheets: Sheet[] = [{ columns: [[], []] }];
  let column = 0;
  let used = 0;
  for (let index = 0; index < heights.length; index++) {
    const height = heights[index];
    // An oversized block cannot fit intact in an A4 column. Give it a
    // dedicated full-width page with native overflow, preserving all text.
    if (height > COLUMN_HEIGHT) {
      if (sheets.at(-1)!.columns.some(items => items.length))
        sheets.push({ columns: [[], []] });
      Object.assign(sheets.at(-1)!, { columns: [[index]], oversized: true });
      sheets.push({ columns: [[], []] });
      column = 0;
      used = 0;
      continue;
    }
    if (used + height > COLUMN_HEIGHT + 0.001) {
      if (column === 0) column = 1;
      else {
        sheets.push({ columns: [[], []] });
        column = 0;
      }
      used = 0;
    }
    sheets.at(-1)!.columns[column].push(index);
    used += height;
  }
  if (sheets.length > 1 && !sheets.at(-1)!.columns.some(items => items.length))
    sheets.pop();
  return sheets;
}

// Measure the same components/fonts at their final width. This includes text
// wrapping, borders, padding and margins instead of estimating by item count.
export async function preparePDFRepertorio(props: PDFProps) {
  let heights: number[] | undefined;
  await pdf(
    <Document
      onRender={result => {
        // Renderer 4 exposes computed Yoga boxes here, although its public
        // OnRenderProps type omits this field. Keep the dependency isolated.
        const layout = (result as { _INTERNAL__LAYOUT__DATA_?: LayoutNode })
          ._INTERNAL__LAYOUT__DATA_;
        heights = layout?.children?.[0]?.children?.[0]?.children?.map(
          node =>
            node.box.height +
            (node.box.marginTop ?? 0) +
            (node.box.marginBottom ?? 0)
        );
      }}
    >
      <Page
        size={{ width: A4_PAGE_SIZE.width }}
        style={{ ...styles.page }}
        wrap={false}
      >
        <View style={styles.column}>{blocksFor(props.repertorio)}</View>
      </Page>
    </Document>
  ).toBlob();
  if (!heights || heights.some(height => !Number.isFinite(height)))
    throw new Error("Não foi possível medir os blocos do repertório.");
  return <PDFRepertorio {...props} sheets={distributeRepertorio(heights)} />;
}

export function PDFRepertorio({
  agendamento,
  repertorio,
  sheets,
  logo,
}: PDFProps & { sheets?: Sheet[] }) {
  const title = `Repertório ${appointmentName(agendamento.descricao ?? "")}`;
  const blocks = blocksFor(repertorio);
  return (
    <Document title={title}>
      {(
        sheets ?? [
          { columns: [blocks.map((_, index) => index)], oversized: true },
        ]
      ).map((sheet, pageIndex) => (
        <Page
          key={pageIndex}
          size={{ ...A4_PAGE_SIZE }}
          orientation="portrait"
          style={{ ...styles.page, height: A4_PAGE_SIZE.height }}
          wrap
        >
          <View style={styles.headerRow} fixed>
            <Image src={resolveDocumentLogo(logo)} style={styles.logo} />
            <View style={styles.headerTitle}>
              <Text style={[styles.title, { fontSize: titleFontSize(title) }]}>
                {title}
              </Text>
            </View>
          </View>
          <View style={styles.columns}>
            {sheet.columns.map((indices, columnIndex) => (
              <View
                key={columnIndex}
                style={sheet.oversized ? { width: "100%" } : styles.column}
              >
                {indices.map(index =>
                  sheet.oversized
                    ? React.cloneElement(
                        blocks[index] as React.ReactElement<{
                          allowWrap?: boolean;
                          wrap?: boolean;
                        }>,
                        { allowWrap: true, wrap: true }
                      )
                    : blocks[index]
                )}
              </View>
            ))}
          </View>
          <Text style={styles.footer} fixed>
            SGA App Todos os Direitos reservados
          </Text>
        </Page>
      ))}
    </Document>
  );
}

function Moment({
  moment,
  number,
  allowWrap = false,
}: {
  moment: any;
  number: number;
  allowWrap?: boolean;
}) {
  const songs = momentoSongs(moment);

  return (
    <View style={styles.moment} wrap={allowWrap}>
      <View style={styles.momentHeading} wrap={false}>
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
                {[music.artista, music.tonalidade && `Tom: ${music.tonalidade}`]
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
