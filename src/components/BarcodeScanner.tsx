import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const containerId = "barcode-scanner";

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;

    let stopped = false;

    // Use wider config — no qrbox restriction for barcodes (let it use full viewfinder)
    const config = {
      fps: 15,
      // Don't restrict qrbox on mobile — barcodes need the full width
      // Only set qrbox on larger screens
      qrbox: undefined as unknown as { width: number; height: number },
      aspectRatio: 1.5,
      disableFlip: false,
    };

    // On wider screens, add a scan zone
    if (typeof window !== "undefined" && window.innerWidth > 500) {
      config.qrbox = { width: 350, height: 150 };
    }

    scanner
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Prevent double-fire
          if (scannedRef.current) return;
          scannedRef.current = true;
          setScanning(false);
          onScan(decodedText);
          // Vibrate if available
          if (navigator.vibrate) navigator.vibrate(100);
          // Auto-close after short delay
          setTimeout(() => {
            stopScanner();
            onClose();
          }, 500);
        },
        () => {
          // Ignore scan failures
        },
      )
      .catch((err) => {
        if (!stopped) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("Permission") || msg.includes("denied") || msg.includes("NotAllowedError")) {
            setError("Camera permission denied. Please allow camera access in your browser settings and try again.");
          } else {
            setError(`Camera error: ${msg}`);
          }
        }
      });

    return () => {
      stopped = true;
      stopScanner();
    };
  }, []);

  function stopScanner() {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
      scannerRef.current = null;
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const scanner = new Html5Qrcode("barcode-file-scan", {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
    });

    scanner
      .scanFile(file, true)
      .then((decoded) => {
        onScan(decoded);
        onClose();
      })
      .catch(() => {
        setError("Could not read a barcode from that image. Try a clearer photo or use the camera.");
      });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-200">Scan Barcode</h2>
        <button
          type="button"
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {error ? (
          <div className="text-center px-8 space-y-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div id={containerId} className="w-full max-w-md" />
        )}
      </div>

      <div className="px-4 py-4 bg-zinc-900 text-center space-y-3">
        {scanning && (
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <div className="w-3 h-3 border-2 border-zinc-500 border-t-emerald-400 rounded-full animate-spin" />
            Scanning... hold steady
          </div>
        )}
        <div className="flex items-center gap-4 justify-center">
          <span className="text-xs text-zinc-600">— or —</span>
        </div>
        <label className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer border border-border-subtle">
          📷 Upload photo of barcode
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        <p className="text-xs text-zinc-600">Supports UPC, EAN, and QR codes</p>
      </div>

      {/* Hidden div for file scan */}
      <div id="barcode-file-scan" className="hidden" />
    </div>
  );
}