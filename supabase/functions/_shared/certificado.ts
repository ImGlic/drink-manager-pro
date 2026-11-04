// Leitura e validação de certificado A1 (PKCS#12).
// @deno-types="npm:@types/node-forge@1.3.11"
import forge from "npm:node-forge@1.3.1";
import { HttpError } from "./comum.ts";

const OID_CNPJ_ICP_BRASIL = "2.16.76.1.3.3";

export function lerCertificado(pfxBase64: string, senha: string) {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const der = forge.util.decode64(pfxBase64);
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), senha);
  } catch {
    throw new HttpError(400, "Não foi possível abrir o certificado. Verifique o arquivo e a senha.");
  }

  const chaves = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
  if (chaves.length === 0) throw new HttpError(400, "O arquivo não contém a chave privada (não é um certificado A1).");

  const certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [])
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => !!c);

  // certificado do titular = o que não é autoridade certificadora
  const cert =
    certs.find((c) => {
      const bc = c.getExtension("basicConstraints") as { cA?: boolean } | null;
      return !bc?.cA;
    }) ?? certs[0];
  if (!cert) throw new HttpError(400, "Certificado não encontrado no arquivo.");

  const cn = String(cert.subject.getField("CN")?.value ?? "");
  let cnpj = cn.match(/:(\d{14})$/)?.[1] ?? "";

  if (!cnpj) {
    // ICP-Brasil: CNPJ no subjectAltName (otherName 2.16.76.1.3.3)
    const san = cert.getExtension("subjectAltName") as { altNames?: { type: number; value: unknown }[] } | null;
    const raw = JSON.stringify(san ?? {});
    if (raw.includes(OID_CNPJ_ICP_BRASIL)) cnpj = raw.match(/(\d{14})/)?.[1] ?? "";
  }

  return {
    titular: cn.replace(/:\d{11,14}$/, ""),
    cnpj,
    emissor: String(cert.issuer.getField("CN")?.value ?? ""),
    numero_serie: cert.serialNumber,
    valido_de: cert.validity.notBefore.toISOString(),
    valido_ate: cert.validity.notAfter.toISOString(),
  };
}

