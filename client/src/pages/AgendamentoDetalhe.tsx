import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAppAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  FileText,
  User,
  CreditCard,
  Pencil,
  CheckCircle2,
  Phone,
  BadgeCheck,
  ChevronDown,
  Download,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateSafe as formatDateSafeShared } from "@shared/dateUtils";
import StatusBadge from "@/components/StatusBadge";
import AgendamentoModal from "@/components/AgendamentoModal";
import CobrancaModal from "@/components/CobrancaModal";

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function formatDateSafe(value: string | Date | null | undefined, fmt: string) {
  return formatDateSafeShared(value, fmt);
}

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  transferencia: "Transferência Bancária",
  boleto: "Boleto",
};

const STATUS_VALUES = ["orcamento", "confirmado", "pagamento", "concluido"] as const;
type AgendamentoStatus = (typeof STATUS_VALUES)[number];

function isAgendamentoStatus(status: string): status is AgendamentoStatus {
  return STATUS_VALUES.includes(status as AgendamentoStatus);
}

type CobrancaEndereco = {
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  enderecoCompleto?: string | null;
  endereco?: string | null;
};

function formatCobrancaEndereco(cobranca: CobrancaEndereco | null | undefined) {
  if (!cobranca) return "-";
  if (!cobranca.rua) return cobranca.enderecoCompleto || cobranca.endereco || "-";
  return `${cobranca.rua}, ${cobranca.numero}${cobranca.complemento ? ` - ${cobranca.complemento}` : ""}, ${cobranca.bairro}, ${cobranca.cidade} - ${cobranca.estado}${cobranca.cep ? `, CEP: ${cobranca.cep}` : ""}`;
}

