import React, { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buscarCep, type DadosBar } from "@/services/baresService";
import { formatCNPJ } from "@/lib/format";

export const REGIMES = [
  { valor: 1, nome: "Simples Nacional" },
  { valor: 4, nome: "MEI" },
  { valor: 2, nome: "Simples Nacional (excesso de sublimite)" },
  { valor: 3, nome: "Regime Normal (Lucro Presumido/Real)" },
];

export type ValoresBar = Required<
  Pick<
    DadosBar,
    | "nome"
    | "razao_social"
    | "cnpj"
    | "inscricao_estadual"
    | "inscricao_municipal"
    | "regime_tributario"
    | "telefone"
    | "email"
    | "cep"
    | "logradouro"
    | "numero"
    | "complemento"
    | "bairro"
    | "municipio"
    | "codigo_municipio"
    | "uf"
  >
>;

export const valoresVazios: ValoresBar = {
  nome: "",
  razao_social: "",
  cnpj: "",
  inscricao_estadual: "",
  inscricao_municipal: "",
  regime_tributario: 1,
  telefone: "",
  email: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  municipio: "",
  codigo_municipio: "",
  uf: "",
};

interface Props {
  valores: ValoresBar;
  onChange: (v: ValoresBar) => void;
  desabilitado?: boolean;
}

const Campo: React.FC<{ label: string; children: React.ReactNode; className?: string; dica?: string }> = ({
  label,
  children,
  className,
  dica,
}) => (
  <div className={`space-y-1.5 ${className ?? ""}`}>
    <Label>{label}</Label>
    {children}
    {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
  </div>
);

const FormDadosBar: React.FC<Props> = ({ valores, onChange, desabilitado }) => {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const set = <K extends keyof ValoresBar>(k: K, v: ValoresBar[K]) => onChange({ ...valores, [k]: v });

  const consultarCep = async () => {
    setBuscandoCep(true);
    try {
      const end = await buscarCep(valores.cep ?? "");
      if (end) onChange({ ...valores, ...end });
    } finally {
      setBuscandoCep(false);
    }
  };

  return (
    <fieldset disabled={desabilitado} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nome do bar (fantasia) *" className="sm:col-span-2">
          <Input value={valores.nome ?? ""} onChange={(e) => set("nome", e.target.value)} placeholder="Whiskeria do Centro" required />
        </Campo>
        <Campo label="Razão social">
          <Input value={valores.razao_social ?? ""} onChange={(e) => set("razao_social", e.target.value)} />
        </Campo>
        <Campo label="CNPJ">
          <Input
            value={formatCNPJ(valores.cnpj)}
            onChange={(e) => set("cnpj", e.target.value)}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
          />
        </Campo>
        <Campo label="Inscrição estadual" dica="Obrigatória para emitir NFC-e">
          <Input value={valores.inscricao_estadual ?? ""} onChange={(e) => set("inscricao_estadual", e.target.value)} />
        </Campo>
        <Campo label="Regime tributário">
          <Select
            value={String(valores.regime_tributario ?? 1)}
            onValueChange={(v) => set("regime_tributario", Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIMES.map((r) => (
                <SelectItem key={r.valor} value={String(r.valor)}>
                  {r.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Telefone">
          <Input value={valores.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} inputMode="tel" />
        </Campo>
        <Campo label="E-mail">
          <Input type="email" value={valores.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Campo>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <Campo label="CEP" className="sm:col-span-2">
          <div className="flex gap-2">
            <Input
              value={valores.cep ?? ""}
              onChange={(e) => set("cep", e.target.value)}
              onBlur={consultarCep}
              inputMode="numeric"
              placeholder="00000-000"
            />
            <Button type="button" variant="outline" size="icon" onClick={consultarCep} disabled={buscandoCep}>
              {buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </Campo>
        <Campo label="Logradouro" className="sm:col-span-4">
          <Input value={valores.logradouro ?? ""} onChange={(e) => set("logradouro", e.target.value)} />
        </Campo>
        <Campo label="Número" className="sm:col-span-1">
          <Input value={valores.numero ?? ""} onChange={(e) => set("numero", e.target.value)} />
        </Campo>
        <Campo label="Complemento" className="sm:col-span-2">
          <Input value={valores.complemento ?? ""} onChange={(e) => set("complemento", e.target.value)} />
        </Campo>
        <Campo label="Bairro" className="sm:col-span-3">
          <Input value={valores.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} />
        </Campo>
        <Campo label="Município" className="sm:col-span-3">
          <Input value={valores.municipio ?? ""} onChange={(e) => set("municipio", e.target.value)} />
        </Campo>
        <Campo label="UF" className="sm:col-span-1">
          <Input value={valores.uf ?? ""} maxLength={2} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
        </Campo>
        <Campo label="Cód. IBGE" className="sm:col-span-2" dica="Preenchido pelo CEP">
          <Input value={valores.codigo_municipio ?? ""} onChange={(e) => set("codigo_municipio", e.target.value)} inputMode="numeric" />
        </Campo>
      </div>
    </fieldset>
  );
};

export default FormDadosBar;
