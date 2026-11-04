/**
 * Impressão de cupons em impressora térmica.
 *
 * Conexões suportadas:
 *  - "navegador": usa o driver instalado (Windows/Android/iOS). Funciona com qualquer impressora
 *    instalada no sistema. Configure o papel como 80mm (ou 58mm) e margens zero no driver.
 *  - "usb": WebUSB, envia ESC/POS direto (Chrome/Edge no Android e desktop sem driver de impressora).
 *  - "serial": Web Serial, para impressoras USB que criam uma porta COM (Elgin, Bematech, Daruma).
 *  - "bluetooth": Web Bluetooth BLE, para mini impressoras portáteis de 58mm (Chrome Android).
 *
 * A configuração fica neste dispositivo (cada caixa/celular tem sua impressora).
 */
import { cupomParaEscPos, cupomParaHtml, montarCupom, type CupomDados } from "./cupom";

export type TipoConexao = "navegador" | "usb" | "serial" | "bluetooth";

export interface ConfigImpressora {
  conexao: TipoConexao;
  largura: 58 | 80;
  baudRate: number;
  cortarPapel: boolean;
  abrirGaveta: boolean;
  imprimirAutomatico: boolean;
  vias: number;
  rodape: string;
}

const CONFIG_KEY = "dmp:impressora";

export const CONFIG_PADRAO: ConfigImpressora = {
  conexao: "navegador",
  largura: 80,
  baudRate: 9600,
  cortarPapel: true,
  abrirGaveta: false,
  imprimirAutomatico: true,
  vias: 1,
  rodape: "Obrigado pela preferência!",
};

export function lerConfigImpressora(): ConfigImpressora {
  try {
    const salvo = localStorage.getItem(CONFIG_KEY);
    return salvo ? { ...CONFIG_PADRAO, ...JSON.parse(salvo) } : CONFIG_PADRAO;
  } catch {
    return CONFIG_PADRAO;
  }
}

export function salvarConfigImpressora(config: ConfigImpressora) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* armazenamento indisponível */
  }
}

export const suporteConexao: Record<TipoConexao, () => boolean> = {
  navegador: () => true,
  usb: () => typeof navigator !== "undefined" && "usb" in navigator,
  serial: () => typeof navigator !== "undefined" && "serial" in navigator,
  bluetooth: () => typeof navigator !== "undefined" && "bluetooth" in navigator,
};

// ---------------------------------------------------------------------------
// Tipos mínimos das APIs Web USB / Serial / Bluetooth (evita dependências extras)
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyNavigator = Navigator & { usb?: any; serial?: any; bluetooth?: any };
const nav = () => navigator as AnyNavigator;

interface Transporte {
  escrever(dados: Uint8Array): Promise<void>;
}

// --------------------------- USB --------------------------------------------
let usbAtual: { device: any; endpoint: number } | null = null;

async function abrirUsb(device: any) {
  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const ep = alt.endpoints.find((e: any) => e.direction === "out" && e.type === "bulk");
      if (ep) {
        try {
          await device.claimInterface(iface.interfaceNumber);
        } catch {
          /* pode já estar reivindicada */
        }
        usbAtual = { device, endpoint: ep.endpointNumber };
        return usbAtual;
      }
    }
  }
  throw new Error("A impressora USB não expõe um endpoint de saída compatível.");
}

const transporteUsb: Transporte = {
  async escrever(dados) {
    if (!usbAtual) {
      const [device] = await nav().usb.getDevices();
      if (!device) throw new Error("Nenhuma impressora USB pareada. Conecte em Configurações > Impressora.");
      await abrirUsb(device);
    }
    const { device, endpoint } = usbAtual!;
    for (let i = 0; i < dados.length; i += 4096) {
      await device.transferOut(endpoint, dados.slice(i, i + 4096));
    }
  },
};

// --------------------------- SERIAL -----------------------------------------
let portaSerial: any = null;

const transporteSerial = (baudRate: number): Transporte => ({
  async escrever(dados) {
    if (!portaSerial) {
      const [porta] = await nav().serial.getPorts();
      if (!porta) throw new Error("Nenhuma porta serial pareada. Conecte em Configurações > Impressora.");
      portaSerial = porta;
    }
    if (!portaSerial.writable) await portaSerial.open({ baudRate });
    const writer = portaSerial.writable.getWriter();
    try {
      await writer.write(dados);
    } finally {
      writer.releaseLock();
    }
  },
});

