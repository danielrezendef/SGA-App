import { useAppAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WeddingLayout from "@/components/WeddingLayout";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, Mail, User, Lock, FileText, CalendarDays, CheckCircle2, AlertCircle, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Perfil() {
  const { user, setUser } = useAppAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const generateUploadUrlMutation = trpc.auth.generateProfilePhotoUploadUrl.useMutation();
  const uploadPhotoMutation = trpc.auth.uploadProfilePhoto.useMutation();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();
  const changePasswordMutation = trpc.auth.changePassword.useMutation();
  const updateContratoAutomaticoMutation = trpc.auth.updateContratoAutomatico.useMutation();
  const calendarStatus = trpc.googleCalendar.status.useQuery();
  const calendarList = trpc.googleCalendar.calendars.useQuery(undefined, {
    enabled: Boolean(calendarStatus.data?.connected),
  });
  const calendarAuthorizationMutation = trpc.googleCalendar.authorizationUrl.useMutation();
  const calendarSelectionMutation = trpc.googleCalendar.selectCalendar.useMutation({
    onSuccess: async selected => {
      await calendarStatus.refetch();
      toast.success(`Eventos serão gravados em “${selected.name}”.`);
    },
    onError: error => toast.error(error.message),
  });
  const calendarDisconnectMutation = trpc.googleCalendar.disconnect.useMutation({
    onSuccess: async () => {
      await calendarStatus.refetch();
      await calendarList.refetch();
      toast.success("Google Agenda desconectado.");
    },
    onError: error => toast.error(error.message),
  });

  const [gerarContratoAutomaticamente, setGerarContratoAutomaticamente] = useState(
    Boolean(user?.gerarContratoAutomaticamente ?? false)
  );

  const selectedCalendarId = calendarStatus.data?.calendarId === "primary"
    ? calendarList.data?.find(calendar => calendar.primary)?.id
    : calendarStatus.data?.calendarId;

  useEffect(() => {
    setGerarContratoAutomaticamente(Boolean(user?.gerarContratoAutomaticamente ?? false));
  }, [user?.gerarContratoAutomaticamente]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("googleCalendar");
    if (!result) return;
    if (result === "connected") {
      toast.success("Google Agenda conectado com sucesso.");
      void calendarStatus.refetch();
    } else if (result === "cancelled") {
      toast.info("Conexão com Google Agenda cancelada.");
    } else {
      toast.error("Não foi possível conectar o Google Agenda.");
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const handleConnectGoogleCalendar = async () => {
    try {
      const { url } = await calendarAuthorizationMutation.mutateAsync();
      window.location.assign(url);
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível iniciar a conexão com o Google Agenda.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
      });
      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao atualizar perfil");
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });
      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      let errorMessage = "Não foi possível alterar a senha.";

      try {
        // Caso venha como string JSON
        const parsed =
          typeof error?.message === "string" &&
            (error.message.startsWith("[") || error.message.startsWith("{"))
            ? JSON.parse(error.message)
            : error?.message;

        // Caso seja um array de erros
        if (Array.isArray(parsed) && parsed.length > 0) {
          errorMessage = parsed.map((item) => item.message).filter(Boolean).join("\n");
        }
        // Caso venha um único objeto com message
        else if (parsed?.message) {
          errorMessage = parsed.message;
        }
        // Caso venha uma string simples
        else if (typeof error?.message === "string" && error.message.trim()) {
          errorMessage = error.message;
        }
      } catch {
        // fallback silencioso
      }

      toast.error(errorMessage);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida (JPG, PNG, GIF)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // Gerar URL de upload
      const uploadUrlResponse = await generateUploadUrlMutation.mutateAsync({
        fileName: file.name,
        contentType: file.type,
      });

      if (!uploadUrlResponse.success || !uploadUrlResponse.uploadUrl) {
        toast.error("Erro ao gerar URL de upload");
        return;
      }

      // Upload do arquivo para S3
      const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        console.error("Upload failed:", uploadResponse.status, uploadResponse.statusText);
        toast.error(`Erro ao fazer upload: ${uploadResponse.statusText}`);
        return;
      }

      // Extrair URL da foto (remover query string)
      const photoUrl = uploadUrlResponse.uploadUrl.split("?")[0];

      // Atualizar perfil com URL da foto
      await uploadPhotoMutation.mutateAsync({
        photoUrl: photoUrl,
      });

      toast.success("Foto atualizada com sucesso!");
    } catch (error: any) {
      console.error("Photo upload error:", error);
      toast.error(error?.message || "Erro ao processar a imagem");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleToggleContratoAutomatico = async (checked: boolean) => {
    const previousValue = Boolean(user?.gerarContratoAutomaticamente ?? false);

    setGerarContratoAutomaticamente(checked);
    setUser(user ? { ...user, gerarContratoAutomaticamente: checked } : user);

    try {
      await updateContratoAutomaticoMutation.mutateAsync({ gerarContratoAutomaticamente: checked });
      toast.success("Configuração salva com sucesso.");
    } catch (error: any) {
      setGerarContratoAutomaticamente(previousValue);
      setUser(user ? { ...user, gerarContratoAutomaticamente: previousValue } : user);
      toast.error(error?.message || "Não foi possível salvar a configuração.");
    }
  };

  if (!user) {
    return (
      <WeddingLayout>
        <div className="container max-w-2xl py-8">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </WeddingLayout>
    );
  }

  return (
    <WeddingLayout>
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground">Visualize e edite suas informações pessoais</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Configuração de contrato
            </CardTitle>
            <CardDescription>
              Controle como o sistema avança o fluxo após confirmar o orçamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="gerar-contrato-automaticamente">Emitir contrato automaticamente ao confirmar orçamento</Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativado, o sistema cria o contrato automaticamente após o preenchimento dos dados de cobrança.
                </p>
              </div>
              <Switch
                id="gerar-contrato-automaticamente"
                checked={gerarContratoAutomaticamente}
                onCheckedChange={handleToggleContratoAutomatico}
                disabled={updateContratoAutomaticoMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Google Agenda
            </CardTitle>
            <CardDescription>
              Adicione automaticamente à sua agenda os eventos confirmados pelo pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {calendarStatus.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Verificando conexão...
              </div>
            ) : !calendarStatus.data?.configured ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <AlertCircle className="mt-0.5 w-5 h-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">Integração ainda não configurada no servidor</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure as credenciais OAuth do Google Calendar para liberar a conexão.
                  </p>
                </div>
              </div>
            ) : calendarStatus.data.connected ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium">Google Agenda conectado</p>
                      <p className="text-sm text-muted-foreground">
                        Escolha abaixo em qual agenda os novos eventos serão gravados.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => calendarDisconnectMutation.mutate()}
                    disabled={calendarDisconnectMutation.isPending}
                  >
                    {calendarDisconnectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Unplug className="w-4 h-4 mr-2" />
                    )}
                    Desconectar
                  </Button>
                </div>

                {calendarList.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando agendas...
                  </div>
                ) : calendarList.error ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {calendarList.error.message}
                    </p>
                    <Button type="button" variant="outline" onClick={handleConnectGoogleCalendar}>
                      Reconectar
                    </Button>
                  </div>
                ) : (
                  <div className="max-w-xl space-y-2">
                    <Label htmlFor="google-calendar-selection">Agenda para sincronização</Label>
                    <Select
                      value={selectedCalendarId}
                      onValueChange={calendarId => calendarSelectionMutation.mutate({ calendarId })}
                      disabled={calendarSelectionMutation.isPending || !calendarList.data?.length}
                    >
                      <SelectTrigger id="google-calendar-selection">
                        <SelectValue placeholder="Selecione uma agenda" />
                      </SelectTrigger>
                      <SelectContent>
                        {calendarList.data?.map(calendar => (
                          <SelectItem key={calendar.id} value={calendar.id}>
                            {calendar.name}{calendar.primary ? " (principal)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Apenas agendas em que você pode criar e editar eventos são exibidas.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Autorize o SGA App e depois escolha em qual agenda os eventos serão gravados.
                </p>
                <Button
                  type="button"
                  onClick={handleConnectGoogleCalendar}
                  disabled={calendarAuthorizationMutation.isPending}
                >
                  {calendarAuthorizationMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Conectar Google Agenda
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Foto de Perfil */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>
              Atualize sua foto de perfil (máximo 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt="Foto de perfil"
                  className="w-20 h-20 rounded-full object-cover border-2 border-champagne"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-champagne/40 flex items-center justify-center">
                  <User className="w-10 h-10 text-gold" />
                </div>
              )}
              <div className="flex-1">
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingPhoto}
                    onClick={() => document.getElementById("photo-upload")?.click()}
                    className="w-full"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Foto
                      </>
                    )}
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Informações Pessoais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Atualize seus dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 pt-4">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-primary hover:bg-gold/90 text-primary-foreground"
                >
                  Editar Perfil
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="bg-primary hover:bg-gold/90 text-primary-foreground"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: user.name || "",
                        email: user.email || "",
                      });
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Mantenha sua conta segura alterando sua senha regularmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  required
                  className="mt-1"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-primary hover:bg-gold/90 text-primary-foreground"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </WeddingLayout>
  );
}
