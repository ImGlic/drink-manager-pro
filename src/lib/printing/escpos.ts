/**
 * Encoder ESC/POS (padrão Epson), compatível com a maioria das impressoras térmicas
 * vendidas no Brasil: Elgin i7/i8/i9, Bematech MP-4200, Epson TM-T20, Tanca, Daruma, Knup,
 * e as mini impressoras Bluetooth de 58mm.
 */
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Remove acentos e caracteres fora do ASCII (evita "lixo" em impressoras sem a code page certa). */
export const paraAscii = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");

export class EscPos {
  private bytes: number[] = [];

  constructor(public readonly colunas: number) {}

  private push(...b: number[]) {
    for (const x of b) this.bytes.push(x);
    return this;
  }

  init() {
    return this.push(ESC, 0x40);
  }

  align(a: "left" | "center" | "right") {
    return this.push(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
  }

  bold(on: boolean) {
    return this.push(ESC, 0x45, on ? 1 : 0);
  }

  /** Multiplicador de largura/altura (1 a 8). */
  size(largura = 1, altura = 1) {
    return this.push(GS, 0x21, ((largura - 1) << 4) | (altura - 1));
  }

  text(texto: string) {
    for (const ch of paraAscii(texto)) this.bytes.push(ch.charCodeAt(0));
    return this;
  }

  line(texto = "") {
    return this.text(texto).push(LF);
  }

  feed(linhas = 1) {
    return this.push(ESC, 0x64, linhas);
  }

  /** Corte parcial com avanço de papel. */
  cut() {
    return this.push(GS, 0x56, 0x42, 0x00);
  }

  /** Pulso para abrir a gaveta de dinheiro (conector RJ11 da impressora). */
  abrirGaveta() {
    return this.push(ESC, 0x70, 0x00, 0x19, 0xfa);
  }

  /** QR Code nativo da impressora (GS ( k). */
  qrcode(dados: string, tamanho = 6) {
    const conteudo = Array.from(paraAscii(dados)).map((c) => c.charCodeAt(0));
    const len = conteudo.length + 3;
    this.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // modelo 2
    this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, tamanho); // tamanho do módulo
    this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31); // correção de erro M
    this.push(GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30, ...conteudo);
    this.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30); // imprimir
    return this;
  }

  encode() {
    return new Uint8Array(this.bytes);
  }
}
