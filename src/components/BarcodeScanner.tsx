import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner";

  useEffect(() => {
    // Create scanner with barcode formats (not just QR)
    const scanner = new Html5Qrcode(containerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,     // Most common food barcode (US/EU)
        Html5QrcodeSupportedFormats.EAN_8,      // Shorter barcode
        Html5QrcodeSupportedFormats.UPC_A,       // US standard
        Html5QrcodeSupportedFormats.UPC_E,       // US compact
        Html5QrcodeSupportedFormats.CODE_128,    // General purpose
        Html5QrcodeSupportedFormats.CODE_39,     // Older format
        Html5QrcodeSupportedFormats.QR_CODE,     // Keep QR too
      ],
      verbose: false,
    });
    scannerRef.current = scanner;

    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" }, // back camera
        {
          fps: 15,
          qrbox: function (viewfinderWidth, viewfinderHeight) {
            // Wide rectangle for barcodes (not square like QR)
            const width = Math.min(viewfinderWidth * 0.85, 350);
            const height = Math.min(viewfinderHeight * 0.3, 120);
            return { width, height };
          },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Debounce: ignore same barcode within 3 seconds
          if (decodedText === lastScan) return;
          setLastScan(decodedText);
          onScan(decodedText);
          // Auto-close after successful scan
          stopScanner();
          onClose();
        },
        () => {
          // Ignore scan failures (no barcode found in frame)
        },
      )
      .catch((err) => {
        if (!stopped) {
          setError(err instanceof Error ? err.message : "Camera access denied. Check permissions.");
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
        .catch(() => {
          // Already stopped
        });
      scannerRef.current = null;
    }
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

      <div className="flex-1 flex items-center justify-center">
        {error ? (
          <div className="text-center px-8">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div id={containerId} className="w-full max-w-md" />
        )}
      </div>

      <div className="px-4 py-4 bg-zinc-900 text-center space-y-1">
        <p className="text-xs text-zinc-500">Point your camera at the barcode — hold steady</p>
        <p className="text-xs text-zinc-600">Supports UPC, EAN, and QR codes</p>
      </div>
    </div>
  );
}