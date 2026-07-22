import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateSafe } from "@shared/dateUtils";
import logoImg from "@/assets/logo.png";

interface PDFReciboProps {
  agendamento: {
    id: number;
    descricao: string;
    dataEvento: Date;
    horario: string;
    endereco: string;
    valorServico: number;
    status: string;
  };
  cobranca: {
    id: number;
    responsavel: string;
    cpf: string;
    endereco: string;
    valor: number;
    condicaoPagamento: string;
    formaPagamento: string;
    createdAt: Date;
  };
  nomeEmpresa: string;

  contratada: {
    nome: string;
    cpf: string;
    endereco: string;
    cidadeAssinatura: string;
    foro: string;
    dataAssinatura?: Date;
  };
  
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 2,
  },
  page: {
  paddingTop: 15,
  paddingRight: 40,
  paddingBottom: 40,
  paddingLeft: 40,
  fontFamily: "Helvetica",
  backgroundColor: "#fbf7ef",
},

logo: {
  width: 210,
  height: 100,
  objectFit: "contain",
  alignSelf: "flex-start",
  marginBottom: 4,
  marginLeft: 0,
},
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8f6c35",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: "#76572f",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2b2018",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5d1a3",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#76572f",
    width: "30%",
  },
  value: {
    fontSize: 10,
    color: "#2b2018",
    width: "70%",
  },
  twoColumn: {
    display: "flex",
    flexDirection: "row",
    gap: 20,
  },
  column: {
    flex: 1,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5d1a3",
    textAlign: "center",
    fontSize: 9,
    color: "#8f6c35",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 5,
  },
  statusOrcamento: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  statusConfirmado: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusPagamento: {
    backgroundColor: "#fed7aa",
    color: "#92400e",
  },
  statusConcluido: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: "#b9934f",
  },
  totalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#8f6c35",
  },

  // CONTRATO
  contractPage: {
    paddingTop: 42,
    paddingBottom: 42,
    paddingHorizontal: 52,
    backgroundColor: "#fbf7ef",
    fontFamily: "Helvetica",
  },
  contractTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 24,
    color: "#2b2018",
  },
  contractSectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 8,
    color: "#2b2018",
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.6,
    textAlign: "justify",
    marginBottom: 10,
    color: "#2b2018",
  },
  clause: {
    fontSize: 10.5,
    lineHeight: 1.6,
    textAlign: "justify",
    marginBottom: 12,
    color: "#2b2018",
  },
  bold: {
    fontWeight: "bold",
  },
  dateText: {
    marginTop: 18,
    fontSize: 10.5,
    textAlign: "left",
    color: "#2b2018",
  },
  signaturesContainer: {
    marginTop: 34,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  signatureBlock: {
    width: "45%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#5d4633",
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 10,
    textAlign: "center",
    textTransform: "uppercase",
  },
  signatureRole: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
  },
  witnessContainer: {
    marginTop: 34,
  },
  witnessTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 16,
    textTransform: "uppercase",
  },
  witnessBlock: {
    marginBottom: 22,
  },
  witnessLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#5d4633",
    marginBottom: 5,
  },
  witnessText: {
    fontSize: 10,
    textTransform: "uppercase",
  },
  footerNoteTitle: {
    marginTop: 14,
    fontSize: 10,
    fontWeight: "bold",
  },
  footerNote: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 1.5,
    textAlign: "justify",
  },
});