export default function AgendamentoDetalhe() {
  const params = useParams<{ id: string }>();
  const id = Number.parseInt(params.id ?? "", 10);
  const hasValidId = Number.isFinite(id) && id > 0;
  const [, navigate] = useLocation();
  const { user, isAdmin } = useAppAuth();
  const utils = trpc.useUtils();

  const [showEdit, setShowEdit] = useState(false);
  const [showCobranca, setShowCobranca] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const updateStatusMutation = trpc.agendamentos.updateStatus.useMutation({
    onMutate: async ({ status }) => {
      setIsChangingStatus(true);
      await utils.agendamentos.byId.cancel({ id });
      const previousAgendamento = utils.agendamentos.byId.getData({ id });

      utils.agendamentos.byId.setData({ id }, (current) => {
        if (!current) return current;
        return { ...current, status };
      });

      return { previousAgendamento };
    },
    onSuccess: (updatedAgendamento) => {
      if (updatedAgendamento) {
        utils.agendamentos.byId.setData({ id }, (current) => {
          if (!current) return current;
          return { ...current, ...updatedAgendamento, cobranca: current.cobranca };
        });
      }

      toast.success("Status atualizado com sucesso!");
      utils.agendamentos.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousAgendamento) {
        utils.agendamentos.byId.setData({ id }, context.previousAgendamento);
      }
      toast.error(err?.message || "Erro ao atualizar status");
    },
    onSettled: () => {
      utils.agendamentos.byId.invalidate({ id });
      setIsChangingStatus(false);
    },
  });

  const { data, isLoading, error } = trpc.agendamentos.byId.useQuery(
    { id },
    { enabled: hasValidId }
  );
  
  const { data: contrato } = trpc.contratos.get.useQuery();
  
  if (isLoading) {
    return (
      <div className="space-y-4 page-enter">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!hasValidId || error || !data) {
    return (
      <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
        <p className="font-medium">Agendamento não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/agendamentos")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const cobranca = data.cobranca;
  const canAddCobranca = !cobranca;
  const canEditCobranca = !!cobranca;
  const canUseContracts = Boolean(user?.gerarContratoAutomaticamente);

  const handleStatusChange = (newStatus: string) => {
    if (!isAgendamentoStatus(newStatus) || newStatus === data.status || isChangingStatus) return;
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleDownloadPDF = async () => {
    if (!data || !cobranca) {
      toast.error("Dados incompletos para gerar PDF");
      return;
    }

    try {
      setIsGeneratingPDF(true);
      const { PDFRecibo } = await import("@/components/PDFRecibo");
      const { pdf } = await import("@react-pdf/renderer");
      
      const doc = (
        <PDFRecibo
          agendamento={{
            ...data,
            endereco: data.enderecoCerimonia,
            valorServico: Number(data.valorServico),
          } as any}
          cobranca={{
            ...cobranca,
            valor: Number(cobranca.valor),
            responsavel: cobranca.nomeResponsavel,
            endereco: `${cobranca.rua}, ${cobranca.numero}${cobranca.complemento ? ` - ${cobranca.complemento}` : ""}, ${cobranca.bairro}, ${cobranca.cidade} - ${cobranca.estado}${cobranca.cep ? `, CEP: ${cobranca.cep}` : ""}`,
          }}
          nomeEmpresa="SGA App"
          contratada={{
            nome: contrato?.nomeCompleto || "",
            cpf: contrato?.cpf || "",
            endereco: contrato ? `${contrato.rua}, ${contrato.numero}${contrato.complemento ? ` - ${contrato.complemento}` : ""}, ${contrato.bairro}, ${contrato.cidade} - ${contrato.estado}${contrato.cep ? `, CEP: ${contrato.cep}` : ""}` : "",
            cidadeAssinatura: contrato?.cidade ? `${contrato.cidade} - ${contrato.estado}` : "Itaúna - MG",
            dataAssinatura: new Date(),
            foro: contrato?.cidade ? `${contrato.cidade} - ${contrato.estado}` : "Itaúna - MG",
          }}

        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const descricaoArquivo = (data.descricao || "sem_descricao")
        .trim()
        .replace(/[^a-zA-Z0-9\s_-]/g, "")
        .replace(/\s+/g, "_");
      link.href = url;
      link.download = `Contrato_${data.id}_${descricaoArquivo}_${new Date().toISOString().split("T")[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado com sucesso!");
      
      // Atualizar status para "pagamento" quando emitir PDF, sem rebaixar agendamentos já concluídos.
      if (data.status !== "pagamento" && data.status !== "concluido") {
        updateStatusMutation.mutate({ id, status: "pagamento" });
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/agendamentos")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{data.descricao}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Agendamento #{data.id}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          <Pencil className="w-4 h-4 mr-2" /> Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Dados do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <InfoItem icon={<FileText className="w-4 h-4" />} label="Descrição" value={data.descricao} />
                </div>
                <InfoItem
                  icon={<Calendar className="w-4 h-4" />}
                  label="Data do Agendamento"
                  value={formatDateSafe(data.dataEvento, "dd 'de' MMMM 'de' yyyy")}
                />
                <InfoItem
                  icon={<Clock className="w-4 h-4" />}
                  label="Horário"
                  value={data.horario?.slice(0, 5) ?? "-"}
                />
              </div>
              <Separator />
              <InfoItem
                icon={<MapPin className="w-4 h-4" />}
                label="Endereço da Cerimônia"
                value={data.enderecoCerimonia}
              />
              <InfoItem
                icon={<DollarSign className="w-4 h-4" />}
                label="Valor do Serviço"
                value={formatCurrency(data.valorServico)}
                valueClass="text-primary font-semibold"
              />
              {data.observacoes && (
                <>
                  <Separator />
                  <InfoItem
                    icon={<FileText className="w-4 h-4" />}
                    label="Observações"
                    value={data.observacoes}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Cobrança */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Dados de Cobrança
                </CardTitle>
                {canAddCobranca && (
                  <Button size="sm" onClick={() => setShowCobranca(true)}>
                    Fechar orçamento
                  </Button>
                )}
                {canEditCobranca && (
                  <Button variant="outline" size="sm" onClick={() => setShowCobranca(true)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar cobrança
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {cobranca ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem icon={<User className="w-4 h-4" />} label="Responsável Financeiro" value={cobranca.nomeResponsavel} />
                    <InfoItem icon={<BadgeCheck className="w-4 h-4" />} label="CPF" value={cobranca.cpf} />
                    <InfoItem
                      icon={<DollarSign className="w-4 h-4" />}
                      label="Valor Cobrado"
                      value={formatCurrency(cobranca.valor)}
                      valueClass="text-primary font-semibold"
                    />
                    <InfoItem
                      icon={<CreditCard className="w-4 h-4" />}
                      label="Forma de Pagamento"
                      value={FORMA_PAGAMENTO_LABELS[cobranca.formaPagamento] ?? cobranca.formaPagamento}
                    />
                    <InfoItem icon={<FileText className="w-4 h-4" />} label="Condição de Pagamento" value={cobranca.condicaoPagamento} />
                  </div>
                    <InfoItem 
                      icon={<MapPin className="w-4 h-4" />} 
                      label="Endereço" 
                      value={formatCobrancaEndereco(cobranca)} 
                    />
                  <div className="pt-3 border-t border-border/50">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full"
                      onClick={handleDownloadPDF}
                      disabled={isGeneratingPDF || !canUseContracts}
                    >
                      {isGeneratingPDF ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Gerando...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 mr-1.5" /> {canUseContracts ? "Baixar Contrato" : "Ative contrato automático no perfil"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma cobrança cadastrada</p>
                  {data.status === "orcamento" && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Clique em "Fechar orçamento" para cadastrar os dados de cobrança
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-5">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status atual</p>
                {isAdmin ? (
                  <Select value={data.status} onValueChange={handleStatusChange} disabled={isChangingStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orcamento">Orçamento</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="pagamento">Pagamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={data.status} />
                )}
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm font-medium mt-0.5">
                  {formatDateSafe(data.createdAt, "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última atualização</p>
                <p className="text-sm font-medium mt-0.5">
                  {formatDateSafe(data.updatedAt, "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status flow */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fluxo do contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { status: "orcamento", label: "Orçamento" },
                  { status: "confirmado", label: "Confirmado" },
                  { status: "pagamento", label: "Pagamento" },
                  { status: "concluido", label: "Concluído" },
                ].map((step, idx) => {
                  const isActive = data.status === step.status;
                  const statusOrder = ["orcamento", "confirmado", "pagamento", "concluido"];
                  const currentIdx = statusOrder.indexOf(data.status);
                  const stepIdx = statusOrder.indexOf(step.status);
                  const isDone = stepIdx < currentIdx;

                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all
                        ${isActive ? "bg-primary text-primary-foreground shadow-sm" : isDone ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <span className={`text-sm ${isActive ? "font-semibold text-primary" : isDone ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AgendamentoModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        agendamento={data}
        onSuccess={() => utils.agendamentos.byId.invalidate({ id })}
      />

      <CobrancaModal
        open={showCobranca}
        onClose={() => setShowCobranca(false)}
        agendamentoId={id}
        cobranca={cobranca}
        agendamento={data}
        onSuccess={() => {
          utils.agendamentos.byId.invalidate({ id });
          utils.dashboard.stats.invalidate();
        }}
      />
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  valueClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm mt-0.5 break-words ${valueClass || "font-medium"}`}>{value}</p>
      </div>
    </div>
  );
}
