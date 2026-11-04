import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileKey, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { formatCNPJ, mensagemErro, somenteDigitos } from "@/lib/format";
import {
  carregarConfigFiscal,
  enviarCertificado,
  listarCertificados,
  removerCertificado,
  salvarConfigFiscal,
  sincronizarEmpresaFiscal,
  type ConfigFiscal,
} from "@/services/baresService";

const diasAte = (data: string | null) => (data ? Math.ceil((new Date(data).getTime() - Date.now()) / 86_400_000) : 0);

const AbaFiscal: React.FC = () => {
  const { barAtivo } = useAuth();
  const bar = barAtivo!.bar;
  const queryClient = useQueryClient();
  const [cfg, setCfg] = useState<Partial<ConfigFiscal>>({});
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const { data: config } = useQuery({ queryKey: ["config-fiscal", bar.id], queryFn: () => carregarConfigFiscal(bar.id) });
  const { data: certificados = [] } = useQuery({
    queryKey: ["certificados", bar.id],
    queryFn: () => listarCertificados(bar.id),
  });
  useEffect(() => {
    if (config) setCfg(config);
  }, [config]);

  const ativo = certificados.find((c) => c.ativo);
  const pendencias = [
    somenteDigitos(bar.cnpj).length !== 14 && "CNPJ",
    !bar.razao_social && "Razão social",
    !bar.inscricao_estadual && "Inscrição estadual",
    (!bar.logradouro || !bar.numero || !bar.bairro) && "Endereço",
    somenteDigitos(bar.codigo_municipio).length !== 7 && "Código IBGE do município",
    !ativo && "Certificado A1",
    (!cfg.csc_id || !cfg.csc_token) && "CSC",
  ].filter(Boolean) as string[];

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarConfigFiscal(bar.id, cfg);
      queryClient.invalidateQueries({ queryKey: ["config-fiscal", bar.id] });
      toast.success("Configuração fiscal salva");
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao salvar"));
    } finally {
      setSalvando(false);
    }
  };

  const enviar = async () => {
    if (!arquivo || !senha) return toast.warning("Selecione o arquivo .pfx e informe a senha");
    setEnviando(true);
    try {
      const cert = await enviarCertificado(bar.id, arquivo, senha);
      toast.success(`Certificado de ${cert.titular} cadastrado (válido até ${new Date(cert.valido_ate!).toLocaleDateString("pt-BR")})`);
      setArquivo(null);
      setSenha("");
      queryClient.invalidateQueries({ queryKey: ["certificados", bar.id] });
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao enviar certificado"));
    } finally {
      setEnviando(false);
    }
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este certificado? A emissão de NFC-e para até cadastrar outro.")) return;
    try {
      await removerCertificado(bar.id, id);
      queryClient.invalidateQueries({ queryKey: ["certificados", bar.id] });
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  };

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      await salvarConfigFiscal(bar.id, cfg);
      const r = await sincronizarEmpresaFiscal(bar.id);
      toast.success(r.mensagem);
      queryClient.invalidateQueries({ queryKey: ["certificados", bar.id] });
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao sincronizar"));
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="space-y-4">
      {pendencias.length > 0 ? (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            Para emitir NFC-e falta: <strong>{pendencias.join(", ")}</strong>. Os dados cadastrais ficam na aba "Bar".
          </div>
        </div>
      ) : (
        <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Tudo pronto. Clique em "Sincronizar com provedor" após qualquer alteração fiscal.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="h-5 w-5" /> Certificado digital A1
          </CardTitle>
          <CardDescription>
            Arquivo .pfx ou .p12 do e-CNPJ do bar. O arquivo fica em armazenamento privado e a senha é guardada
            criptografada no servidor; ninguém consegue baixá-los pelo sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {certificados.map((c) => {
            const dias = diasAte(c.valido_ate);
            return (
              <div key={c.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium truncate">{c.titular}</p>
                  <p className="text-xs text-muted-foreground">
                    CNPJ {formatCNPJ(c.cnpj)} · emitido por {c.emissor}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {c.ativo && <Badge>Em uso</Badge>}
                    <Badge variant={dias <= 0 ? "destructive" : dias <= 30 ? "secondary" : "outline"}>
                      {dias <= 0
                        ? "Vencido"
                        : `Vence em ${new Date(c.valido_ate!).toLocaleDateString("pt-BR")} (${dias} dias)`}
                    </Badge>
                    <Badge variant="outline">{c.enviado_provedor ? "Enviado ao provedor" : "Não sincronizado"}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remover(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Arquivo (.pfx / .p12)</Label>
              <Input type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha do certificado</Label>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="off" />
            </div>
            <Button onClick={enviar} disabled={enviando || !arquivo}>
              {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {ativo ? "Substituir certificado" : "Enviar certificado"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NFC-e</CardTitle>
          <CardDescription>
            O CSC (Código de Segurança do Contribuinte) é gerado no site da SEFAZ do seu estado. Comece em homologação
            (testes sem valor fiscal) e só mude para produção depois de validar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ambiente</Label>
              <Select value={cfg.ambiente ?? "homologacao"} onValueChange={(v) => setCfg({ ...cfg, ambiente: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação (testes)</SelectItem>
                  <SelectItem value="producao">Produção (valor fiscal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Série</Label>
                <Input
                  value={cfg.serie_nfce ?? 1}
                  onChange={(e) => setCfg({ ...cfg, serie_nfce: Number(somenteDigitos(e.target.value)) || 1 })}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Próximo número</Label>
                <Input
                  value={cfg.proximo_numero_nfce ?? 1}
                  onChange={(e) => setCfg({ ...cfg, proximo_numero_nfce: Number(somenteDigitos(e.target.value)) || 1 })}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ID do CSC (token)</Label>
              <Input value={cfg.csc_id ?? ""} onChange={(e) => setCfg({ ...cfg, csc_id: e.target.value })} placeholder="000001" />
            </div>
            <div className="space-y-1.5">
              <Label>Código CSC</Label>
              <Input
                type="password"
                value={cfg.csc_token ?? ""}
                onChange={(e) => setCfg({ ...cfg, csc_token: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Informações complementares (opcional)</Label>
              <Textarea
                value={cfg.informacoes_adicionais ?? ""}
                onChange={(e) => setCfg({ ...cfg, informacoes_adicionais: e.target.value })}
                placeholder="Ex.: Tributos aproximados conforme Lei 12.741/2012"
              />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>
              Emitir NFC-e automaticamente em toda venda
              <span className="block text-xs text-muted-foreground">O operador ainda pode desligar na hora do pagamento.</span>
            </span>
            <Switch checked={!!cfg.emitir_automaticamente} onCheckedChange={(v) => setCfg({ ...cfg, emitir_automaticamente: v })} />
          </label>
          {cfg.ambiente === "producao" && (
            <p className="text-sm text-destructive">
              Atenção: em produção as notas têm valor fiscal e geram obrigações. Confirme com o contador.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={sincronizar} disabled={sincronizando}>
              <RefreshCw className={`h-4 w-4 mr-2 ${sincronizando ? "animate-spin" : ""}`} />
              Sincronizar com provedor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AbaFiscal;