const getStatusColor = (status: string) => {
  switch (status) {
    case "orcamento":
      return styles.statusOrcamento;
    case "confirmado":
      return styles.statusConfirmado;
    case "pagamento":
      return styles.statusPagamento;
    case "concluido":
      return styles.statusConcluido;
    default:
      return {};
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    orcamento: "Orçamento",
    confirmado: "Confirmado",
    pagamento: "Pagamento",
    concluido: "Concluído",
  };
  return labels[status] || status;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const PDFRecibo: React.FC<PDFReciboProps> = ({
  agendamento,
  cobranca,
  nomeEmpresa,
  contratada,
}) => {
  const dataEmissao = new Date();
  const dataAssinatura = contratada.dataAssinatura || cobranca.createdAt || new Date();

  return (
    <Document>
      {/* RECIBO */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.logo} src={logoImg} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Recibo</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Número:</Text>
            <Text style={styles.value}>#{cobranca.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data de Emissão:</Text>
            <Text style={styles.value}>
              {format(dataEmissao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <View style={[styles.statusBadge, getStatusColor(agendamento.status)]}>
              <Text>{getStatusLabel(agendamento.status)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Evento</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Descrição:</Text>
            <Text style={styles.value}>{agendamento.descricao}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data do Evento:</Text>
            <Text style={styles.value}>
              {formatDateSafe(agendamento.dataEvento, "dd 'de' MMMM 'de' yyyy")}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Horário:</Text>
            <Text style={styles.value}>{agendamento.horario}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Local:</Text>
            <Text style={styles.value}>{agendamento.endereco}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contratante</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{cobranca.responsavel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CPF:</Text>
            <Text style={styles.value}>{cobranca.cpf}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Endereço:</Text>
            <Text style={styles.value}>{cobranca.endereco}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados de Cobrança</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Valor do Serviço:</Text>
            <Text style={styles.value}>{formatCurrency(agendamento.valorServico)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Valor Cobrado:</Text>
            <Text style={styles.value}>{formatCurrency(cobranca.valor)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Forma de Pagamento:</Text>
            <Text style={styles.value}>{cobranca.formaPagamento}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Condição de Pagamento:</Text>
            <Text style={styles.value}>{cobranca.condicaoPagamento}</Text>
          </View>
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>TOTAL A PAGAR:</Text>
            <Text style={styles.totalValue}>{formatCurrency(cobranca.valor)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Documento emitido em{" "}
            {format(dataEmissao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
          <Text style={{ marginTop: 10 }}>
            Este recibo é válido como comprovante de cobrança do serviço.
          </Text>
        </View>
      </Page>

      {/* CONTRATO - PÁGINA 1 */}
      <Page size="A4" style={styles.contractPage}>
        <Text style={styles.contractTitle}>
          CONTRATO DE PRESTAÇÃO DE{"\n"}SERVIÇOS MUSICAIS
        </Text>

        <Text style={styles.contractSectionTitle}>
          IDENTIFICAÇÃO DAS PARTES CONTRATANTES
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>CONTRATANTE:</Text>{" "}
          <Text style={styles.bold}>{cobranca.responsavel}</Text>, inscrito(a) no CPF sob o nº{" "}
          <Text style={styles.bold}>{cobranca.cpf}</Text>, residente e domiciliado(a) em{" "}
          <Text style={styles.bold}>{cobranca.endereco}</Text>.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>CONTRATADA:</Text>{" "}
          <Text style={styles.bold}>{contratada.nome}</Text>, inscrito(a) no CPF sob o nº{" "}
          <Text style={styles.bold}>{contratada.cpf}</Text>, residente e domiciliado(a) em{" "}
          <Text style={styles.bold}>{contratada.endereco}</Text>.
        </Text>

        <Text style={styles.paragraph}>
          As partes acima identificadas têm, entre si, justo e acertado o presente
          Contrato de Prestação de Serviços Musicais, que se regerá pelas cláusulas
          seguintes e pelas condições descritas neste instrumento.
        </Text>

        <Text style={styles.contractSectionTitle}>DO OBJETO DO CONTRATO</Text>
        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 1ª.</Text> O presente contrato tem como
          objeto a prestação de serviços musicais no evento{" "}
          <Text style={styles.bold}>
            {agendamento.descricao}
          </Text>
          , por parte da CONTRATADA à CONTRATANTE, no evento a ser realizado no dia{" "}
          <Text style={styles.bold}>
            {formatDateSafe(agendamento.dataEvento, "dd/MM/yyyy")}
          </Text>
          .
        </Text>

        <Text style={styles.contractSectionTitle}>DAS OBRIGAÇÕES DA CONTRATANTE</Text>
        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 2ª.</Text> Assume a CONTRATANTE os riscos
          sobre a execução do evento, responsabilizando-se por eventuais danos que
          surgirem decorrentes da realização do mesmo.
        </Text>

        <Text style={styles.contractSectionTitle}>DO PAGAMENTO</Text>
        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 3ª.</Text> A CONTRATANTE pagará à
          CONTRATADA a quantia de{" "}
          <Text style={styles.bold}>{formatCurrency(cobranca.valor)}</Text> em razão da
          prestação dos serviços musicais. Este pagamento será realizado em{" "}
          <Text style={styles.bold}>{cobranca.condicaoPagamento}</Text>, por meio de{" "}
          <Text style={styles.bold}>{cobranca.formaPagamento}</Text>.
        </Text>

        <Text style={styles.contractSectionTitle}>DO EVENTO</Text>
        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 4ª.</Text> O evento se realizará em{" "}
          <Text style={styles.bold}>{agendamento.endereco}</Text>, às{" "}
          <Text style={styles.bold}>{agendamento.horario}</Text> horas do dia{" "}
          <Text style={styles.bold}>
            {formatDateSafe(agendamento.dataEvento, "dd/MM/yyyy")}
          </Text>
          , devendo a CONTRATADA comparecer ao local com 1 (uma) hora de antecedência
          para a execução das atividades previstas neste instrumento.
        </Text>

        <Text style={styles.contractSectionTitle}>DOS EQUIPAMENTOS</Text>
        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 5ª.</Text> A CONTRATADA fornecerá todo
          equipamento de som necessário para a realização da apresentação musical,
          comprometendo-se a CONTRATANTE a respeitar as condições fundamentais para o
          bom funcionamento dos equipamentos, tais como energia elétrica no local e
          acesso ao local antes do horário para montagem dos mesmos.
        </Text>
      </Page>

      {/* CONTRATO - PÁGINA 2 */}
      <Page size="A4" style={styles.contractPage}>
        <Text style={styles.contractSectionTitle}>DA RESCISÃO</Text>

        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 6ª.</Text> O presente contrato será
          rescindido caso uma das partes descumpra o pactuado nas cláusulas deste
          instrumento.
        </Text>

        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 7ª.</Text> Caso ocorra algum impedimento à
          realização da cerimônia, ligado a caso fortuito ou força maior, as partes
          deverão pactuar outra data, devendo tal ajuste ser feito por escrito e
          endereçado exclusivamente à CONTRATADA.
        </Text>

        <Text style={styles.contractSectionTitle}>DA MULTA</Text>
        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 8ª.</Text> A parte que der causa à
          rescisão do presente pagará multa de 50% (cinquenta por cento) do valor total
          do contrato.
        </Text>

        <Text style={styles.contractSectionTitle}>DO FORO</Text>
        <Text style={styles.clause}>
          <Text style={styles.bold}>CLÁUSULA 9ª.</Text> Para dirimir quaisquer
          controvérsias oriundas do presente contrato, as partes elegem o foro da
          comarca de <Text style={styles.bold}>{contratada.foro}</Text>.
        </Text>
      
        <Text style={styles.dateText}>
          {contratada.cidadeAssinatura},{" "}
          {format(new Date(dataAssinatura), "dd 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}
          .
        </Text>

        <View style={styles.signaturesContainer}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{cobranca.responsavel}</Text>
              <Text style={styles.signatureRole}>CONTRATANTE</Text>
            </View>

            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{contratada.nome}</Text>
              <Text style={styles.signatureRole}>CONTRATADA</Text>
            </View>
          </View>
        </View>
        <Text style={styles.footerNoteTitle}>Nota</Text>
        <Text style={styles.footerNote}>
          Este contrato rege-se pelo disposto nos artigos 593 a 609 do Código Civil.
        </Text>
      </Page>
    </Document>
  );
};
