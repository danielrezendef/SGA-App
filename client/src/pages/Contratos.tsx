import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAppAuth } from "@/contexts/AuthContext";

type FormDataType = {
  nomeCompleto: string;
  cpf: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  isDefault: boolean;
};

const initialFormData: FormDataType = {
  nomeCompleto: "",
  cpf: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  isDefault: false,
};

type ContratoItem = inferRouterOutputs<AppRouter>["contratos"]["list"][number];

function contratoToForm(contrato: ContratoItem): FormDataType {
  return {
    nomeCompleto: contrato.nomeCompleto ?? "",
    cpf: contrato.cpf ?? "",
    cep: contrato.cep ?? "",
    rua: contrato.rua ?? "",
    numero: contrato.numero ?? "",
    complemento: contrato.complemento ?? "",
    bairro: contrato.bairro ?? "",
    cidade: contrato.cidade ?? "",
    estado: contrato.estado ?? "",
    isDefault: contrato.isDefault,
  };
}

export default function Contratos() {
  const { user } = useAppAuth();
  const canUseContracts = Boolean(user?.gerarContratoAutomaticamente);
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState<FormDataType>(initialFormData);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const {
    data: contratos = [],
    isLoading,
    isFetching,
  } = trpc.contratos.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const orderedContratos = useMemo(
    () =>
      [...contratos].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    [contratos]
  );
  const selectedContrato =
    contratos.find(item => item.id === selectedId) ?? null;

  useEffect(() => {
    if (isLoading) return;
    if (mode === "create") return;
    const selected = contratos.find(item => item.id === selectedId);
    const next =
      selected ?? contratos.find(item => item.isDefault) ?? contratos[0];
    if (next) {
      setSelectedId(next.id);
      setFormData(contratoToForm(next));
    } else {
      setSelectedId(null);
      setFormData(initialFormData);
      setMode("create");
    }
  }, [contratos, isLoading, mode, selectedId]);

  const invalidateContratos = async () => {
    await Promise.all([
      utils.contratos.list.invalidate(),
      utils.contratos.get.invalidate(),
    ]);
  };

  const createMutation = trpc.contratos.create.useMutation({
    onSuccess: async created => {
      await invalidateContratos();
      setSelectedId(created.id);
      setMode("view");
      toast.success("Dados de contrato adicionados.");
    },
    onError: err => toast.error(err.message),
  });

  const updateMutation = trpc.contratos.update.useMutation({
    onSuccess: async () => {
      await invalidateContratos();
      setMode("view");
      toast.success("Dados de contrato atualizados.");
    },
    onError: err => toast.error(err.message),
  });

  const setDefaultMutation = trpc.contratos.setDefault.useMutation({
    onSuccess: async () => {
      toast.success("Contrato padrão atualizado.");
      await invalidateContratos();
    },
    onError: err => toast.error(err.message),
  });

  const deleteMutation = trpc.contratos.delete.useMutation({
    onSuccess: async () => {
      await invalidateContratos();
      setDeleteId(null);
      setSelectedId(null);
      setMode("view");
      toast.success("Dados de contrato removidos.");
    },
    onError: err => toast.error(err.message),
  });

  const handleChange = (field: keyof FormDataType, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCpfChange = (value: string) => {
    let formatted = value.replace(/\D/g, "").slice(0, 11);
    formatted = formatted.replace(/(\d{3})(\d)/, "$1.$2");
    formatted = formatted.replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    formatted = formatted.replace(
      /(\d{3})\.(\d{3})\.(\d{3})(\d)/,
      "$1.$2.$3-$4"
    );
    handleChange("cpf", formatted);
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
      setFormData(prev => ({
        ...prev,
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    let formatted = value.replace(/\D/g, "").slice(0, 8);
    if (formatted.length > 5)
      formatted = formatted.replace(/(\d{5})(\d)/, "$1-$2");
    handleChange("cep", formatted);
    if (formatted.replace(/\D/g, "").length === 8) {
      void searchCep(formatted.replace(/\D/g, ""));
    }
  };

  const startCreate = () => {
    setSelectedId(null);
    setFormData({ ...initialFormData, isDefault: contratos.length === 0 });
    setMode("create");
  };

  const selectContrato = (id: number) => {
    const contrato = contratos.find(item => item.id === id);
    if (!contrato) return;
    setSelectedId(id);
    setFormData(contratoToForm(contrato));
    setMode("view");
  };

  const cancelForm = () => {
    if (selectedContrato) {
      setFormData(contratoToForm(selectedContrato));
      setMode("view");
    } else if (contratos.length > 0) {
      selectContrato(
        contratos.find(item => item.isDefault)?.id ?? contratos[0].id
      );
    } else {
      setFormData(initialFormData);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canUseContracts) {
      toast.error("Ative a emissão automática de contrato no perfil.");
      return;
    }
    if (
      !formData.nomeCompleto ||
      !formData.cpf ||
      !formData.rua ||
      !formData.numero ||
      !formData.bairro ||
      !formData.cidade ||
      !formData.estado
    ) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const payload = {
      nomeCompleto: formData.nomeCompleto.trim(),
      cpf: formData.cpf.trim(),
      cep: formData.cep.trim(),
      rua: formData.rua.trim(),
      numero: formData.numero.trim(),
      complemento: formData.complemento.trim(),
      bairro: formData.bairro.trim(),
      cidade: formData.cidade.trim(),
      estado: formData.estado.trim(),
    };

    if (mode === "edit" && selectedContrato) {
      updateMutation.mutate({ id: selectedContrato.id, ...payload });
    } else {
      createMutation.mutate({ ...payload, isDefault: formData.isDefault });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isFormDisabled = !canUseContracts || mode === "view" || isSaving;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Contratos</h1>
            {(isLoading || isFetching) && (
              <Loader2 className="size-4 animate-spin text-primary" />
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            Cadastre diferentes dados e escolha quais serão usados como padrão
            nos contratos.
          </p>
        </div>
        <Button
          onClick={startCreate}
          disabled={!canUseContracts || mode === "create"}
        >
          <Plus className="size-4" /> Novos dados
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Dados cadastrados</CardTitle>
            <CardDescription>
              {contratos.length}{" "}
              {contratos.length === 1 ? "cadastro" : "cadastros"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : orderedContratos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum dado de contrato cadastrado.
              </p>
            ) : (
              orderedContratos.map(contrato => (
                <button
                  key={contrato.id}
                  type="button"
                  onClick={() => selectContrato(contrato.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedId === contrato.id && mode !== "create" ? "border-primary bg-accent" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-tight">
                      {contrato.nomeCompleto}
                    </span>
                    {contrato.isDefault && (
                      <Badge>
                        <Star className="size-3 fill-current" /> Padrão
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {contrato.cpf}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {contrato.cidade} - {contrato.estado}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {mode === "create"
                    ? "Novos dados de contrato"
                    : formData.nomeCompleto || "Dados do contrato"}
                </CardTitle>
                <CardDescription>
                  {mode === "view"
                    ? "Confira os dados selecionados."
                    : "Preencha os campos obrigatórios e salve."}
                </CardDescription>
              </div>
              {selectedContrato && mode === "view" && (
                <div className="flex gap-2">
                  {!selectedContrato.isDefault && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDefaultMutation.mutate({ id: selectedContrato.id })
                      }
                      disabled={
                        !canUseContracts || setDefaultMutation.isPending
                      }
                    >
                      <Star className="size-4" /> Definir como padrão
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setMode("edit")}
                    disabled={!canUseContracts}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteId(selectedContrato.id)}
                    disabled={!canUseContracts}
                    aria-label="Excluir"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === "create" && contratos.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleChange("isDefault", !formData.isDefault)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${formData.isDefault ? "border-primary bg-primary/5" : ""}`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded border ${formData.isDefault ? "border-primary bg-primary text-primary-foreground" : ""}`}
                  >
                    {formData.isDefault && <Check className="size-3.5" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      Usar estes dados como padrão
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Substitui o padrão atual após salvar.
                    </span>
                  </span>
                </button>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nomeCompleto">Nome completo *</Label>
                  <Input
                    id="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={e => handleChange("nomeCompleto", e.target.value)}
                    disabled={isFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={e => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    disabled={isFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="relative">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={e => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      disabled={isFormDisabled}
                    />
                    {isSearchingCep && (
                      <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-pulse text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="rua">Rua *</Label>
                  <Input
                    id="rua"
                    value={formData.rua}
                    onChange={e => handleChange("rua", e.target.value)}
                    disabled={isFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={e => handleChange("numero", e.target.value)}
                    disabled={isFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento}
                    onChange={e => handleChange("complemento", e.target.value)}
                    disabled={isFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={e => handleChange("bairro", e.target.value)}
                    disabled={isFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={e => handleChange("cidade", e.target.value)}
                    disabled={isFormDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado (UF) *</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={e =>
                      handleChange("estado", e.target.value.toUpperCase())
                    }
                    maxLength={2}
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              {mode !== "view" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!canUseContracts || isSaving}
                  >
                    {isSaving && <Loader2 className="size-4 animate-spin" />}{" "}
                    Salvar
                  </Button>
                  {(contratos.length > 0 || mode === "edit") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={cancelForm}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={open => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dados de contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Se este for o padrão, outro
              cadastro será escolhido automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteId && deleteMutation.mutate({ id: deleteId })
              }
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}{" "}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
