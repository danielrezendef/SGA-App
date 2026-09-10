import { useState } from "react";
import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppAuth } from "@/contexts/AuthContext";
import { useDocumentLogo } from "@/hooks/useDocumentLogo";
import { prepareDocumentLogo } from "@/lib/documentLogo";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DocumentLogoSettings() {
  const { user, setUser } = useAppAuth();
  const utils = trpc.useUtils();
  const { logo, loading } = useDocumentLogo();
  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const save = trpc.documentLogo.save.useMutation();
  const remove = trpc.documentLogo.remove.useMutation();
  const busy = processing || save.isPending || remove.isPending;

  function updateKey(documentLogoKey: string | null) {
    if (user) setUser({ ...user, documentLogoKey });
    utils.auth.me.setData(undefined, previous =>
      previous ? { ...previous, documentLogoKey } : previous
    );
    setSelected(null);
  }

  async function saveLogo() {
    if (!selected) return;
    try {
      const result = await save.mutateAsync({
        contentType: "image/png",
        data: selected.split(",")[1],
      });
      utils.documentLogo.get.setData(
        { key: result.documentLogoKey },
        result.logoData
      );
      updateKey(result.documentLogoKey);
      toast.success("Logotipo salva com sucesso.");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível salvar a logotipo.");
    }
  }

  async function removeLogo() {
    try {
      await remove.mutateAsync();
      updateKey(null);
      toast.success(
        "Logotipo removida. Os documentos voltarão a usar a logo padrão."
      );
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível remover a logotipo.");
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Logotipo
        </CardTitle>
        <CardDescription>
          Defina a logotipo que será utilizada nos documentos e PDFs emitidos
          pelo sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-32 items-center justify-center rounded-md border bg-muted/20 p-3">
          {loading && !selected ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <img
              src={selected ?? logo}
              alt="Logotipo dos documentos"
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {selected
            ? "Prévia da nova logotipo. Salve para aplicar."
            : user?.documentLogoKey
              ? "Logotipo personalizada"
              : "Logotipo padrão do SGA App"}
        </p>
        <div className="space-y-2">
          <Label htmlFor="document-logo">
            {user?.documentLogoKey ? "Alterar logotipo" : "Selecionar logotipo"}
          </Label>
          <Input
            id="document-logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={async event => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setProcessing(true);
              try {
                setSelected(await prepareDocumentLogo(file));
              } catch (error: any) {
                toast.error(error.message);
              } finally {
                setProcessing(false);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            PNG, JPG/JPEG ou WEBP, até 5 MB. A proporção será preservada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveLogo} disabled={!selected || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            logotipo
          </Button>
          {selected && (
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
          )}
          {user?.documentLogoKey && (
            <Button variant="outline" onClick={removeLogo} disabled={busy}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remover logotipo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
