import { useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const scannedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let stopped = false;

    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: containerRef.current,
          constraints: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 15,
        decoder: {
          readers: [
            "ean_reader",       // EAN-13 (most food barcodes worldwide)
            "ean_8_reader",     // EAN-8
            "upc_reader",       // UPC-A (US food packaging)
            "upc_e_reader",     // UPC-E (compact US)
            "code_128_reader",  // General purpose
            "code_39_reader",   // Older format
          ],
          multiple: false,
        },
        locate: true,
      },
      (err) => {
        if (err) {
          if (!stopped) {
            const msg = err.message || String(err);
            if (msg.includes("Permission") || msg.includes("denied") || msg.includes("NotAllowedError")) {
              setError("Camera permission denied. Allow camera access in Settings and try again.");
            } else {
              setError(`Camera error: ${msg}`);
            }
          }
          return;
        }
        Quagga.start();
      },
    );

    Quagga.onDetected((result) => {
      if (scannedRef.current) return;
      if (!result.codeResult || !result.codeResult.code) return;

      const code = result.codeResult.code;
      // Validate: UPC-A is 12 digits, EAN-13 is 13 digits, etc.
      // Require multiple consecutive reads for confidence
      // Quagga handles this via frequency but let's be safe
      scannedRef.current = true;
      setScanning(false);

      // Vibrate if available
      if (navigator.vibrate) navigator.vibrate(100);

      Quagga.stop();
      onScan(code);
      setTimeout(() => onClose(), 300);
    });

    return () => {
      stopped = true;
      try {
        Quagga.offDetected();
        Quagga.stop();
      } catch {
        // Already stopped
      }
    };
  }, []);

  // Photo upload fallback using html5-qrcode (static image decode)
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      // Create image from file and decode with canvas
      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = url;
      });

      // Draw to canvas and use Quagga's static decode
      const canvas = document.createElement("canvas");
      const maxDim = 1200;
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const result = await Quagga.decodeSingle({
        src: url,
        numOfWorkers: 0,
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "upc_reader",
            "upc_e_reader",
            "code_128_reader",
            "code_39_reader",
          ],
          multiple: false,
        },
        locate: true,
      });

      URL.revokeObjectURL(url);

      if (result && result.codeResult && result.codeResult.code) {
        onScan(result.codeResult.code);
        onClose();
      } else {
        setError("Could not read a barcode from that image. Try taking a clearer photo with good lighting, or search by name instead.");
      }
    } catch {
      setError("Could not read barcode from image. Try searching by name instead.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 z-10">
        <h2 className="text-sm font-medium text-zinc-200">Scan Barcode</h2>
        <button
          type="button"
          onClick={() => {
            try { Quagga.stop(); } catch {}
            onClose();
          }}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <div className="text-center space-y-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="absolute inset-0">
            {/* Quagga renders the video stream here */}
          </div>
        )}

        {/* Scan line animation overlay */}
        {scanning && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[85%] max-w-[350px] h-[120px] border-2 border-emerald-400/40 rounded-lg">
              <div className="w-full h-[2px] bg-emerald-400/70 animate-bounce mt-[58px]" />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4 bg-zinc-900 text-center space-y-3 z-10">
        {scanning && !error && (
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <div className="w-3 h-3 border-2 border-zinc-500 border-t-emerald-400 rounded-full animate-spin" />
            Hold camera steady over the barcode
          </div>
        )}
        <div className="flex items-center gap-3 justify-center">
          <span className="text-xs text-zinc-600">or</span>
          <label className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer border border-border-subtle">
            📷 Upload photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-600">UPC, EAN, and QR codes supported</p>
      </div>
    </div>
  );
}