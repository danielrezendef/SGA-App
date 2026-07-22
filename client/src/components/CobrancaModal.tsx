import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard } from "lucide-react";

const schema = z.object({
  nomeResponsavel: z.string().min(1, "Nome obrigatório"),
  cpf: z.string().min(11, "CPF inválido").max(14),
  cep: z.string().optional(),
  rua: z.string().min(1, "Rua obrigatória"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro obrigatório"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  estado: z.string().min(2, "Estado obrigatório").max(2),
  valor: z.string().min(1, "Valor obrigatório"),
  condicaoPagamento: z.string().min(1, "Condição de pagamento obrigatória"),
  formaPagamento: z.enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia", "boleto"]),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agendamentoId: number;
  cobranca?: any;
  agendamento?: any;
  onDownloadPDF?: () => void;
};

export default function CobrancaModal({ open, onClose, onSuccess, agendamentoId, cobranca, agendamento, onDownloadPDF }: Props) {
  const isEdit = !!cobranca;
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (cobranca) {
      reset({
        nomeResponsavel: cobranca.nomeResponsavel || cobranca.responsavel,
        cpf: cobranca.cpf,
        cep: cobranca.cep || "",
        rua: cobranca.rua || "",
        numero: cobranca.numero || "",
        complemento: cobranca.complemento || "",
        bairro: cobranca.bairro || "",
        cidade: cobranca.cidade || "",
        estado: cobranca.estado || "",
        valor: cobranca.valor?.toString(),
        condicaoPagamento: cobranca.condicaoPagamento,
        formaPagamento: cobranca.formaPagamento,
      });
    } else {
      reset({
        formaPagamento: "pix",
        valor: agendamento?.valorServico?.toString() || "",
      });
    }
  }, [cobranca, open, reset, agendamento]);

  const createMutation = trpc.cobrancas.create.useMutation({
    onSuccess: data => {
      if (data?.googleCalendarSync === "synced") {
        toast.success("Cobrança cadastrada e evento adicionado ao Google Agenda!");
      } else if (data?.googleCalendarSync === "failed") {
        toast.warning("Cobrança cadastrada, mas não foi possível sincronizar o Google Agenda.");
      } else {
        toast.success("Cobrança cadastrada! Status atualizado para Confirmado.");
      }
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.cobrancas.update.useMutation({
    onSuccess: () => {
      toast.success("Cobrança atualizada com sucesso!");
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: FormData) => {
    if (isEdit) {
      updateMutation.mutate({ agendamentoId, ...data });
    } else {
      createMutation.mutate({ agendamentoId, ...data });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const formaPagamento = watch("formaPagamento");

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
    setValue("cpf", v);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 5) {
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    setValue("cep", v);

    if (v.replace(/\D/g, "").length === 8) {
      searchCep(v.replace(/\D/g, ""));
    }
  };

  const searchCep = async (cep: string) => {
    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setValue("rua", data.logradouro || watch("rua"));
      setValue("bairro", data.bairro || watch("bairro"));
      setValue("cidade", data.localidade || watch("cidade"));
      setValue("estado", data.uf || watch("estado"));
      
      toast.success("Endereço preenchido via CEP");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsSearchingCep(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {isEdit ? "Editar cobrança" : "Fechar orçamento"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados de cobrança do agendamento"
              : "Preencha os dados de cobrança para confirmar o agendamento."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="nomeResponsavel">Nome Completo do Responsável *</Label>
              <Input id="nomeResponsavel" placeholder="Nome completo" {...register("nomeResponsavel")} />
              {errors.nomeResponsavel && <p className="text-xs text-destructive">{errors.nomeResponsavel.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                {...register("cpf")}
                onChange={handleCpfChange}
              />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cep">CEP (Opcional)</Label>
              <div className="relative">
                <Input
                  id="cep"
                  placeholder="00000-000"
                  {...register("cep")}
                  onChange={handleCepChange}
                />
                {isSearchingCep && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="rua">Rua *</Label>
              <Input id="rua" placeholder="Rua / Logradouro" {...register("rua")} />
              {errors.rua && <p className="text-xs text-destructive">{errors.rua.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numero">Número *</Label>
              <Input id="numero" placeholder="Nº" {...register("numero")} />
              {errors.numero && <p className="text-xs text-destructive">{errors.numero.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" placeholder="Apto, Bloco, etc" {...register("complemento")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bairro">Bairro *</Label>
              <Input id="bairro" placeholder="Bairro" {...register("bairro")} />
              {errors.bairro && <p className="text-xs text-destructive">{errors.bairro.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input id="cidade" placeholder="Cidade" {...register("cidade")} />
              {errors.cidade && <p className="text-xs text-destructive">{errors.cidade.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado (UF) *</Label>
              <Input id="estado" placeholder="UF" maxLength={2} {...register("estado")} onChange={(e) => setValue("estado", e.target.value.toUpperCase())} />
              {errors.estado && <p className="text-xs text-destructive">{errors.estado.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor *</Label>
              <Input id="valor" placeholder="Ex: 3500.00" {...register("valor")} />
              {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Forma de Pagamento *</Label>
              <Select
                value={formaPagamento}
                onValueChange={(v) => setValue("formaPagamento", v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Dezbito</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
              {errors.formaPagamento && <p className="text-xs text-destructive">{errors.formaPagamento.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="condicaoPagamento">Condição de Pagamento *</Label>
              <Input
                id="condicaoPagamento"
                placeholder="Ex: 50% entrada + 50% no dia"
                {...register("condicaoPagamento")}
              />
              {errors.condicaoPagamento && <p className="text-xs text-destructive">{errors.condicaoPagamento.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isEdit ? "Salvando..." : "Confirmar..."}</>
              ) : (
                isEdit ? "Salvar alterações" : "Confirmar agendamento"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
