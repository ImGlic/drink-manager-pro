import React, { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { bip } from "@/hooks/useBarcodeScanner";

interface CameraScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (codigo: string) => void;
  /** Mantém a câmera aberta para ler vários itens em sequência. */
  continuo?: boolean;
  titulo?: string;
}

const FORMATOS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.ITF,
];

const mensagemErroCamera = (err: unknown) => {
  if (!window.isSecureContext) {
    return "A câmera só funciona com HTTPS. Acesse o sistema pelo endereço https://.";
  }
  const nome = (err as { name?: string })?.name ?? String(err);
  if (nome.includes("NotAllowed") || nome.includes("Permission")) {
    return "Permissão da câmera negada. Libere o acesso à câmera nas configurações do navegador.";
  }
  if (nome.includes("NotFound") || nome.includes("Overconstrained")) {
    return "Nenhuma câmera encontrada neste dispositivo.";
  }
  if (nome.includes("NotReadable")) {
    return "A câmera está sendo usada por outro aplicativo.";
  }
  return "Não foi possível iniciar a câmera.";
};

/**
 * Leitor de QR Code e código de barras pela câmera (celular/tablet/webcam).
 * Usa a API nativa BarcodeDetector quando disponível (Android/Chrome) e ZXing como fallback (iPhone).
 */
const CameraScanner: React.FC<CameraScannerProps> = ({ open, onOpenChange, onScan, continuo = false, titulo }) => {
  const elementId = `scanner-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const ultimoCodigo = useRef<{ codigo: string; em: number }>({ codigo: "", em: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [erro, setErro] = useState<string | null>(null);
  const [ultimoLido, setUltimoLido] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setUltimoLido(null);
    let cancelado = false;

    const iniciar = async () => {
      // espera o Dialog montar o elemento de vídeo
      await new Promise((r) => setTimeout(r, 150));
      if (cancelado || !document.getElementById(elementId)) return;

      const scanner = new Html5Qrcode(elementId, {
        formatsToSupport: FORMATOS,
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: (w, h) => ({ width: Math.floor(w * 0.85), height: Math.floor(Math.min(h * 0.6, w * 0.5)) }),
            aspectRatio: 4 / 3,
          },
          (texto) => {
            const agora = Date.now();
            // evita ler o mesmo código várias vezes seguidas
            if (texto === ultimoCodigo.current.codigo && agora - ultimoCodigo.current.em < 1500) return;
            ultimoCodigo.current = { codigo: texto, em: agora };
            bip();
            setUltimoLido(texto);
            onScanRef.current(texto.trim());
            if (!continuo) onOpenChange(false);
          },
          () => {
            /* frame sem código: ignorar */
          }
        );
      } catch (err) {
        if (!cancelado) setErro(mensagemErroCamera(err));
      }
    };

    iniciar();

    return () => {
      cancelado = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner
          .stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              /* já limpo */
            }
          });
      }
    };
  }, [open, continuo, elementId, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> {titulo ?? "Ler código"}
          </DialogTitle>
          <DialogDescription>
            Aponte a câmera para o código de barras ou QR Code.
            {continuo && " A câmera continua aberta para ler vários itens."}
          </DialogDescription>
        </DialogHeader>

        {erro ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CameraOff className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{erro}</p>
          </div>
        ) : (
          <div id={elementId} className="w-full overflow-hidden rounded-lg bg-black min-h-[240px]" />
        )}

        {ultimoLido && continuo && (
          <p className="text-sm text-center">
            Último lido: <span className="font-mono font-medium">{ultimoLido}</span>
          </p>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {continuo ? "Concluir" : "Cancelar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CameraScanner;
