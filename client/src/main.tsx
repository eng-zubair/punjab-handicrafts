import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function silencer() {
  window.addEventListener('error', (e: any) => {
    const src = String(e?.filename || '');
    const msg = String(e?.message || '');
    if (src.includes('inpage.js') || msg.includes('MetaMask')) {
      e.preventDefault();
    }
  });
  window.addEventListener('unhandledrejection', (e: any) => {
    const r = e?.reason;
    const txt = String((r && (r.stack || r.message)) || r || '');
    if (txt.includes('MetaMask') || txt.includes('inpage.js')) {
      e.preventDefault();
    }
  });
}

silencer();

createRoot(document.getElementById("root")!).render(<App />);
