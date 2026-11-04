import React, { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import FormDadosBar, { valoresVazios, type ValoresBar } from "./FormDadosBar";
import { useAuth } from "@/context/AuthContext";
import { atualizarBar, enviarLogo } from "@/services/baresService";
import { mensagemErro } from "@/lib/format";

const AbaBar: React.FC = () => {
  const { barAtivo, recarregarBares } = useAuth();
  const bar = barAtivo!.bar;
  const [valores, setValores] = useState<ValoresBar>(valoresVazios);
  const [negativo, setNegativo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const v = { ...valoresVazios };
    (Object.keys(v) as (keyof ValoresBar)[]).forEach((k) => {
      (v as Record<string, unknown>)[k] = bar[k] ?? valoresVazios[k];
    });
    setValores(v);
    setNegativo(bar.permitir_estoque_negativo);
  }, [bar]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valores.nome?.trim()) return toast.warning("Informe o nome do bar.");
    setSalvando(true);
    try {
      await atualizarBar(bar.id, { ...valores, permitir_estoque_negativo: negativo });
      await recarregarBares();
      toast.success("Dados do bar salvos");
    } catch (err) {
      toast.error(mensagemErro(err, "Erro ao salvar"));
    } finally {
      setSalvando(false);
    }
  };

  const trocarLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 1024 * 1024) return toast.warning("Use uma imagem de até 1 MB.");
    try {
      const url = await enviarLogo(bar.id, arquivo);
      await atualizarBar(bar.id, { logo_url: url });
      await recarregarBares();
      toast.success("Logo atualizada");
    } catch (err) {
      toast.error(mensagemErro(err, "Erro ao enviar logo"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do bar</CardTitle>
        <CardDescription>Esses dados aparecem no cupom e são usados como emitente da NFC-e.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-6">
          <div className="flex items-center gap-4">
            {bar.logo_url ? (
              <img src={bar.logo_url} alt="Logo" className="h-16 w-16 rounded-full object-cover border" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted" />
            )}
            <Button type="button" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" /> Trocar logo
                <input type="file" accept="image/*" className="hidden" onChange={trocarLogo} />
              </label>
            </Button>
          </div>

          <FormDadosBar valores={valores} onChange={setValores} desabilitado={salvando} />

          <label className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
            <span>
              Permitir vender sem estoque
              <span className="block text-xs text-muted-foreground">
                Útil enquanto o estoque ainda não foi conferido. O estoque fica negativo.
              </span>
            </span>
            <Switch checked={negativo} onCheckedChange={setNegativo} />
          </label>

          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AbaBar;
