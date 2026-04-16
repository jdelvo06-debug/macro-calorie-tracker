import { useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

// Validate barcode formats we accept
function isValidBarcode(code: string): boolean {
  // UPC-A: exactly 12 digits
  if (/^\d{12}$/.test(code)) return true;
  // EAN-13: exactly 13 digits
  if (/^\d{13}$/.test(code)) return true;
  // EAN-8: exactly 8 digits
  if (/^\d{8}$/.test(code)) return true;
  // UPC-E: exactly 6 or 8 digits
  if (/^\d{6}$/.test(code)) return true;
  // Code 128/39: alphanumeric 4+
  if (/^[A-Za-z0-9\- ]{4,20}$/.test(code)) return true;
  return false;
}

// EAN-13 check digit verification
function verifyEAN13(code: string): boolean {
  if (code.length !== 13) return true; // not EAN-13, skip check
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// UPC-A check digit verification
function verifyUPCA(code: string): boolean {
  if (code.length !== 12) return true; // not UPC-A, skip check
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [foundCode, setFoundCode] = useState<string | null>(null);
  const scannedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const recentCodes = useRef<Map<string, number>>(new Map());

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
      },
      (err) => {
        if (err) {
          if (!stopped) {
            const msg = err.message || String(err);
            if (msg.includes("Permission") || msg.includes("denied") || msg.includes("NotAllowedError")) {
              setError("Camera permission denied. Allow camera access in your browser settings and try again.");
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

      // Validate format
      if (!isValidBarcode(code)) return;

      // Verify check digits
      if (!verifyEAN13(code) || !verifyUPCA(code)) return;

      // Confirmation: require same code read at least 2 times within 1.5 seconds
      const now = Date.now();
      const recent = recentCodes.current;

      // Clean old entries (>3s)
      for (const [k, t] of recent) {
        if (now - t > 3000) recent.delete(k);
      }

      const count = (recent.get(code) || 0) + 1;
      recent.set(code, count);

      if (count < 2) return; // Need at least 2 reads to confirm

      // Confirmed!
      scannedRef.current = true;
      setScanning(false);
      setFoundCode(code);

      // Vibrate
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

      // Brief display of found code, then close
      setTimeout(() => {
        Quagga.stop().catch(() => {});
        onScan(code);
        onClose();
      }, 600);
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

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const url = URL.createObjectURL(file);

      // Quagga decodeSingle can take a URL directly
      const result = await Quagga.decodeSingle({
        src: url,
        numOfWorkers: 0,
        inputStream: {
          size: 1200,
        },
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

      if (result?.codeResult?.code && isValidBarcode(result.codeResult.code)) {
        const code = result.codeResult.code;
        if (verifyEAN13(code) && verifyUPCA(code)) {
          setFoundCode(code);
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
          setTimeout(() => {
            onScan(code);
            onClose();
          }, 400);
          return;
        }
      }

      setError("Couldn't read a barcode from that photo. Try better lighting or a straighter angle. You can also search by name.");
    } catch {
      setError("Photo decode failed. Try searching by name instead.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
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

      {/* Camera / Scanner View */}
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
          <div ref={containerRef} className="absolute inset-0" />
        )}

        {/* Scan zone overlay */}
        {scanning && !error && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark vignette outside scan zone */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Clear center scan zone */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[80%] max-w-[320px] h-[100px] relative">
                {/* Cut out the center (make it transparent) */}
                <div className="absolute inset-0 bg-black/0 rounded-lg" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)" }} />

                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />

                {/* Animated scan line */}
                <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce top-[50%]" />
              </div>
            </div>
          </div>
        )}

        {/* Success flash */}
        {foundCode && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center pointer-events-none">
            <div className="px-6 py-3 rounded-xl bg-zinc-900/90 border border-emerald-500/40">
              <p className="text-emerald-400 text-sm font-mono">{foundCode}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 bg-zinc-900 text-center space-y-3 z-10">
        {scanning && !error && (
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <div className="w-3 h-3 border-2 border-zinc-500 border-t-emerald-400 rounded-full animate-spin" />
            Hold steady — barcode in the green frame
          </div>
        )}
        <div className="flex items-center gap-3 justify-center">
          <span className="text-xs text-zinc-600">or</span>
          <label className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer border border-border-subtle">
            📷 Upload barcode photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-600">Supports UPC-A, EAN-13, EAN-8, Code-128</p>
      </div>
    </div>
  );
}