import { useEffect, useRef } from "react";

interface Options {
  /** Chamado quando um código completo é lido pelo leitor (BIP/coletor). */
  onScan: (codigo: string) => void;
  /** Desliga a escuta (ex.: quando um modal está aberto). */
  enabled?: boolean;
  /** Tamanho mínimo do código para ser considerado leitura. */
  minLength?: number;
  /** Intervalo máximo (ms) entre teclas. Leitores digitam < 30ms; humanos > 80ms. */
  maxIntervalMs?: number;
}

const isCampoEditavel = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

/**
 * Captura leitores de código de barras USB/Bluetooth em modo "teclado" (HID / keyboard wedge),
 * o padrão dos leitores de BIP e coletores. O leitor "digita" o código muito rápido e envia Enter.
 *
 * Quando o foco está num campo de texto, a leitura é ignorada aqui para não atrapalhar
 * a digitação: o campo de busca do PDV trata o Enter do leitor por conta própria.
 */
export function useBarcodeScanner({ onScan, enabled = true, minLength = 4, maxIntervalMs = 50 }: Options) {
  const buffer = useRef("");
  const ultimo = useRef(0);
  const callback = useRef(onScan);
  callback.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (isCampoEditavel(e.target)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const agora = performance.now();
      const intervalo = agora - ultimo.current;
      ultimo.current = agora;

      if (intervalo > maxIntervalMs) buffer.current = "";

      if (e.key === "Enter" || e.key === "Tab") {
        const codigo = buffer.current.trim();
        buffer.current = "";
        if (codigo.length >= minLength) {
          e.preventDefault();
          callback.current(codigo);
        }
        return;
      }

      if (e.key.length === 1) buffer.current += e.key;
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, minLength, maxIntervalMs]);
}

/** Bipe curto de confirmação (sem arquivo de áudio). */
export function bip(sucesso = true) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = sucesso ? 1800 : 300;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (sucesso ? 0.08 : 0.25));
    osc.onended = () => ctx.close();
    if (navigator.vibrate) navigator.vibrate(sucesso ? 40 : [80, 40, 80]);
  } catch {
    /* sem áudio disponível */
  }
}
