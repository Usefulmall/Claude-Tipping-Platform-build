import { useEffect, useState } from "react";
import { Worker } from "../types";

interface Props {
  worker: Worker;
  baseUrl: string;
}

export default function QrCodeCard({ worker, baseUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const tipUrl = `${baseUrl}?worker=${worker.id}&name=${encodeURIComponent(worker.name)}&sub=${encodeURIComponent(worker.subaccountCode)}`;

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      try {
        // Use a free QR code API so we don't need a local library at runtime
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tipUrl)}`;
        setQrDataUrl(apiUrl);
      } catch (err) {
        console.error("QR generation error", err);
      }
    }
    generate();
    return () => { cancelled = true; };
  }, [tipUrl]);

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR – ${worker.name}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}h2{margin-bottom:8px}p{color:#555;margin:4px 0}</style>
      </head><body>
      <h2>${worker.name}</h2>
      <p>${worker.position}</p>
      <br/>
      <img id="qr-print-img" src="${qrDataUrl}" width="200" height="200" />
      <br/><br/>
      <p style="font-size:12px;color:#888">Scan to leave a tip</p>
      <script>
        var img = document.getElementById('qr-print-img');
        function doPrint() { window.print(); }
        if (img.complete) {
          doPrint();
        } else {
          img.onload = doPrint;
          img.onerror = doPrint;
          // Fallback in case the image never fires an event
          setTimeout(doPrint, 2000);
        }
      </script>
      </body></html>
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
        <button
          onClick={handlePrint}
          className="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-lg transition"
        >
          Print QR
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(tipUrl)}
          className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg transition"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}
