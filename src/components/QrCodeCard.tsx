import { useEffect, useState } from "react";
import { Worker } from "../types";

interface Props {
  worker: Worker;
  baseUrl: string;
}

export default function QrCodeCard({ worker, baseUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const tipUrl = `${baseUrl}?worker=${worker.id}&name=${encodeURIComponent(worker.name)}`;

  useEffect(() => {
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tipUrl)}`;
    setQrDataUrl(apiUrl);
  }, [tipUrl]);

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    // Card dimensions: 6.4cm wide x 10.5cm tall — fits a 6.8 x 11cm lanyard sleeve
    const printQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tipUrl)}`;
    win.document.write(`
      <html>
      <head>
        <title>TipMe Card – ${worker.name}</title>
        <style>
          @page { size: 6.4cm 10.5cm; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 6.4cm;
            height: 10.5cm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #ffffff;
            gap: 0.35cm;
            padding: 0.4cm;
          }
          .hole { width: 0.5cm; height: 0.5cm; border-radius: 50%; border: 1.5px solid #ccc; margin-bottom: 0.1cm; }
          .qr { width: 4cm; height: 4cm; }
          .name { font-size: 14pt; font-weight: 600; color: #111111; text-align: center; }
          .tagline { font-size: 7.5pt; color: #888888; letter-spacing: 0.12em; text-transform: uppercase; text-align: center; }
        </style>
      </head>
      <body>
        <div class="hole"></div>
        <img id="qr-print-img" class="qr" src="${printQrUrl}" alt="QR code" />
        <p class="name">${worker.name}</p>
        <p class="tagline">Scan to tip me</p>
        <script>
          var img = document.getElementById('qr-print-img');
          function doPrint() { window.print(); }
          if (img.complete) { doPrint(); }
          else { img.onload = doPrint; img.onerror = doPrint; setTimeout(doPrint, 2500); }
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-3">
      <p className="font-semibold text-gray-800 text-sm">{worker.name}</p>
      <p className="text-xs text-gray-500">{worker.position}</p>
      {qrDataUrl ? (
        <img src={qrDataUrl} alt={`QR code for ${worker.name}`} className="w-36 h-36 rounded" />
      ) : (
        <div className="w-36 h-36 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
          Generating…
        </div>
      )}
      <div className="flex gap-2 w-full">
        <button onClick={handlePrint}
          className="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-lg transition">
          Print QR
        </button>
        <button onClick={() => navigator.clipboard.writeText(tipUrl)}
          className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg transition">
          Copy Link
        </button>
      </div>
    </div>
  );
}