// --------------------------- BLUETOOTH --------------------------------------
// Serviços BLE usados pelas mini impressoras térmicas mais comuns (genéricas/chinesas, Knup, Goojprt, MTP).
const SERVICOS_BLE = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
];
let caracteristicaBle: any = null;
let dispositivoBle: any = null;

async function conectarCaracteristica(device: any) {
  const server = await device.gatt.connect();
  const servicos = await server.getPrimaryServices();
  for (const servico of servicos) {
    const caracteristicas = await servico.getCharacteristics();
    const c = caracteristicas.find((x: any) => x.properties.write || x.properties.writeWithoutResponse);
    if (c) {
      caracteristicaBle = c;
      return c;
    }
  }
  throw new Error("Impressora Bluetooth sem canal de escrita compatível.");
}

const transporteBluetooth: Transporte = {
  async escrever(dados) {
    if (!dispositivoBle) throw new Error("Impressora Bluetooth não conectada. Conecte em Configurações > Impressora.");
    if (!dispositivoBle.gatt.connected || !caracteristicaBle) await conectarCaracteristica(dispositivoBle);
    const c = caracteristicaBle;
    for (let i = 0; i < dados.length; i += 180) {
      const parte = dados.slice(i, i + 180);
      if (c.properties.writeWithoutResponse) await c.writeValueWithoutResponse(parte);
      else await c.writeValue(parte);
    }
  },
};

/**
 * Abre o seletor do navegador para escolher a impressora (precisa de clique do usuário).
 * Retorna o nome do dispositivo conectado.
 */
export async function conectarImpressora(conexao: TipoConexao, baudRate = 9600): Promise<string> {
  switch (conexao) {
    case "usb": {
      const device = await nav().usb.requestDevice({ filters: [] });
      await abrirUsb(device);
      return device.productName || "Impressora USB";
    }
    case "serial": {
      portaSerial = await nav().serial.requestPort();
      await portaSerial.open({ baudRate });
      return "Porta serial";
    }
    case "bluetooth": {
      dispositivoBle = await nav().bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: SERVICOS_BLE,
      });
      await conectarCaracteristica(dispositivoBle);
      return dispositivoBle.name || "Impressora Bluetooth";
    }
    default:
      return "Impressora do sistema";
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// --------------------------- NAVEGADOR --------------------------------------
async function imprimirHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise<void>((resolve) => {
    const imgs = Array.from(doc.images);
    if (imgs.every((i) => i.complete)) return resolve();
    let pendentes = imgs.length;
    imgs.forEach((i) => (i.onload = i.onerror = () => --pendentes === 0 && resolve()));
    setTimeout(resolve, 1500);
  });
  iframe.contentWindow!.focus();
  iframe.contentWindow!.print();
  setTimeout(() => iframe.remove(), 2000);
}

/** Imprime um cupom com a configuração deste dispositivo. */
export async function imprimirCupom(dados: CupomDados, config = lerConfigImpressora()) {
  const blocos = montarCupom({ ...dados, rodape: dados.rodape ?? config.rodape });

  if (config.conexao === "navegador") {
    await imprimirHtml(await cupomParaHtml(blocos, config.largura));
    return;
  }

  const bytes = cupomParaEscPos(blocos, {
    colunas: config.largura === 80 ? 48 : 32,
    cortar: config.cortarPapel,
    abrirGaveta: config.abrirGaveta,
  });
  const transporte =
    config.conexao === "usb"
      ? transporteUsb
      : config.conexao === "serial"
      ? transporteSerial(config.baudRate)
      : transporteBluetooth;

  for (let via = 0; via < Math.max(1, config.vias); via++) {
    await transporte.escrever(bytes);
  }
}

export async function imprimirTeste(config: ConfigImpressora, nomeBar: string) {
  await imprimirCupom(
    {
      bar: { nome: nomeBar },
      venda: {
        numero: 0,
        data: new Date(),
        operador: "Teste",
        itens: [
          { nome: "Cerveja Long Neck", quantidade: 2, preco_unitario: 12, subtotal: 24, codigo: "7891234567890" },
          { nome: "Dose de Whisky 12 anos", quantidade: 1, preco_unitario: 35, subtotal: 35 },
        ],
        subtotal: 59,
        desconto: 0,
        total: 59,
        troco: 1,
        pagamentos: [{ forma: "dinheiro", valor: 60 }],
      },
      rodape: "Teste de impressão OK",
    },
    config
  );
}
