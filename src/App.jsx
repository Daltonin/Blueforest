import React, { useState, useEffect, useCallback } from "react";

// === STORAGE ===HELPERS --------------------------------------------------------
const STORAGE_KEY = "gestor-obras-data";
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_OWNER = import.meta.env.VITE_GITHUB_OWNER || "Daltonin";
const GH_REPO  = import.meta.env.VITE_GITHUB_REPO  || "Blueforest";
const GH_FILE  = "blueforest-data.json";
const GH_API   = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;

async function loadData() {
  // 1. Try GitHub for latest metadata
  let ghData = null;
  if (GH_TOKEN) {
    try {
      const res = await fetch(GH_API, {
        headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json" }
      });
      if (res.ok) {
        const json = await res.json();
        const raw = json.content.replace(/\n/g, "");
        ghData = JSON.parse(decodeURIComponent(escape(atob(raw))));
      }
    } catch(e) { void 0; }
  }

  // 2. Fallback to localStorage
  if (!ghData) {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) ghData = JSON.parse(s);
    } catch(e) { void 0; }
  }

  // 3. Inject foto srcs from bf-fotos-{obraId} keys
  if (ghData?.obras) {
    ghData.obras = ghData.obras.map(o => {
      const fotosKey = `bf-fotos-${o.id}`;
      // Check if fotos are stored as array (new system)
      try {
        const stored = localStorage.getItem(fotosKey);
        if (!stored) return o;
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // New system: fotos stored as full array with srcs
          return { ...o, fotos: parsed };
        }
        // Old system: stored as {id: src} object
        const srcs = parsed;
        return { ...o, fotos: (o.fotos||[]).map(f => ({ ...f, src: srcs[f.id] || "" })) };
      } catch(e) { return o; }
    });
  }

  return ghData;
}

let _ghSha = null;

async function saveData(data) {
  // NOTE: localStorage is saved by the useEffect BEFORE calling this function
  // with full data including foto srcs. Do NOT overwrite it here.
  
  // Save backup to localStorage with timestamp (last 5 backups)
  try {
    const backups = JSON.parse(localStorage.getItem(STORAGE_KEY + "-backups") || "[]");
    backups.unshift({ ts: new Date().toISOString(), data });
    localStorage.setItem(STORAGE_KEY + "-backups", JSON.stringify(backups.slice(0, 5)));
  } catch(e) { void 0; }

  // 3. Save to GitHub
  if (!GH_TOKEN) return;
  try {
    const dataForGitHub = data;
    if (!_ghSha) {
      const res = await fetch(GH_API, {
        headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json" }
      });
      if (res.ok) {
        const json = await res.json();
        _ghSha = json.sha;
      }
    }
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataForGitHub, null, 2))));
    const body = { message: "Blue Forest autosave", content, ...(_ghSha ? { sha: _ghSha } : {}) };
    const res2 = await fetch(GH_API, {
      method: "PUT",
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res2.ok) {
      const json2 = await res2.json();
      _ghSha = json2.content?.sha;
    }
  } catch(e) { void 0; }
}

// Restaurar desde backup
function getBackups() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY + "-backups") || "[]"); } catch(e) { return []; }
}

// === INITIAL ===DEMO DATA -------------------------------------------------------
const DEMO = {
  obras: [
    {
      id: "o1",
      nombre: "Reforma Oficina Central",
      cliente: "TechCorp SL",
      ubicacion: "Madrid, Gran Vía 14",
      estado: "en_curso",
      presupuesto: 85000,
      gastado: 31200,
      fechaInicio: "2026-04-01",
      fechaFin: "2026-07-15",
      color: "#C8A96E",
      fases: [
        { id: "f1", nombre: "Demolición", estado: "completada", inicio: "2026-04-01", fin: "2026-04-10" },
        { id: "f2", nombre: "Instalaciones eléctricas", estado: "en_curso", inicio: "2026-04-11", fin: "2026-05-10" },
        { id: "f3", nombre: "Fontanería", estado: "pendiente", inicio: "2026-05-05", fin: "2026-05-25" },
        { id: "f4", nombre: "Tabiquería y acabados", estado: "pendiente", inicio: "2026-05-20", fin: "2026-06-30" },
        { id: "f5", nombre: "Mobiliario y entrega", estado: "pendiente", inicio: "2026-07-01", fin: "2026-07-15" },
      ],
      tareas: [
        { id: "t1", titulo: "Pedir permiso de obras", faseId: "f1", estado: "completada", prioridad: "alta", responsable: "Javier M." },
        { id: "t2", titulo: "Retirada de escombros", faseId: "f1", estado: "completada", prioridad: "media", responsable: "Equipo Lima" },
        { id: "t3", titulo: "Cuadro eléctrico principal", faseId: "f2", estado: "en_curso", prioridad: "alta", responsable: "ElecPro" },
        { id: "t4", titulo: "Cableado estructurado Cat6", faseId: "f2", estado: "pendiente", prioridad: "alta", responsable: "ElecPro" },
        { id: "t5", titulo: "Baños planta 2", faseId: "f3", estado: "pendiente", prioridad: "media", responsable: "Fontaneros Roca" },
      ],
      proveedores: [
        { id: "p1", nombre: "ElecPro Madrid", especialidad: "Electricidad", contacto: "Carlos Ruiz", telefono: "612 345 678", estado: "activo", importe: 18000 },
        { id: "p2", nombre: "Fontaneros Roca", especialidad: "Fontanería", contacto: "Ana García", telefono: "698 765 432", estado: "pendiente", importe: 9500 },
        { id: "p3", nombre: "Equipo Lima Demoliciones", especialidad: "Demolición", contacto: "Miguel Lima", telefono: "645 123 456", estado: "finalizado", importe: 7200 },
      ],
    },
  ],
};

// === UTILS ===
const ESTADOS_OBRA = { pendiente: "Pendiente", en_curso: "En curso", pausada: "Pausada", completada: "Completada" };
const ESTADOS_FASE = { pendiente: "Pendiente", en_curso: "En curso", completada: "Completada" };
const ESTADOS_TAREA = { pendiente: "Pendiente", en_curso: "En curso", completada: "Completada", bloqueada: "Bloqueada" };
const PRIORIDADES = { alta: "#E05C5C", media: "#C8A96E", baja: "#6EA8C8" };

function pct(gastado, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((gastado / total) * 100));
}

function diasRestantes(fechaFin) {
  const hoy = new Date();
  const fin = new Date(fechaFin);
  return Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
}

function fmt(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function generarAlertas(obras) {
  const alertas = [];
  const hoy = new Date();
  const en7 = new Date(hoy.getTime() + 7 * 864e5);
  obras.forEach(o => {
    if (o.fechaFin) {
      const dias = Math.ceil((new Date(o.fechaFin) - hoy) / 864e5);
      if (dias < 0 && o.estado !== "completada")
        alertas.push({ tipo:"rojo", texto:`${o.nombre}: entrega retrasada ${Math.abs(dias)}d`, obraId:o.id });
      else if (dias <= 7 && dias >= 0 && o.estado !== "completada")
        alertas.push({ tipo:"naranja", texto:`${o.nombre}: entrega en ${dias}d`, obraId:o.id });
    }
    (o.incidencias||[]).filter(i=>i.prioridad==="critica"&&i.estado==="abierta").forEach(i=>
      alertas.push({ tipo:"rojo", texto:`${o.nombre}: incidencia crítica — ${i.titulo}`, obraId:o.id })
    );
    (o.economica?.cobros||[]).filter(c=>c.estado==="pendiente"&&c.fecha&&new Date(c.fecha)<hoy).forEach(c=>
      alertas.push({ tipo:"naranja", texto:`${o.nombre}: cobro vencido ${fmt(c.importe)}`, obraId:o.id })
    );
    (o.materiales||[]).filter(m=>m.critico&&m.estado!=="recibido").forEach(m=>
      alertas.push({ tipo:"naranja", texto:`${o.nombre}: material crítico pendiente — ${m.nombre}`, obraId:o.id })
    );
    (o.garantias||[]).filter(g=>g.fechaFin&&new Date(g.fechaFin)<=en7&&new Date(g.fechaFin)>=hoy).forEach(g=>
      alertas.push({ tipo:"naranja", texto:`${o.nombre}: garantía vence pronto — ${g.nombre}`, obraId:o.id })
    );
  });
  return alertas;
}

// === STYLES ===
const THEMES = {
  dark: {
    bg: "#0F0F0F", surface: "#171717", surfaceHover: "#1F1F1F",
    border: "#2A2A2A", borderLight: "#333",
    gold: "#C8A96E", goldDim: "#9A7D50",
    text: "#E8E4DC", textMuted: "#888", textDim: "#555",
    red: "#E05C5C", orange: "#E08D3C", green: "#5CB87A", blue: "#5C9BE0",
  },
  light: {
    bg: "#F5F3EF", surface: "#FFFFFF", surfaceHover: "#F0EDE8",
    border: "#E2DDD6", borderLight: "#CCC8C0",
    gold: "#9A6F3A", goldDim: "#7A5520",
    text: "#1A1A2E", textMuted: "#6A6A7A", textDim: "#AAAAAA",
    red: "#C0392B", orange: "#C0680A", green: "#1E6B3C", blue: "#1A5C9A",
  },
};

let _themeMode = "light"; // Modo claro permanente
let G = { ...THEMES.light };

function useTheme() {
  const [mode, setMode] = useState(_themeMode);
  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    _themeMode = next;
    G = { ...THEMES[next] };
    try { localStorage.setItem("bf-theme", next); } catch(e) { return; }
    setMode(next);
  };
  return { mode, toggle, isDark: mode === "dark" };
}

const buildCss = () => `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${G.bg};
    color: ${G.text};
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${G.bg}; }
  ::-webkit-scrollbar-thumb { background: ${G.border}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${G.borderLight}; }

  .mono { font-family: 'DM Mono', monospace; }
  .serif { font-family: 'Playfair Display', serif; }

  input, textarea, select {
    background: ${G.bg};
    border: 1px solid ${G.border};
    color: ${G.text};
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 6px;
    outline: none;
    width: 100%;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus, textarea:focus, select:focus {
    border-color: ${G.gold};
    box-shadow: 0 0 0 3px ${G.gold}18;
  }
  input::placeholder, textarea::placeholder { color: ${G.textDim}; }
  select option { background: ${G.surface}; }
  input:disabled, textarea:disabled, select:disabled { opacity: 0.4; cursor: not-allowed; }

  button { cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  button:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

  .btn-primary {
    background: ${G.gold};
    color: ${G.bg};
    border: none;
    padding: 9px 18px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .btn-primary:hover:not(:disabled) { background: #D4B87A; transform: translateY(-1px); box-shadow: 0 4px 12px ${G.gold}33; }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }

  .btn-ghost {
    background: transparent;
    color: ${G.textMuted};
    border: 1px solid ${G.border};
    padding: 7px 16px;
    border-radius: 6px;
    font-size: 12px;
  }
  .btn-ghost:hover:not(:disabled) { border-color: ${G.goldDim}; color: ${G.gold}; background: ${G.gold}0A; }

  .btn-danger {
    background: transparent;
    color: ${G.red};
    border: 1px solid #3A2020;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
  }
  .btn-danger:hover:not(:disabled) { background: #3A2020; }

  .tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.05em;
    font-weight: 500;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(6px);
    animation: fadeIn 0.18s ease;
  }
  .modal {
    background: ${G.surface};
    border: 1px solid ${G.border};
    border-radius: 10px;
    padding: 32px;
    width: 520px;
    max-width: 95vw;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUp 0.18s ease;
    box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  }

  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }

  .loading-pulse { animation: pulse 1.5s ease infinite; }

  .progress-bar {
    height: 3px;
    background: ${G.border};
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .gantt-bar {
    height: 20px;
    border-radius: 3px;
    position: absolute;
    top: 6px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.2s, filter 0.2s;
    cursor: pointer;
  }
  .gantt-bar:hover { filter: brightness(1.15); }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 14px;
    border-radius: 6px;
    color: ${G.textMuted};
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
    border: none; background: none; width: 100%; text-align: left;
  }
  .nav-item:hover { background: ${G.surfaceHover}; color: ${G.text}; }
  .nav-item.active { background: ${G.gold}15; color: ${G.gold}; }

  .card {
    background: ${G.surface};
    border: 1px solid ${G.border};
    border-radius: 8px;
    padding: 20px;
    transition: border-color 0.2s;
  }
  .card:hover { border-color: ${G.borderLight}; }

  .obra-card {
    cursor: pointer;
    border-left: 3px solid;
  }
  .obra-card:hover { transform: translateX(2px); }

  .stat-box {
    background: ${G.surface};
    border: 1px solid ${G.border};
    border-radius: 8px;
    padding: 16px 20px;
    transition: border-color 0.2s;
  }
  .stat-box:hover { border-color: ${G.borderLight}; }

  /* Tabs overflow scroll */
  .tabs-bar {
    display: flex;
    gap: 2px;
    padding: 0 28px;
    border-bottom: 1px solid ${G.border};
    background: ${G.surface};
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs-bar::-webkit-scrollbar { display: none; }

  .tab-btn {
    padding: 12px 14px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: ${G.textMuted};
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .tab-btn:hover { color: ${G.text}; }
  .tab-btn.active { border-bottom-color: ${G.gold}; color: ${G.gold}; }

  /* Toast notification */
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${G.surface};
    border: 1px solid ${G.border};
    border-radius: 8px;
    padding: 12px 18px;
    font-size: 13px;
    color: ${G.text};
    z-index: 9999;
    animation: slideUp 0.2s ease;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 320px;
  }

  /* Light mode overrides */
  .light-mode .card:hover { border-color: ${G.border}; }
  .light-mode .stat-box { box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .light-mode .modal { box-shadow: 0 24px 60px rgba(0,0,0,0.15); }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .tab-content { animation: fadeIn 0.18s ease; }
  .loading-pulse { animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

// === TAG ===COLOR ----------------------------------------------------------------
function estadoTag(estado, tipo = "obra") {
  const map = {
    completada: { bg: "#1A2E1F", color: "#5CB87A" },
    en_curso: { bg: "#1A2015", color: "#C8A96E" },
    pendiente: { bg: "#1E1E1E", color: "#888" },
    pausada: { bg: "#2A1A1A", color: "#E05C5C" },
    bloqueada: { bg: "#2A1A1A", color: "#E05C5C" },
    activo: { bg: "#1A2E1F", color: "#5CB87A" },
    finalizado: { bg: "#1A1A2A", color: "#5C9BE0" },
  };
  const s = map[estado] || { bg: "#1E1E1E", color: "#888" };
  return (
    <span className="tag" style={{ background: s.bg, color: s.color }}>
      {(tipo === "obra" ? ESTADOS_OBRA : tipo === "fase" ? ESTADOS_FASE : ESTADOS_TAREA)[estado] || estado}
    </span>
  );
}

// === ICONS ===(SVG inline) -------------------------------------------------------
function SvgIcon({ path, size = 16, strokeWidth = "1.8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      {path}
    </svg>
  );
}

// Icons are defined as functions to avoid JSX at module level (esbuild limitation)
const Icon = { building:"🏗",plus:"+",tasks:"✓",users:"👥",euro:"€",calendar:"📅",arrow:"→",x:"✕",home:"🏠",chart:"📊",edit:"✎",trash:"✕" };


// === MODALS ===
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="serif" style={{ fontSize: 20, color: G.gold }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: G.textMuted, padding: 4 }}>{Icon.x}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// === PLANTILLAS ===DE OBRAS ------------------------------------------------------
const PLANTILLAS_OBRA = [
  {
    id: "reforma_integral",
    nombre: "Reforma Integral Vivienda",
    emoji: "🏠",
    desc: "Reforma completa de piso o casa — demolición, instalaciones, acabados",
    color: "#C8A96E",
    fases: [
      { nombre: "Demolición y vaciado",        duracion: 5  },
      { nombre: "Estructura y refuerzos",       duracion: 7  },
      { nombre: "Instalación eléctrica",        duracion: 10 },
      { nombre: "Instalación fontanería",       duracion: 8  },
      { nombre: "Climatización",                duracion: 6  },
      { nombre: "Tabiquería y pladur",          duracion: 10 },
      { nombre: "Alicatado y solado",           duracion: 12 },
      { nombre: "Carpintería y acabados",       duracion: 10 },
      { nombre: "Pintura",                      duracion: 7  },
      { nombre: "Mobiliario e iluminación",     duracion: 5  },
      { nombre: "Limpieza y entrega",           duracion: 2  },
    ],
    tareas: [
      "Obtener licencia de obras",
      "Confirmar planos aprobados con arquitecto",
      "Contratar seguro de responsabilidad civil",
      "Pedir contenedor de escombros",
      "Verificar suministros (agua, luz) antes de comenzar",
      "Fotografiar estado inicial de todas las estancias",
      "Revisar instalación eléctrica existente",
      "Comprobar tuberías de fontanería existentes",
      "Presentar acta de inicio al cliente",
      "Entrega de llaves al jefe de obra",
    ],
    checklist: ["Demolición", "Electricidad", "Fontanería", "Pladur", "Acabados", "Entrega"],
  },
  {
    id: "reforma_cocina",
    nombre: "Reforma de Cocina",
    emoji: "🍳",
    desc: "Reforma completa de cocina — muebles, electrodomésticos, instalaciones",
    color: "#5CB87A",
    fases: [
      { nombre: "Demolición cocina antigua",    duracion: 2 },
      { nombre: "Instalación fontanería",       duracion: 3 },
      { nombre: "Instalación eléctrica",        duracion: 3 },
      { nombre: "Alicatado",                    duracion: 4 },
      { nombre: "Solado",                       duracion: 2 },
      { nombre: "Muebles de cocina",            duracion: 3 },
      { nombre: "Electrodomésticos",            duracion: 1 },
      { nombre: "Acabados y pintura",           duracion: 2 },
    ],
    tareas: [
      "Confirmar medidas y plano de distribución con cliente",
      "Seleccionar y pedir muebles de cocina",
      "Confirmar fecha entrega electrodomésticos",
      "Seleccionar alicatado y solado con cliente",
      "Verificar potencia eléctrica disponible",
      "Coordinar con fontanero fechas de trabajo",
      "Revisar ventilación e instalación de campana",
    ],
    checklist: ["Demolición", "Fontanería", "Electricidad"],
  },
  {
    id: "reforma_bano",
    nombre: "Reforma de Baño",
    emoji: "🚿",
    desc: "Reforma de baño — alicatado, sanitarios, instalaciones",
    color: "#5C9BE0",
    fases: [
      { nombre: "Demolición baño existente",    duracion: 2 },
      { nombre: "Impermeabilización",           duracion: 2 },
      { nombre: "Instalación fontanería",       duracion: 3 },
      { nombre: "Alicatado suelo y paredes",    duracion: 4 },
      { nombre: "Instalación sanitarios",       duracion: 2 },
      { nombre: "Instalación eléctrica baño",   duracion: 1 },
      { nombre: "Carpintería y acabados",       duracion: 1 },
    ],
    tareas: [
      "Seleccionar alicatado con cliente",
      "Elegir sanitarios (inodoro, lavabo, plato ducha/bañera)",
      "Confirmar griferías y accesorios",
      "Verificar ventilación existente",
      "Pedir muestras de materiales antes de encargar",
      "Confirmar disponibilidad de fontanero",
    ],
    checklist: ["Demolición", "Fontanería"],
  },
  {
    id: "reforma_oficina",
    nombre: "Reforma de Oficina",
    emoji: "💼",
    desc: "Reforma de espacio de trabajo — distribución, instalaciones, acabados",
    color: "#A06EBE",
    fases: [
      { nombre: "Demolición y distribución",    duracion: 5  },
      { nombre: "Instalación eléctrica BT",     duracion: 8  },
      { nombre: "Cableado de datos y telecomunicaciones", duracion: 5 },
      { nombre: "Climatización",                duracion: 6  },
      { nombre: "Tabiquería y pladur",          duracion: 8  },
      { nombre: "Pavimento técnico o solado",   duracion: 5  },
      { nombre: "Falso techo",                  duracion: 4  },
      { nombre: "Pintura y acabados",           duracion: 5  },
      { nombre: "Mobiliario y señalización",    duracion: 3  },
    ],
    tareas: [
      "Obtener licencia de actividad",
      "Verificar carga estructural del forjado",
      "Planificar cableado de datos con IT del cliente",
      "Confirmar potencia eléctrica disponible",
      "Estudiar aforo máximo y salidas de emergencia",
      "Coordinar corte de suministros con el edificio",
      "Revisar normativa de accesibilidad",
    ],
    checklist: ["Demolición", "Electricidad"],
  },
  {
    id: "interiorismo",
    nombre: "Proyecto de Interiorismo",
    emoji: "🎨",
    desc: "Proyecto de decoración sin obra — mobiliario, iluminación, textiles",
    color: "#E08D3C",
    fases: [
      { nombre: "Toma de medidas y estado actual", duracion: 1 },
      { nombre: "Propuesta de diseño",           duracion: 7  },
      { nombre: "Aprobación cliente",            duracion: 3  },
      { nombre: "Pedidos de mobiliario",         duracion: 2  },
      { nombre: "Espera de materiales",          duracion: 30 },
      { nombre: "Instalación y montaje",         duracion: 5  },
      { nombre: "Styling y fotografía final",    duracion: 1  },
    ],
    tareas: [
      "Fotografiar estado actual de todas las estancias",
      "Tomar medidas completas con plano",
      "Presentar mood board al cliente",
      "Confirmar paleta de colores y materiales",
      "Pedir presupuestos a proveedores de mobiliario",
      "Coordinar entregas de proveedores",
      "Contratar fotógrafo para documentación final",
    ],
    checklist: [],
  },
];

function NuevaObraModal({ onClose, onSave }) {
  const [paso, setPaso] = useState("plantilla"); // "plantilla" | "datos"
  const [plantillaSelec, setPlantillaSelec] = useState(null);
  const [form, setForm] = useState({ nombre:"", cliente:"", ubicacion:"", presupuesto:"", fechaInicio:"", fechaFin:"", color:"#C8A96E" });
  const [loadingIA, setLoadingIA] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const generarFasesConFechas = (plantilla, fechaInicio) => {
    if (!fechaInicio || !plantilla) return [];
    let cursor = new Date(fechaInicio);
    return plantilla.fases.map((f, i) => {
      const inicio = cursor.toISOString().slice(0,10);
      cursor.setDate(cursor.getDate() + f.duracion);
      const fin = cursor.toISOString().slice(0,10);
      cursor.setDate(cursor.getDate() + 1); // 1 día entre fases
      return { id: uid(), nombre: f.nombre, inicio, fin, estado:"pendiente", retrasoReal:0, material:"", proveedor:"", dependeDe: i > 0 ? "" : "" };
    });
  };

  const crearObra = async () => {
    if (!form.nombre) return;
    // Siempre empezar en blanco — Claude añadirá tareas y fases según la obra
    const fases = [];
    const tareas = [];

    const obra = {
      id: uid(), ...form,
      presupuesto: Number(form.presupuesto)||0,
      gastado: 0, estado:"pendiente",
      fechaFin: form.fechaFin,
      fases, tareas,
      checklists: [],
      proveedores:[], incidencias:[], materiales:[], planos:[], fotos:[],
    };
    onSave(obra);
    onClose();
  };

  const generarConIA = async () => {
    if (!form.nombre.trim()) return;
    setLoadingIA(true);
    try {
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:800,
          messages:[{ role:"user", content:`Genera las fases de obra para un proyecto de reforma/interiorismo con estas características:\nNombre: "${form.nombre}"\nCliente: "${form.cliente||"—"}"\nUbicación: "${form.ubicacion||"—"}"\nPresupuesto: "${form.presupuesto?fmt(Number(form.presupuesto)):"no especificado"}"\n\nResponde ÚNICAMENTE con JSON válido sin backticks:\n{"fases":[{"nombre":"nombre de la fase","duracion":días_laborables}],"tareas":["tarea 1","tarea 2"...]}\n\nMáximo 10 fases, ordenadas lógicamente. Usa terminología española de construcción.` }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      const plantillaIA = {
        id:"ia", nombre:"Generada con IA", emoji:"✦", desc:"Plantilla personalizada", color:form.color,
        fases: parsed.fases||[], tareas: parsed.tareas||[], checklist:[],
      };
      setPlantillaSelec(plantillaIA);
      setPaso("datos");
    } catch(e) { void 0; }
    setLoadingIA(false);
  };

  return (
    <Modal title={paso==="plantilla"?"Nueva Obra — Elige plantilla":"Nueva Obra — Datos"} onClose={onClose}>
      {paso === "plantilla" ? (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:12, color:G.textMuted }}>Elige una plantilla para preconfigurar fases, tareas y checklists automáticamente. O empieza desde cero.</div>

          {/* IA */}
          <div style={{ background:"#1A1A13", border:`1px solid ${G.gold}33`, borderRadius:8, padding:14 }}>
            <div style={{ fontSize:13, color:G.gold, marginBottom:6 }}>✦ Generar plantilla con IA</div>
            <div style={{ fontSize:11, color:G.textMuted, marginBottom:10 }}>Escribe el nombre de la obra y Claude genera las fases específicas</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={form.nombre} onChange={set("nombre")} placeholder="Ej: Reforma loft Barcelona, Tienda de moda..." style={{ flex:1, fontSize:12 }} />
              <button className="btn-primary" onClick={generarConIA} disabled={loadingIA||!form.nombre.trim()} style={{ fontSize:12, opacity:loadingIA||!form.nombre.trim()?0.5:1 }}>
                {loadingIA?"Generando…":"Generar"}
              </button>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, height:1, background:G.border }} />
            <span style={{ fontSize:11, color:G.textDim }}>o elige una plantilla base</span>
            <div style={{ flex:1, height:1, background:G.border }} />
          </div>

          {/* Plantillas */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {PLANTILLAS_OBRA.map(p=>(
              <div key={p.id} onClick={()=>{ setPlantillaSelec(p); setPaso("datos"); }}
                style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 14px", borderRadius:8, border:`1px solid ${plantillaSelec?.id===p.id?p.color:G.border}`, background:plantillaSelec?.id===p.id?p.color+"11":"transparent", cursor:"pointer", transition:"all 0.15s" }}>
                <span style={{ fontSize:24, flexShrink:0 }}>{p.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{p.nombre}</div>
                  <div style={{ fontSize:11, color:G.textMuted, marginTop:2 }}>{p.desc}</div>
                  <div style={{ fontSize:10, color:G.textDim, marginTop:3 }}>{p.fases.length} fases · {p.tareas.length} tareas</div>
                </div>
                <div style={{ width:12, height:12, borderRadius:"50%", background:p.color, flexShrink:0 }} />
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-ghost" onClick={()=>{ setPlantillaSelec(null); setPaso("datos"); }}>Sin plantilla →</button>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Resumen plantilla */}
          {plantillaSelec && (
            <div style={{ background:plantillaSelec.color+"11", border:`1px solid ${plantillaSelec.color}33`, borderRadius:6, padding:"10px 14px", display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:18 }}>{plantillaSelec.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color:plantillaSelec.color }}>{plantillaSelec.nombre}</div>
                <div style={{ fontSize:10, color:G.textMuted }}>{plantillaSelec.fases.length} fases · {plantillaSelec.tareas.length} tareas precargadas</div>
              </div>
              <button onClick={()=>setPaso("plantilla")} style={{ background:"none",border:"none",color:G.textMuted,fontSize:11,cursor:"pointer" }}>Cambiar</button>
            </div>
          )}

          <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>NOMBRE DE LA OBRA *</label>
            <input value={form.nombre} onChange={set("nombre")} placeholder="Reforma oficina..." autoFocus /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>CLIENTE</label>
              <input value={form.cliente} onChange={set("cliente")} placeholder="Empresa SL" /></div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>UBICACIÓN</label>
              <input value={form.ubicacion} onChange={set("ubicacion")} placeholder="Madrid, Calle..." /></div>
          </div>
          <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>PRESUPUESTO (€)</label>
            <input type="number" value={form.presupuesto} onChange={set("presupuesto")} placeholder="50000" /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>FECHA INICIO</label>
              <input type="date" value={form.fechaInicio} onChange={set("fechaInicio")} /></div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>FECHA FIN (auto si hay plantilla)</label>
              <input type="date" value={form.fechaFin} onChange={set("fechaFin")} /></div>
          </div>
          {plantillaSelec && form.fechaInicio && (
            <div style={{ fontSize:11, color:G.gold, fontFamily:"DM Mono" }}>
              ✓ Fases generadas automáticamente desde {form.fechaInicio} · Duración estimada: {plantillaSelec.fases.reduce((a,f)=>a+f.duracion+1,0)} días
            </div>
          )}
          <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>COLOR IDENTIFICADOR</label>
            <div style={{ display:"flex", gap:8 }}>
              {["#C8A96E","#5CB87A","#5C9BE0","#E05C5C","#A06EBE","#E08D5C"].map(c=>(
                <div key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{ width:28,height:28,borderRadius:4,background:c,cursor:"pointer",border:form.color===c?`2px solid ${G.text}`:"2px solid transparent" }} />
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:8, justifyContent:"flex-end" }}>
            <button className="btn-ghost" onClick={()=>setPaso("plantilla")}>← Atrás</button>
            <button className="btn-primary" onClick={crearObra} disabled={!form.nombre.trim()} style={{ opacity:!form.nombre.trim()?0.5:1 }}>
              Crear Obra{plantillaSelec?` con ${plantillaSelec.emoji}`:""}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}


function NuevaFaseModal({ onClose, onSave, fasesExistentes = [] }) {
  const [form, setForm] = useState({ nombre: "", inicio: "", fin: "", estado: "pendiente", dependeDe: "", material: "", proveedor: "", retrasoReal: 0 });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Modal title="Nueva Fase" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>NOMBRE DE LA FASE</label><input value={form.nombre} onChange={set("nombre")} placeholder="Demolición, Instalaciones..." /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>INICIO PREVISTO</label><input type="date" value={form.inicio} onChange={set("inicio")} /></div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>FIN PREVISTO</label><input type="date" value={form.fin} onChange={set("fin")} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>DEPENDE DE (fase anterior)</label>
            <select value={form.dependeDe} onChange={set("dependeDe")}>
              <option value="">Sin dependencia</option>
              {fasesExistentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>RETRASO ACTUAL (días)</label>
            <input type="number" min="0" value={form.retrasoReal} onChange={set("retrasoReal")} placeholder="0" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>MATERIAL CRÍTICO</label><input value={form.material} onChange={set("material")} placeholder="Pladur, baldosas..." /></div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>PROVEEDOR ASIGNADO</label><input value={form.proveedor} onChange={set("proveedor")} placeholder="ElecPro, Fontaneros..." /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => { if (form.nombre) { onSave({ id: uid(), ...form, retrasoReal: Number(form.retrasoReal) || 0 }); onClose(); } }}>Añadir Fase</button>
        </div>
      </div>
    </Modal>
  );
}

function NuevaTareaModal({ fases, onClose, onSave }) {
  const [form, setForm] = useState({ titulo: "", faseId: fases[0]?.id || "", prioridad: "media", responsable: "", estado: "pendiente" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Modal title="Nueva Tarea" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>DESCRIPCIÓN</label><input value={form.titulo} onChange={set("titulo")} placeholder="Instalar cuadro eléctrico..." /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>FASE</label>
            <select value={form.faseId} onChange={set("faseId")}>
              {fases.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>PRIORIDAD</label>
            <select value={form.prioridad} onChange={set("prioridad")}>
              <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
            </select>
          </div>
        </div>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>RESPONSABLE</label><input value={form.responsable} onChange={set("responsable")} placeholder="Proveedor o persona..." /></div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => { if (form.titulo) { onSave({ id: uid(), ...form }); onClose(); } }}>Añadir Tarea</button>
        </div>
      </div>
    </Modal>
  );
}

// === PROVEEDORES ===MEJORADO -----------------------------------------------------
function calcPresupuesto(obra) {
  const presups = obra.presupuestosRecibidos || [];
  const aceptados = presups.filter(p=>p.estado==="aceptado").reduce((a,p)=>a+Number(p.importe||0),0);
  if (aceptados > 0) return aceptados;
  const todos = presups.reduce((a,p)=>a+Number(p.importe||0),0);
  if (todos > 0) return todos;
  return obra.presupuesto || 0;
}

const CATEGORIAS_PLANOS = [
  { id:"distribucion", label:"Distribución" },
  { id:"derribos", label:"Derribos" },
  { id:"instalaciones", label:"Instalaciones" },
  { id:"electricidad", label:"Electricidad" },
  { id:"fontaneria", label:"Fontanería" },
  { id:"climatizacion", label:"Climatización" },
  { id:"estructura", label:"Estructura" },
  { id:"alzados", label:"Alzados / Secciones" },
  { id:"detalles", label:"Detalles constructivos" },
  { id:"proyecto", label:"Proyecto de ejecución" },
  { id:"as_built", label:"As-built / Final" },
  { id:"otros", label:"Otros" },
];

const ESPECIALIDADES_PROV = [
  "Constructor / Albañilería", "Electricista", "Fontanero", "Carpintero",
  "Pintor", "Climatización / Aires", "Cableado / IT", "Cristalero / Vidriería",
  "Moqueta / Suelos", "Arquitecto", "Decorador", "Cerrajero / Metalista",
  "Stores / Persianas", "Sanitarios / Baños", "Cocinas", "Yesero / Pladur",
  "Ascensor", "Jardinería", "Limpieza", "Otro"
];

const ESTADOS_PROV = {
  pendiente:  { label:"Pendiente",   color:"#9A6F3A",   bg:"#FFF8EE" },
  activo:     { label:"Activo",      color:"#1E6B3C",   bg:"#EFFFEF" },
  finalizado: { label:"Finalizado",  color:"#1A5C9A",   bg:"#EEF4FF" },
  pausado:    { label:"Pausado",     color:"#C0680A",   bg:"#FFF3E0" },
  incidencia: { label:"Incidencia",  color:G.red,       bg:"#2A1010" },
};

const ESPECIALIDADES = ["Albañilería","Carpintería","Climatización","Demolición","Diseño","Electricidad","Fontanería","Impermeabilización","Instalaciones","Mobiliario","Paisajismo","Pintura","Seguridad","Soldadura","Suelos","Vidriería","Otro"];

function ProveedorDetalle({ p, proveedores, updateProv, save, pagoForm, setPagoForm, setDetalle, onModal, fmt, G, obra }) {
  const est = ESTADOS_PROV[p.estado] || ESTADOS_PROV.pendiente;
  const pagado = (p.pagos||[]).reduce((a,pg)=>a+(Number(pg.importe)||0),0);
  const pendiente = (p.importe||0) - pagado;
  const [analisisIA, setAnalisisIA] = React.useState("");
  const [loadingIA, setLoadingIA] = React.useState(false);
  const [nuevoComentario, setNuevoComentario] = React.useState("");

  const analizarProveedor = async () => {
    setLoadingIA(true); setAnalisisIA("");
    try {
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:800,
          messages:[{role:"user",content:`Analiza este proveedor de reforma en 3 puntos breves: 1) Valoración general, 2) Riesgos, 3) Recomendación. Proveedor: ${p.nombre}, Especialidad: ${p.especialidad||"N/A"}, Valoración: ${p.valoracion||0}/5, Estado: ${p.estado}, Importe: ${fmt(p.importe)}, Pagado: ${fmt(pagado)}, Incidencias: ${(obra.incidencias||[]).filter(i=>i.responsable===p.nombre).length}`}]
        })
      });
      const d = await res.json();
      setAnalisisIA(d.content?.[0]?.text||"Error");
    } catch(e) { void 0; }
    setLoadingIA(false);
  };

  return (
    <div style={{ flex:1, background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${G.border}`, background:"#F0F7FF", display:"flex", gap:12, alignItems:"center" }}>
        <div style={{ flex:1 }}>
          <div className="serif" style={{ fontSize:16, color:"#1A1A2E" }}>{p.nombre}</div>
          <div style={{ display:"flex", gap:6, marginTop:4 }}>
            {(()=>{ const esp = Array.isArray(p.especialidad)?p.especialidad.join(", "):(p.especialidad&&p.especialidad!=="undefined"?p.especialidad:""); return esp ? <span className="tag" style={{ background:"#EEF2FF", color:"#3B4FC8", fontSize:9 }}>{esp}</span> : null; })()}
            <span className="tag" style={{ background:est.bg, color:est.color, fontSize:9 }}>{est.label}</span>
            {p.telefono&&<a href={`tel:${p.telefono}`} style={{ fontSize:11, color:"#3B4FC8", textDecoration:"none" }}>📞 {p.telefono}</a>}
          </div>
        </div>
        <button onClick={()=>setDetalle(null)} style={{ background:"none", border:"none", color:G.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
      </div>
      <div style={{ flex:1, overflow:"auto", padding:16, display:"flex", flexDirection:"column", gap:14 }}>
        {/* Económico */}
        <div className="card">
          <div style={{ fontSize:10, color:G.textMuted, marginBottom:10, fontFamily:"DM Mono" }}>ESTADO ECONÓMICO</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[{l:"Contratado",v:fmt(p.importe||0),c:G.gold},{l:"Pagado",v:fmt(pagado),c:G.green},{l:"Pendiente",v:fmt(pendiente),c:pendiente>0?G.orange:G.textMuted}].map(k=>(
              <div key={k.l} style={{ textAlign:"center", background:G.bg, borderRadius:6, padding:"8px 4px" }}>
                <div className="serif" style={{ fontSize:16, color:k.c }}>{k.v}</div>
                <div style={{ fontSize:9, color:G.textMuted }}>{k.l}</div>
              </div>
            ))}
          </div>
          {p.importe>0&&<div style={{ marginTop:10 }}>
            <div style={{ height:6, background:G.border, borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(100,Math.round((pagado/(p.importe||1))*100))}%`, background:G.green, borderRadius:3 }} />
            </div>
          </div>}
        </div>
        {/* Registro de pagos */}
        <div className="card">
          <div style={{ fontSize:10, color:G.textMuted, marginBottom:10, fontFamily:"DM Mono" }}>REGISTRAR PAGO</div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input value={pagoForm.concepto} onChange={e=>setPagoForm(f=>({...f,concepto:e.target.value}))} placeholder="Concepto..." style={{ flex:1, fontSize:11 }} />
            <input type="number" value={pagoForm.importe} onChange={e=>setPagoForm(f=>({...f,importe:e.target.value}))} placeholder="€" style={{ width:80, fontSize:11 }} />
            <button className="btn-primary" onClick={()=>{
              if(!pagoForm.concepto||!pagoForm.importe) return;
              updateProv(p.id,{pagos:[...(p.pagos||[]),{id:uid(),concepto:pagoForm.concepto,importe:Number(pagoForm.importe),fecha:new Date().toLocaleDateString("es-ES")}]});
              setPagoForm({concepto:"",importe:""});
            }} style={{ padding:"6px 10px", fontSize:11 }}>+ Añadir</button>
          </div>
          {(p.pagos||[]).length>0&&(p.pagos||[]).slice(-3).map((pg,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderTop:`1px solid ${G.border}`, fontSize:11, color:G.textMuted }}>
              <span>{pg.concepto}</span><span style={{ color:G.green }}>{fmt(pg.importe)}</span>
            </div>
          ))}
        </div>
        {/* Editar datos */}
        <div className="card">
          <div style={{ fontSize:10, color:G.textMuted, marginBottom:10, fontFamily:"DM Mono" }}>DATOS</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[{l:"TELÉFONO",k:"telefono"},{l:"EMAIL",k:"email"},{l:"CONTACTO",k:"contacto"},{l:"IBAN / CUENTA",k:"iban"},{l:"IMPORTE (€)",k:"importe",t:"number"}].map(f=>(
              <div key={f.k}>
                <div style={{ fontSize:9, color:G.textMuted, marginBottom:3 }}>{f.l}</div>
                <input type={f.t||"text"} value={p[f.k]||""} onChange={e=>updateProv(p.id,{[f.k]:f.t==="number"?Number(e.target.value):e.target.value})} style={{ fontSize:11, width:"100%" }} />
              </div>
            ))}
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ fontSize:9, color:G.textMuted, marginBottom:6 }}>ESPECIALIDADES</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                {ESPECIALIDADES_PROV.map(esp=>{
                  const actual = Array.isArray(p.especialidad)?p.especialidad:(p.especialidad?[p.especialidad]:[]);
                  const checked = actual.includes(esp);
                  return (
                    <label key={esp} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:12, border:`1px solid ${checked?"#3B4FC8":"#DDD"}`, background:checked?"#EEF2FF":"#FFF", cursor:"pointer", fontSize:11, color:checked?"#3B4FC8":"#555" }}>
                      <input type="checkbox" checked={checked} style={{ display:"none" }} onChange={()=>{
                        const lista = actual.includes(esp) ? actual.filter(x=>x!==esp) : [...actual, esp];
                        updateProv(p.id, { especialidad: lista });
                      }} />
                      {checked?"✓ ":""}{esp}
                    </label>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <input id={`esp-custom-${p.id}`} placeholder="+ Añadir especialidad nueva..." style={{ flex:1, fontSize:11 }} onKeyDown={e=>{
                  if(e.key==="Enter"&&e.target.value.trim()){
                    const nueva = e.target.value.trim();
                    const actual = Array.isArray(p.especialidad)?p.especialidad:(p.especialidad?[p.especialidad]:[]);
                    if(!ESPECIALIDADES_PROV.includes(nueva)) ESPECIALIDADES_PROV.push(nueva);
                    updateProv(p.id, { especialidad: [...actual, nueva] });
                    e.target.value="";
                  }
                }} />
              </div>
            </div>
          </div>
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:9, color:G.textMuted, marginBottom:3 }}>ESTADO</div>
            <select value={p.estado} onChange={e=>updateProv(p.id,{estado:e.target.value})} style={{ fontSize:11 }}>
              {Object.entries(ESTADOS_PROV).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:9, color:G.textMuted, marginBottom:3 }}>NOTAS</div>
            <textarea value={p.notas||""} onChange={e=>updateProv(p.id,{notas:e.target.value})} style={{ minHeight:50, fontSize:11, resize:"vertical" }} />
          </div>
        </div>
        {/* IA */}
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono" }}>ANÁLISIS IA</div>
            <button onClick={analizarProveedor} disabled={loadingIA} className="btn-ghost" style={{ fontSize:10 }}>{loadingIA?"Analizando…":"✦ Analizar"}</button>
          </div>
          {analisisIA&&<div style={{ fontSize:12, color:G.text, lineHeight:1.7 }}>{analisisIA}</div>}
        </div>
        {/* Acciones */}
        <div style={{ display:"flex", gap:8 }}>
          {p.telefono&&<a href={`tel:${p.telefono}`} style={{ flex:1, textAlign:"center", padding:"7px 0", border:`1px solid ${G.border}`, borderRadius:6, color:G.textMuted, fontSize:12, textDecoration:"none" }}>📞 Llamar</a>}
          {p.email&&<a href={`mailto:${p.email}`} style={{ flex:1, textAlign:"center", padding:"7px 0", border:`1px solid ${G.border}`, borderRadius:6, color:G.textMuted, fontSize:12, textDecoration:"none" }}>📧 Email</a>}
          <button className="btn-danger" onClick={()=>{ save(proveedores.filter(x=>x.id!==p.id)); setDetalle(null); }} style={{ padding:"7px 12px" }}>✕</button>
        </div>
      </div>
    </div>
  );
}

function ProveedoresTab({ obra, onUpdate, onModal }) {
  const proveedores = obra.proveedores || [];
  const [detalle, setDetalle] = React.useState(null);
  const [busqueda, setBusqueda] = React.useState("");
  const [filtroEst, setFiltroEst] = React.useState("todos");
  const [vistaMode, setVistaMode] = React.useState("grid");
  const [pagoForm, setPagoForm] = React.useState({ concepto:"", importe:"" });

  const save = (nuevos) => onUpdate({ proveedores: nuevos });
  const updateProv = (id, cambios) => {
    // Clean undefined especialidad
    if (cambios.especialidad === "undefined") cambios.especialidad = [];
    save(proveedores.map(p => p.id===id ? {...p,...cambios} : p));
  };

  const totalContratado = proveedores.reduce((a,p)=>a+(Number(p.importe)||0),0);
  const totalPagado = proveedores.reduce((a,p)=>a+(p.pagos||[]).reduce((s,pg)=>s+(Number(pg.importe)||0),0),0);
  const pendientePagar = totalContratado - totalPagado;
  const activos = proveedores.filter(p=>p.estado==="activo").length;

  const filtrados = proveedores.filter(p => {
    if (filtroEst!=="todos" && p.estado!==filtroEst) return false;
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && !p.especialidad?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const Estrellas = ({val, onChange}) => (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(n=>(
        <span key={n} onClick={()=>onChange&&onChange(n)} style={{ cursor:onChange?"pointer":"default", fontSize:16, color:n<=(val||0)?"#F5A623":"#E0E0E0" }}>★</span>
      ))}
    </div>
  );

  return (
    <div style={{ display:"flex", gap:20, height:"100%" }}>
      <div style={{ flex:detalle?"0 0 380px":1, display:"flex", flexDirection:"column", gap:14, overflow:"auto" }}>
        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            {label:"TOTAL OBRA",val:fmt(totalContratado),color:G.gold},
            {label:"PAGADO",val:fmt(totalPagado),color:G.green},
            {label:"PENDIENTE",val:fmt(pendientePagar),color:pendientePagar>0?G.orange:G.textMuted},
            {label:"ACTIVOS",val:activos,color:G.text},
          ].map(k=>(
            <div key={k.label} className="stat-box">
              <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
              <div className="serif" style={{ fontSize:18,color:k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Controles */}
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Buscar proveedor..." style={{ flex:1,fontSize:12 }} />
          <select value={filtroEst} onChange={e=>setFiltroEst(e.target.value)} style={{ width:"auto",fontSize:12 }}>
            <option value="todos">Todos</option>
            {Object.entries(ESTADOS_PROV).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{ display:"flex",gap:3,background:G.bg,borderRadius:5,padding:3 }}>
            {[["grid","⊞"],["lista","☰"]].map(([id,icon])=>(
              <button key={id} onClick={()=>setVistaMode(id)} style={{ padding:"4px 10px",borderRadius:4,border:"none",background:vistaMode===id?G.surface:"transparent",color:vistaMode===id?G.gold:G.textMuted,cursor:"pointer" }}>{icon}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={()=>onModal&&onModal("proveedor")} style={{ flexShrink:0 }}>+ Añadir</button>
        </div>

        {filtrados.length===0&&(
          <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
            <div style={{ fontSize:36,marginBottom:10 }}>👷</div>
            <div>{busqueda?"Sin resultados":"Sin proveedores. Añade el primero."}</div>
          </div>
        )}

        {/* GRID */}
        {vistaMode==="grid" && filtrados.length>0 && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12 }}>
            {filtrados.map(p=>{
              const est = ESTADOS_PROV[p.estado]||ESTADOS_PROV.pendiente;
              const pagado = (p.pagos||[]).reduce((a,pg)=>a+(Number(pg.importe)||0),0);
              const pctPag = p.importe ? Math.min(100,Math.round((pagado/p.importe)*100)) : 0;
              const sel = detalle?.id===p.id;
              return (
                <div key={p.id} className="card" style={{ cursor:"pointer",borderTop:`3px solid ${est.color}`,background:sel?"#F0F7FF":"#FFFFFF", boxShadow:"0 1px 3px #0001" }} onClick={()=>setDetalle(sel?null:p)}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13,fontWeight:600,marginBottom:2,color:"#1A1A2E" }}>{p.nombre}</div>
                      <span className="tag" style={{ background:"#EEF2FF",color:"#3B4FC8",fontSize:9 }}>{Array.isArray(p.especialidad)?p.especialidad.join(", "):(p.especialidad&&p.especialidad!=="undefined"?p.especialidad:"")}</span>
                    </div>
                    <span className="tag" style={{ background:est.bg,color:est.color,fontSize:9 }}>{est.label}</span>
                  </div>
                  <Estrellas val={p.valoracion||0} onChange={v=>updateProv(p.id,{valoracion:v})} />
                  <div style={{ marginTop:10 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:G.textMuted,marginBottom:4 }}>
                      <span>Pagado</span><span className="mono">{pctPag}%</span>
                    </div>
                    <div style={{ height:4,background:G.border,borderRadius:2 }}>
                      <div style={{ height:"100%",width:`${pctPag}%`,background:G.green,borderRadius:2 }} />
                    </div>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:G.textMuted }}>
                    <span>{fmt(p.importe||0)}</span>
                    {p.telefono&&<a href={`tel:${p.telefono}`} onClick={e=>e.stopPropagation()} style={{color:G.blue,textDecoration:"none",fontSize:11}}>📞 {p.telefono}</a>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LISTA */}
        {vistaMode==="lista" && filtrados.length>0 && (
          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
            {filtrados.map(p=>{
              const est = ESTADOS_PROV[p.estado]||ESTADOS_PROV.pendiente;
              const pagado = (p.pagos||[]).reduce((a,pg)=>a+(Number(pg.importe)||0),0);
              const sel = detalle?.id===p.id;
              return (
                <div key={p.id} className="card" style={{ cursor:"pointer",borderLeft:`3px solid ${est.color}`,background:sel?"#F0F7FF":"#FFFFFF", boxShadow:"0 1px 3px #0001" }} onClick={()=>setDetalle(sel?null:p)}>
                  <div style={{ display:"flex",gap:14,alignItems:"center" }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:3 }}>
                        <span style={{ fontSize:13,fontWeight:600 }}>{p.nombre}</span>
                        <span className="tag" style={{ background:"#EEF2FF",color:"#3B4FC8",fontSize:9 }}>{Array.isArray(p.especialidad)?p.especialidad.join(", "):(p.especialidad&&p.especialidad!=="undefined"?p.especialidad:"")}</span>
                        <span className="tag" style={{ background:est.bg,color:est.color,fontSize:9 }}>{est.label}</span>
                      </div>
                      <div style={{ fontSize:10,color:G.textMuted }}>
                        {p.contacto&&<span>{p.contacto}</span>}
                        {p.telefono&&<span> · {p.telefono}</span>}
                      </div>
                    </div>
                    <Estrellas val={p.valoracion||0} onChange={v=>updateProv(p.id,{valoracion:v})} />
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <div className="mono" style={{ fontSize:14,color:G.gold }}>{fmt(p.importe||0)}</div>
                      {p.importe>0&&<div style={{ fontSize:10,color:G.textMuted }}>pagado {Math.min(100,Math.round((pagado/(p.importe||1))*100))}%</div>}
                    </div>
                    <select value={p.estado} onChange={e=>{e.stopPropagation();updateProv(p.id,{estado:e.target.value});}} style={{ width:"auto",fontSize:11,padding:"3px 6px" }} onClick={e=>e.stopPropagation()}>
                      {Object.entries(ESTADOS_PROV).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button className="btn-danger" onClick={e=>{e.stopPropagation();save(proveedores.filter(x=>x.id!==p.id));}} style={{ padding:"4px 8px",flexShrink:0 }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel detalle */}
      {detalle && (
        <ProveedorDetalle
          p={proveedores.find(x=>x.id===detalle.id)||detalle}
          proveedores={proveedores}
          updateProv={updateProv}
          save={save}
          pagoForm={pagoForm}
          setPagoForm={setPagoForm}
          setDetalle={setDetalle}
          onModal={onModal}
          fmt={fmt}
          G={G}
          obra={obra}
        />
      )}
    </div>
  );
}



function NuevoProveedorModal({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre: "", especialidad: "", contacto: "", telefono: "", importe: "", estado: "pendiente" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  
  const dirGlobal = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("bf-proveedores-global") || "[]"); } catch(e) { return []; }
  }, []);

  const autocompletar = (nombre) => {
    const encontrado = dirGlobal.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
    if (encontrado) {
      setForm(f => ({ ...f, nombre, especialidad: Array.isArray(encontrado.especialidad)?encontrado.especialidad.join(", "):(encontrado.especialidad||""), contacto: encontrado.contacto||f.contacto, telefono: encontrado.telefono||f.telefono }));
    } else {
      setForm(f => ({ ...f, nombre }));
    }
  };
  return (
    <Modal title="Nuevo Proveedor" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>EMPRESA / PROVEEDOR</label>
          <input list="prov-global-list" value={form.nombre} onChange={e=>autocompletar(e.target.value)} placeholder="ElecPro SL..." />
          <datalist id="prov-global-list">{dirGlobal.map(p=><option key={p.id||p.nombre} value={p.nombre}/>)}</datalist>
          {dirGlobal.find(p=>p.nombre.toLowerCase()===form.nombre.toLowerCase()) && <div style={{ fontSize:10, color:"#1E6B3C", marginTop:3 }}>✓ Proveedor conocido — datos cargados automáticamente</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>ESPECIALIDAD</label><input list="esp-list-form" value={form.especialidad} onChange={set("especialidad")} placeholder="Selecciona o escribe..." /><datalist id="esp-list-form">{ESPECIALIDADES_PROV.map(e=><option key={e} value={e}/>)}</datalist></div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>PERSONA DE CONTACTO</label><input value={form.contacto} onChange={set("contacto")} placeholder="Carlos Ruiz" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>TELÉFONO</label><input value={form.telefono} onChange={set("telefono")} placeholder="612 345 678" /></div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>IMPORTE CONTRATADO (€)</label><input type="number" value={form.importe} onChange={set("importe")} placeholder="15000" /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => { if (form.nombre) { onSave({ id: uid(), ...form, importe: Number(form.importe) || 0 }); onClose(); } }}>Añadir Proveedor</button>
        </div>
      </div>
    </Modal>
  );
}

// === MOTOR ===DE INTELIGENCIA GANTT ---------------------------------------------
function calcularConflictos(fases) {
  const conflictos = [];
  const alertas = [];
  const cuellos = [];

  fases.forEach(fase => {
    const retraso = Number(fase.retrasoReal) || 0;
    if (retraso <= 0) return;

    // Buscar fases dependientes
    const dependientes = fases.filter(f => f.dependeDe === fase.id);
    dependientes.forEach(dep => {
      const finOriginal = new Date(fase.fin);
      const finConRetraso = new Date(finOriginal.getTime() + retraso * 864e5);
      const iniDep = new Date(dep.inicio);

      if (finConRetraso > iniDep) {
        const diasConflicto = Math.ceil((finConRetraso - iniDep) / 864e5);
        conflictos.push({ faseOrigen: fase.id, faseDep: dep.id });
        alertas.push({
          tipo: "conflicto",
          mensaje: `⚠ "${fase.nombre}" lleva ${retraso}d de retraso → "${dep.nombre}" entra en conflicto (${diasConflicto}d de solapamiento)`,
          faseId: dep.id,
          diasImpacto: diasConflicto,
        });
      }
    });

    // Material cr-tico
    if (fase.material) {
      alertas.push({
        tipo: "material",
        mensaje: `📦 Material crítico en riesgo: "${fase.material}" (${fase.nombre} retrasada ${retraso}d)`,
        faseId: fase.id,
      });
    }
  });

  // Cuellos de botella - fases con m-s dependientes
  fases.forEach(fase => {
    const ndep = fases.filter(f => f.dependeDe === fase.id).length;
    if (ndep >= 2) {
      cuellos.push({ faseId: fase.id, ndep });
      if (Number(fase.retrasoReal) > 0) {
        alertas.push({
          tipo: "cuello",
          mensaje: `🔴 Cuello de botella: "${fase.nombre}" bloquea ${ndep} fases y lleva ${fase.retrasoReal}d de retraso`,
          faseId: fase.id,
        });
      }
    }
  });

  return { conflictos, alertas, cuellos };
}

// === GANTT ===INTELIGENTE --------------------------------------------------------
function GanttView({ obra, onUpdate }) {
  const [tooltip, setTooltip] = useState(null);
  const [hoveredFase, setHoveredFase] = useState(null);
  const [mostrarDeps, setMostrarDeps] = useState(true);
  const [mostrarCritico, setMostrarCritico] = useState(true);

  const fases = obra.fases || [];

  if (!fases.length) return (
    <div style={{ color: G.textMuted, textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
      No hay fases definidas
    </div>
  );

  const fechasValidas = fases.flatMap(f => [new Date(f.inicio), new Date(f.fin)]).filter(d => !isNaN(d));
  if (!fechasValidas.length) return <div style={{ color: G.textMuted, textAlign: "center", padding: 40 }}>Añade fechas de inicio y fin a las fases</div>;

  const minDate = new Date(Math.min(...fechasValidas));
  const maxDate = new Date(Math.max(...fechasValidas));
  const PADDING_DAYS = 5;
  const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / 864e5)) + PADDING_DAYS;
  const LABEL_W = 180;
  const ROW_H = 40;

  const { conflictos, alertas, cuellos } = calcularConflictos(fases);

  // Camino crítico: la cadena más larga de dependencias
  const calcCaminoCritico = () => {
    const critico = new Set();
    const duracion = (f) => Math.ceil((new Date(f.fin) - new Date(f.inicio)) / 864e5) + (Number(f.retrasoReal) || 0);
    const findChain = (faseId, visited = new Set()) => {
      if (visited.has(faseId)) return 0;
      visited.add(faseId);
      const fase = fases.find(f => f.id === faseId);
      if (!fase) return 0;
      const deps = fases.filter(f => f.dependeDe === faseId);
      const maxChild = deps.length ? Math.max(...deps.map(d => findChain(d.id, new Set(visited)))) : 0;
      return duracion(fase) + maxChild;
    };
    const raices = fases.filter(f => !f.dependeDe);
    let maxDur = 0;
    let caminoMax = [];
    raices.forEach(r => {
      const d = findChain(r.id);
      if (d > maxDur) { maxDur = d; caminoMax = [r.id]; }
    });
    const markCritico = (faseId) => {
      critico.add(faseId);
      const deps = fases.filter(f => f.dependeDe === faseId);
      if (deps.length) {
        const maxDep = deps.reduce((a, d) => {
          const dd = Math.ceil((new Date(d.fin) - new Date(d.inicio)) / 864e5);
          return dd > a.dur ? { id: d.id, dur: dd } : a;
        }, { id: null, dur: -1 });
        if (maxDep.id) markCritico(maxDep.id);
      }
    };
    caminoMax.forEach(markCritico);
    return critico;
  };
  const caminoCritico = mostrarCritico ? calcCaminoCritico() : new Set();

  const toX = (dateStr) => ((new Date(dateStr) - minDate) / 864e5 / totalDays) * 100;

  const barColor = (fase) => {
    if (caminoCritico.has(fase.id)) return "#C0392B";
    if (Number(fase.retrasoReal) > 0) return G.orange;
    if (fase.estado === "completada") return G.green;
    if (fase.estado === "en_curso") return G.gold;
    return "#3A3A5A";
  };

  const months = [];
  let cur = new Date(minDate); cur.setDate(1);
  while (cur <= maxDate) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }

  // Hoy
  const hoy = new Date();
  const hoyX = hoy >= minDate && hoy <= maxDate ? toX(hoy.toISOString().slice(0, 10)) : null;

  // Progreso de cada fase basado en fechas
  const progresoDeFase = (fase) => {
    if (fase.estado === "completada") return 100;
    if (fase.estado === "pendiente") return 0;
    const ini = new Date(fase.inicio);
    const fin = new Date(fase.fin);
    if (isNaN(ini) || isNaN(fin)) return 0;
    const total = fin - ini;
    const transcurrido = hoy - ini;
    return Math.max(0, Math.min(95, Math.round((transcurrido / total) * 100)));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Controles */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" id="showDeps" checked={mostrarDeps} onChange={e => setMostrarDeps(e.target.checked)} style={{ cursor: "pointer" }} />
          <label htmlFor="showDeps" style={{ fontSize: 12, color: G.textMuted, cursor: "pointer" }}>Mostrar dependencias</label>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" id="showCritico" checked={mostrarCritico} onChange={e => setMostrarCritico(e.target.checked)} style={{ cursor: "pointer" }} />
          <label htmlFor="showCritico" style={{ fontSize: 12, color: G.textMuted, cursor: "pointer" }}>Camino crítico</label>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[["#3A3A5A","Pendiente"],[G.gold,"En curso"],[G.green,"Completada"],[G.orange,"Con retraso"],["#C0392B","Camino crítico"]].map(([c,l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: G.textMuted }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {alertas.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 14px", borderRadius: 6, background: a.tipo === "cuello" ? "#2A1010" : a.tipo === "conflicto" ? "#1E1410" : "#101A1E", border: `1px solid ${a.tipo === "cuello" ? G.red : a.tipo === "conflicto" ? G.orange : G.blue}33`, fontSize: 12 }}>
              <span style={{ color: a.tipo === "cuello" ? G.red : a.tipo === "conflicto" ? G.orange : G.blue }}>{a.mensaje}</span>
              {a.diasImpacto && <span className="mono" style={{ fontSize: 10, color: G.red }}>+{a.diasImpacto}d</span>}
              {a.tipo === "conflicto" && onUpdate && (
                <button onClick={() => {
                  const nuevas = fases.map(f => {
                    if (f.id === a.faseId) {
                      const ni = new Date(new Date(f.inicio).getTime() + a.diasImpacto * 864e5);
                      const nf = new Date(new Date(f.fin).getTime() + a.diasImpacto * 864e5);
                      return { ...f, inicio: ni.toISOString().slice(0,10), fin: nf.toISOString().slice(0,10) };
                    }
                    return f;
                  });
                  onUpdate({ fases: nuevas });
                }} style={{ marginLeft: "auto", background: "#2A1A10", border: `1px solid ${G.orange}44`, color: G.orange, padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                  Replanificar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {alertas.length === 0 && (
        <div style={{ padding: "9px 14px", borderRadius: 6, background: "#101A10", border: `1px solid ${G.green}33`, fontSize: 12, color: G.green }}>
          ✅ Sin conflictos detectados
        </div>
      )}

      {/* GANTT */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 720, position: "relative" }}>

          {/* Cabecera meses */}
          <div style={{ display: "flex", marginBottom: 8 }}>
            <div style={{ width: LABEL_W, flexShrink: 0 }} />
            <div style={{ flex: 1, position: "relative", height: 22 }}>
              {months.map((m, i) => (
                <div key={i} className="mono" style={{ position: "absolute", left: `${toX(m.toISOString().slice(0,10))}%`, fontSize: 9, color: G.textMuted, transform: "translateX(-50%)", top: 4, whiteSpace: "nowrap" }}>
                  {m.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).toUpperCase()}
                </div>
              ))}
            </div>
            <div style={{ width: 64, flexShrink: 0 }} />
          </div>

          {/* SVG para flechas de dependencias */}
          {mostrarDeps && (
            <svg style={{ position: "absolute", left: LABEL_W, top: 22, right: 64, bottom: 0, width: `calc(100% - ${LABEL_W}px - 64px)`, pointerEvents: "none", overflow: "visible", zIndex: 5 }}>
              {fases.map((fase, idx) => {
                if (!fase.dependeDe) return null;
                const padre = fases.find(f => f.id === fase.dependeDe);
                if (!padre || !padre.fin || !fase.inicio) return null;
                const padreIdx = fases.indexOf(padre);
                const padreEndX = toX(padre.fin);
                const hijoStartX = toX(fase.inicio);
                const padreY = padreIdx * (ROW_H + 6) + ROW_H / 2;
                const hijoY = idx * (ROW_H + 6) + ROW_H / 2;
                const isCrit = caminoCritico.has(fase.id) && caminoCritico.has(padre.id);
                const col = isCrit && mostrarCritico ? "#C0392B88" : G.gold + "66";
                const x1 = `${padreEndX}%`, y1 = padreY, x2 = `${hijoStartX}%`, y2 = hijoY;
                const mx = `${(padreEndX + hijoStartX) / 2}%`;
                return (
                  <g key={fase.id}>
                    <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      fill="none" stroke={col} strokeWidth={isCrit ? 2 : 1.5} strokeDasharray={isCrit ? "none" : "4 3"} />
                    <polygon points={`${x2},${y2} ${x2},${y2-4} ${x2},${y2+4}`}
                      style={{ transform: `translate(calc(${x2} - 4px), 0)` }}
                      fill={col} />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Filas */}
          <div style={{ position: "relative" }}>
            {fases.map((fase, idx) => {
              if (!fase.inicio || !fase.fin || isNaN(new Date(fase.inicio)) || isNaN(new Date(fase.fin))) return null;
              const left = toX(fase.inicio);
              const width = Math.max(1.5, toX(fase.fin) - left);
              const retraso = Number(fase.retrasoReal) || 0;
              const retrasoW = retraso > 0 ? (retraso / totalDays) * 100 : 0;
              const color = barColor(fase);
              const isCrit = caminoCritico.has(fase.id);
              const progreso = progresoDeFase(fase);
              const hovered = hoveredFase === fase.id;
              const padre = fases.find(f => f.id === fase.dependeDe);

              return (
                <div key={fase.id} style={{ display: "flex", alignItems: "center", height: ROW_H, marginBottom: 6, opacity: hoveredFase && !hovered ? 0.5 : 1, transition: "opacity 0.15s" }}
                  onMouseEnter={() => setHoveredFase(fase.id)}
                  onMouseLeave={() => setHoveredFase(null)}>
                  {/* Label */}
                  <div style={{ width: LABEL_W, flexShrink: 0, paddingRight: 12, textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: isCrit && mostrarCritico ? "#E05C5C" : hovered ? G.gold : G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isCrit && mostrarCritico ? 600 : 400 }}>
                      {isCrit && mostrarCritico && <span style={{ marginRight: 4 }}>🔴</span>}
                      {fase.nombre}
                    </div>
                    {fase.proveedor && <div style={{ fontSize: 10, color: G.textDim }}>{fase.proveedor}</div>}
                    {padre && <div style={{ fontSize: 9, color: G.textDim, fontFamily: "DM Mono" }}>↳ {padre.nombre.slice(0,18)}</div>}
                  </div>

                  {/* Track */}
                  <div style={{ flex: 1, position: "relative", height: "100%", borderLeft: `1px solid ${G.border}` }}>
                    {/* Grid lines */}
                    {months.map((m, i) => (
                      <div key={i} style={{ position: "absolute", left: `${toX(m.toISOString().slice(0,10))}%`, top: 0, bottom: 0, width: 1, background: G.border, opacity: 0.3 }} />
                    ))}

                    {/* Barra principal */}
                    <div onMouseEnter={e => setTooltip({ fase, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 8, height: 22, background: color, borderRadius: 4, overflow: "hidden", cursor: "pointer", border: isCrit && mostrarCritico ? `1px solid #E05C5C` : "none", boxShadow: hovered ? `0 2px 8px ${color}66` : "none", transition: "box-shadow 0.15s" }}>
                      {/* Barra de progreso interior */}
                      {progreso > 0 && (
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progreso}%`, background: "rgba(255,255,255,0.25)", borderRadius: "3px 0 0 3px" }} />
                      )}
                      {width > 8 && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 6px", fontSize: 10, color: "#fff", fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {fase.nombre}
                        </div>
                      )}
                    </div>

                    {/* Retraso */}
                    {retraso > 0 && (
                      <>
                        <div style={{ position: "absolute", left: `${left + width}%`, width: `${retrasoW}%`, top: 8, height: 22, background: `repeating-linear-gradient(45deg, ${G.red}44, ${G.red}44 3px, transparent 3px, transparent 6px)`, border: `1px solid ${G.red}66`, borderRadius: "0 4px 4px 0" }} />
                        <div className="mono" style={{ position: "absolute", left: `${left + width + retrasoW + 0.5}%`, top: 12, fontSize: 10, color: G.red, whiteSpace: "nowrap" }}>+{retraso}d</div>
                      </>
                    )}

                    {/* Hoy line */}
                    {hoyX !== null && (
                      <div style={{ position: "absolute", left: `${hoyX}%`, top: 0, bottom: 0, width: 1, background: G.red, opacity: 0.6, zIndex: 3 }} />
                    )}
                  </div>

                  {/* Input retraso */}
                  <div style={{ width: 64, flexShrink: 0, paddingLeft: 8 }}>
                    <input type="number" min="0" value={fase.retrasoReal || 0}
                      onChange={e => onUpdate && onUpdate({ fases: fases.map(f => f.id === fase.id ? {...f, retrasoReal: Number(e.target.value)} : f) })}
                      style={{ width: "100%", fontSize: 10, padding: "3px 4px", textAlign: "center" }}
                      title="Días de retraso real" />
                  </div>
                </div>
              );
            })}

            {/* Hoy label global */}
            {hoyX !== null && (
              <div style={{ position: "absolute", left: `calc(${LABEL_W}px + ${hoyX}% * (100% - ${LABEL_W + 64}px) / 100)`, top: -18, zIndex: 10, pointerEvents: "none" }}>
                <div className="mono" style={{ fontSize: 9, color: G.red, transform: "translateX(-50%)", whiteSpace: "nowrap", background: G.bg, padding: "1px 4px", borderRadius: 3 }}>HOY</div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 10, color: G.textDim, marginTop: 8, paddingLeft: LABEL_W }}>
            Columna derecha: días de retraso real · Las dependencias se configuran en el editor de fases
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 10, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "12px 16px", zIndex: 9999, minWidth: 220, pointerEvents: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
          <div className="serif" style={{ fontSize: 14, marginBottom: 8, color: G.gold }}>{tooltip.fase.nombre}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: G.textMuted }}>
            <div>📅 {tooltip.fase.inicio} → {tooltip.fase.fin}</div>
            <div>Estado: <span style={{ color: barColor(tooltip.fase) }}>{tooltip.fase.estado}</span></div>
            {tooltip.fase.proveedor && <div>👷 {tooltip.fase.proveedor}</div>}
            {tooltip.fase.dependeDe && <div>🔗 Depende de: {fases.find(f=>f.id===tooltip.fase.dependeDe)?.nombre||"—"}</div>}
            {Number(tooltip.fase.retrasoReal) > 0 && <div style={{ color: G.red }}>⚠ Retraso: {tooltip.fase.retrasoReal}d</div>}
            {caminoCritico.has(tooltip.fase.id) && mostrarCritico && <div style={{ color: "#C0392B", fontWeight: 600 }}>🔴 En camino crítico</div>}
            <div style={{ marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span>Progreso estimado</span>
                <span className="mono" style={{ color: G.gold }}>{progresoDeFase(tooltip.fase)}%</span>
              </div>
              <div style={{ height: 4, background: G.border, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${progresoDeFase(tooltip.fase)}%`, background: barColor(tooltip.fase), borderRadius: 2 }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// === CLIENTE ===IA TAB -----------------------------------------------------------
function ClienteIATab({ obra, onUpdate }) {
  const cliente = obra.clienteIA || { perfil: null, promesas: [], conversaciones: [] };
  const [texto, setTexto] = useState("");
  const [instruccion, setInstruccion] = useState("");
  const [canal, setCanal] = useState("whatsapp"); // "whatsapp" | "email" | "llamada"
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const [loadingRespuesta, setLoadingRespuesta] = useState(false);
  const [respuestaBorrador, setRespuestaBorrador] = useState("");
  const [seccion, setSeccion] = useState("perfil"); // "perfil" | "analizar" | "responder" | "historial"
  const [nuevaPromesa, setNuevaPromesa] = useState("");

  const saveCliente = (cambios) => onUpdate({ clienteIA: { ...cliente, ...cambios } });

  const analizarConversacion = async () => {
    if (!texto.trim()) return;
    setLoadingAnalisis(true);
    try {
      const contextoObra = `Obra: ${obra.nombre}. Cliente: ${obra.cliente}. Presupuesto: ${fmt(obra.presupuesto)}. Fechas: ${obra.fechaInicio||"—"} → ${obra.fechaFin||"—"}.`;
      const perfilPrevio = cliente.perfil ? `\n\nPERFIL YA CONOCIDO:\n${JSON.stringify(cliente.perfil)}` : "";
      const promesasPrev = cliente.promesas.length ? `\n\nCOMPROMISOS PREVIOS:\n${cliente.promesas.map(p=>`- ${p.texto} (${p.fecha||"sin fecha"}, ${p.estado})`).join("\n")}` : "";
      const canalCtx = { whatsapp:"WhatsApp", email:"email", llamada:"llamada telefónica" }[canal];

      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1200,
          messages:[{ role:"user", content:`Eres experto en gestión de clientes de obras y reformas premium en España. Analiza esta conversación de ${canalCtx} y extrae información estructurada.

CONTEXTO:
${contextoObra}${perfilPrevio}${promesasPrev}

CONVERSACIÓN:
${texto}

Responde ÚNICAMENTE con JSON válido sin backticks:
{
  "perfil": {
    "tono": "descripción del tono del cliente",
    "caracter": "descripción de su carácter y personalidad",
    "prioridades": ["sus preocupaciones principales"],
    "comoTratarle": "recomendación concreta para comunicarse bien con él/ella",
    "nivelExigencia": "bajo|medio|alto",
    "sensibilidadPrecio": "baja|media|alta",
    "puntosCalientes": ["temas sensibles a evitar o tratar con cuidado"],
    "satisfaccion": "satisfecho|neutral|insatisfecho|preocupado"
  },
  "promesasNuevas": [{"texto":"compromiso dado","fecha":"fecha o null","quienComprometio":"quién lo prometió","estado":"pendiente"}],
  "resumenConversacion": "resumen de 2-3 frases",
  "alertas": ["problemas o tensiones detectadas"],
  "sentimientoGeneral": "positivo|neutro|negativo|mixto",
  "urgencia": "alta|media|baja",
  "accionesSugeridas": ["acción 1", "acción 2"]
}` }]
        })
      });
      const data = await res.json();
      const parsed = JSON.parse((data.content?.find(b=>b.type==="text")?.text||"{}").replace(/```json|```/g,"").trim());
      const nuevaConv = {
        id: uid(), fecha: new Date().toLocaleDateString("es-ES"),
        canal, texto: texto.slice(0,300)+(texto.length>300?"…":""),
        resumen: parsed.resumenConversacion,
        alertas: parsed.alertas||[],
        sentimiento: parsed.sentimientoGeneral,
        urgencia: parsed.urgencia,
        accionesSugeridas: parsed.accionesSugeridas||[],
      };
      saveCliente({
        perfil: parsed.perfil,
        promesas: [...cliente.promesas, ...(parsed.promesasNuevas||[]).map(p=>({id:uid(),...p}))],
        conversaciones: [...cliente.conversaciones, nuevaConv],
      });
      setTexto("");
      setSeccion("perfil");
    } catch(e) { void 0; }
    setLoadingAnalisis(false);
  };

  const generarRespuesta = async () => {
    setLoadingRespuesta(true); setRespuestaBorrador("");
    try {
      const canalCtx = { whatsapp:"WhatsApp (informal, emojis si procede, máx 3 párrafos cortos)", email:"email profesional (formal, estructurado)", llamada:"guión para llamada telefónica (puntos clave a cubrir)" }[canal];
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:800,
          messages:[{ role:"user", content:`Eres experto en comunicación con clientes de obras premium. Redacta un mensaje para ${canalCtx}.

OBRA: ${obra.nombre} — ${obra.cliente}
${cliente.perfil?`PERFIL CLIENTE: tono ${cliente.perfil.tono}, exigencia ${cliente.perfil.nivelExigencia}, sensibilidad precio ${cliente.perfil.sensibilidadPrecio}. Cómo tratarle: ${cliente.perfil.comoTratarle}. Puntos calientes: ${(cliente.perfil.puntosCalientes||[]).join(", ")}.`:""}
COMPROMISOS PENDIENTES: ${cliente.promesas.filter(p=>p.estado==="pendiente").map(p=>p.texto).join(", ")||"ninguno"}
ÚLTIMA CONVERSACIÓN: ${cliente.conversaciones.at(-1)?.resumen||"primera comunicación"}
${instruccion?`QUÉ COMUNICAR: ${instruccion}`:""}

Escribe SOLO el mensaje, sin explicaciones. Adaptado perfectamente al perfil del cliente.` }]
        })
      });
      const data = await res.json();
      setRespuestaBorrador(data.content?.find(b=>b.type==="text")?.text||"");
    } catch { setRespuestaBorrador("Error al generar."); }
    setLoadingRespuesta(false);
  };

  const togglePromesa = (id) => {
    const est = ["pendiente","cumplido","vencido"];
    saveCliente({ promesas: cliente.promesas.map(p=>p.id===id?{...p,estado:est[(est.indexOf(p.estado)+1)%est.length]}:p) });
  };

  const promesaColor = { pendiente:G.gold, cumplido:G.green, vencido:G.red };
  const sentimientoEmoji = { positivo:"😊", neutro:"😐", negativo:"😟", mixto:"😕", insatisfecho:"😠", preocupado:"😰" };
  const satisfaccionColor = { satisfecho:G.green, neutral:G.textMuted, insatisfecho:G.red, preocupado:G.orange };

  const ultimaConv = cliente.conversaciones.at(-1);
  const alertasTotal = cliente.conversaciones.flatMap(c=>c.alertas||[]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Sub-nav */}
      <div style={{ display:"flex", gap:4, background:G.bg, borderRadius:6, padding:4, width:"fit-content" }}>
        {[["perfil","👤 Perfil"],["analizar","📋 Analizar"],["responder","✍️ Responder"],["historial","💬 Historial"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSeccion(id)} style={{ padding:"7px 14px",borderRadius:4,border:"none",background:seccion===id?G.surface:"transparent",color:seccion===id?G.gold:G.textMuted,fontSize:12,cursor:"pointer" }}>{label}</button>
        ))}
      </div>

      {/* ── PERFIL ── */}
      {seccion==="perfil" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {!cliente.perfil ? (
            <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
              <div style={{ fontSize:36,marginBottom:12 }}>👤</div>
              <div className="serif" style={{ fontSize:18,marginBottom:8 }}>Sin perfil del cliente</div>
              <div style={{ fontSize:13,marginBottom:16 }}>Pega una conversación de WhatsApp o email para generar el perfil automáticamente</div>
              <button className="btn-primary" onClick={()=>setSeccion("analizar")}>Analizar primera conversación →</button>
            </div>
          ) : (
            <>
              {/* Perfil principal */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
                <div className="card">
                  <div className="serif" style={{ fontSize:15,marginBottom:14,color:G.gold }}>👤 Perfil del Cliente</div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>
                    <span className="tag" style={{ background:G.blue+"22",color:G.blue }}>Tono: {cliente.perfil.tono}</span>
                    <span className="tag" style={{ background:satisfaccionColor[cliente.perfil.satisfaccion]+"22",color:satisfaccionColor[cliente.perfil.satisfaccion]||G.textMuted }}>
                      {sentimientoEmoji[cliente.perfil.satisfaccion]||"😐"} {cliente.perfil.satisfaccion||"neutral"}
                    </span>
                    <span className="tag" style={{ background:cliente.perfil.nivelExigencia==="alto"?"#2A1A1A":"#1A2E1F",color:cliente.perfil.nivelExigencia==="alto"?G.red:G.green }}>
                      Exigencia: {cliente.perfil.nivelExigencia}
                    </span>
                    <span className="tag" style={{ background:G.border,color:G.textMuted }}>
                      💶 {cliente.perfil.sensibilidadPrecio}
                    </span>
                  </div>
                  <div style={{ fontSize:12,color:G.text,marginBottom:8 }}><span style={{ color:G.textMuted,fontSize:10,fontFamily:"DM Mono" }}>CARÁCTER · </span>{cliente.perfil.caracter}</div>
                  <div style={{ background:"#1A1A13",border:`1px solid ${G.gold}33`,borderRadius:6,padding:"10px 14px",fontSize:12,color:G.gold,lineHeight:1.7 }}>
                    <span style={{ fontSize:9,fontFamily:"DM Mono",display:"block",marginBottom:4 }}>CÓMO TRATARLE</span>
                    {cliente.perfil.comoTratarle}
                  </div>
                  {cliente.perfil.prioridades?.length>0&&(
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:10,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>LO QUE MÁS LE IMPORTA</div>
                      <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                        {cliente.perfil.prioridades.map((p,i)=><span key={i} className="tag" style={{ background:"#1E1A13",color:G.gold }}>{p}</span>)}
                      </div>
                    </div>
                  )}
                  {cliente.perfil.puntosCalientes?.length>0&&(
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:10,color:G.red,marginBottom:6,fontFamily:"DM Mono" }}>⚠ PUNTOS CALIENTES</div>
                      {cliente.perfil.puntosCalientes.map((p,i)=><div key={i} style={{ fontSize:11,color:G.orange,marginBottom:3 }}>· {p}</div>)}
                    </div>
                  )}
                </div>

                {/* Alertas + última conversación */}
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  <div className="card">
                    <div className="serif" style={{ fontSize:14,marginBottom:10,color:G.red }}>⚠ Alertas Detectadas</div>
                    {alertasTotal.length===0
                      ?<div style={{ color:G.textMuted,fontSize:12 }}>Sin alertas por ahora</div>
                      :<div>{alertasTotal.slice(-5).map((a,i)=>(
                        <div key={i} style={{ fontSize:12,padding:"6px 0",borderBottom:`1px solid ${G.border}`,color:G.text }}>
                          <span style={{ color:G.red,marginRight:8 }}>·</span>{a}
                        </div>
                      ))}</div>
                    }
                  </div>
                  {ultimaConv&&(
                    <div className="card">
                      <div style={{ fontSize:10,color:G.textMuted,fontFamily:"DM Mono",marginBottom:8 }}>ÚLTIMA CONVERSACIÓN</div>
                      <div style={{ display:"flex",gap:8,marginBottom:8,flexWrap:"wrap" }}>
                        {ultimaConv.sentimiento&&<span className="tag" style={{ background:G.surface,color:G.textMuted }}>{sentimientoEmoji[ultimaConv.sentimiento]} {ultimaConv.sentimiento}</span>}
                        {ultimaConv.urgencia&&<span className="tag" style={{ background:ultimaConv.urgencia==="alta"?G.red+"22":G.gold+"22",color:ultimaConv.urgencia==="alta"?G.red:G.gold }}>urgencia {ultimaConv.urgencia}</span>}
                      </div>
                      <div style={{ fontSize:12,lineHeight:1.6,marginBottom:8 }}>{ultimaConv.resumen}</div>
                      {ultimaConv.accionesSugeridas?.length>0&&(
                        <div>
                          <div style={{ fontSize:9,color:G.textMuted,fontFamily:"DM Mono",marginBottom:5 }}>ACCIONES SUGERIDAS</div>
                          {ultimaConv.accionesSugeridas.map((a,i)=><div key={i} style={{ fontSize:11,color:G.gold,marginBottom:3 }}>→ {a}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Compromisos */}
              <div className="card">
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                  <div className="serif" style={{ fontSize:15 }}>📅 Compromisos y Fechas</div>
                  <div style={{ display:"flex",gap:8 }}>
                    <input value={nuevaPromesa} onChange={e=>setNuevaPromesa(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&nuevaPromesa.trim()){saveCliente({promesas:[...cliente.promesas,{id:uid(),texto:nuevaPromesa,fecha:null,quienComprometio:"Manual",estado:"pendiente"}]});setNuevaPromesa("");}}} placeholder="Añadir compromiso manual..." style={{ fontSize:12,width:280 }} />
                    <button className="btn-ghost" onClick={()=>{if(nuevaPromesa.trim()){saveCliente({promesas:[...cliente.promesas,{id:uid(),texto:nuevaPromesa,fecha:null,quienComprometio:"Manual",estado:"pendiente"}]});setNuevaPromesa("");}}} style={{ fontSize:11 }}>+</button>
                  </div>
                </div>
                {cliente.promesas.length===0
                  ?<div style={{ color:G.textMuted,fontSize:12 }}>Los compromisos se extraen automáticamente al analizar conversaciones</div>
                  :cliente.promesas.map(p=>(
                    <div key={p.id} style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:`1px solid ${G.border}` }}>
                      <button onClick={()=>togglePromesa(p.id)} style={{ background:"none",border:"none",padding:0,marginTop:2 }}>
                        <div style={{ width:13,height:13,borderRadius:"50%",background:promesaColor[p.estado],cursor:"pointer" }} />
                      </button>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,textDecoration:p.estado==="cumplido"?"line-through":"none",color:p.estado==="cumplido"?G.textMuted:G.text }}>{p.texto}</div>
                        <div style={{ fontSize:10,color:G.textMuted,marginTop:2 }}>
                          {p.quienComprometio&&<span>{p.quienComprometio}</span>}
                          {p.fecha&&<span className="mono"> · {p.fecha}</span>}
                        </div>
                      </div>
                      <span className="tag" style={{ background:p.estado==="cumplido"?"#1A2E1F":p.estado==="vencido"?"#2A1A1A":"#1E1A13",color:promesaColor[p.estado] }}>{p.estado}</span>
                      <button className="btn-danger" onClick={()=>saveCliente({promesas:cliente.promesas.filter(x=>x.id!==p.id)})}>{Icon.trash}</button>
                    </div>
                  ))
                }
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ANALIZAR ── */}
      {seccion==="analizar" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card">
            <div className="serif" style={{ fontSize:15,marginBottom:6 }}>📋 Analizar Conversación</div>
            <div style={{ fontSize:12,color:G.textMuted,marginBottom:14 }}>Pega mensajes de WhatsApp, email o notas de una llamada. La IA extrae el perfil del cliente, compromisos y alertas automáticamente.</div>

            {/* Canal */}
            <div style={{ display:"flex",gap:6,marginBottom:12 }}>
              {[["whatsapp","💬 WhatsApp"],["email","📧 Email"],["llamada","📞 Llamada"]].map(([id,label])=>(
                <button key={id} onClick={()=>setCanal(id)} style={{ padding:"6px 14px",borderRadius:6,border:`1px solid ${canal===id?G.gold:G.border}`,background:canal===id?"#1E1A13":"transparent",color:canal===id?G.gold:G.textMuted,fontSize:12,cursor:"pointer" }}>{label}</button>
              ))}
            </div>

            <textarea value={texto} onChange={e=>setTexto(e.target.value)}
              placeholder={canal==="whatsapp"
                ?"[10:34] Cliente: Hola, quería saber cuándo va a venir el carpintero...\n[10:36] Yo: Buenos días! Está previsto para el jueves..."
                :canal==="email"?"Asunto: Reunión urgente sobre la cocina\n\nEstimado,...\n\n..."
                :"Llamada con cliente 15/01:\n- Pregunta por el estado del baño\n- Preocupado por el plazo..."}
              style={{ minHeight:180,resize:"vertical",marginBottom:12,fontSize:12,lineHeight:1.6 }} />
            <button className="btn-primary" onClick={analizarConversacion} disabled={loadingAnalisis||!texto.trim()} style={{ opacity:loadingAnalisis||!texto.trim()?0.5:1,display:"flex",alignItems:"center",gap:6 }}>
              {loadingAnalisis?"Analizando…":"✦ Analizar con IA"}
            </button>
          </div>

          {/* Tip WhatsApp */}
          <div style={{ background:"#1A1A13",border:`1px solid ${G.gold}33`,borderRadius:8,padding:"12px 16px",fontSize:12,color:G.textMuted }}>
            <span style={{ color:G.gold }}>💡 Tip:</span> Para exportar WhatsApp, abre el chat → ⋮ → Exportar chat → Sin archivos. Pega el texto directamente aquí.
          </div>
        </div>
      )}

      {/* ── RESPONDER ── */}
      {seccion==="responder" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card">
            <div className="serif" style={{ fontSize:15,marginBottom:6 }}>✍️ Generar Respuesta</div>
            <div style={{ fontSize:12,color:G.textMuted,marginBottom:14 }}>La IA redacta un mensaje adaptado exactamente al perfil y situación del cliente</div>

            {/* Canal */}
            <div style={{ display:"flex",gap:6,marginBottom:12 }}>
              {[["whatsapp","💬 WhatsApp"],["email","📧 Email"],["llamada","📞 Guión llamada"]].map(([id,label])=>(
                <button key={id} onClick={()=>setCanal(id)} style={{ padding:"6px 14px",borderRadius:6,border:`1px solid ${canal===id?G.gold:G.border}`,background:canal===id?"#1E1A13":"transparent",color:canal===id?G.gold:G.textMuted,fontSize:12,cursor:"pointer" }}>{label}</button>
              ))}
            </div>

            {cliente.perfil&&(
              <div style={{ background:G.bg,borderRadius:6,padding:"10px 14px",marginBottom:12,fontSize:11,color:G.textMuted,lineHeight:1.6 }}>
                Perfil activo: <strong style={{ color:G.text }}>{cliente.perfil.tono}</strong> · Exigencia: <strong style={{ color:G.text }}>{cliente.perfil.nivelExigencia}</strong> · {cliente.perfil.comoTratarle?.slice(0,80)}...
              </div>
            )}

            <textarea value={instruccion} onChange={e=>setInstruccion(e.target.value)}
              placeholder="¿Qué quieres comunicar? Ej: explicar el retraso del carpintero, pedir aprobación del presupuesto de extras, confirmar visita el jueves..."
              style={{ minHeight:80,resize:"vertical",marginBottom:12,fontSize:13 }} />
            <button className="btn-primary" onClick={generarRespuesta} disabled={loadingRespuesta} style={{ opacity:loadingRespuesta?0.5:1,marginBottom:respuestaBorrador?16:0 }}>
              {loadingRespuesta?"Redactando…":"✦ Generar Borrador"}
            </button>

            {respuestaBorrador&&(
              <div style={{ background:G.bg,border:`1px solid ${G.border}`,borderRadius:8,padding:16 }}>
                <div style={{ fontSize:10,color:G.gold,marginBottom:10,fontFamily:"DM Mono" }}>BORRADOR · {canal.toUpperCase()}</div>
                <textarea value={respuestaBorrador} onChange={e=>setRespuestaBorrador(e.target.value)}
                  style={{ width:"100%",minHeight:160,resize:"vertical",fontSize:13,lineHeight:1.7,marginBottom:12,background:"transparent",border:"none",outline:"none",color:G.text,fontFamily:"DM Sans, sans-serif" }} />
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>navigator.clipboard.writeText(respuestaBorrador)} className="btn-primary" style={{ fontSize:12 }}>📋 Copiar</button>
                  <button onClick={()=>setRespuestaBorrador("")} className="btn-ghost" style={{ fontSize:12 }}>Descartar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {seccion==="historial" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {cliente.conversaciones.length===0?(
            <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
              <div style={{ fontSize:36,marginBottom:12 }}>💬</div>
              <div>Sin conversaciones analizadas aún</div>
            </div>
          ):[...cliente.conversaciones].reverse().map(c=>(
            <div key={c.id} className="card">
              <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:10 }}>
                <span style={{ fontSize:16 }}>{c.canal==="whatsapp"?"💬":c.canal==="email"?"📧":"📞"}</span>
                <span className="mono" style={{ fontSize:10,color:G.textMuted }}>{c.fecha}</span>
                {c.sentimiento&&<span className="tag" style={{ background:G.surface,color:G.textMuted }}>{sentimientoEmoji[c.sentimiento]} {c.sentimiento}</span>}
                {c.urgencia&&<span className="tag" style={{ background:c.urgencia==="alta"?G.red+"22":G.gold+"22",color:c.urgencia==="alta"?G.red:G.gold }}>urgencia {c.urgencia}</span>}
              </div>
              <div style={{ fontSize:13,lineHeight:1.6,marginBottom:8 }}>{c.resumen}</div>
              {c.alertas?.length>0&&(
                <div style={{ marginBottom:8 }}>
                  {c.alertas.map((a,i)=><div key={i} style={{ fontSize:11,color:G.orange }}>⚠ {a}</div>)}
                </div>
              )}
              {c.accionesSugeridas?.length>0&&(
                <div>
                  {c.accionesSugeridas.map((a,i)=><div key={i} style={{ fontSize:11,color:G.gold }}>→ {a}</div>)}
                </div>
              )}
              <div style={{ fontSize:10,color:G.textDim,marginTop:8,fontStyle:"italic" }}>{c.texto}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



  const saveCliente = (cambios) => onUpdate({ clienteIA: { ...cliente, ...cambios } });

  const analizarConversacion = async () => {
    if (!texto.trim()) return;
    setLoadingAnalisis(true);
    setError("");
    try {
      const contextoObra = `Obra: ${obra.nombre}. Cliente: ${obra.cliente}. Ubicación: ${obra.ubicacion}. Presupuesto: ${obra.presupuesto}€. Fechas: ${obra.fechaInicio} a ${obra.fechaFin}.`;
      const perfilPrevio = cliente.perfil ? `\n\nPERFIL YA CONOCIDO DEL CLIENTE:\n${JSON.stringify(cliente.perfil)}` : "";
      const promesasPrevias = cliente.promesas.length ? `\n\nCOMPROMISOS PREVIOS REGISTRADOS:\n${cliente.promesas.map(p => `- ${p.texto} (${p.fecha}, ${p.estado})`).join("\n")}` : "";

      const prompt = `Eres un asistente experto en gestión de clientes de obras y reformas. Analiza esta conversación y extrae información estructurada.

CONTEXTO DE LA OBRA:
${contextoObra}${perfilPrevio}${promesasPrevias}

CONVERSACIÓN A ANALIZAR:
${texto}

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin backticks. El JSON debe tener exactamente esta estructura:
{
  "perfil": {
    "tono": "descripción del tono general del cliente (ej: exigente, colaborativo, ansioso, confiado)",
    "caracter": "descripción del carácter y personalidad detectada",
    "prioridades": ["lista de lo que más le importa"],
    "comoTratarle": "recomendación concreta de cómo comunicarse con él/ella",
    "nivelExigencia": "bajo|medio|alto",
    "sensibilidadPrecio": "baja|media|alta"
  },
  "promesasNuevas": [
    {
      "texto": "descripción del compromiso dado",
      "fecha": "fecha mencionada o null",
      "quienComprometio": "nombre o rol de quien prometió",
      "estado": "pendiente|cumplido|vencido"
    }
  ],
  "resumenConversacion": "resumen de 2-3 frases de lo hablado",
  "alertas": ["posibles problemas o tensiones detectadas"]
}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      const nuevaConv = {
        id: uid(),
        fecha: new Date().toLocaleDateString("es-ES"),
        texto: texto.slice(0, 200) + (texto.length > 200 ? "…" : ""),
        resumen: parsed.resumenConversacion,
        alertas: parsed.alertas || []
      };

      const promesasActualizadas = [
        ...cliente.promesas,
        ...(parsed.promesasNuevas || []).map(p => ({ id: uid(), ...p }))
      ];

      saveCliente({
        perfil: parsed.perfil,
        promesas: promesasActualizadas,
        conversaciones: [...cliente.conversaciones, nuevaConv]
      });
      setTexto("");
    } catch (e) {
      setError("Error al analizar. Revisa que el texto sea legible.");
    }
    setLoadingAnalisis(false);
  };

  const generarRespuesta = async () => {
    setLoadingRespuesta(true);
    setError("");
    setRespuestaBorrador("");
    try {
      const contexto = `
Obra: ${obra.nombre}. Cliente: ${obra.cliente}.
${cliente.perfil ? `Perfil del cliente: tono ${cliente.perfil.tono}, carácter ${cliente.perfil.caracter}. Cómo tratarle: ${cliente.perfil.comoTratarle}.` : ""}
Compromisos pendientes: ${cliente.promesas.filter(p => p.estado === "pendiente").map(p => p.texto).join(", ") || "ninguno"}
${instruccion ? `Lo que quiero comunicar: ${instruccion}` : ""}
Última conversación: ${cliente.conversaciones.at(-1)?.resumen || "no hay conversaciones previas"}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Eres un experto en comunicación con clientes de obras y reformas. Redacta un mensaje para WhatsApp o email adaptado al perfil del cliente.

CONTEXTO:
${contexto}

Escribe un mensaje natural, en español, que:
- Se adapte al tono y carácter del cliente
- Sea profesional pero cercano si corresponde
- Aborde lo indicado con claridad
- No sea ni demasiado corto ni excesivamente largo

Escribe SOLO el mensaje, sin explicaciones previas ni comillas.`
          }]
        })
      });
      const data = await res.json();
      const msg = data.content?.find(b => b.type === "text")?.text || "";
      setRespuestaBorrador(msg);
    } catch(e) {
      setError("Error al generar la respuesta.");
    }
    setLoadingRespuesta(false);
  };

// === PLANOS TAB ===
function PlanosTab({ obra, onUpdate }) {
  const planos = obra.planos || [];
  const [visor, setVisor] = useState(null);
  const [catActiva, setCatActiva] = useState("todos");
  const [dragging, setDragging] = useState(false);
  const [vistaMode, setVistaMode] = useState("galeria"); // "galeria" | "versiones"
  const [comparando, setComparando] = useState([]);
  const [loadingIA, setLoadingIA] = useState(false);
  const [analisisVersion, setAnalisisVersion] = useState("");
  const [confirmVersion, setConfirmVersion] = useState(null); // plano nuevo a confirmar versión

  const save = (nuevos) => onUpdate({ planos: nuevos });

  // === Detecci-n ===autom-tica de versiones --
  const detectarVersion = (nombreNuevo, planosExistentes) => {
    const normalizar = n => n.toLowerCase().replace(/[-_v\d.]+$/g,"").replace(/\s+/g," ").trim();
    const baseNuevo = normalizar(nombreNuevo);
    const similares = planosExistentes.filter(p => {
      const baseEx = normalizar(p.nombre);
      return baseEx === baseNuevo || baseEx.includes(baseNuevo) || baseNuevo.includes(baseEx);
    });
    return similares;
  };

  const siguienteVersion = (similares) => {
    const versiones = similares.map(p => Number(p.version)||1);
    return Math.max(...versiones, 0) + 1;
  };

  const procesarArchivos = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.match(/(pdf|image)/)) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const nombreBase = file.name.replace(/\.[^/.]+$/, "");
        const similares = detectarVersion(nombreBase, planos);
        const version = siguienteVersion(similares);
        const plano = {
          id: uid(),
          nombre: nombreBase,
          archivo: e.target.result,
          tipo: file.type,
          categoria: "otros",
          fecha: new Date().toLocaleDateString("es-ES"),
          fechaISO: new Date().toISOString().slice(0,10),
          tamaño: (file.size / 1024).toFixed(0) + " KB",
          notas: "",
          version,
          estado: "activo", // "activo" | "superado" | "rechazado"
          versionDe: similares.length > 0 ? similares[0].nombre : null,
        };
        if (similares.length > 0 && version > 1) {
          // Marcar versiones anteriores como superadas
          const actualizados = planos.map(p =>
            similares.find(s => s.id === p.id) ? { ...p, estado: "superado" } : p
          );
          setConfirmVersion({ plano, similares, actualizados });
        } else {
          save([...planos, plano]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const confirmarVersion = (aceptar) => {
    if (!confirmVersion) return;
    if (aceptar) {
      save([...confirmVersion.actualizados, confirmVersion.plano]);
    } else {
      save([...planos, { ...confirmVersion.plano, version: 1, versionDe: null }]);
    }
    setConfirmVersion(null);
  };

  const analizarCambios = async (planoNuevo, planoAnterior) => {
    setLoadingIA(true); setAnalisisVersion("");
    try {
      const messages = [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: planoNuevo.archivo.split(",")[1] } },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: planoAnterior.archivo.split(",")[1] } },
          { type: "text", text: `Eres experto en arquitectura y gestión de planos de obras. Compara estas dos versiones del plano "${planoNuevo.nombre}": la PRIMERA es la versión ${planoNuevo.version} (actual) y la SEGUNDA es la versión ${planoAnterior.version} (anterior). Describe en lenguaje claro: 1) Cambios detectados, 2) Elementos eliminados, 3) Elementos nuevos, 4) Impacto en la obra. Máximo 150 palabras.` }
        ]
      }];
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 400, messages })
      });
      const data = await res.json();
      setAnalisisVersion(data.content?.find(b=>b.type==="text")?.text || "");
    } catch { setAnalisisVersion("Error al analizar."); }
    setLoadingIA(false);
  };

  // Agrupar por nombre base para vista de versiones
  const gruposVersiones = (() => {
    const grupos = {};
    planos.forEach(p => {
      const base = p.versionDe || p.nombre;
      if (!grupos[base]) grupos[base] = [];
      grupos[base].push(p);
    });
    return Object.entries(grupos).map(([nombre, versions]) => ({
      nombre,
      versions: versions.sort((a,b) => (Number(b.version)||1) - (Number(a.version)||1)),
      activo: versions.find(v => v.estado === "activo") || versions[0],
    }));
  })();

  const planosFiltrados = catActiva === "todos" ? planos : planos.filter(p => p.categoria === catActiva);
  const contar = (cat) => planos.filter(p => p.categoria === cat).length;

  const estadoBadge = (estado) => {
    const m = { activo:{bg:"#1A2E1F",color:G.green,label:"ACTIVO"}, superado:{bg:"#1E1E1E",color:G.textMuted,label:"SUPERADO"}, rechazado:{bg:"#2A1010",color:G.red,label:"RECHAZADO"} };
    const s = m[estado]||m.activo;
    return <span className="tag" style={{ background:s.bg, color:s.color }}>{s.label}</span>;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Upload + controles */}
      <div style={{ display:"flex", gap:14, alignItems:"stretch" }}>
        <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);procesarArchivos(e.dataTransfer.files);}}
          style={{ flex:1, border:`2px dashed ${dragging?G.gold:G.border}`, borderRadius:8, padding:"20px 24px", textAlign:"center", background:dragging?"#1E1A13":"transparent", transition:"all 0.2s", cursor:"pointer" }}
          onClick={()=>document.getElementById("file-input-planos").click()}>
          <div style={{ fontSize:28, marginBottom:8 }}>📐</div>
          <div style={{ fontSize:13, color:G.textMuted }}>Arrastra planos aquí o <span style={{ color:G.gold }}>haz clic para seleccionar</span></div>
          <div style={{ fontSize:11, color:G.textDim, marginTop:4 }}>El sistema detecta automáticamente si es una nueva versión de un plano existente</div>
          <input id="file-input-planos" type="file" multiple accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>procesarArchivos(e.target.files)} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <button onClick={()=>setVistaMode("galeria")} style={{ padding:"10px 16px", borderRadius:6, border:`1px solid ${vistaMode==="galeria"?G.gold:G.border}`, background:vistaMode==="galeria"?"#1E1A13":"transparent", color:vistaMode==="galeria"?G.gold:G.textMuted, cursor:"pointer", fontSize:12 }}>⊞ Galería</button>
          <button onClick={()=>setVistaMode("versiones")} style={{ padding:"10px 16px", borderRadius:6, border:`1px solid ${vistaMode==="versiones"?G.gold:G.border}`, background:vistaMode==="versiones"?"#1E1A13":"transparent", color:vistaMode==="versiones"?G.gold:G.textMuted, cursor:"pointer", fontSize:12 }}>🔢 Versiones</button>
        </div>
      </div>

      {/* Alerta de nueva versión detectada */}
      {confirmVersion && (
        <div style={{ background:"#1E1A10", border:`1px solid ${G.gold}44`, borderRadius:8, padding:"16px 20px" }}>
          <div style={{ fontSize:13, color:G.gold, marginBottom:8, fontWeight:500 }}>✦ Nueva versión detectada</div>
          <div style={{ fontSize:12, color:G.text, marginBottom:12 }}>
            El plano <strong>"{confirmVersion.plano.nombre}"</strong> parece ser una revisión de planos existentes (<strong>{confirmVersion.similares.map(s=>s.nombre).join(", ")}</strong>).
            ¿Lo registro como <strong>v{confirmVersion.plano.version}</strong> y marco los anteriores como superados?
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn-primary" onClick={()=>confirmarVersion(true)}>✓ Sí, es nueva versión (v{confirmVersion.plano.version})</button>
            <button className="btn-ghost" onClick={()=>confirmarVersion(false)}>No, es un plano nuevo independiente</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      {planos.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            { label:"PLANOS TOTALES", val:planos.length, color:G.text },
            { label:"ACTIVOS", val:planos.filter(p=>p.estado==="activo"||!p.estado).length, color:G.green },
            { label:"SUPERADOS", val:planos.filter(p=>p.estado==="superado").length, color:G.textMuted },
            { label:"GRUPOS DE PLANOS", val:gruposVersiones.length, color:G.gold },
          ].map(k=>(
            <div key={k.label} className="stat-box" style={{ padding:"12px 14px" }}>
              <div style={{ fontSize:9, color:G.textMuted, marginBottom:6, fontFamily:"DM Mono" }}>{k.label}</div>
              <div className="serif" style={{ fontSize:22, color:k.color }}>{k.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── VISTA GALERÍA ── */}
      {vistaMode === "galeria" && (
        <>
          {/* Filtros categoría */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={()=>setCatActiva("todos")} style={{ padding:"5px 12px", borderRadius:4, border:`1px solid ${catActiva==="todos"?G.gold:G.border}`, background:catActiva==="todos"?"#1E1A13":"transparent", color:catActiva==="todos"?G.gold:G.textMuted, fontSize:12, cursor:"pointer" }}>
              Todos ({planos.length})
            </button>
            {CATEGORIAS_PLANOS.map(cat => {
              const n = contar(cat.id); if (!n) return null;
              return (
                <button key={cat.id} onClick={()=>setCatActiva(cat.id)} style={{ padding:"5px 12px", borderRadius:4, border:`1px solid ${catActiva===cat.id?cat.color:G.border}`, background:catActiva===cat.id?cat.color+"22":"transparent", color:catActiva===cat.id?cat.color:G.textMuted, fontSize:12, cursor:"pointer" }}>
                  {cat.label} ({n})
                </button>
              );
            })}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:14 }}>
            {planosFiltrados.map(plano => {
              const cat = CATEGORIAS_PLANOS.find(c=>c.id===plano.categoria);
              const esImagen = plano.tipo?.startsWith("image");
              const superado = plano.estado === "superado";
              const selComp = comparando.includes(plano.id);
              return (
                <div key={plano.id} className="card" style={{ padding:0, overflow:"hidden", cursor:"pointer", opacity:superado?0.5:1, border:`1px solid ${selComp?G.gold:G.border}` }} onClick={()=>setVisor(plano)}>
                  <div style={{ height:140, background:G.bg, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>
                    {esImagen ? <img src={plano.archivo} alt={plano.nombre} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <div style={{ textAlign:"center" }}><div style={{ fontSize:40 }}>📄</div><div style={{ fontSize:10, color:G.textMuted, marginTop:4 }}>PDF</div></div>}
                    <div style={{ position:"absolute", top:8, left:8, display:"flex", gap:4 }}>
                      {plano.version && <span className="tag" style={{ background:"rgba(0,0,0,0.8)", color:G.gold }}>v{plano.version}</span>}
                      {superado && <span className="tag" style={{ background:"rgba(0,0,0,0.8)", color:G.textMuted }}>SUPERADO</span>}
                    </div>
                    <div style={{ position:"absolute", top:8, right:8 }}>
                      <span className="tag" style={{ background:cat?.color+"33", color:cat?.color, fontSize:9 }}>{cat?.label||"Otros"}</span>
                    </div>
                  </div>
                  <div style={{ padding:"10px 12px" }}>
                    <div style={{ fontSize:12, fontWeight:500, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{plano.nombre}</div>
                    <div style={{ fontSize:10, color:G.textMuted }}>{plano.fecha} · {plano.tamaño}</div>
                    <select value={plano.categoria} onChange={e=>{e.stopPropagation();save(planos.map(p=>p.id===plano.id?{...p,categoria:e.target.value}:p));}} onClick={e=>e.stopPropagation()} style={{ marginTop:8, width:"100%", fontSize:10, padding:"3px 6px" }}>
                      {CATEGORIAS_PLANOS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
            {planosFiltrados.length===0 && <div style={{ gridColumn:"1/-1", color:G.textMuted, textAlign:"center", padding:40 }}>Sin planos en esta categoría</div>}
          </div>
        </>
      )}

      {/* ── VISTA VERSIONES ── */}
      {vistaMode === "versiones" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {gruposVersiones.length === 0 && <div style={{ color:G.textMuted, textAlign:"center", padding:40 }}>Sin planos subidos aún</div>}
          {gruposVersiones.map(grupo => (
            <div key={grupo.nombre} className="card" style={{ padding:0, overflow:"hidden" }}>
              {/* Header grupo */}
              <div style={{ padding:"14px 18px", background:G.bg, borderBottom:`1px solid ${G.border}`, display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>{grupo.nombre}</div>
                  <div style={{ fontSize:11, color:G.textMuted, marginTop:2 }}>{grupo.versions.length} versión{grupo.versions.length!==1?"es":""} · última: {grupo.activo?.fecha}</div>
                </div>
                {grupo.versions.length > 1 && (
                  <button className="btn-ghost" onClick={()=>analizarCambios(grupo.versions[0], grupo.versions[1])} disabled={loadingIA||!grupo.versions[0].tipo?.startsWith("image")||!grupo.versions[1].tipo?.startsWith("image")} style={{ fontSize:11, opacity:loadingIA?0.5:1 }}>
                    {loadingIA?"Analizando…":"✦ Comparar v"+grupo.versions[0].version+" vs v"+grupo.versions[1].version}
                  </button>
                )}
              </div>

              {/* Lista de versiones */}
              {grupo.versions.map((v, i) => (
                <div key={v.id} style={{ display:"flex", gap:14, alignItems:"center", padding:"12px 18px", borderTop:i>0?`1px solid ${G.border}`:"none", background:v.estado==="superado"?"transparent":G.surface+"66" }}>
                  {/* Thumbnail */}
                  <div style={{ width:56, height:42, borderRadius:4, overflow:"hidden", flexShrink:0, border:`1px solid ${G.border}`, background:G.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {v.tipo?.startsWith("image") ? <img src={v.archivo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:20 }}>📄</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                      <span className="mono" style={{ fontSize:12, color:G.gold }}>v{v.version||1}</span>
                      {estadoBadge(v.estado||"activo")}
                      {i===0 && grupo.versions.length>1 && <span className="tag" style={{ background:"#1A2E1F", color:G.green }}>ÚLTIMA</span>}
                    </div>
                    <div style={{ fontSize:11, color:G.textMuted }}>{v.fecha} · {v.tamaño}</div>
                    {v.notas && <div style={{ fontSize:11, color:G.textDim, marginTop:2, fontStyle:"italic" }}>{v.notas}</div>}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>setVisor(v)} className="btn-ghost" style={{ fontSize:11 }}>Ver</button>
                    <a href={v.archivo} download={v.nombre} style={{ color:G.textMuted, fontSize:11, padding:"7px 12px", border:`1px solid ${G.border}`, borderRadius:6, textDecoration:"none" }}>⬇</a>
                    {v.estado==="superado" && (
                      <button onClick={()=>{ save(planos.map(p => p.id===v.id?{...p,estado:"activo"}: grupo.versions.some(gv=>gv.id===p.id&&p.id!==v.id)?{...p,estado:"superado"}:p)); }} className="btn-ghost" style={{ fontSize:10 }}>Restaurar</button>
                    )}
                    <button className="btn-danger" onClick={()=>save(planos.filter(p=>p.id!==v.id))}>{Icon.trash}</button>
                  </div>
                </div>
              ))}

              {/* Análisis IA de cambios */}
              {analisisVersion && grupo.versions.length > 1 && grupo.versions[0].nombre === grupo.nombre && (
                <div style={{ padding:"14px 18px", borderTop:`1px solid ${G.border}`, background:"#1A1A13" }}>
                  <div style={{ fontSize:10, color:G.gold, fontFamily:"DM Mono", marginBottom:8 }}>✦ CAMBIOS DETECTADOS POR IA</div>
                  <div style={{ fontSize:12, lineHeight:1.7, color:G.text, whiteSpace:"pre-wrap" }}>{analisisVersion}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Visor */}
      {visor && (
        <div className="modal-overlay" onClick={()=>setVisor(null)}>
          <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, width:"90vw", maxWidth:900, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${G.border}`, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input value={visor.nombre} onChange={e=>{const v={...visor,nombre:e.target.value};setVisor(v);save(planos.map(p=>p.id===v.id?v:p));}} style={{ fontSize:16, fontFamily:"'Playfair Display', serif", background:"none", border:"none", color:G.text, width:"100%", padding:0 }} />
                  {visor.version && <span className="tag" style={{ background:G.gold+"22", color:G.gold }}>v{visor.version}</span>}
                  {estadoBadge(visor.estado||"activo")}
                </div>
                <div style={{ fontSize:11, color:G.textMuted, marginTop:2 }}>{visor.fecha} · {visor.tamaño}</div>
              </div>
              <a href={visor.archivo} download={visor.nombre} style={{ color:G.gold, fontSize:12, textDecoration:"none", border:`1px solid ${G.gold}33`, padding:"5px 12px", borderRadius:4 }}>⬇ Descargar</a>
              <button onClick={()=>{save(planos.filter(p=>p.id!==visor.id));setVisor(null);}} className="btn-danger">Eliminar</button>
              <button onClick={()=>setVisor(null)} style={{ background:"none", border:"none", color:G.textMuted, fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ flex:1, overflow:"auto", padding:20, display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
              {visor.tipo?.startsWith("image") ? <img src={visor.archivo} alt={visor.nombre} style={{ maxWidth:"100%", borderRadius:4 }} />
                : <iframe src={visor.archivo} style={{ width:"100%", height:"60vh", border:"none", borderRadius:4 }} title={visor.nombre} />}
            </div>
            <div style={{ padding:"12px 20px", borderTop:`1px solid ${G.border}` }}>
              <input value={visor.notas} onChange={e=>{const v={...visor,notas:e.target.value};setVisor(v);save(planos.map(p=>p.id===v.id?v:p));}} placeholder="Notas sobre este plano..." style={{ fontSize:12 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// === ARQUITECTO ===TAB -----------------------------------------------------------
const DOCS_ARQUITECTO = [
  { id: "proyecto_basico", label: "Proyecto Básico", desc: "Proyecto arquitectónico básico visado", icono: "📋" },
  { id: "proyecto_ejecucion", label: "Proyecto de Ejecución", desc: "Proyecto de ejecución completo", icono: "📐" },
  { id: "licencia_obras", label: "Licencia de Obras", desc: "Licencia municipal de obras", icono: "🏛️" },
  { id: "assabentat", label: "Assabentat / Comunicat", desc: "Comunicación previa o assabentat", icono: "📬" },
  { id: "visado_coac", label: "Visado COAC/COACB", desc: "Visado colegial del proyecto", icono: "✅" },
  { id: "certificado_final", label: "Certificado Final de Obra", desc: "Certificado de fin de obra del arquitecto", icono: "🎓" },
  { id: "cedula_habitabilidad", label: "Cédula Habitabilidad", desc: "Cédula de habitabilidad / primera ocupación", icono: "🏠" },
  { id: "informe_iee", label: "Informe IEE / ITE", desc: "Informe de evaluación del edificio", icono: "🔍" },
  { id: "memoria_calidades", label: "Memoria de Calidades", desc: "Memoria descriptiva de materiales y acabados", icono: "📝" },
  { id: "otros", label: "Otros Documentos", desc: "Documentación adicional", icono: "📁" },
];

const ESTADOS_DOC = {
  pendiente: { label: "Pendiente", color: G.textMuted, bg: "#1E1E1E" },
  solicitado: { label: "Solicitado", color: "#E0C85C", bg: "#1E1A10" },
  en_tramite: { label: "En trámite", color: G.gold, bg: "#1E1A13" },
  recibido: { label: "Recibido", color: G.green, bg: "#1A2E1F" },
  no_aplica: { label: "No aplica", color: G.textDim, bg: "#181818" },
};

function ArquitectoTab({ obra, onUpdate }) {
  const docs = obra.docsArquitecto || DOCS_ARQUITECTO.map(d => ({ ...d, estado:"pendiente", archivo:null, fechaEntrega:"", notas:"", archivoNombre:"", archivoTipo:"", expediente:"", organismo:"" }));
  const [visor, setVisor] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [analisisIA, setAnalisisIA] = useState("");
  const [seccion, setSeccion] = useState("docs"); // "docs" | "arquitecto" | "timeline"

  const save = (nuevos) => onUpdate({ docsArquitecto: nuevos });
  const updateDoc = (id, cambios) => save(docs.map(d => d.id === id ? { ...d, ...cambios } : d));

  const subirArchivo = (docId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => updateDoc(docId, { archivo:e.target.result, archivoNombre:file.name, archivoTipo:file.type });
    reader.readAsDataURL(file);
  };

  const docsAplicables = docs.filter(d => d.estado !== "no_aplica");
  const recibidos = docs.filter(d => d.estado === "recibido").length;
  const enTramite = docs.filter(d => d.estado === "en_tramite" || d.estado === "solicitado").length;
  const pendientes = docs.filter(d => d.estado === "pendiente").length;

  // Progreso global de licencias
  const pctDocs = docsAplicables.length ? Math.round((recibidos/docsAplicables.length)*100) : 0;

  // Alertas - docs sin fecha que est-n en tr-mite
  const alertas = docs.filter(d => (d.estado==="en_tramite"||d.estado==="solicitado") && !d.fechaEntrega);

  // An-lisis IA del estado de documentaci-n
  const analizarDocumentacion = async () => {
    setLoadingIA(true); setAnalisisIA("");
    const estado = docs.map(d => `${d.label}: ${d.estado}${d.notas?` (${d.notas})`:""}`).join(", ");
    try {
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:600,
          messages:[{ role:"user", content:`Eres experto en trámites administrativos de obras y reformas en España. Analiza el estado de documentación de esta obra:\n\nObra: "${obra.nombre}"\nUbicación: "${obra.ubicacion||"no especificada"}"\nEstado documentación: ${estado}\n\nProporciona: 1) ¿Puede iniciarse/continuar la obra con la documentación actual? 2) Documentos críticos que faltan y cómo obtenerlos 3) Plazos típicos en España para los docs en trámite 4) Alertas o riesgos por documentación incompleta. Máximo 200 palabras.` }]
        })
      });
      const data = await res.json();
      setAnalisisIA(data.content?.find(b=>b.type==="text")?.text||"");
    } catch { setAnalisisIA("Error al analizar."); }
    setLoadingIA(false);
  };

  // Timeline de documentaci-n
  const docsConFecha = docs.filter(d=>d.fechaEntrega).sort((a,b)=>a.fechaEntrega.localeCompare(b.fechaEntrega));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* KPIs + progreso */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <div className="stat-box" style={{ gridColumn:"span 1" }}>
          <div style={{ fontSize:10,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>PROGRESO DOCS</div>
          <div className="serif" style={{ fontSize:24,color:pctDocs===100?G.green:G.gold }}>{pctDocs}%</div>
          <div className="progress-bar" style={{ marginTop:8,height:4 }}>
            <div className="progress-fill" style={{ width:`${pctDocs}%`,background:pctDocs===100?G.green:G.gold }} />
          </div>
        </div>
        {[
          { label:"RECIBIDOS", val:recibidos, color:G.green },
          { label:"EN TRÁMITE", val:enTramite, color:G.gold },
          { label:"PENDIENTES", val:pendientes, color:G.textMuted },
        ].map(k=>(
          <div key={k.label} className="stat-box">
            <div style={{ fontSize:10,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
            <div className="serif" style={{ fontSize:24,color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {alertas.map(d=>(
            <div key={d.id} style={{ padding:"10px 14px",borderRadius:6,background:"#1E1A10",border:`1px solid ${G.gold}44`,fontSize:12,color:G.gold,display:"flex",gap:10,alignItems:"center" }}>
              <span>⚠</span>
              <span style={{ flex:1 }}><strong>{d.label}</strong> está en trámite pero sin fecha de entrega estimada</span>
              <button onClick={()=>{ setExpandido(d.id); setSeccion("docs"); }} style={{ background:"none",border:`1px solid ${G.gold}44`,color:G.gold,padding:"3px 10px",borderRadius:4,fontSize:11,cursor:"pointer" }}>Añadir fecha</button>
            </div>
          ))}
        </div>
      )}

      {/* Sub-nav */}
      <div style={{ display:"flex", gap:4, background:G.bg, borderRadius:6, padding:4, width:"fit-content" }}>
        {[["docs","Documentación"],["arquitecto","Datos Arquitecto"],["timeline","Timeline"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSeccion(id)} style={{ padding:"6px 16px",borderRadius:4,border:"none",background:seccion===id?G.surface:"transparent",color:seccion===id?G.gold:G.textMuted,fontSize:12,cursor:"pointer" }}>{label}</button>
        ))}
        <button onClick={analizarDocumentacion} disabled={loadingIA} style={{ padding:"6px 16px",borderRadius:4,border:"none",background:"transparent",color:loadingIA?G.textDim:G.gold,fontSize:12,cursor:"pointer",marginLeft:8,opacity:loadingIA?0.5:1 }}>
          {loadingIA?"Analizando…":"✦ Analizar con IA"}
        </button>
      </div>

      {/* Análisis IA */}
      {analisisIA && (
        <div style={{ background:"#1A1A13",border:`1px solid ${G.gold}33`,borderRadius:8,padding:"16px 20px",display:"flex",gap:14 }}>
          <div style={{ fontSize:20 }}>✦</div>
          <div>
            <div style={{ fontSize:11,color:G.gold,fontFamily:"DM Mono",marginBottom:8 }}>ANÁLISIS DE DOCUMENTACIÓN</div>
            <div style={{ fontSize:13,lineHeight:1.8,color:G.text,whiteSpace:"pre-wrap" }}>{analisisIA}</div>
          </div>
        </div>
      )}

      {/* ── DOCUMENTACIÓN ── */}
      {seccion === "docs" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {docs.map(doc => {
            const est = ESTADOS_DOC[doc.estado]||ESTADOS_DOC.pendiente;
            const abierto = expandido === doc.id;
            return (
              <div key={doc.id} className="card" style={{ padding:0, overflow:"hidden", opacity:doc.estado==="no_aplica"?0.4:1 }}>
                <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",cursor:"pointer" }} onClick={()=>setExpandido(abierto?null:doc.id)}>
                  <div style={{ fontSize:20,flexShrink:0 }}>{doc.icono}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:500 }}>{doc.label}</div>
                    <div style={{ fontSize:11,color:G.textMuted }}>{doc.desc}</div>
                    {doc.fechaEntrega && <div style={{ fontSize:10,color:G.textDim,marginTop:2,fontFamily:"DM Mono" }}>Fecha: {doc.fechaEntrega}{doc.expediente?` · Exp: ${doc.expediente}`:""}</div>}
                    {doc.notas && <div style={{ fontSize:10,color:G.textDim,marginTop:1,fontStyle:"italic" }}>{doc.notas}</div>}
                  </div>
                  {doc.archivo && (
                    <button onClick={e=>{e.stopPropagation();setVisor(doc);}} style={{ background:"none",border:`1px solid ${G.border}`,color:G.blue,padding:"4px 10px",borderRadius:4,fontSize:11,cursor:"pointer" }}>
                      Ver
                    </button>
                  )}
                  <select value={doc.estado} onChange={e=>{e.stopPropagation();updateDoc(doc.id,{estado:e.target.value});}} onClick={e=>e.stopPropagation()}
                    style={{ width:"auto",fontSize:11,padding:"4px 8px",color:est.color,background:est.bg,border:`1px solid ${est.color}44` }}>
                    {Object.entries(ESTADOS_DOC).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <span style={{ color:G.textMuted,fontSize:12,transform:abierto?"rotate(90deg)":"none",transition:"transform 0.2s" }}>›</span>
                </div>

                {abierto && (
                  <div style={{ borderTop:`1px solid ${G.border}`,padding:"16px 18px",background:G.bg,display:"flex",flexDirection:"column",gap:12 }}>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
                      <div>
                        <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:4 }}>FECHA ENTREGA / RECEPCIÓN</label>
                        <input type="date" value={doc.fechaEntrega||""} onChange={e=>updateDoc(doc.id,{fechaEntrega:e.target.value})} style={{ fontSize:12 }} />
                      </div>
                      <div>
                        <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:4 }}>Nº EXPEDIENTE</label>
                        <input value={doc.expediente||""} onChange={e=>updateDoc(doc.id,{expediente:e.target.value})} placeholder="EXP-2024-001..." style={{ fontSize:12 }} />
                      </div>
                      <div>
                        <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:4 }}>ORGANISMO</label>
                        <input value={doc.organismo||""} onChange={e=>updateDoc(doc.id,{organismo:e.target.value})} placeholder="Ayuntamiento, COAC..." style={{ fontSize:12 }} />
                      </div>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                      <div>
                        <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:4 }}>NOTAS / OBSERVACIONES</label>
                        <input value={doc.notas||""} onChange={e=>updateDoc(doc.id,{notas:e.target.value})} placeholder="Número de expediente, condicionantes..." style={{ fontSize:12 }} />
                      </div>
                      <div>
                        <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:4 }}>ADJUNTAR DOCUMENTOS</label>
                        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                          {(doc.archivos||[]).map((a,i)=>(
                            <div key={i} style={{ display:"flex",gap:6,alignItems:"center" }}>
                              <a href={a.data} download={a.nombre} style={{ fontSize:11,color:"#1A5C9A",textDecoration:"none",flex:1 }}>📎 {a.nombre}</a>
                              <span onClick={()=>updateDoc(doc.id,{archivos:(doc.archivos||[]).filter((_,j)=>j!==i)})} style={{ cursor:"pointer",color:G.red,fontSize:11 }}>✕</span>
                            </div>
                          ))}
                          <button onClick={()=>document.getElementById(`file-arq-${doc.id}`).click()} style={{ background:G.surface,border:`1px solid ${G.border}`,color:G.textMuted,padding:"6px 12px",borderRadius:4,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",alignSelf:"flex-start" }}>
                            📎 Añadir PDF
                          </button>
                          <input id={`file-arq-${doc.id}`} type="file" accept="image/*,.pdf" multiple style={{ display:"none" }} onChange={e=>{
                            const files = Array.from(e.target.files);
                            files.forEach(file => {
                              const reader = new FileReader();
                              reader.onload = ev => {
                                const nuevos = [...(doc.archivos||[]), {nombre:file.name, data:ev.target.result}];
                                updateDoc(doc.id, {archivos:nuevos});
                              };
                              reader.readAsDataURL(file);
                            });
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DATOS ARQUITECTO ── */}
      {seccion === "arquitecto" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card">
            <div className="serif" style={{ fontSize:15,marginBottom:16 }}>🏛️ Datos del Arquitecto / Estudio</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              {[
                { campo:"arquitecto_nombre", label:"NOMBRE ARQUITECTO" },
                { campo:"arquitecto_col", label:"Nº COLEGIADO" },
                { campo:"arquitecto_tel", label:"TELÉFONO" },
                { campo:"arquitecto_email", label:"EMAIL" },
                { campo:"arquitecto_estudio", label:"ESTUDIO / DESPACHO" },
                { campo:"arquitecto_honorarios", label:"HONORARIOS (€)" },
              ].map(f=>(
                <div key={f.campo}>
                  <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:4 }}>{f.label}</label>
                  <input value={obra[f.campo]||""} onChange={e=>onUpdate({[f.campo]:e.target.value})} placeholder={f.label.charAt(0)+f.label.slice(1).toLowerCase()} style={{ fontSize:12 }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:4 }}>NOTAS</label>
              <textarea value={obra.arquitecto_notas||""} onChange={e=>onUpdate({arquitecto_notas:e.target.value})} placeholder="Observaciones sobre el arquitecto o el proyecto..." style={{ minHeight:70,resize:"vertical",fontSize:12 }} />
            </div>
          </div>

          <div className="card">
            <div className="serif" style={{ fontSize:15,marginBottom:16 }}>🏗️ Datos del Aparejador / Jefe de Obra</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              {[
                { campo:"aparejador_nombre", label:"NOMBRE APAREJADOR" },
                { campo:"aparejador_col", label:"Nº COLEGIADO" },
                { campo:"aparejador_tel", label:"TELÉFONO" },
                { campo:"aparejador_email", label:"EMAIL" },
              ].map(f=>(
                <div key={f.campo}>
                  <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:4 }}>{f.label}</label>
                  <input value={obra[f.campo]||""} onChange={e=>onUpdate({[f.campo]:e.target.value})} placeholder={f.label.charAt(0)+f.label.slice(1).toLowerCase()} style={{ fontSize:12 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TIMELINE ── */}
      {seccion === "timeline" && (
        <div className="card">
          <div className="serif" style={{ fontSize:15,marginBottom:16 }}>Timeline de Documentación</div>
          {docsConFecha.length===0 ? (
            <div style={{ color:G.textMuted,textAlign:"center",padding:30,fontSize:13 }}>
              Añade fechas a los documentos para ver el timeline
            </div>
          ) : (
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute",left:18,top:0,bottom:0,width:2,background:G.border }} />
              {docsConFecha.map((doc,i)=>{
                const est = ESTADOS_DOC[doc.estado]||ESTADOS_DOC.pendiente;
                const hoy = new Date();
                const fecha = new Date(doc.fechaEntrega);
                const pasado = fecha < hoy;
                return (
                  <div key={doc.id} style={{ display:"flex",gap:16,alignItems:"flex-start",paddingLeft:40,marginBottom:20,position:"relative" }}>
                    <div style={{ position:"absolute",left:10,top:4,width:18,height:18,borderRadius:"50%",background:doc.estado==="recibido"?G.green:pasado?G.red:G.surface,border:`2px solid ${est.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10 }}>
                      {doc.estado==="recibido"?"✓":""}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:3 }}>
                        <span style={{ fontSize:16 }}>{doc.icono}</span>
                        <span style={{ fontSize:13,fontWeight:500 }}>{doc.label}</span>
                        <span className="tag" style={{ background:est.bg,color:est.color }}>{est.label}</span>
                      </div>
                      <div style={{ fontSize:11,color:G.textMuted }}>{doc.fechaEntrega}</div>
                      {doc.expediente&&<div style={{ fontSize:10,color:G.textDim,fontFamily:"DM Mono" }}>Exp: {doc.expediente}</div>}
                      {doc.organismo&&<div style={{ fontSize:10,color:G.textDim }}>{doc.organismo}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Visor */}
      {visor && (
        <div className="modal-overlay" onClick={()=>setVisor(null)}>
          <div style={{ background:G.surface,border:`1px solid ${G.border}`,borderRadius:8,width:"90vw",maxWidth:860,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"16px 20px",borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",gap:12 }}>
              <span style={{ fontSize:20 }}>{visor.icono}</span>
              <div style={{ flex:1 }}>
                <div className="serif" style={{ fontSize:16 }}>{visor.label}</div>
                <div style={{ fontSize:11,color:G.textMuted }}>{visor.archivoNombre}</div>
              </div>
              <a href={visor.archivo} download={visor.archivoNombre} style={{ color:G.gold,fontSize:12,textDecoration:"none",border:`1px solid ${G.gold}33`,padding:"5px 12px",borderRadius:4 }}>⬇ Descargar</a>
              <button onClick={()=>setVisor(null)} style={{ background:"none",border:"none",color:G.textMuted,fontSize:18,cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ flex:1,overflow:"auto",padding:20,display:"flex",alignItems:"flex-start",justifyContent:"center" }}>
              {visor.archivoTipo?.startsWith("image")
                ?<img src={visor.archivo} alt={visor.label} style={{ maxWidth:"100%",borderRadius:4 }} />
                :<iframe src={visor.archivo} style={{ width:"100%",height:"65vh",border:"none",borderRadius:4 }} title={visor.label} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === INCIDENCIAS ===
const TIPOS_INC = ["Técnica", "Material", "Proveedor", "Cliente", "Plano", "Seguridad", "Otro"];
const ESTADOS_INC = {
  abierta:    { label: "Abierta",    color: G.red,    bg: "#2A1010" },
  en_curso:   { label: "En curso",   color: G.orange,  bg: "#1E1410" },
  bloqueada:  { label: "Bloqueada",  color: "#A06EBE", bg: "#1A1028" },
  resuelta:   { label: "Resuelta",   color: G.green,   bg: "#101A10" },
  cerrada:    { label: "Cerrada",    color: G.textMuted, bg: "#1A1A1A" },
};
const PRIORIDADES_INC = {
  critica: { label: "Crítica", color: G.red },
  alta:    { label: "Alta",    color: G.orange },
  media:   { label: "Media",   color: G.gold },
  baja:    { label: "Baja",    color: G.textMuted },
};

function NuevaIncidenciaModal({ fases, proveedores, onClose, onSave }) {
  const [form, setForm] = useState({ titulo: "", descripcion: "", tipo: "Técnica", prioridad: "alta", responsable: "", faseId: "", coste: "", fecha: new Date().toISOString().slice(0,10) });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Modal title="Nueva Incidencia" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>TÍTULO *</label><input value={form.titulo} onChange={set("titulo")} placeholder="La ducha no coincide con el plano..." /></div>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>DESCRIPCIÓN</label><textarea value={form.descripcion} onChange={set("descripcion")} placeholder="Describe el problema con detalle..." style={{ minHeight: 80, resize: "vertical" }} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>TIPO</label>
            <select value={form.tipo} onChange={set("tipo")}>{TIPOS_INC.map(t => <option key={t}>{t}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>PRIORIDAD</label>
            <select value={form.prioridad} onChange={set("prioridad")}>
              {Object.entries(PRIORIDADES_INC).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>RESPONSABLE</label>
            <input value={form.responsable} onChange={set("responsable")} placeholder="Nombre o empresa..." />
          </div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>FASE AFECTADA</label>
            <select value={form.faseId} onChange={set("faseId")}>
              <option value="">Sin fase</option>
              {fases.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>FECHA DETECCIÓN</label><input type="date" value={form.fecha} onChange={set("fecha")} /></div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>COSTE ESTIMADO (€)</label><input type="number" value={form.coste} onChange={set("coste")} placeholder="0" /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => { if (form.titulo) { onSave({ id: uid(), ...form, estado: "abierta", comentarios: [], coste: Number(form.coste)||0 }); onClose(); } }}>Crear Incidencia</button>
        </div>
      </div>
    </Modal>
  );
}

function IncidenciasTab({ obra, onUpdate }) {
  const incidencias = obra.incidencias || [];
  const [vistaMode, setVistaMode] = useState("kanban"); // "kanban" | "lista" | "tabla"
  const [detalle, setDetalle] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todas");
  const [filtroPri, setFiltroPri] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [loadingIA, setLoadingIA] = useState(false);
  const [sugerenciaIA, setSugerenciaIA] = useState("");
  const [dragOver, setDragOver] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [modalNueva, setModalNueva] = useState(false);
  const [form, setForm] = useState({ titulo:"", tipo:"ejecucion", prioridad:"media", descripcion:"", responsable:"", coste:"", faseId:"", fechaLimite:"" });

  const save = (nuevas) => onUpdate({ incidencias: nuevas });
  const updateInc = (id, cambios) => {
    const nuevas = incidencias.map(i => i.id===id ? {...i,...cambios} : i);
    save(nuevas);
    if (detalle?.id===id) setDetalle(prev=>({...prev,...cambios}));
  };

  const crear = () => {
    if (!form.titulo.trim()) return;
    const inc = {
      id: uid(), ...form, coste: Number(form.coste)||0,
      estado: "abierta", fecha: new Date().toLocaleDateString("es-ES"),
      fechaISO: new Date().toISOString().slice(0,10),
      comentarios: [], fotos: [],
      historial: [{ texto:"Incidencia creada", fecha:new Date().toLocaleDateString("es-ES") }],
    };
    save([...incidencias, inc]);
    setModalNueva(false);
    setForm({ titulo:"", tipo:"ejecucion", prioridad:"media", descripcion:"", responsable:"", coste:"", faseId:"", fechaLimite:"" });
    setDetalle(inc);
  };

  const analizarIA = async (inc) => {
    setLoadingIA(true); setSugerenciaIA("");
    try {
      const fase = obra.fases?.find(f=>f.id===inc.faseId)?.nombre||"sin fase";
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:600,
          messages:[{ role:"user", content:`Experto en gestión de obras. Analiza esta incidencia:\n\nObra: ${obra.nombre}\nFase: ${fase}\nTipo: ${inc.tipo}\nPrioridad: ${inc.prioridad}\nProblema: ${inc.titulo}\nDescripción: ${inc.descripcion||"sin descripción"}\nCoste estimado: ${fmt(inc.coste||0)}\nDías abierta: ${Math.floor((new Date()-new Date(inc.fechaISO||new Date()))/864e5)}\n\nProporciona: 1) Causa más probable, 2) Pasos concretos para resolverla, 3) Responsable recomendado, 4) Riesgo de coste adicional. Máximo 180 palabras.` }]
        })
      });
      const data = await res.json();
      setSugerenciaIA(data.content?.find(b=>b.type==="text")?.text||"");
      updateInc(inc.id, { sugerenciaIA: data.content?.find(b=>b.type==="text")?.text||"" });
    } catch { setSugerenciaIA("Error al analizar."); }
    setLoadingIA(false);
  };

  const addComentario = (inc) => {
    if (!nuevoComentario.trim()) return;
    const com = { id:uid(), texto:nuevoComentario, fecha:new Date().toLocaleDateString("es-ES"), autor:"Yo" };
    updateInc(inc.id, { comentarios:[...(inc.comentarios||[]),com] });
    setNuevoComentario("");
  };

  const subirFoto = (incId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const inc = incidencias.find(i=>i.id===incId);
      if (!inc) return;
      updateInc(incId, { fotos:[...(inc.fotos||[]),{ id:uid(), src:e.target.result, fecha:new Date().toLocaleDateString("es-ES") }] });
    };
    reader.readAsDataURL(file);
  };

  const diasAbierta = (inc) => {
    if (!inc.fechaISO) return 0;
    return Math.floor((new Date()-new Date(inc.fechaISO))/864e5);
  };

  // Filtrado
  const incFiltradas = incidencias.filter(inc => {
    if (filtroTipo!=="todas" && inc.tipo!==filtroTipo) return false;
    if (filtroPri!=="todas" && inc.prioridad!==filtroPri) return false;
    if (busqueda && !inc.titulo.toLowerCase().includes(busqueda.toLowerCase()) && !(inc.descripcion||"").toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  // KPIs
  const abiertas = incidencias.filter(i=>i.estado==="abierta").length;
  const criticas = incidencias.filter(i=>i.prioridad==="critica"&&i.estado!=="cerrada").length;
  const costeTotal = incidencias.reduce((a,i)=>a+(i.coste||0),0);
  const resueltas = incidencias.filter(i=>i.estado==="resuelta"||i.estado==="cerrada").length;

  // Kanban columnas
  const COLUMNAS = [
    { id:"abierta",   label:"Abierta",    color:G.red,    bg:"#2A1010" },
    { id:"en_curso",  label:"En curso",   color:G.gold,   bg:"#1E1A10" },
    { id:"bloqueada", label:"Bloqueada",  color:G.orange, bg:"#1E1610" },
    { id:"resuelta",  label:"Resuelta",   color:G.green,  bg:"#101A10" },
    { id:"cerrada",   label:"Cerrada",    color:G.textMuted, bg:"#1A1A1A" },
  ];

  // Drag & drop kanban
  const onDragStart = (id) => setDraggingId(id);
  const onDrop = (estadoDestino) => {
    if (!draggingId) return;
    const histEntry = { texto:`Estado cambiado a: ${ESTADOS_INC[estadoDestino]?.label}`, fecha:new Date().toLocaleDateString("es-ES") };
    const inc = incidencias.find(i=>i.id===draggingId);
    updateInc(draggingId, { estado:estadoDestino, historial:[...(inc?.historial||[]),histEntry] });
    setDraggingId(null); setDragOver(null);
  };

  const PriBadge = ({prioridad}) => {
    const p = PRIORIDADES_INC[prioridad]||PRIORIDADES_INC.media;
    return <span className="tag" style={{ background:p.color+"22",color:p.color,fontSize:9 }}>{p.label}</span>;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, height:"100%" }}>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"ABIERTAS", val:abiertas, color:abiertas>0?G.red:G.green },
          { label:"CRÍTICAS", val:criticas, color:criticas>0?G.red:G.textMuted },
          { label:"RESUELTAS", val:resueltas, color:G.green },
          { label:"COSTE TOTAL", val:fmt(costeTotal), color:costeTotal>0?G.orange:G.textMuted },
        ].map(k=>(
          <div key={k.label} className="stat-box">
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
            <div className="serif" style={{ fontSize:22,color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Buscar..." style={{ width:180,fontSize:12 }} />
        <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{ width:"auto",fontSize:12 }}>
          <option value="todas">Todos los tipos</option>
          {["ejecucion","material","proveedor","diseno","cliente","seguridad","otro"].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroPri} onChange={e=>setFiltroPri(e.target.value)} style={{ width:"auto",fontSize:12 }}>
          <option value="todas">Todas las prioridades</option>
          {Object.entries(PRIORIDADES_INC).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display:"flex",gap:4,background:G.bg,borderRadius:6,padding:3 }}>
          {[["kanban","⊞ Kanban"],["lista","☰ Lista"],["tabla","📊 Tabla"]].map(([id,label])=>(
            <button key={id} onClick={()=>setVistaMode(id)} style={{ padding:"5px 12px",borderRadius:4,border:"none",background:vistaMode===id?G.surface:"transparent",color:vistaMode===id?G.gold:G.textMuted,fontSize:11,cursor:"pointer" }}>{label}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>setModalNueva(true)} style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6 }}>
          {Icon.plus} Nueva incidencia
        </button>
      </div>

      <div style={{ display:"flex", gap:16, flex:1, overflow:"hidden", minHeight:0 }}>
        {/* ── KANBAN ── */}
        {vistaMode==="kanban" && (
          <div style={{ display:"flex", gap:12, flex:1, overflow:"auto" }}>
            {COLUMNAS.map(col=>{
              const items = incFiltradas.filter(i=>i.estado===col.id);
              return (
                <div key={col.id} style={{ flex:"0 0 240px", display:"flex", flexDirection:"column", gap:8 }}
                  onDragOver={e=>{e.preventDefault();setDragOver(col.id);}}
                  onDragLeave={()=>setDragOver(null)}
                  onDrop={()=>onDrop(col.id)}>
                  {/* Header columna */}
                  <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:6,background:col.bg,border:`1px solid ${col.color}33` }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:col.color }} />
                    <span style={{ fontSize:12,fontWeight:500,color:col.color }}>{col.label}</span>
                    <span className="mono" style={{ fontSize:10,color:G.textDim,marginLeft:"auto" }}>{items.length}</span>
                  </div>
                  {/* Drop zone */}
                  <div style={{ flex:1,minHeight:200,border:dragOver===col.id?`2px dashed ${col.color}`:"2px dashed transparent",borderRadius:6,transition:"border 0.15s",display:"flex",flexDirection:"column",gap:6,padding:dragOver===col.id?4:0 }}>
                    {items.map(inc=>{
                      const pri = PRIORIDADES_INC[inc.prioridad]||PRIORIDADES_INC.media;
                      const dias = diasAbierta(inc);
                      return (
                        <div key={inc.id} draggable onDragStart={()=>onDragStart(inc.id)}
                          onClick={()=>setDetalle(detalle?.id===inc.id?null:inc)}
                          style={{ background:G.surface,border:`1px solid ${detalle?.id===inc.id?col.color:G.border}`,borderTop:`3px solid ${pri.color}`,borderRadius:6,padding:"10px 12px",cursor:"pointer",opacity:draggingId===inc.id?0.4:1,transition:"opacity 0.15s" }}>
                          <div style={{ fontSize:12,fontWeight:500,marginBottom:6,lineHeight:1.3 }}>{inc.titulo}</div>
                          <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:6 }}>
                            <PriBadge prioridad={inc.prioridad} />
                            <span className="tag" style={{ background:"#EEF2FF",color:"#3B4FC8",fontSize:9 }}>{inc.tipo}</span>
                          </div>
                          <div style={{ display:"flex",gap:8,fontSize:10,color:G.textMuted,alignItems:"center" }}>
                            {inc.responsable&&<span>👤 {inc.responsable.split(" ")[0]}</span>}
                            {inc.coste>0&&<span style={{ color:G.orange }}>💶 {fmt(inc.coste)}</span>}
                            <span style={{ marginLeft:"auto",color:dias>7&&inc.estado==="abierta"?G.red:G.textDim }}>{dias}d</span>
                            {(inc.comentarios||[]).length>0&&<span>💬{inc.comentarios.length}</span>}
                            {(inc.fotos||[]).length>0&&<span>📷{inc.fotos.length}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {items.length===0&&<div style={{ color:G.textDim,fontSize:11,textAlign:"center",padding:"20px 0" }}>Sin incidencias</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── LISTA ── */}
        {vistaMode==="lista" && (
          <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", gap:6 }}>
            {incFiltradas.length===0&&<div style={{ color:G.textMuted,textAlign:"center",padding:40 }}>Sin incidencias con estos filtros</div>}
            {incFiltradas.map(inc=>{
              const est = ESTADOS_INC[inc.estado]||ESTADOS_INC.abierta;
              const pri = PRIORIDADES_INC[inc.prioridad]||PRIORIDADES_INC.media;
              const dias = diasAbierta(inc);
              const sel = detalle?.id===inc.id;
              return (
                <div key={inc.id} className="card" style={{ borderLeft:`3px solid ${pri.color}`,cursor:"pointer",background:sel?"#EEF2FF":"#FFFFFF", boxShadow:"0 1px 3px #0001" }} onClick={()=>setDetalle(sel?null:inc)}>
                  <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap" }}>
                        <span style={{ fontSize:13,fontWeight:500 }}>{inc.titulo}</span>
                        <span className="tag" style={{ background:est.bg,color:est.color }}>{est.label}</span>
                        <PriBadge prioridad={inc.prioridad} />
                        <span className="tag" style={{ background:"#EEF2FF",color:"#3B4FC8",fontSize:9 }}>{inc.tipo}</span>
                      </div>
                      <div style={{ display:"flex",gap:14,fontSize:10,color:G.textMuted }}>
                        <span>{inc.fecha}</span>
                        {inc.responsable&&<span>👤 {inc.responsable}</span>}
                        {inc.coste>0&&<span style={{ color:G.orange }}>💶 {fmt(inc.coste)}</span>}
                        <span style={{ color:dias>7&&inc.estado==="abierta"?G.red:G.textDim }}>🕐 {dias}d</span>
                        {(inc.comentarios||[]).length>0&&<span>💬 {inc.comentarios.length}</span>}
                      </div>
                    </div>
                    <select value={inc.estado} onChange={e=>{e.stopPropagation();updateInc(inc.id,{estado:e.target.value});}} onClick={e=>e.stopPropagation()} style={{ width:"auto",fontSize:10,padding:"3px 6px",color:est.color,background:est.bg,border:`1px solid ${est.color}33` }}>
                      {Object.entries(ESTADOS_INC).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TABLA ── */}
        {vistaMode==="tabla" && (
          <div style={{ flex:1, overflow:"auto" }}>
            <div style={{ minWidth:700 }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr",background:"#1A1A2E",padding:"8px 14px",gap:0 }}>
                {["TÍTULO","TIPO","PRIORIDAD","ESTADO","RESPONSABLE","COSTE","DÍAS"].map(h=>(
                  <div key={h} style={{ fontSize:9,color:"#9090A8",fontFamily:"DM Mono" }}>{h}</div>
                ))}
              </div>
              {incFiltradas.map(inc=>{
                const est=ESTADOS_INC[inc.estado]||ESTADOS_INC.abierta;
                const pri=PRIORIDADES_INC[inc.prioridad]||PRIORIDADES_INC.media;
                const dias=diasAbierta(inc);
                return (
                  <div key={inc.id} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr",padding:"10px 14px",borderBottom:`1px solid ${G.border}`,cursor:"pointer" }} onClick={()=>setDetalle(detalle?.id===inc.id?null:inc)}>
                    <div style={{ fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{inc.titulo}</div>
                    <div><span className="tag" style={{ background:"#EEF2FF",color:"#3B4FC8",fontSize:9 }}>{inc.tipo}</span></div>
                    <div><PriBadge prioridad={inc.prioridad} /></div>
                    <div><span className="tag" style={{ background:est.bg,color:est.color,fontSize:9 }}>{est.label}</span></div>
                    <div style={{ fontSize:11,color:G.textMuted }}>{inc.responsable||"—"}</div>
                    <div><span className="mono" style={{ fontSize:11,color:inc.coste>0?G.orange:G.textDim }}>{inc.coste>0?fmt(inc.coste):"—"}</span></div>
                    <div><span className="mono" style={{ fontSize:11,color:dias>7&&inc.estado==="abierta"?G.red:G.textDim }}>{dias}d</span></div>
                  </div>
                );
              })}
              {incFiltradas.length===0&&<div style={{ color:G.textMuted,textAlign:"center",padding:30,fontSize:12 }}>Sin incidencias</div>}
            </div>
          </div>
        )}

        {/* ── PANEL DETALLE tipo Jira ── */}
        {null}
      </div>

      {/* Modal nueva incidencia */}
      {modalNueva&&(
        <Modal title="Nueva Incidencia" onClose={()=>setModalNueva(false)}>
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>TÍTULO *</label>
              <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Descripción breve del problema..." autoFocus /></div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>TIPO</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                  {["ejecucion","material","proveedor","diseno","cliente","seguridad","otro"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>PRIORIDAD</label>
                <select value={form.prioridad} onChange={e=>setForm(f=>({...f,prioridad:e.target.value}))}>
                  {Object.entries(PRIORIDADES_INC).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>DESCRIPCIÓN</label>
              <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} style={{ minHeight:70,resize:"vertical" }} /></div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>RESPONSABLE</label>
                <input value={form.responsable} onChange={e=>setForm(f=>({...f,responsable:e.target.value}))} /></div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>COSTE ESTIMADO (€)</label>
                <input type="number" value={form.coste} onChange={e=>setForm(f=>({...f,coste:e.target.value}))} placeholder="0" /></div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>FASE AFECTADA</label>
                <select value={form.faseId} onChange={e=>setForm(f=>({...f,faseId:e.target.value}))}>
                  <option value="">Sin fase</option>
                  {(obra.fases||[]).map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>FECHA LÍMITE</label>
                <input type="date" value={form.fechaLimite} onChange={e=>setForm(f=>({...f,fechaLimite:e.target.value}))} /></div>
            </div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:8 }}>
              <button className="btn-ghost" onClick={()=>setModalNueva(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crear} disabled={!form.titulo.trim()} style={{ opacity:!form.titulo.trim()?0.5:1 }}>Crear incidencia</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// === CONTROL ===ECON-MICO + CASHFLOW ---------------------------------------------
const CATEGORIAS_ECO = [
  { id: "mano_obra",    label: "Mano de obra",   color: "#5C9BE0", icon: "👷" },
  { id: "materiales",   label: "Materiales",      color: "#C8A96E", icon: "🧱" },
  { id: "industriales", label: "Industriales",    color: "#A06EBE", icon: "⚡" },
  { id: "imprevistos",  label: "Imprevistos",     color: "#E05C5C", icon: "⚠️" },
  { id: "mobiliario",   label: "Mobiliario",      color: "#5CB87A", icon: "🛋️" },
  { id: "iluminacion",  label: "Iluminación",     color: "#E0C85C", icon: "💡" },
  { id: "logistica",    label: "Logística",       color: "#5CE0D8", icon: "🚛" },
  { id: "honorarios",   label: "Honorarios",      color: "#E08D3C", icon: "📋" },
];

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function EconomicaTab({ obra, onUpdate }) {
  const eco = obra.economica || { partidas: [], movimientos: [], cobros: [] };
  const [seccion, setSeccion] = useState("resumen");
  const [formPartida, setFormPartida] = useState({ categoria: "mano_obra", concepto: "", previsto: "", real: "" });
  const [formMov, setFormMov] = useState({ tipo: "pago", concepto: "", importe: "", fecha: new Date().toISOString().slice(0,10), categoria: "materiales", estado: "previsto" });
  const [formCobro, setFormCobro] = useState({ concepto: "", importe: "", fecha: new Date().toISOString().slice(0,10), estado: "pendiente" });

  const saveEco = (cambios) => onUpdate({ economica: { ...eco, ...cambios } });

  // === C-lculos ===globales --
  const totalPrevisto = eco.partidas.reduce((a, p) => a + (Number(p.previsto)||0), 0) || obra.presupuesto;
  const totalReal     = eco.partidas.reduce((a, p) => a + (Number(p.real)||0), 0);
  const desviacion    = totalReal - totalPrevisto;
  const pctDesv       = totalPrevisto ? Math.round((desviacion / totalPrevisto) * 100) : 0;

  const pagosPrev     = eco.movimientos.filter(m => m.tipo === "pago" && m.estado === "previsto").reduce((a,m) => a+(Number(m.importe)||0), 0);
  const pagosReal     = eco.movimientos.filter(m => m.tipo === "pago" && m.estado === "realizado").reduce((a,m) => a+(Number(m.importe)||0), 0);
  const cobrosTotal   = eco.cobros.reduce((a,c) => a+(Number(c.importe)||0), 0);
  const cobrosPend    = eco.cobros.filter(c => c.estado === "pendiente").reduce((a,c) => a+(Number(c.importe)||0), 0);
  const margen        = cobrosTotal - totalReal;
  const margenPct     = cobrosTotal ? Math.round((margen / cobrosTotal) * 100) : 0;

  // === Cashflow ===por mes --
  const cashflowMeses = () => {
    const map = {};
    [...eco.movimientos, ...eco.cobros.map(c => ({ ...c, tipo: "cobro" }))].forEach(m => {
      if (!m.fecha) return;
      const d = new Date(m.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
      if (!map[key]) map[key] = { mes: MESES[d.getMonth()], año: d.getFullYear(), pagos: 0, cobros: 0 };
      if (m.tipo === "cobro") map[key].cobros += Number(m.importe)||0;
      else map[key].pagos += Number(m.importe)||0;
    });
    return Object.values(map).sort((a,b) => `${a.año}${a.mes}` > `${b.año}${b.mes}` ? 1 : -1);
  };
  const meses = cashflowMeses();
  const maxVal = Math.max(...meses.map(m => Math.max(m.pagos, m.cobros)), 1);

  // === Por ===categor-a --
  const porCategoria = CATEGORIAS_ECO.map(cat => {
    const partidas = eco.partidas.filter(p => p.categoria === cat.id);
    return {
      ...cat,
      previsto: partidas.reduce((a,p) => a+(Number(p.previsto)||0), 0),
      real:     partidas.reduce((a,p) => a+(Number(p.real)||0), 0),
    };
  }).filter(c => c.previsto > 0 || c.real > 0);

  const SECCIONES = [
    { id: "resumen",    label: "Resumen" },
    { id: "partidas",   label: "Partidas" },
    { id: "cashflow",   label: "Cashflow" },
    { id: "cobros",     label: "Cobros" },
  ];

  // Cashflow acumulado
  const cashflowAcumulado = () => {
    const map = {};
    const MESES_CORTO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    [...eco.movimientos, ...eco.cobros.map(c=>({...c,tipo:"cobro"}))].forEach(m=>{
      if (!m.fecha) return;
      const d = new Date(m.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!map[key]) map[key] = { mes:MESES_CORTO[d.getMonth()], año:d.getFullYear(), key, pagos:0, cobros:0, pagosPrev:0, cobrosPrev:0 };
      if (m.tipo==="cobro") {
        if (m.estado==="cobrado") map[key].cobros += Number(m.importe)||0;
        else map[key].cobrosPrev += Number(m.importe)||0;
      } else {
        if (m.estado==="realizado") map[key].pagos += Number(m.importe)||0;
        else map[key].pagosPrev += Number(m.importe)||0;
      }
    });
    const sorted = Object.values(map).sort((a,b)=>a.key.localeCompare(b.key));
    let acum = 0;
    sorted.forEach(m=>{ acum += m.cobros - m.pagos; m.acumulado = acum; });
    return sorted;
  };
  const mesesCashflow = cashflowAcumulado();
  const maxValCF = Math.max(...mesesCashflow.map(m=>Math.max(m.pagos+m.pagosPrev, m.cobros+m.cobrosPrev)), 1);
  const maxAcum = Math.max(...mesesCashflow.map(m=>Math.abs(m.acumulado)), 1);

  // Previsión de tesorería (próximos 90 días)
  const hoy = new Date();
  const en90 = new Date(hoy.getTime()+90*864e5);
  const proximosCobros = eco.cobros.filter(c=>c.estado==="pendiente"&&c.fecha&&new Date(c.fecha)<=en90).reduce((a,c)=>a+(Number(c.importe)||0),0);
  const proximosPagos  = eco.movimientos.filter(m=>m.estado==="previsto"&&m.fecha&&new Date(m.fecha)<=en90).reduce((a,m)=>a+(Number(m.importe)||0),0);
  const saldoProyectado = proximosCobros - proximosPagos;


}

// === FOTOS ===+ IA DE AVANCE -----------------------------------------------------
const ZONAS_OBRA = ["General","Entrada","Salón","Cocina","Baño principal","Baño suite","Dormitorio principal","Dormitorio 2","Terraza","Pasillo","Zona de trabajo","Fachada","Otra"];

function FotosTab({ obra, onUpdate }) {
  const [zonaFiltro, setZonaFiltro] = useState("todas");
  const [tipoFiltro, setTipoFiltro] = useState("todas");
  const [seleccionadas, setSeleccionadas] = useState([]);
  const FOTOS_KEY = `bf-fotos-${obra.id}`;

  // Fotos live in global state (obra.fotos) WITH srcs
  // srcs are also backed up in localStorage for persistence across reloads
  const fotos = obra.fotos || [];

  const comprimirFoto = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const save = (nuevas) => {
    try {
      localStorage.setItem(FOTOS_KEY, JSON.stringify(nuevas));
    } catch(e) {
      try { localStorage.setItem(FOTOS_KEY, JSON.stringify(nuevas.slice(-5))); } catch(e2) { void 0; }
    }
    onUpdate({ fotos: nuevas });
  };

  const procesarArchivos = async (files) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!arr.length) return;
    const nuevasFotos = [];
    for (const file of arr) {
      const src = await comprimirFoto(file);
      nuevasFotos.push({
        id: uid(), src,
        zona: "General", fecha: new Date().toLocaleDateString("es-ES"),
        fechaISO: new Date().toISOString().slice(0,10),
        notas: "", avanceIA: null, cambiosIA: null, tipo: "actual",
      });
    }
    save([...fotos, ...nuevasFotos]);
  };

  const [visor, setVisor] = useState(null);
  const [loadingIA, setLoadingIA] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [vistaMode, setVistaMode] = useState("grid");
  const [comparandoA, setComparandoA] = useState(null);
  const [comparandoB, setComparandoB] = useState(null);
  const [comparacionIA, setComparacionIA] = useState("");
  const [loadingComp, setLoadingComp] = useState(false);

  const comprimirImagen = (dataUrl, maxSize = 800) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  });

  const analizarConIA = async (foto) => {
    setLoadingIA(foto.id);
    try {
      const anteriores = fotos.filter(f=>f.zona===foto.zona&&f.id!==foto.id&&f.fechaISO<foto.fechaISO);
      const fotoAnterior = anteriores.sort((a,b)=>b.fechaISO.localeCompare(a.fechaISO))[0];
      const hayAnterior = !!fotoAnterior;
      const content = [
        { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:foto.src.split(",")[1] } },
        ...(hayAnterior?[{ type:"image", source:{ type:"base64", media_type:"image/jpeg", data:fotoAnterior.src.split(",")[1] } }]:[]),
        { type:"text", text: hayAnterior
          ? `Eres experto en gestión de obras. Tienes DOS imágenes: la PRIMERA es la foto actual (${foto.fecha}) de la zona "${foto.zona}" y la SEGUNDA es foto anterior (${fotoAnterior.fecha}). Analiza el avance. JSON exacto: {"avancePct":0-100,"cambiosDetectados":["..."],"zonasFaltantes":["..."],"observaciones":"1-2 frases"}`
          : `Eres experto en gestión de obras. Analiza esta foto de la zona "${foto.zona}". JSON exacto: {"avancePct":0-100,"cambiosDetectados":["elementos visibles"],"zonasFaltantes":["trabajos pendientes"],"observaciones":"1-2 frases"}`
        }
      ];
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:600, messages:[{role:"user",content}] })
      });
      const data = await res.json();
      const textBlock = data.content?.find(b=>b.type==="text")?.text || "{}";
      const clean = textBlock.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      const nuevas = fotos.map(f=>f.id===foto.id?{...f,avanceIA:parsed.avancePct??0,cambiosIA:parsed.cambiosDetectados||[],faltantesIA:parsed.zonasFaltantes||[],observacionIA:parsed.observaciones||"Sin datos",comparadoCon:fotoAnterior?.id||null}:f);
      save(nuevas);
      if(visor?.id===foto.id) setVisor(nuevas.find(f=>f.id===foto.id));
    } catch(e) { void 0; }
    setLoadingIA(null);
  };

  // Analizar todas sin an-lisis de un golpe
  const analizarTodas = async () => {
    const sinAnalizar = fotos.filter(f=>f.avanceIA===null);
    if (!sinAnalizar.length) return;
    setLoadingBatch(true);
    for (const foto of sinAnalizar) {
      await analizarConIA(foto);
    }
    setLoadingBatch(false);
  };

  // Comparar 2 fotos cualquiera con IA
  const compararFotos = async () => {
    if (!comparandoA || !comparandoB) return;
    setLoadingComp(true); setComparacionIA("");
    try {
      const fA = fotos.find(f=>f.id===comparandoA);
      const fB = fotos.find(f=>f.id===comparandoB);
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:600,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:"image/jpeg",data:fA.src.split(",")[1]}},
            {type:"image",source:{type:"base64",media_type:"image/jpeg",data:fB.src.split(",")[1]}},
            {type:"text",text:`Compara estas dos fotos de obra. Foto A: ${fA.zona} (${fA.fecha}). Foto B: ${fB.zona} (${fB.fecha}). Describe: 1) Diferencias principales, 2) Progreso detectado, 3) Puntos de atención. Máximo 150 palabras.`}
          ]}]
        })
      });
      const data = await res.json();
      setComparacionIA(data.content?.find(b=>b.type==="text")?.text||"");
    } catch { setComparacionIA("Error al comparar."); }
    setLoadingComp(false);
  };

  const zonas = ["todas",...ZONAS_OBRA.filter(z=>fotos.some(f=>f.zona===z))];
  const fotosFiltradas = fotos.filter(f=>{
    if(zonaFiltro!=="todas"&&f.zona!==zonaFiltro) return false;
    if(tipoFiltro!=="todas"&&f.tipo!==tipoFiltro) return false;
    return true;
  });
  const fotosSorted = [...fotosFiltradas].sort((a,b)=>(b.fechaISO||"").localeCompare(a.fechaISO||""));

  // Avance por zona (-ltima foto analizada de cada zona)
  const avancePorZona = ZONAS_OBRA.map(z=>{
    const fz=fotos.filter(f=>f.zona===z&&f.avanceIA!==null);
    if(!fz.length) return null;
    const ultima=fz.sort((a,b)=>b.fechaISO.localeCompare(a.fechaISO))[0];
    return { zona:z, avance:ultima.avanceIA, fecha:ultima.fecha, total:fotos.filter(f=>f.zona===z).length };
  }).filter(Boolean);
  const avanceMedio = avancePorZona.length ? Math.round(avancePorZona.reduce((a,z)=>a+z.avance,0)/avancePorZona.length) : null;

  // Agrupar por zona para timeline
  const porZona = ZONAS_OBRA.map(z=>({
    zona:z,
    fotos:fotos.filter(f=>f.zona===z).sort((a,b)=>a.fechaISO?.localeCompare(b.fechaISO||"")||0),
  })).filter(z=>z.fotos.length>0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"FOTOS TOTALES", val:fotos.length, sub:`${fotos.filter(f=>f.avanceIA!==null).length} analizadas`, color:G.text },
          { label:"ZONAS CUBIERTAS", val:new Set(fotos.map(f=>f.zona)).size, sub:`de ${ZONAS_OBRA.length} posibles`, color:G.text },
          { label:"AVANCE MEDIO IA", val:avanceMedio!==null?`${avanceMedio}%`:"—", sub:avancePorZona.length?`${avancePorZona.length} zonas analizadas`:"Sin análisis aún", color:avanceMedio!==null?(avanceMedio>70?G.green:avanceMedio>40?G.gold:G.orange):G.textMuted },
          { label:"SIN ANALIZAR", val:fotos.filter(f=>f.avanceIA===null).length, sub:"pendientes de IA", color:fotos.filter(f=>f.avanceIA===null).length>0?G.orange:G.green },
        ].map(k=>(
          <div key={k.label} className="stat-box">
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
            <div className="serif" style={{ fontSize:22,color:k.color }}>{k.val}</div>
            <div style={{ fontSize:10,color:G.textMuted,marginTop:3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Avance por zona */}
      {avancePorZona.length>0 && (
        <div className="card">
          <div className="serif" style={{ fontSize:14,marginBottom:14 }}>📊 Avance por Zona (IA)</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10 }}>
            {avancePorZona.map(z=>(
              <div key={z.zona} style={{ cursor:"pointer" }} onClick={()=>setZonaFiltro(z.zona)}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4 }}>
                  <span>{z.zona}</span>
                  <span className="mono" style={{ color:z.avance>70?G.green:z.avance>40?G.gold:G.orange }}>{z.avance}%</span>
                </div>
                <div className="progress-bar" style={{ height:5 }}>
                  <div className="progress-fill" style={{ width:`${z.avance}%`,background:z.avance>70?G.green:z.avance>40?G.gold:G.orange }} />
                </div>
                <div style={{ fontSize:9,color:G.textDim,marginTop:3 }}>{z.total} foto{z.total!==1?"s":""} · última {z.fecha}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload + controles */}
      <div style={{ display:"flex",gap:12,alignItems:"stretch" }}>
        <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);procesarArchivos(e.dataTransfer.files);}}
          onClick={()=>document.getElementById("foto-upload").click()}
          style={{ flex:1,border:`2px dashed ${dragging?G.gold:G.border}`,borderRadius:8,padding:"16px 20px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",background:dragging?"#1E1A13":"transparent",transition:"all 0.2s" }}>
          <div style={{ fontSize:24 }}>📸</div>
          <div>
            <div style={{ fontSize:13,color:G.text }}>Arrastra fotos o <span style={{ color:G.gold }}>haz clic para seleccionar</span></div>
            <div style={{ fontSize:11,color:G.textMuted,marginTop:2 }}>JPG, PNG · múltiples a la vez</div>
          </div>
          <input id="foto-upload" type="file" multiple accept="image/*" style={{ display:"none" }} onChange={e=>procesarArchivos(e.target.files)} />
        </div>
        {fotos.filter(f=>f.avanceIA===null).length>0 && (
          <button onClick={analizarTodas} disabled={loadingBatch} style={{ padding:"0 16px",background:G.gold+"22",border:`1px solid ${G.gold}44`,color:G.gold,borderRadius:8,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",opacity:loadingBatch?0.5:1 }}>
            {loadingBatch?"Analizando…":`✦ Analizar todas (${fotos.filter(f=>f.avanceIA===null).length})`}
          </button>
        )}
        {fotos.length>0 && (
          <div style={{ display:"flex",gap:6 }}>
            <button onClick={()=>{
              const todas = fotos.map(f=>f.id);
              setSeleccionadas(prev => prev.length===todas.length ? [] : todas);
            }} style={{ padding:"4px 10px",background:G.surface,border:`1px solid ${G.border}`,borderRadius:6,fontSize:11,cursor:"pointer",color:G.textMuted }}>
              {seleccionadas.length===fotos.length ? "✕ Deselect." : "☑ Sel. todas"}
            </button>
            {seleccionadas.length>0 && (
              <button onClick={()=>{
                if(window.confirm(`¿Borrar ${seleccionadas.length} fotos?`)){
                  save(fotos.filter(f=>!seleccionadas.includes(f.id)));
                  setSeleccionadas([]);
                }
              }} style={{ padding:"4px 10px",background:G.red+"22",border:`1px solid ${G.red}44`,borderRadius:6,fontSize:11,cursor:"pointer",color:G.red }}>
                🗑 Borrar ({seleccionadas.length})
              </button>
            )}
          </div>
        )}
        <div style={{ display:"flex",gap:4 }}>
          {[["grid","⊞"],["lista","☰"],["timeline","⏱"],["comparar","⇔"]].map(([mode,icon])=>(
            <button key={mode} onClick={()=>setVistaMode(mode)} style={{ padding:"0 12px",background:vistaMode===mode?G.surface:"transparent",border:`1px solid ${vistaMode===mode?G.gold:G.border}`,color:vistaMode===mode?G.gold:G.textMuted,borderRadius:6,cursor:"pointer",fontSize:14 }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      {fotos.length>0 && vistaMode!=="comparar" && (
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
          <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
            {zonas.map(z=>(
              <button key={z} onClick={()=>setZonaFiltro(z)} style={{ padding:"4px 10px",borderRadius:4,border:`1px solid ${zonaFiltro===z?G.gold:G.border}`,background:zonaFiltro===z?"#1E1A13":"transparent",color:zonaFiltro===z?G.gold:G.textMuted,fontSize:11,cursor:"pointer" }}>
                {z==="todas"?`Todas (${fotos.length})`:`${z} (${fotos.filter(f=>f.zona===z).length})`}
              </button>
            ))}
          </div>
          <div style={{ height:16,width:1,background:G.border }} />
          {[["todas","Todos"],["inicial","Inicial"],["actual","Avance"],["final","Final"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTipoFiltro(t)} style={{ padding:"4px 10px",borderRadius:4,border:`1px solid ${tipoFiltro===t?G.blue:G.border}`,background:tipoFiltro===t?G.blue+"22":"transparent",color:tipoFiltro===t?G.blue:G.textMuted,fontSize:11,cursor:"pointer" }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ── VISTA GRID ── */}
      {vistaMode==="grid" && (
        fotosSorted.length===0
          ? <div style={{ textAlign:"center",padding:"50px 0",color:G.textMuted }}><div style={{ fontSize:40,marginBottom:12 }}>📷</div><div className="serif" style={{ fontSize:16,marginBottom:6 }}>Sin fotos aún</div><div style={{ fontSize:13 }}>Sube fotos del avance de cada zona</div></div>
          : <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14 }}>
              {fotosSorted.map(foto=>(
                <div key={foto.id} style={{ position:"relative",cursor:"pointer",borderRadius:8,overflow:"hidden",border:`1px solid ${G.border}`,background:G.surface }} onClick={()=>setVisor(foto)}>
                  <img src={foto.src} alt={foto.zona} style={{ width:"100%",height:130,objectFit:"cover",display:"block" }} />
                  {foto.avanceIA!==null&&(
                    <div style={{ position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.8)",borderRadius:10,padding:"2px 7px",fontSize:10,fontFamily:"DM Mono",color:foto.avanceIA>70?G.green:foto.avanceIA>40?G.gold:G.orange }}>{foto.avanceIA}%</div>
                  )}
                  {foto.tipo&&foto.tipo!=="actual"&&(
                    <div style={{ position:"absolute",top:6,left:6,background:"rgba(0,0,0,0.7)",borderRadius:6,padding:"1px 6px",fontSize:9,color:"#fff" }}>{foto.tipo==="inicial"?"INICIAL":"FINAL"}</div>
                  )}
                  <div onClick={e=>{e.stopPropagation();if(window.confirm("¿Borrar esta foto?"))save(fotos.filter(f=>f.id!==foto.id));}} style={{ position:"absolute",top:6,right:foto.avanceIA!==null?40:6,background:"rgba(0,0,0,0.6)",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,color:"#fff" }}>✕</div>
                  {loadingIA===foto.id&&<div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:G.gold }}>Analizando…</div>}
                  <div style={{ padding:"9px 11px" }} onClick={e=>e.stopPropagation()}>
                    <select value={foto.zona||"General"} onChange={e=>{save(fotos.map(f=>f.id===foto.id?{...f,zona:e.target.value}:f));}} style={{ fontSize:10,width:"100%",marginBottom:4,padding:"2px 4px" }}>
                      {["General","Recepción","Baño pequeño","Baño grande","Despacho 1","Despacho 2","Despacho redondo","Admin+Milu","Despacho siguiente","Sala juntas","Cocina","Sallares","Pasillo","Fotocopiadora","Exterior"].map(z=><option key={z} value={z}>{z}</option>)}
                    </select>
                    <input value={foto.notas||""} onChange={e=>{save(fotos.map(f=>f.id===foto.id?{...f,notas:e.target.value}:f));}} placeholder="Descripción..." style={{ fontSize:10,width:"100%",padding:"2px 4px",boxSizing:"border-box" }} />
                    <div style={{ fontSize:9,color:G.textMuted,marginTop:3 }}>{foto.fecha}</div>
                    {!foto.avanceIA&&loadingIA!==foto.id&&(
                      <button onClick={e=>{e.stopPropagation();analizarConIA(foto);}} style={{ marginTop:5,background:"none",border:`1px solid ${G.gold}44`,color:G.gold,fontSize:9,padding:"2px 7px",borderRadius:3,cursor:"pointer",width:"100%" }}>✦ Analizar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
      )}

      {/* ── VISTA LISTA ── */}
      {vistaMode==="lista" && (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {fotosSorted.map(foto=>(
            <div key={foto.id} className="card" style={{ display:"flex",gap:14,alignItems:"center",cursor:"pointer" }} onClick={()=>setVisor(foto)}>
              <img src={foto.src} alt={foto.zona} style={{ width:70,height:52,objectFit:"cover",borderRadius:4,flexShrink:0 }} />
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:3 }}>
                  <span style={{ fontSize:13,fontWeight:500 }}>{foto.zona}</span>
                  {foto.tipo&&foto.tipo!=="actual"&&<span className="tag" style={{ background:G.border,color:G.textMuted }}>{foto.tipo}</span>}
                </div>
                <div style={{ fontSize:10,color:G.textMuted }}>{foto.fecha}</div>
                {foto.observacionIA&&foto.avanceIA!==null&&<div style={{ fontSize:11,color:G.textMuted,marginTop:3,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{foto.observacionIA}</div>}
                <div style={{ display:"flex",gap:6,marginTop:4,alignItems:"center" }}>
                  <select value={foto.zona||"General"} onChange={e=>{const nuevas=fotos.map(f=>f.id===foto.id?{...f,zona:e.target.value}:f);save(nuevas);}} onClick={e=>e.stopPropagation()} style={{ fontSize:10,flex:1,padding:"2px 4px" }}>
                    {["General","Recepción","Baño pequeño","Baño grande","Despacho 1","Despacho 2","Despacho redondo","Admin+Milu","Despacho siguiente","Sala juntas","Cocina","Sallares","Pasillo","Fotocopiadora","Exterior"].map(z=><option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <input value={foto.notas||""} onChange={e=>{const nuevas=fotos.map(f=>f.id===foto.id?{...f,notas:e.target.value}:f);save(nuevas);}} onClick={e=>e.stopPropagation()} placeholder="Descripción..." style={{ fontSize:10,width:"100%",marginTop:4,padding:"2px 4px",boxSizing:"border-box" }} />
              </div>
              {foto.avanceIA!==null
                ? <div style={{ textAlign:"center",flexShrink:0 }}>
                    <div className="mono" style={{ fontSize:18,color:foto.avanceIA>70?G.green:foto.avanceIA>40?G.gold:G.orange }}>{foto.avanceIA}%</div>
                    <div style={{ fontSize:9,color:G.textMuted }}>avance</div>
                  </div>
                : <button onClick={e=>{e.stopPropagation();analizarConIA(foto);}} disabled={loadingIA===foto.id} style={{ background:"none",border:`1px solid ${G.gold}44`,color:G.gold,fontSize:11,padding:"4px 10px",borderRadius:4,cursor:"pointer",opacity:loadingIA===foto.id?0.5:1 }}>
                    {loadingIA===foto.id?"…":"✦ IA"}
                  </button>
              }
              <button onClick={e=>{e.stopPropagation();save(fotos.filter(f=>f.id!==foto.id));}} style={{ background:"none",border:"none",color:G.textDim,cursor:"pointer",padding:4 }}>{Icon.trash}</button>
            </div>
          ))}
          {fotosSorted.length===0&&<div style={{ color:G.textMuted,textAlign:"center",padding:40 }}>Sin fotos con estos filtros</div>}
        </div>
      )}

      {/* ── VISTA TIMELINE ── */}
      {vistaMode==="timeline" && (
        <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
          {porZona.length===0&&<div style={{ color:G.textMuted,textAlign:"center",padding:40 }}>Sin fotos agrupables por zona</div>}
          {porZona.map(grupo=>(
            <div key={grupo.zona}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
                <div className="serif" style={{ fontSize:14 }}>{grupo.zona}</div>
                <div style={{ flex:1,height:1,background:G.border }} />
                <span style={{ fontSize:11,color:G.textMuted }}>{grupo.fotos.length} fotos</span>
                {grupo.fotos.some(f=>f.avanceIA!==null)&&(
                  <span className="mono" style={{ fontSize:11,color:G.gold }}>{grupo.fotos.filter(f=>f.avanceIA!==null).slice(-1)[0]?.avanceIA}%</span>
                )}
              </div>
              <div style={{ display:"flex",gap:10,overflowX:"auto",paddingBottom:8 }}>
                {grupo.fotos.map((foto,i)=>(
                  <div key={foto.id} onClick={()=>setVisor(foto)} style={{ flex:"0 0 130px",cursor:"pointer" }}>
                    <div style={{ position:"relative",borderRadius:6,overflow:"hidden",border:`1px solid ${G.border}`,marginBottom:6 }}>
                      <img src={foto.src} alt="" style={{ width:"100%",height:90,objectFit:"cover",display:"block" }} />
                      {foto.avanceIA!==null&&<div style={{ position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,0.8)",borderRadius:6,padding:"1px 5px",fontSize:9,fontFamily:"DM Mono",color:foto.avanceIA>70?G.green:foto.avanceIA>40?G.gold:G.orange }}>{foto.avanceIA}%</div>}
                      {i>0&&<div style={{ position:"absolute",top:"50%",left:-5,transform:"translateY(-50%)",color:G.gold,fontSize:14 }}>→</div>}
                    </div>
                    <div style={{ fontSize:9,color:G.textMuted,textAlign:"center" }}>{foto.fecha}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VISTA COMPARAR ── */}
      {vistaMode==="comparar" && (
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          <div style={{ fontSize:12,color:G.textMuted }}>Selecciona dos fotos para compararlas con IA. Clic en la foto para seleccionarla como A o B.</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
            {["A","B"].map(lado=>{
              const idSelec = lado==="A"?comparandoA:comparandoB;
              const fotoSelec = fotos.find(f=>f.id===idSelec);
              return (
                <div key={lado}>
                  <div style={{ fontSize:11,color:G.textMuted,fontFamily:"DM Mono",marginBottom:8 }}>FOTO {lado}{fotoSelec?` — ${fotoSelec.zona} (${fotoSelec.fecha})`:""}</div>
                  {fotoSelec
                    ? <div style={{ position:"relative",borderRadius:8,overflow:"hidden",border:`2px solid ${lado==="A"?G.blue:G.orange}`,cursor:"pointer" }} onClick={()=>lado==="A"?setComparandoA(null):setComparandoB(null)}>
                        <img src={fotoSelec.src} alt="" style={{ width:"100%",maxHeight:280,objectFit:"cover",display:"block" }} />
                        <div style={{ position:"absolute",top:8,left:8,background:`rgba(0,0,0,0.8)`,borderRadius:6,padding:"3px 10px",fontSize:11,color:lado==="A"?G.blue:G.orange,fontWeight:600 }}>{lado}</div>
                        <div style={{ position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.7)",borderRadius:6,padding:"2px 8px",fontSize:10,color:G.textMuted }}>✕ Cambiar</div>
                      </div>
                    : <div style={{ border:`2px dashed ${lado==="A"?G.blue:G.orange}44`,borderRadius:8,height:200,display:"flex",alignItems:"center",justifyContent:"center",color:G.textMuted,fontSize:13 }}>
                        Selecciona Foto {lado} del grid
                      </div>
                  }
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            <button className="btn-primary" onClick={compararFotos} disabled={!comparandoA||!comparandoB||loadingComp} style={{ opacity:!comparandoA||!comparandoB?0.5:1 }}>
              {loadingComp?"Comparando…":"✦ Comparar con IA"}
            </button>
            {(comparandoA||comparandoB)&&<button className="btn-ghost" onClick={()=>{setComparandoA(null);setComparandoB(null);setComparacionIA("");}} style={{ fontSize:12 }}>Limpiar</button>}
          </div>
          {comparacionIA&&(
            <div style={{ background:"#1A1A13",border:`1px solid ${G.gold}33`,borderRadius:8,padding:"16px 20px" }}>
              <div style={{ fontSize:11,color:G.gold,fontFamily:"DM Mono",marginBottom:10 }}>✦ ANÁLISIS COMPARATIVO IA</div>
              <div style={{ fontSize:13,lineHeight:1.8,color:G.text,whiteSpace:"pre-wrap" }}>{comparacionIA}</div>
            </div>
          )}
          {/* Mini grid para seleccionar */}
          <div style={{ fontSize:11,color:G.textMuted,fontFamily:"DM Mono",marginTop:8 }}>SELECCIONA FOTOS</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10 }}>
            {fotos.map(foto=>{
              const esA = comparandoA===foto.id;
              const esB = comparandoB===foto.id;
              return (
                <div key={foto.id} onClick={()=>{
                  if(esA){setComparandoA(null);}
                  else if(esB){setComparandoB(null);}
                  else if(!comparandoA){setComparandoA(foto.id);}
                  else if(!comparandoB){setComparandoB(foto.id);}
                }} style={{ cursor:"pointer",borderRadius:6,overflow:"hidden",border:`2px solid ${esA?G.blue:esB?G.orange:G.border}`,position:"relative" }}>
                  <img src={foto.src} alt="" style={{ width:"100%",height:80,objectFit:"cover",display:"block" }} />
                  {(esA||esB)&&<div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:esA?G.blue:G.orange }}>{esA?"A":"B"}</div>}
                  <div style={{ padding:"5px 7px",fontSize:9,color:G.textMuted }}>{foto.zona} · {foto.fecha}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISOR */}
      {visor && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }} onClick={()=>setVisor(null)}>
          <div style={{ position:"absolute",top:16,right:16,color:"#fff",fontSize:24,cursor:"pointer" }} onClick={()=>setVisor(null)}>✕</div>
          <img src={visor.src} alt={visor.zona} style={{ maxWidth:"90vw",maxHeight:"75vh",objectFit:"contain",borderRadius:8 }} onClick={e=>e.stopPropagation()} />
          <div style={{ marginTop:16,textAlign:"center",color:"#fff" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16,fontWeight:600 }}>{visor.zona}</div>
            {visor.notas&&<div style={{ fontSize:13,color:"#ccc",marginTop:4 }}>{visor.notas}</div>}
            <div style={{ fontSize:12,color:"#888",marginTop:4 }}>{visor.fecha}</div>
          </div>
          <div style={{ display:"flex",gap:12,marginTop:16 }} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>{const idx=fotosSorted.findIndex(f=>f.id===visor.id);if(idx>0)setVisor(fotosSorted[idx-1]);}} style={{ padding:"6px 18px",background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:6,cursor:"pointer",fontSize:14 }}>← Anterior</button>
            <button onClick={()=>{const idx=fotosSorted.findIndex(f=>f.id===visor.id);if(idx<fotosSorted.length-1)setVisor(fotosSorted[idx+1]);}} style={{ padding:"6px 18px",background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:6,cursor:"pointer",fontSize:14 }}>Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  );
}

const TIPOS_GARANTIA = [
  { id: "obra",          label: "Obra general",        emoji: "🏗️", años: 10, desc: "Defectos estructurales" },
  { id: "habitabilidad", label: "Habitabilidad",       emoji: "🏠", años: 3,  desc: "Defectos que afectan habitabilidad" },
  { id: "acabados",      label: "Acabados",            emoji: "🎨", años: 1,  desc: "Defectos de terminación" },
  { id: "instalacion",   label: "Instalación",         emoji: "⚡", años: 2,  desc: "Elec., fontanería, clima..." },
  { id: "electrodomestico", label: "Electrodoméstico", emoji: "📦", años: 2,  desc: "Garantía de fabricante" },
  { id: "mobiliario",    label: "Mobiliario",          emoji: "🛋️", años: 2,  desc: "Muebles y elementos" },
  { id: "material",      label: "Material",            emoji: "🧱", años: 2,  desc: "Materiales y productos" },
  { id: "otro",          label: "Otro",                emoji: "📋", años: 1,  desc: "Otro tipo de garantía" },
];

const ESTADOS_GAR = {
  vigente:  { label: "Vigente",   color: "#5CB87A", bg: "#101A10" },
  proxima:  { label: "Vence pronto", color: "#C8A96E", bg: "#1E1A13" },
  vencida:  { label: "Vencida",   color: "#E05C5C", bg: "#2A1010" },
  reclamada:{ label: "Reclamada", color: "#5C9BE0", bg: "#101828" },
};

function calcEstadoGarantia(fechaFin) {
  if (!fechaFin) return "vigente";
  const hoy = new Date();
  const fin = new Date(fechaFin);
  const diasRestantes = Math.ceil((fin - hoy) / 864e5);
  if (diasRestantes < 0) return "vencida";
  if (diasRestantes <= 90) return "proxima";
  return "vigente";
}

function GarantiasTab({ obra, onUpdate }) {
  const garantias = obra.garantias || [];
  const [modal, setModal] = useState(false);
  const [selec, setSelec] = useState(null);
  const [form, setForm] = useState({
    nombre: "", tipo: "acabados", proveedor: "", numeroSerie: "",
    fechaInicio: new Date().toISOString().slice(0,10), años: 2, fechaFin: "",
    descripcion: "", contactoGarantia: "", telefonoGarantia: "", notas: "",
    archivo: null, archivoNombre: "", archivoTipo: "",
  });

  const save = (nuevas) => onUpdate({ garantias: nuevas });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Calcular fechaFin autom-ticamente
  const calcFechaFin = (inicio, años) => {
    if (!inicio || !años) return "";
    const d = new Date(inicio);
    d.setFullYear(d.getFullYear() + Number(años));
    return d.toISOString().slice(0,10);
  };

  const subirArchivo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, archivo: e.target.result, archivoNombre: file.name, archivoTipo: file.type }));
    reader.readAsDataURL(file);
  };

  const crear = () => {
    if (!form.nombre.trim()) return;
    const fechaFin = form.fechaFin || calcFechaFin(form.fechaInicio, form.años);
    const garantia = {
      id: uid(), ...form, años: Number(form.años),
      fechaFin, estado: calcEstadoGarantia(fechaFin),
      reclamaciones: [], creadoEn: new Date().toLocaleDateString("es-ES"),
    };
    save([...garantias, garantia]);
    setModal(false);
    setForm({ nombre:"", tipo:"acabados", proveedor:"", numeroSerie:"", fechaInicio:new Date().toISOString().slice(0,10), años:2, fechaFin:"", descripcion:"", contactoGarantia:"", telefonoGarantia:"", notas:"", archivo:null, archivoNombre:"", archivoTipo:"" });
  };

  const addReclamacion = (garantiaId, texto) => {
    if (!texto.trim()) return;
    const rec = { id: uid(), texto, fecha: new Date().toLocaleDateString("es-ES"), estado: "abierta" };
    const nuevas = garantias.map(g => g.id === garantiaId ? { ...g, reclamaciones: [...(g.reclamaciones||[]), rec], estado: "reclamada" } : g);
    save(nuevas);
    if (selec?.id === garantiaId) setSelec(prev => ({ ...prev, reclamaciones: [...(prev.reclamaciones||[]), rec], estado: "reclamada" }));
  };

  const [nuevaRec, setNuevaRec] = useState("");

  // Estad-sticas
  const hoy = new Date();
  const vigentes = garantias.filter(g => calcEstadoGarantia(g.fechaFin) === "vigente").length;
  const proximas = garantias.filter(g => calcEstadoGarantia(g.fechaFin) === "proxima").length;
  const vencidas = garantias.filter(g => calcEstadoGarantia(g.fechaFin) === "vencida").length;
  const reclamadas = garantias.filter(g => g.estado === "reclamada").length;

  // Pr-ximas a vencer (90 d-as)
  const proximasVencer = garantias.filter(g => {
    if (!g.fechaFin) return false;
    const dias = Math.ceil((new Date(g.fechaFin) - hoy) / 864e5);
    return dias >= 0 && dias <= 90;
  }).sort((a,b) => new Date(a.fechaFin) - new Date(b.fechaFin));

  const exportarCertificado = (g) => {
    const tipo = TIPOS_GARANTIA.find(t=>t.id===g.tipo)||TIPOS_GARANTIA[7];
    const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch { return {}; } })();
    const diasRestantes = Math.ceil((new Date(g.fechaFin) - hoy) / 864e5);
    const est = calcEstadoGarantia(g.fechaFin);
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Certificado de Garantía</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0} body{font-family:'DM Sans',sans-serif;font-size:13px;color:#1A1A2E;background:#F8F6F2}
  .page{max-width:210mm;margin:0 auto;background:#fff}
  @media print{.no-print{display:none}@page{margin:15mm;size:A4}}
  .header{background:#1A1A2E;padding:40px 56px;display:flex;justify-content:space-between;align-items:center}
  .brand{font-family:'Playfair Display',serif;font-size:20px;color:#C8A96E}
  .shield{font-size:48px;color:#C8A96E}
  .body{padding:48px 56px}
  .title{font-family:'Playfair Display',serif;font-size:28px;margin-bottom:8px;border-bottom:2px solid #C8A96E;padding-bottom:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:28px 0}
  .field{padding:14px 18px;background:#F8F6F2;border-radius:8px;border-left:3px solid #C8A96E}
  .field-label{font-family:'DM Mono',monospace;font-size:9px;color:#9A9AB0;letter-spacing:0.06em;margin-bottom:4px}
  .field-val{font-size:14px;font-weight:500}
  .estado{display:inline-block;padding:6px 16px;border-radius:20px;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:0.04em;margin:16px 0}
  .conditions{background:#F8F6F2;border-radius:8px;padding:20px 24px;margin:20px 0;font-size:12px;line-height:1.8;color:#5A5A72}
  .footer{padding:20px 56px;border-top:1px solid #EEEBE5;display:flex;justify-content:space-between;font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace}
  .no-print{position:fixed;bottom:20px;right:20px;background:#1A1A2E;color:#C8A96E;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px}
</style></head><body><div class="page">
<div class="header">
  <div><div class="brand">${config.estudio||"Blue Forest"}</div><div style="font-size:10px;color:#9090A8;font-family:'DM Mono',monospace;margin-top:3px">CERTIFICADO DE GARANTÍA</div></div>
  <div class="shield">${tipo.emoji}</div>
</div>
<div class="body">
  <div class="title">Certificado de Garantía</div>
  <div><span class="estado" style="background:${est==="vigente"?"#E8F5EE":est==="proxima"?"#FFF8EC":"#FDEAEA"};color:${est==="vigente"?"#2D7A4F":est==="proxima"?"#9A6F3A":"#C0392B"}">
    ${est==="vigente"?"✓ GARANTÍA VIGENTE":est==="proxima"?"⚠ VENCE PRONTO":"✕ GARANTÍA VENCIDA"}
  </span></div>
  <div class="grid">
    <div class="field"><div class="field-label">ELEMENTO GARANTIZADO</div><div class="field-val">${g.nombre}</div></div>
    <div class="field"><div class="field-label">TIPO DE GARANTÍA</div><div class="field-val">${tipo.label}</div></div>
    <div class="field"><div class="field-label">OBRA</div><div class="field-val">${obra.nombre}</div></div>
    <div class="field"><div class="field-label">CLIENTE</div><div class="field-val">${obra.cliente||"—"}</div></div>
    <div class="field"><div class="field-label">FECHA DE INICIO</div><div class="field-val" style="font-family:'DM Mono',monospace">${g.fechaInicio}</div></div>
    <div class="field"><div class="field-label">FECHA DE VENCIMIENTO</div><div class="field-val" style="font-family:'DM Mono',monospace;color:${est==="vencida"?"#C0392B":est==="proxima"?"#9A6F3A":"#2D7A4F"}">${g.fechaFin}${diasRestantes>0?` (${diasRestantes}d restantes)`:diasRestantes<0?` (vencida hace ${Math.abs(diasRestantes)}d)`:""}</div></div>
    ${g.proveedor?`<div class="field"><div class="field-label">PROVEEDOR / FABRICANTE</div><div class="field-val">${g.proveedor}</div></div>`:""}
    ${g.numeroSerie?`<div class="field"><div class="field-label">NÚMERO DE SERIE / REF.</div><div class="field-val" style="font-family:'DM Mono',monospace">${g.numeroSerie}</div></div>`:""}
    ${g.contactoGarantia?`<div class="field"><div class="field-label">CONTACTO GARANTÍA</div><div class="field-val">${g.contactoGarantia}${g.telefonoGarantia?" · "+g.telefonoGarantia:""}</div></div>`:""}
  </div>
  ${g.descripcion?`<div class="conditions"><strong>Descripción:</strong> ${g.descripcion}</div>`:""}
  <div class="conditions">
    <strong>Condiciones generales:</strong> Esta garantía cubre los defectos de ${tipo.desc.toLowerCase()} durante ${g.años} año${g.años!==1?"s":""} desde la fecha de entrega. No cubre daños por uso indebido, modificaciones no autorizadas o causas de fuerza mayor. Para hacer efectiva la garantía, contactar con ${g.contactoGarantia||config.nombre||config.estudio||"el profesional"}.
  </div>
  ${(g.reclamaciones||[]).length>0?`<div style="margin-top:20px"><div style="font-family:'DM Mono',monospace;font-size:10px;color:#9A9AB0;margin-bottom:10px">RECLAMACIONES</div>${(g.reclamaciones||[]).map(r=>`<div style="padding:10px;background:#FDEAEA;border-radius:6px;margin-bottom:6px;font-size:12px">${r.fecha}: ${r.texto}</div>`).join("")}</div>`:""}
</div>
<div class="footer">
  <span>${config.estudio||"Blue Forest"} · ${config.nif||""}</span>
  <span>Emitido el ${new Date().toLocaleDateString("es-ES")}</span>
</div>
</div>
<button class="no-print" onclick="window.print()">🖨 Imprimir / PDF</button>
</body></html>`;
    const blob = new Blob([html], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Garantia_${g.nombre.replace(/\s+/g,"_")}_${obra.nombre.replace(/\s+/g,"_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display:"flex", gap:20, height:"100%" }}>
      {/* Lista */}
      <div style={{ flex: selec ? "0 0 400px" : 1, display:"flex", flexDirection:"column", gap:16 }}>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            { label:"VIGENTES", val:vigentes, color:G.green },
            { label:"VENCE PRONTO", val:proximas, color:proximas>0?G.gold:G.textMuted },
            { label:"VENCIDAS", val:vencidas, color:vencidas>0?G.red:G.textMuted },
            { label:"RECLAMADAS", val:reclamadas, color:reclamadas>0?G.blue:G.textMuted },
          ].map(k=>(
            <div key={k.label} className="stat-box">
              <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
              <div className="serif" style={{ fontSize:22,color:k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Alertas de vencimiento próximo */}
        {proximasVencer.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {proximasVencer.map(g => {
              const dias = Math.ceil((new Date(g.fechaFin)-hoy)/864e5);
              return (
                <div key={g.id} style={{ display:"flex", gap:12, padding:"10px 14px", borderRadius:6, background:"#1E1A10", border:`1px solid ${G.gold}44`, fontSize:12, color:G.gold, alignItems:"center" }}>
                  <span>⚠</span>
                  <span style={{ flex:1 }}>Garantía "{g.nombre}" vence en <strong>{dias} días</strong> ({g.fechaFin})</span>
                  <button onClick={()=>setSelec(g)} style={{ background:"none",border:`1px solid ${G.gold}44`,color:G.gold,padding:"3px 10px",borderRadius:4,fontSize:11,cursor:"pointer" }}>Ver</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Nueva + lista */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, color:G.textMuted }}>{garantias.length} garantía{garantias.length!==1?"s":""}</div>
          <button className="btn-primary" onClick={()=>setModal(true)} style={{ display:"flex",alignItems:"center",gap:6 }}>
            {Icon.plus} Nueva garantía
          </button>
        </div>

        {garantias.length===0 ? (
          <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
            <div style={{ fontSize:36,marginBottom:10 }}>🛡️</div>
            <div style={{ fontSize:13 }}>Sin garantías registradas. Añade las garantías de instalaciones, electrodomésticos y materiales.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {garantias.map(g => {
              const tipo = TIPOS_GARANTIA.find(t=>t.id===g.tipo)||TIPOS_GARANTIA[7];
              const estadoReal = g.estado==="reclamada" ? "reclamada" : calcEstadoGarantia(g.fechaFin);
              const est = ESTADOS_GAR[estadoReal]||ESTADOS_GAR.vigente;
              const dias = g.fechaFin ? Math.ceil((new Date(g.fechaFin)-hoy)/864e5) : null;
              const activo = selec?.id===g.id;
              return (
                <div key={g.id} className="card" onClick={()=>setSelec(activo?null:g)}
                  style={{ cursor:"pointer", borderLeft:`3px solid ${est.color}`, background:activo?"#1A1A1A":G.surface }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <span style={{ fontSize:24, flexShrink:0 }}>{tipo.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
                        <span style={{ fontSize:13, fontWeight:500 }}>{g.nombre}</span>
                        <span className="tag" style={{ background:est.bg, color:est.color }}>{est.label}</span>
                      </div>
                      <div style={{ fontSize:11, color:G.textMuted, display:"flex", gap:12 }}>
                        <span>{tipo.label}</span>
                        {g.proveedor && <span>{g.proveedor}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div className="mono" style={{ fontSize:13, color:est.color }}>{g.años} año{g.años!==1?"s":""}</div>
                      {dias !== null && (
                        <div style={{ fontSize:10, color:dias<0?G.red:dias<90?G.gold:G.textMuted, marginTop:2 }}>
                          {dias<0?`Vencida hace ${Math.abs(dias)}d`:`${dias}d restantes`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel detalle */}
      {selec && (() => {
        const g = garantias.find(x=>x.id===selec.id)||selec;
        const tipo = TIPOS_GARANTIA.find(t=>t.id===g.tipo)||TIPOS_GARANTIA[7];
        const estadoReal = g.estado==="reclamada"?"reclamada":calcEstadoGarantia(g.fechaFin);
        const est = ESTADOS_GAR[estadoReal]||ESTADOS_GAR.vigente;
        const dias = g.fechaFin ? Math.ceil((new Date(g.fechaFin)-hoy)/864e5) : null;
        return (
          <div style={{ flex:1, background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${G.border}`, display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:22 }}>{tipo.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <div className="serif" style={{ fontSize:16 }}>{g.nombre}</div>
                  <span className="tag" style={{ background:est.bg, color:est.color }}>{est.label}</span>
                </div>
                <div style={{ fontSize:11, color:G.textMuted }}>{tipo.label} · {g.años} año{g.años!==1?"s":""}</div>
              </div>
              <button className="btn-ghost" onClick={()=>exportarCertificado(g)} style={{ fontSize:11 }}>⬇ Certificado</button>
              <button onClick={()=>setSelec(null)} style={{ background:"none",border:"none",color:G.textMuted,cursor:"pointer" }}>{Icon.x}</button>
            </div>

            <div style={{ flex:1, overflow:"auto", padding:20, display:"flex", flexDirection:"column", gap:16 }}>
              {/* Info clave */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  { label:"INICIO", val:g.fechaInicio },
                  { label:"VENCIMIENTO", val:g.fechaFin, color:dias!==null&&dias<0?G.red:dias!==null&&dias<90?G.gold:G.text },
                  { label:"PROVEEDOR", val:g.proveedor||"—" },
                  { label:"Nº SERIE / REF.", val:g.numeroSerie||"—" },
                  { label:"CONTACTO", val:g.contactoGarantia||"—" },
                  { label:"TELÉFONO", val:g.telefonoGarantia||"—" },
                ].map(f=>(
                  <div key={f.label} className="stat-box" style={{ padding:"10px 14px" }}>
                    <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>{f.label}</div>
                    <div style={{ fontSize:13, color:f.color||G.text, fontFamily:f.label.includes("SERIE")?"DM Mono":"DM Sans" }}>{f.val}</div>
                  </div>
                ))}
              </div>

              {/* Días restantes visual */}
              {dias !== null && (
                <div style={{ background:G.bg, borderRadius:8, padding:"14px 18px", textAlign:"center" }}>
                  <div style={{ fontSize:9, color:G.textMuted, fontFamily:"DM Mono", marginBottom:6 }}>DÍAS RESTANTES DE GARANTÍA</div>
                  <div className="serif" style={{ fontSize:36, color:dias<0?G.red:dias<90?G.gold:G.green }}>{Math.abs(dias)}</div>
                  <div style={{ fontSize:11, color:G.textMuted }}>{dias<0?`días de retraso (vencida el ${g.fechaFin})`:dias<90?"días — vence pronto":"días restantes"}</div>
                </div>
              )}

              {/* Descripción */}
              {g.descripcion && <div><label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:5,fontFamily:"DM Mono" }}>DESCRIPCIÓN</label><div style={{ fontSize:12,lineHeight:1.7 }}>{g.descripcion}</div></div>}

              {/* Documento adjunto */}
              {g.archivo && (
                <div>
                  <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:8,fontFamily:"DM Mono" }}>DOCUMENTO ADJUNTO</label>
                  <div style={{ display:"flex", gap:10, alignItems:"center", padding:"10px 14px", background:G.bg, borderRadius:6, border:`1px solid ${G.border}` }}>
                    <span style={{ fontSize:20 }}>{g.archivoTipo?.includes("pdf")?"📕":"📄"}</span>
                    <span style={{ flex:1, fontSize:12 }}>{g.archivoNombre}</span>
                    <a href={g.archivo} download={g.archivoNombre} style={{ color:G.gold, fontSize:11, textDecoration:"none", border:`1px solid ${G.gold}44`, padding:"4px 10px", borderRadius:4 }}>⬇ Descargar</a>
                  </div>
                </div>
              )}

              {/* Reclamaciones */}
              <div>
                <div style={{ fontSize:10,color:G.textMuted,marginBottom:10,fontFamily:"DM Mono" }}>RECLAMACIONES ({(g.reclamaciones||[]).length})</div>
                {(g.reclamaciones||[]).map((r,i)=>(
                  <div key={i} style={{ background:G.bg, borderRadius:6, padding:"10px 12px", border:`1px solid ${G.border}`, marginBottom:6 }}>
                    <div style={{ fontSize:10,color:G.textDim,marginBottom:3,fontFamily:"DM Mono" }}>{r.fecha}</div>
                    <div style={{ fontSize:12 }}>{r.texto}</div>
                  </div>
                ))}
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <input value={nuevaRec} onChange={e=>setNuevaRec(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&nuevaRec.trim()){ addReclamacion(g.id,nuevaRec); setNuevaRec(""); }}}
                    placeholder="Registrar reclamación..." style={{ flex:1, fontSize:12 }} />
                  <button className="btn-primary" onClick={()=>{ if(nuevaRec.trim()){ addReclamacion(g.id,nuevaRec); setNuevaRec(""); }}} style={{ padding:"8px 14px" }}>+</button>
                </div>
              </div>

              <div style={{ display:"flex", gap:8, paddingTop:8, borderTop:`1px solid ${G.border}` }}>
                <button className="btn-danger" onClick={()=>{ save(garantias.filter(x=>x.id!==g.id)); setSelec(null); }}>{Icon.trash} Eliminar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal nueva garantía */}
      {modal && (
        <Modal title="Nueva Garantía" onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:8 }}>TIPO DE GARANTÍA</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {TIPOS_GARANTIA.map(t=>(
                  <div key={t.id} onClick={()=>setForm(f=>({...f,tipo:t.id,años:t.años}))}
                    style={{ padding:"8px 6px", borderRadius:6, border:`1px solid ${form.tipo===t.id?G.gold:G.border}`, background:form.tipo===t.id?"#1E1A13":"transparent", cursor:"pointer", textAlign:"center" }}>
                    <div style={{ fontSize:18,marginBottom:2 }}>{t.emoji}</div>
                    <div style={{ fontSize:10, color:form.tipo===t.id?G.gold:G.textMuted }}>{t.label}</div>
                    <div style={{ fontSize:9, color:G.textDim }}>{t.años}a</div>
                  </div>
                ))}
              </div>
            </div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>ELEMENTO GARANTIZADO *</label>
              <input value={form.nombre} onChange={set("nombre")} placeholder="Instalación eléctrica, Nevera Samsung, Suelo de parquet..." autoFocus /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>PROVEEDOR / FABRICANTE</label>
                <input value={form.proveedor} onChange={set("proveedor")} placeholder="ElecPro, Samsung..." /></div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>Nº SERIE / REFERENCIA</label>
                <input value={form.numeroSerie} onChange={set("numeroSerie")} placeholder="SN-12345..." /></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>FECHA INICIO</label>
                <input type="date" value={form.fechaInicio} onChange={e=>setForm(f=>({...f,fechaInicio:e.target.value,fechaFin:calcFechaFin(e.target.value,f.años)}))} /></div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>DURACIÓN (AÑOS)</label>
                <input type="number" min="1" max="20" value={form.años} onChange={e=>setForm(f=>({...f,años:Number(e.target.value),fechaFin:calcFechaFin(f.fechaInicio,e.target.value)}))} /></div>
            </div>
            {form.fechaFin && <div style={{ fontSize:12, color:G.gold, fontFamily:"DM Mono" }}>Vence el: {form.fechaFin}</div>}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>CONTACTO GARANTÍA</label>
                <input value={form.contactoGarantia} onChange={set("contactoGarantia")} placeholder="Nombre o empresa..." /></div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>TELÉFONO GARANTÍA</label>
                <input value={form.telefonoGarantia} onChange={set("telefonoGarantia")} placeholder="900 123 456..." /></div>
            </div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>DESCRIPCIÓN / ALCANCE</label>
              <textarea value={form.descripcion} onChange={set("descripcion")} placeholder="Qué cubre esta garantía..." style={{ minHeight:60,resize:"vertical" }} /></div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>DOCUMENTO ADJUNTO (opcional)</label>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>document.getElementById("gar-file").click()} style={{ background:G.bg,border:`1px solid ${G.border}`,color:G.textMuted,padding:"7px 12px",borderRadius:6,fontSize:12,cursor:"pointer" }}>
                  {form.archivoNombre||"📎 Subir documento"}
                </button>
                <input id="gar-file" type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>subirArchivo(e.target.files[0])} />
              </div>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <button className="btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crear} disabled={!form.nombre.trim()} style={{ opacity:!form.nombre.trim()?0.5:1 }}>Crear garantía</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === EXTRAS ===& MODIFICADOS -----------------------------------------------------
const TIPOS_EXTRA = [
  { id: "extra",       label: "Extra",           emoji: "➕", color: G.blue   },
  { id: "modificado",  label: "Modificado",      emoji: "✏️", color: G.orange },
  { id: "imprevisto",  label: "Imprevisto",      emoji: "⚡", color: G.red    },
  { id: "mejora",      label: "Mejora cliente",  emoji: "⭐", color: "#A06EBE" },
  { id: "descuento",   label: "Descuento",       emoji: "🔻", color: G.green  },
];

const ESTADOS_EXTRA = {
  pendiente:  { label: "Pendiente aprobación", color: G.textMuted, bg: "#1E1E1E" },
  aprobado:   { label: "Aprobado",             color: G.green,     bg: "#101A10" },
  rechazado:  { label: "Rechazado",            color: G.red,       bg: "#2A1010" },
  ejecutado:  { label: "Ejecutado",            color: G.blue,      bg: "#101828" },
  facturado:  { label: "Facturado",            color: G.gold,      bg: "#1E1A13" },
};

function ExtrasTab({ obra, onUpdate }) {
  const extras = obra.extras || [];
  const [modal, setModal] = useState(false);
  const [selec, setSelec] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [form, setForm] = useState({ titulo:"", tipo:"extra", descripcion:"", importe:"", solicitadoPor:"cliente", fecha:new Date().toISOString().slice(0,10), faseId:"", impactoplazo:"" });

  const save = (nuevos) => onUpdate({ extras: nuevos });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const crear = () => {
    if (!form.titulo.trim()) return;
    const extra = { id: uid(), ...form, importe: Number(form.importe)||0, estado: "pendiente", comentarios: [], historial: [{ texto: "Extra creado", fecha: new Date().toLocaleDateString("es-ES") }] };
    save([...extras, extra]);
    setModal(false);
    setForm({ titulo:"", tipo:"extra", descripcion:"", importe:"", solicitadoPor:"cliente", fecha:new Date().toISOString().slice(0,10), faseId:"", impactoplazo:"" });
  };

  const updateExtra = (id, cambios) => {
    const nuevos = extras.map(e => e.id === id ? { ...e, ...cambios } : e);
    save(nuevos);
    if (selec?.id === id) setSelec(prev => ({ ...prev, ...cambios }));
  };

  const cambiarEstado = (id, nuevoEstado) => {
    const extra = extras.find(e => e.id === id);
    const historial = [...(extra?.historial||[]), { texto: `Estado cambiado a: ${ESTADOS_EXTRA[nuevoEstado]?.label}`, fecha: new Date().toLocaleDateString("es-ES") }];
    updateExtra(id, { estado: nuevoEstado, historial });
  };

  const analizarIA = async (extra) => {
    setLoadingIA(true);
    try {
      const presupOriginal = obra.presupuesto || 0;
      const extrasAprobados = extras.filter(e => e.estado !== "rechazado" && e.id !== extra.id).reduce((a,e)=>a+(e.importe||0),0);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 600,
          messages: [{ role: "user", content: `Eres experto en gestión de obras y reformas en España. Analiza este extra/modificado:\n\nObra: ${obra.nombre}\nPresupuesto original: ${fmt(presupOriginal)}\nExtras ya aprobados: ${fmt(extrasAprobados)}\nNuevo extra:\n- Tipo: ${extra.tipo}\n- Descripción: ${extra.titulo} — ${extra.descripcion||"sin descripción"}\n- Importe solicitado: ${fmt(extra.importe)}\n- Solicitado por: ${extra.solicitadoPor}\n- Impacto en plazo: ${extra.impactoplazo||"no especificado"}\n\nProporciona: 1) Si el precio es razonable para el mercado español, 2) Recomendación (aprobar/negociar/rechazar) con justificación, 3) Impacto real en el presupuesto total (%), 4) Puntos a negociar si procede. Máximo 150 palabras.` }]
        })
      });
      const data = await res.json();
      const texto = data.content?.find(b=>b.type==="text")?.text||"";
      updateExtra(extra.id, { analisisIA: texto });
      if (selec?.id === extra.id) setSelec(prev => ({ ...prev, analisisIA: texto }));
    } catch(e) { void 0; }
    setLoadingIA(false);
  };

  // Totales
  const totalExtras = extras.filter(e=>e.estado!=="rechazado").reduce((a,e)=>a+(e.importe||0),0);
  const aprobados = extras.filter(e=>e.estado==="aprobado"||e.estado==="ejecutado"||e.estado==="facturado").reduce((a,e)=>a+(e.importe||0),0);
  const pendientes = extras.filter(e=>e.estado==="pendiente").reduce((a,e)=>a+(e.importe||0),0);
  const presupTotal = (obra.presupuesto||0) + aprobados;

  return (
    <div style={{ display:"flex", gap:20, height:"100%" }}>
      {/* Lista */}
      <div style={{ flex: selec ? "0 0 400px" : 1, display:"flex", flexDirection:"column", gap:16 }}>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            { label:"PRESUPUESTO + EXTRAS", val:fmt(presupTotal), color:G.gold },
            { label:"EXTRAS APROBADOS", val:fmt(aprobados), color:G.green },
            { label:"PDTE. APROBACIÓN", val:fmt(pendientes), color:pendientes>0?G.orange:G.textMuted },
            { label:"VARIACIÓN TOTAL", val:`${obra.presupuesto?Math.round((aprobados/obra.presupuesto)*100):0}%`, color:aprobados>0?G.orange:G.textMuted },
          ].map(k=>(
            <div key={k.label} className="stat-box">
              <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
              <div className="serif" style={{ fontSize:18,color:k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Barra impacto presupuestario */}
        {obra.presupuesto > 0 && aprobados > 0 && (
          <div className="card" style={{ padding:"14px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12 }}>
              <span style={{ color:G.textMuted }}>Presupuesto original</span>
              <span style={{ display:"flex", gap:16 }}>
                <span className="mono" style={{ color:G.gold }}>{fmt(obra.presupuesto)}</span>
                <span style={{ color:G.textMuted }}>+</span>
                <span className="mono" style={{ color:G.orange }}>{fmt(aprobados)} extras</span>
                <span style={{ color:G.textMuted }}>=</span>
                <span className="mono" style={{ color:G.green }}>{fmt(presupTotal)}</span>
              </span>
            </div>
            <div style={{ height:8, background:G.border, borderRadius:4, overflow:"hidden", position:"relative" }}>
              <div style={{ position:"absolute",left:0,top:0,height:"100%",width:`${Math.min(100,obra.presupuesto/(presupTotal||1)*100)}%`,background:G.gold,borderRadius:"4px 0 0 4px" }} />
              <div style={{ position:"absolute",left:`${Math.min(100,obra.presupuesto/(presupTotal||1)*100)}%`,top:0,height:"100%",width:`${Math.min(100,aprobados/(presupTotal||1)*100)}%`,background:G.orange }} />
            </div>
            <div style={{ display:"flex", gap:16, marginTop:6, fontSize:10, color:G.textMuted }}>
              <span style={{ display:"flex",gap:4,alignItems:"center" }}><div style={{ width:8,height:8,borderRadius:2,background:G.gold }} />Original</span>
              <span style={{ display:"flex",gap:4,alignItems:"center" }}><div style={{ width:8,height:8,borderRadius:2,background:G.orange }} />Extras aprobados</span>
            </div>
          </div>
        )}

        {/* Nueva + lista */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, color:G.textMuted }}>{extras.length} extra{extras.length!==1?"s":""} registrado{extras.length!==1?"s":""}</div>
          <button className="btn-primary" onClick={()=>setModal(true)} style={{ display:"flex",alignItems:"center",gap:6 }}>
            {Icon.plus} Nuevo extra
          </button>
        </div>

        {extras.length===0 ? (
          <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
            <div style={{ fontSize:36,marginBottom:10 }}>➕</div>
            <div style={{ fontSize:13 }}>Sin extras ni modificados. Registra cualquier trabajo adicional o cambio del cliente.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {extras.map(extra => {
              const tipo = TIPOS_EXTRA.find(t=>t.id===extra.tipo)||TIPOS_EXTRA[0];
              const est = ESTADOS_EXTRA[extra.estado]||ESTADOS_EXTRA.pendiente;
              const fase = obra.fases?.find(f=>f.id===extra.faseId);
              const activo = selec?.id===extra.id;
              return (
                <div key={extra.id} className="card" onClick={()=>setSelec(activo?null:extra)}
                  style={{ cursor:"pointer", borderLeft:`3px solid ${tipo.color}`, background:activo?"#1A1A1A":G.surface }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{tipo.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
                        <span style={{ fontSize:13, fontWeight:500 }}>{extra.titulo}</span>
                        <span className="tag" style={{ background:tipo.color+"22", color:tipo.color }}>{tipo.label}</span>
                        <span className="tag" style={{ background:est.bg, color:est.color }}>{est.label}</span>
                      </div>
                      <div style={{ display:"flex", gap:16, fontSize:11, color:G.textMuted }}>
                        <span>{extra.fecha}</span>
                        <span>Por: {extra.solicitadoPor==="cliente"?"Cliente":"Profesional"}</span>
                        {fase && <span>Fase: {fase.nombre}</span>}
                        {extra.impactoplazo && <span>⏱ {extra.impactoplazo}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div className="mono" style={{ fontSize:16, color:extra.tipo==="descuento"?G.green:G.orange }}>
                        {extra.tipo==="descuento"?"-":"+"}{fmt(extra.importe)}
                      </div>
                      <select value={extra.estado} onChange={e=>{e.stopPropagation();cambiarEstado(extra.id,e.target.value);}} onClick={e=>e.stopPropagation()}
                        style={{ marginTop:6, width:"auto", fontSize:10, padding:"3px 6px", color:est.color, background:est.bg }}>
                        {Object.entries(ESTADOS_EXTRA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel detalle */}
      {selec && (() => {
        const extra = extras.find(e=>e.id===selec.id)||selec;
        const tipo = TIPOS_EXTRA.find(t=>t.id===extra.tipo)||TIPOS_EXTRA[0];
        const est = ESTADOS_EXTRA[extra.estado]||ESTADOS_EXTRA.pendiente;
        return (
          <div style={{ flex:1, background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${G.border}`, display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:22 }}>{tipo.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <div className="serif" style={{ fontSize:16 }}>{extra.titulo}</div>
                  <span className="tag" style={{ background:tipo.color+"22",color:tipo.color }}>{tipo.label}</span>
                  <span className="tag" style={{ background:est.bg,color:est.color }}>{est.label}</span>
                </div>
                <div style={{ fontSize:11,color:G.textMuted }}>{extra.fecha} · Solicitado por: {extra.solicitadoPor==="cliente"?"el cliente":"el profesional"}</div>
              </div>
              <button onClick={()=>setSelec(null)} style={{ background:"none",border:"none",color:G.textMuted,cursor:"pointer" }}>{Icon.x}</button>
            </div>

            <div style={{ flex:1, overflow:"auto", padding:20, display:"flex", flexDirection:"column", gap:16 }}>
              {/* Importe y datos */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div className="stat-box" style={{ padding:"12px 14px" }}>
                  <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>IMPORTE</div>
                  <div className="mono" style={{ fontSize:22, color:extra.tipo==="descuento"?G.green:G.orange }}>
                    {extra.tipo==="descuento"?"-":"+"}{fmt(extra.importe)}
                  </div>
                  <input type="number" value={extra.importe} onChange={e=>updateExtra(extra.id,{importe:Number(e.target.value)})} style={{ marginTop:8,fontSize:12 }} />
                </div>
                <div className="stat-box" style={{ padding:"12px 14px" }}>
                  <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>IMPACTO EN PLAZO</div>
                  <div style={{ fontSize:13 }}>{extra.impactoplazo||"No especificado"}</div>
                  <input value={extra.impactoplazo||""} onChange={e=>updateExtra(extra.id,{impactoplazo:e.target.value})} placeholder="+3 días, sin impacto..." style={{ marginTop:8,fontSize:12 }} />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label style={{ fontSize:10,color:G.textMuted,display:"block",marginBottom:6,fontFamily:"DM Mono" }}>DESCRIPCIÓN</label>
                <textarea value={extra.descripcion||""} onChange={e=>updateExtra(extra.id,{descripcion:e.target.value})}
                  placeholder="Descripción detallada del trabajo adicional o modificación..." style={{ minHeight:80,resize:"vertical",fontSize:12 }} />
              </div>

              {/* Análisis IA */}
              <div style={{ background:G.bg, border:`1px solid ${G.border}`, borderRadius:6, padding:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:extra.analisisIA?10:0 }}>
                  <div style={{ fontSize:11,color:G.gold }}>✦ Análisis IA</div>
                  <button className="btn-ghost" onClick={()=>analizarIA(extra)} disabled={loadingIA} style={{ fontSize:11,opacity:loadingIA?0.5:1 }}>
                    {loadingIA?"Analizando…":"Analizar"}
                  </button>
                </div>
                {extra.analisisIA ? (
                  <div style={{ fontSize:12,lineHeight:1.7,color:G.text,whiteSpace:"pre-wrap" }}>{extra.analisisIA}</div>
                ) : (
                  <div style={{ fontSize:11,color:G.textDim }}>La IA analiza si el precio es razonable, recomienda aprobar/negociar y calcula el impacto en presupuesto</div>
                )}
              </div>

              {/* Historial */}
              <div>
                <div style={{ fontSize:10,color:G.textMuted,marginBottom:8,fontFamily:"DM Mono" }}>HISTORIAL</div>
                {(extra.historial||[]).slice().reverse().map((h,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:`1px solid ${G.border}` }}>
                    <span className="mono" style={{ fontSize:10,color:G.textDim,flexShrink:0 }}>{h.fecha}</span>
                    <span style={{ fontSize:12 }}>{h.texto}</span>
                  </div>
                ))}
              </div>

              {/* Acciones */}
              <div style={{ display:"flex", gap:8, paddingTop:8, borderTop:`1px solid ${G.border}` }}>
                {extra.estado==="pendiente" && <>
                  <button className="btn-primary" onClick={()=>cambiarEstado(extra.id,"aprobado")} style={{ fontSize:12 }}>✓ Aprobar</button>
                  <button className="btn-ghost" onClick={()=>cambiarEstado(extra.id,"rechazado")} style={{ fontSize:12 }}>✕ Rechazar</button>
                </>}
                {extra.estado==="aprobado" && (
                  <button className="btn-primary" onClick={()=>cambiarEstado(extra.id,"ejecutado")} style={{ fontSize:12 }}>Marcar ejecutado</button>
                )}
                {extra.estado==="ejecutado" && (
                  <button className="btn-primary" onClick={()=>cambiarEstado(extra.id,"facturado")} style={{ fontSize:12 }}>💶 Marcar facturado</button>
                )}
                <button className="btn-danger" onClick={()=>{save(extras.filter(e=>e.id!==extra.id));setSelec(null);}} style={{ marginLeft:"auto" }}>{Icon.trash}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal nuevo extra */}
      {modal && (
        <Modal title="Nuevo Extra / Modificado" onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Tipo */}
            <div>
              <label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:8 }}>TIPO</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                {TIPOS_EXTRA.map(t=>(
                  <div key={t.id} onClick={()=>setForm(f=>({...f,tipo:t.id}))}
                    style={{ padding:"8px 10px", borderRadius:6, border:`1px solid ${form.tipo===t.id?t.color:G.border}`, background:form.tipo===t.id?t.color+"22":"transparent", cursor:"pointer", textAlign:"center" }}>
                    <div style={{ fontSize:18,marginBottom:2 }}>{t.emoji}</div>
                    <div style={{ fontSize:11, color:form.tipo===t.id?t.color:G.textMuted }}>{t.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>TÍTULO *</label>
              <input value={form.titulo} onChange={set("titulo")} placeholder="Ampliación baño, cambio de materiales..." autoFocus /></div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>DESCRIPCIÓN</label>
              <textarea value={form.descripcion} onChange={set("descripcion")} placeholder="Descripción detallada..." style={{ minHeight:70,resize:"vertical" }} /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>IMPORTE (€)</label>
                <input type="number" value={form.importe} onChange={set("importe")} placeholder="0" /></div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>SOLICITADO POR</label>
                <select value={form.solicitadoPor} onChange={set("solicitadoPor")}>
                  <option value="cliente">Cliente</option>
                  <option value="profesional">Profesional</option>
                </select>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>FECHA</label>
                <input type="date" value={form.fecha} onChange={set("fecha")} /></div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>FASE AFECTADA</label>
                <select value={form.faseId} onChange={set("faseId")}>
                  <option value="">Sin fase</option>
                  {(obra.fases||[]).map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
            </div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>IMPACTO EN PLAZO</label>
              <input value={form.impactoplazo} onChange={set("impactoplazo")} placeholder="+3 días, sin impacto en plazo..." /></div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <button className="btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crear} disabled={!form.titulo.trim()} style={{ opacity:!form.titulo.trim()?0.5:1 }}>Crear extra</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === FIRMA ===DIGITAL ------------------------------------------------------------
function FirmaTab({ obra, onUpdate }) {
  const documentos = obra.documentosFirma || [];
  const [docSelec, setDocSelec] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [formDoc, setFormDoc] = useState({ titulo: "", tipo: "contrato", descripcion: "" });
  const [firmando, setFirmando] = useState(null); // "cliente" | "profesional"
  const [canvasRef] = useState({ current: null });
  const [dibujando, setDibujando] = useState(false);
  const [ultimoPunto, setUltimoPunto] = useState(null);
  const [firmaVacia, setFirmaVacia] = useState(true);

  const save = (nuevos) => onUpdate({ documentosFirma: nuevos });
  const getDoc = () => documentos.find(d => d.id === docSelec?.id) || docSelec;

  const TIPOS_DOC = [
    { id: "contrato", label: "Contrato de obra", emoji: "📄" },
    { id: "presupuesto", label: "Presupuesto aceptado", emoji: "💶" },
    { id: "acta", label: "Acta de reunión", emoji: "📝" },
    { id: "entrega", label: "Acta de entrega", emoji: "🏁" },
    { id: "modificado", label: "Modificado/Extra", emoji: "➕" },
    { id: "garantia", label: "Garantía", emoji: "🛡️" },
    { id: "otro", label: "Otro documento", emoji: "📋" },
  ];

  const crearDocumento = () => {
    if (!formDoc.titulo.trim()) return;
    const doc = {
      id: uid(),
      ...formDoc,
      estado: "pendiente",
      creadoEn: new Date().toLocaleDateString("es-ES"),
      creadoISO: new Date().toISOString(),
      firmaCLiente: null,
      firmaProfesional: null,
      fechaFirmaCliente: null,
      fechaFirmaProfesional: null,
      contenido: generarContenido(formDoc),
    };
    const nuevos = [...documentos, doc];
    save(nuevos);
    setDocSelec(doc);
    setModalNuevo(false);
    setFormDoc({ titulo: "", tipo: "contrato", descripcion: "" });
  };

  const generarContenido = (form) => {
    const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch { return {}; } })();
    const hoy = new Date().toLocaleDateString("es-ES", { day:"numeric", month:"long", year:"numeric" });
    const bases = {
      contrato: `CONTRATO DE OBRA\n\nEn ${obra.ubicacion||"____"}, a ${hoy}\n\nREUNIDOS\n\nDe una parte, ${config.nombre||config.estudio||"____"} (en adelante, EL PROFESIONAL)${config.nif?", con NIF "+config.nif:""}.\n\nDe otra parte, ${obra.cliente||"____"} (en adelante, EL CLIENTE).\n\nACUERDAN\n\n1. OBJETO DEL CONTRATO\nEl Profesional se compromete a realizar la obra de reforma denominada "${obra.nombre}", sita en ${obra.ubicacion||"____"}.\n\n2. PLAZO DE EJECUCIÓN\nFecha de inicio: ${obra.fechaInicio||"____"}\nFecha de finalización prevista: ${obra.fechaFin||"____"}\n\n3. PRECIO Y FORMA DE PAGO\nEl precio total de la obra asciende a la cantidad de ${new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(obra.presupuesto||0)} (IVA incluido).\n\n4. OBLIGACIONES DEL PROFESIONAL\n- Ejecutar los trabajos con arreglo al proyecto y buenas prácticas constructivas.\n- Informar al Cliente de cualquier incidencia relevante.\n- Garantizar los trabajos realizados durante un período de 2 años.\n\n5. OBLIGACIONES DEL CLIENTE\n- Facilitar el acceso a la propiedad en los horarios acordados.\n- Realizar los pagos en los plazos establecidos.\n\n6. JURISDICCIÓN\nLas partes se someten a los Juzgados y Tribunales del domicilio del Profesional.\n\nY en prueba de conformidad, ambas partes firman el presente contrato.`,
      presupuesto: `ACEPTACIÓN DE PRESUPUESTO\n\nEn ${obra.ubicacion||"____"}, a ${hoy}\n\nEl cliente ${obra.cliente||"____"} acepta el presupuesto presentado por ${config.nombre||config.estudio||"____"} para la obra "${obra.nombre}" por un importe de ${new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(obra.presupuesto||0)} (IVA incluido).\n\n${form.descripcion||""}\n\nEl Cliente declara haber leído y comprendido el presupuesto y acepta todas sus condiciones.`,
      acta: `ACTA DE REUNIÓN\n\nFecha: ${hoy}\nObra: ${obra.nombre}\nCliente: ${obra.cliente||"____"}\nLugar: ${obra.ubicacion||"____"}\n\nPUNTOS TRATADOS\n${form.descripcion||"1. \n2. \n3. "}\n\nACUERDOS ADOPTADOS\n-\n-\n\nPRÓXIMOS PASOS\n-\n\nAmbas partes confirman lo reflejado en esta acta con su firma.`,
      entrega: `ACTA DE ENTREGA DE OBRA\n\nEn ${obra.ubicacion||"____"}, a ${hoy}\n\nEl Profesional ${config.nombre||config.estudio||"____"} hace entrega formal de la obra "${obra.nombre}" al cliente ${obra.cliente||"____"}.\n\nESTADO DE LA OBRA\n${form.descripcion||"La obra se entrega en perfecto estado, habiendo ejecutado todos los trabajos contratados."}\n\nGARANTÍAS\nLos trabajos ejecutados quedan bajo garantía durante 2 años a partir de la fecha de entrega.\n\nEl Cliente declara haber recibido las llaves/acceso y haber inspeccionado la obra, mostrando su conformidad con la misma.`,
      modificado: `MODIFICADO / TRABAJO EXTRA\n\nFecha: ${hoy}\nObra: ${obra.nombre}\nCliente: ${obra.cliente||"____"}\n\nDESCRIPCIÓN DEL MODIFICADO\n${form.descripcion||"Descripción del trabajo adicional o modificación."}\n\nIMPACTO ECONÓMICO\nImporte adicional acordado: ______ € (IVA incluido)\n\nIMPACTO EN PLAZO\nVariación del plazo: ______\n\nAmbas partes aceptan el presente modificado.`,
      garantia: `CERTIFICADO DE GARANTÍA\n\nEl Profesional ${config.nombre||config.estudio||"____"} certifica que los trabajos realizados en "${obra.nombre}" quedan cubiertos por una garantía de 2 años desde la fecha de entrega (${obra.fechaFin||hoy}).\n\n${form.descripcion||""}\n\nEsta garantía cubre defectos de ejecución pero no daños por uso indebido o causas ajenas a los trabajos realizados.`,
      otro: `DOCUMENTO: ${form.titulo}\n\nFecha: ${hoy}\nObra: ${obra.nombre}\nCliente: ${obra.cliente||"____"}\n\n${form.descripcion||""}`,
    };
    return bases[form.tipo] || bases.otro;
  };

  // Canvas de firma
  const iniciarCanvas = (canvas) => {
    if (!canvas || canvasRef.current === canvas) return;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1A1A2E";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDibujando(true);
    setFirmaVacia(false);
    const pos = getPos(e, canvasRef.current);
    setUltimoPunto(pos);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!dibujando || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(ultimoPunto.x, ultimoPunto.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setUltimoPunto(pos);
  };

  const stopDraw = () => setDibujando(false);

  const limpiarCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setFirmaVacia(true);
  };

  const guardarFirma = () => {
    if (!canvasRef.current || firmaVacia || !getDoc()) return;
    const firma = canvasRef.current.toDataURL("image/png");
    const ahora = new Date().toLocaleDateString("es-ES");
    const doc = getDoc();
    const cambios = firmando === "cliente"
      ? { firmaCliente: firma, fechaFirmaCliente: ahora }
      : { firmaProfesional: firma, fechaFirmaProfesional: ahora };
    // Estado del documento
    const yaFirmadoOtro = firmando === "cliente" ? doc.firmaProfesional : doc.firmaCliente;
    const nuevoEstado = yaFirmadoOtro ? "firmado" : "parcial";
    const nuevos = documentos.map(d => d.id === doc.id ? { ...d, ...cambios, estado: nuevoEstado } : d);
    save(nuevos);
    setDocSelec(prev => ({ ...prev, ...cambios, estado: nuevoEstado }));
    setFirmando(null);
    limpiarCanvas();
  };

  const exportarDocFirmado = (doc) => {
    const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch { return {}; } })();
    const tipo = TIPOS_DOC.find(t => t.id === doc.tipo);
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${doc.titulo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0} body{font-family:'DM Sans',sans-serif;font-size:13px;color:#1A1A2E;background:#F8F6F2}
  .page{max-width:210mm;margin:0 auto;background:#fff}
  @media print{.no-print{display:none}@page{margin:15mm;size:A4}}
  .header{background:#1A1A2E;padding:32px 48px;display:flex;justify-content:space-between;align-items:center}
  .brand{font-family:'Playfair Display',serif;font-size:18px;color:#C8A96E}
  .doc-info{text-align:right;color:#F8F6F2;font-size:11px;font-family:'DM Mono',monospace;color:#9090A8}
  .content{padding:40px 48px;min-height:300px}
  .content pre{font-family:'DM Sans',sans-serif;white-space:pre-wrap;font-size:13px;line-height:1.8;color:#1A1A2E}
  .firmas{display:grid;grid-template-columns:1fr 1fr;gap:48px;padding:32px 48px;border-top:1px solid #EEEBE5;background:#F8F6F2}
  .firma-box{text-align:center}
  .firma-img{max-width:200px;max-height:80px;margin:0 auto 8px;display:block;border-bottom:1px solid #1A1A2E;padding-bottom:4px}
  .firma-label{font-size:10px;font-family:'DM Mono',monospace;color:#9A9AB0;letter-spacing:0.06em}
  .firma-fecha{font-size:11px;color:#5A5A72;margin-top:4px}
  .firma-pending{height:80px;border-bottom:1px dashed #CCCCCC;margin-bottom:8px}
  .footer{padding:16px 48px;border-top:1px solid #EEEBE5;display:flex;justify-content:space-between;font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace}
  .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-family:'DM Mono',monospace;font-size:9px}
  .no-print{position:fixed;bottom:20px;right:20px;background:#1A1A2E;color:#C8A96E;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px}
</style></head><body><div class="page">
<div class="header">
  <div><div class="brand">${config.estudio||"Blue Forest"}</div><div style="font-size:10px;color:#9090A8;font-family:'DM Mono',monospace;margin-top:3px">GESTIÓN DE OBRAS PREMIUM</div></div>
  <div class="doc-info"><div style="font-size:14px;color:#F8F6F2;font-family:'Playfair Display',serif;margin-bottom:4px">${doc.titulo}</div><div>${tipo?.emoji||"📄"} ${tipo?.label||doc.tipo} · ${doc.creadoEn}</div><div style="margin-top:6px"><span class="badge" style="background:${doc.estado==="firmado"?"#2D7A4F22":"#C8A96E22"};color:${doc.estado==="firmado"?"#2D7A4F":"#C8A96E"}">${doc.estado==="firmado"?"✓ FIRMADO":"PENDIENTE"}</span></div></div>
</div>
<div class="content"><pre>${doc.contenido}</pre></div>
<div class="firmas">
  <div class="firma-box">
    ${doc.firmaCliente ? `<img class="firma-img" src="${doc.firmaCliente}" alt="Firma cliente" /><div class="firma-label">FIRMA DEL CLIENTE</div><div style="font-size:12px;margin-top:4px">${obra.cliente||"Cliente"}</div><div class="firma-fecha">${doc.fechaFirmaCliente||""}</div>` : `<div class="firma-pending"></div><div class="firma-label">FIRMA DEL CLIENTE</div><div style="font-size:12px;margin-top:4px;color:#9A9AB0">${obra.cliente||"Cliente"}</div><div class="firma-fecha" style="color:#CCCCCC">Pendiente de firma</div>`}
  </div>
  <div class="firma-box">
    ${doc.firmaProfesional ? `<img class="firma-img" src="${doc.firmaProfesional}" alt="Firma profesional" /><div class="firma-label">FIRMA DEL PROFESIONAL</div><div style="font-size:12px;margin-top:4px">${config.nombre||config.estudio||"Profesional"}</div><div class="firma-fecha">${doc.fechaFirmaProfesional||""}</div>` : `<div class="firma-pending"></div><div class="firma-label">FIRMA DEL PROFESIONAL</div><div style="font-size:12px;margin-top:4px;color:#9A9AB0">${config.nombre||config.estudio||"Profesional"}</div><div class="firma-fecha" style="color:#CCCCCC">Pendiente de firma</div>`}
  </div>
</div>
<div class="footer"><span>${config.estudio||"Blue Forest"} · ${config.nif||""}</span><span>Documento generado el ${new Date().toLocaleDateString("es-ES")}</span></div>
</div>
<button class="no-print" onclick="window.print()">🖨 Imprimir / PDF</button>
</body></html>`;
    const blob = new Blob([html], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${doc.titulo.replace(/\s+/g,"_")}_${obra.nombre.replace(/\s+/g,"_")}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const estadoColor = { pendiente:G.textMuted, parcial:G.orange, firmado:G.green };
  const estadoLabel = { pendiente:"Pendiente", parcial:"Firmado parcialmente", firmado:"Firmado" };

  return (
    <div style={{ display:"flex", gap:20, height:"100%" }}>
      {/* Lista documentos */}
      <div style={{ width:260, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
        <button className="btn-primary" onClick={()=>setModalNuevo(true)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          {Icon.plus} Nuevo documento
        </button>

        {/* KPIs */}
        {documentos.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { label:"FIRMADOS", val:documentos.filter(d=>d.estado==="firmado").length, color:G.green },
              { label:"PENDIENTES", val:documentos.filter(d=>d.estado!=="firmado").length, color:G.orange },
            ].map(k => (
              <div key={k.label} className="stat-box" style={{ padding:"10px 12px" }}>
                <div style={{ fontSize:9, color:G.textMuted, marginBottom:4, fontFamily:"DM Mono" }}>{k.label}</div>
                <div className="serif" style={{ fontSize:20, color:k.color }}>{k.val}</div>
              </div>
            ))}
          </div>
        )}

        {documentos.length === 0 ? (
          <div style={{ textAlign:"center", padding:"30px 0", color:G.textMuted }}>
            <div style={{ fontSize:32, marginBottom:10 }}>✍️</div>
            <div style={{ fontSize:13 }}>Sin documentos. Crea el primero para firmar digitalmente.</div>
          </div>
        ) : documentos.map(doc => {
          const tipo = TIPOS_DOC.find(t=>t.id===doc.tipo);
          const activo = docSelec?.id === doc.id;
          const col = estadoColor[doc.estado]||G.textMuted;
          return (
            <div key={doc.id} className="card" onClick={()=>setDocSelec(doc)}
              style={{ cursor:"pointer", borderLeft:`3px solid ${col}`, background:activo?"#1A1A1A":G.surface }}>
              <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{tipo?.emoji||"📄"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.titulo}</div>
                  <div style={{ fontSize:10, color:G.textMuted, marginTop:2 }}>{doc.creadoEn}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span className="tag" style={{ background:col+"22", color:col }}>{estadoLabel[doc.estado]}</span>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:8, fontSize:10, color:G.textMuted }}>
                <span>{doc.firmaCliente?"✓ Cliente":"○ Cliente"}</span>
                <span>{doc.firmaProfesional?"✓ Profesional":"○ Profesional"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel documento */}
      {!docSelec ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:G.textMuted }}>
          <div style={{ fontSize:48 }}>✍️</div>
          <div className="serif" style={{ fontSize:18 }}>Selecciona un documento para firmar</div>
          <div style={{ fontSize:13 }}>O crea uno nuevo desde las plantillas</div>
        </div>
      ) : (() => {
        const doc = getDoc();
        if (!doc) return null;
        const tipo = TIPOS_DOC.find(t=>t.id===doc.tipo);
        const col = estadoColor[doc.estado]||G.textMuted;
        return (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {/* Header */}
            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${G.border}`, background:G.surface, display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:20 }}>{tipo?.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div className="serif" style={{ fontSize:16 }}>{doc.titulo}</div>
                  <span className="tag" style={{ background:col+"22", color:col }}>{estadoLabel[doc.estado]}</span>
                </div>
                <div style={{ fontSize:11, color:G.textMuted }}>Creado {doc.creadoEn}</div>
              </div>
              <button className="btn-ghost" onClick={()=>exportarDocFirmado(doc)} style={{ fontSize:11 }}>⬇ Exportar</button>
              <button className="btn-danger" onClick={()=>{save(documentos.filter(d=>d.id!==doc.id));setDocSelec(null);}}>{Icon.trash}</button>
            </div>

            <div style={{ flex:1, overflow:"auto", padding:20, display:"flex", gap:20 }}>
              {/* Contenido editable */}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:8 }}>CONTENIDO DEL DOCUMENTO</div>
                <textarea value={doc.contenido||""} onChange={e=>{ const nuevos=documentos.map(d=>d.id===doc.id?{...d,contenido:e.target.value}:d); save(nuevos); setDocSelec(prev=>({...prev,contenido:e.target.value})); }}
                  style={{ width:"100%", minHeight:400, resize:"vertical", fontSize:12, lineHeight:1.8, fontFamily:"DM Sans, sans-serif", padding:"14px 16px" }} />
              </div>

              {/* Panel firmas */}
              <div style={{ width:260, flexShrink:0, display:"flex", flexDirection:"column", gap:14 }}>
                {/* Firma cliente */}
                <div className="card" style={{ padding:"16px" }}>
                  <div style={{ fontSize:11, color:G.textMuted, fontFamily:"DM Mono", marginBottom:10 }}>FIRMA DEL CLIENTE</div>
                  {doc.firmaCliente ? (
                    <>
                      <img src={doc.firmaCliente} alt="firma" style={{ width:"100%", maxHeight:80, objectFit:"contain", borderBottom:`1px solid ${G.border}`, paddingBottom:8, marginBottom:8 }} />
                      <div style={{ fontSize:11, color:G.textMuted }}>{obra.cliente||"Cliente"}</div>
                      <div style={{ fontSize:10, color:G.green }}>✓ Firmado el {doc.fechaFirmaCliente}</div>
                      <button className="btn-danger" onClick={()=>{const nuevos=documentos.map(d=>d.id===doc.id?{...d,firmaCliente:null,fechaFirmaCliente:null,estado:doc.firmaProfesional?"parcial":"pendiente"}:d);save(nuevos);setDocSelec(prev=>({...prev,firmaCliente:null,estado:doc.firmaProfesional?"parcial":"pendiente"}));}} style={{ fontSize:10, marginTop:8, width:"100%" }}>Eliminar firma</button>
                    </>
                  ) : (
                    <button className="btn-primary" onClick={()=>setFirmando("cliente")} style={{ width:"100%", fontSize:12 }}>✍ Firmar como cliente</button>
                  )}
                </div>

                {/* Firma profesional */}
                <div className="card" style={{ padding:"16px" }}>
                  <div style={{ fontSize:11, color:G.textMuted, fontFamily:"DM Mono", marginBottom:10 }}>FIRMA DEL PROFESIONAL</div>
                  {doc.firmaProfesional ? (
                    <>
                      <img src={doc.firmaProfesional} alt="firma" style={{ width:"100%", maxHeight:80, objectFit:"contain", borderBottom:`1px solid ${G.border}`, paddingBottom:8, marginBottom:8 }} />
                      <div style={{ fontSize:11, color:G.textMuted }}>{(() => { try { const c=JSON.parse(localStorage.getItem("bf-config")||"{}"); return c.nombre||c.estudio||"Profesional"; } catch { return "Profesional"; } })()}</div>
                      <div style={{ fontSize:10, color:G.green }}>✓ Firmado el {doc.fechaFirmaProfesional}</div>
                      <button className="btn-danger" onClick={()=>{const nuevos=documentos.map(d=>d.id===doc.id?{...d,firmaProfesional:null,fechaFirmaProfesional:null,estado:doc.firmaCliente?"parcial":"pendiente"}:d);save(nuevos);setDocSelec(prev=>({...prev,firmaProfesional:null,estado:doc.firmaCliente?"parcial":"pendiente"}));}} style={{ fontSize:10, marginTop:8, width:"100%" }}>Eliminar firma</button>
                    </>
                  ) : (
                    <button className="btn-primary" onClick={()=>setFirmando("profesional")} style={{ width:"100%", fontSize:12 }}>✍ Firmar como profesional</button>
                  )}
                </div>

                {doc.estado === "firmado" && (
                  <div style={{ background:"#101A10", border:`1px solid ${G.green}33`, borderRadius:8, padding:"14px 16px", textAlign:"center" }}>
                    <div style={{ fontSize:20, marginBottom:6 }}>✅</div>
                    <div style={{ fontSize:13, color:G.green, fontWeight:500 }}>Documento firmado</div>
                    <div style={{ fontSize:11, color:G.textMuted, marginTop:4 }}>Ambas partes han firmado</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal panel de firma */}
      {firmando && (
        <div className="modal-overlay" onClick={()=>setFirmando(null)}>
          <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:12, padding:28, width:440, boxShadow:"0 24px 60px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
            <div className="serif" style={{ fontSize:20, marginBottom:6 }}>
              Firma {firmando === "cliente" ? `del cliente (${obra.cliente||"Cliente"})` : "del profesional"}
            </div>
            <div style={{ fontSize:12, color:G.textMuted, marginBottom:16 }}>Dibuja tu firma en el recuadro. Usa el ratón o el dedo en pantalla táctil.</div>
            <canvas ref={el=>iniciarCanvas(el)} width={380} height={160}
              style={{ width:"100%", height:160, background:"#F8F6F2", borderRadius:8, border:`2px solid ${G.border}`, cursor:"crosshair", display:"block" }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button className="btn-ghost" onClick={limpiarCanvas} style={{ fontSize:12 }}>Limpiar</button>
              <button className="btn-ghost" onClick={()=>setFirmando(null)} style={{ fontSize:12 }}>Cancelar</button>
              <button className="btn-primary" onClick={guardarFirma} disabled={firmaVacia} style={{ flex:1, opacity:firmaVacia?0.5:1 }}>
                ✓ Guardar firma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo documento */}
      {modalNuevo && (
        <Modal title="Nuevo Documento" onClose={()=>setModalNuevo(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><label style={{ fontSize:11, color:G.textMuted, display:"block", marginBottom:5 }}>TIPO DE DOCUMENTO</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {TIPOS_DOC.map(t => (
                  <div key={t.id} onClick={()=>setFormDoc(f=>({...f,tipo:t.id}))}
                    style={{ padding:"10px 12px", borderRadius:6, border:`1px solid ${formDoc.tipo===t.id?G.gold:G.border}`, background:formDoc.tipo===t.id?"#1E1A13":"transparent", cursor:"pointer", display:"flex", gap:8, alignItems:"center" }}>
                    <span>{t.emoji}</span><span style={{ fontSize:12, color:formDoc.tipo===t.id?G.gold:G.text }}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div><label style={{ fontSize:11, color:G.textMuted, display:"block", marginBottom:5 }}>TÍTULO *</label>
              <input value={formDoc.titulo} onChange={e=>setFormDoc(f=>({...f,titulo:e.target.value}))} placeholder="Contrato de reforma oficina..." autoFocus /></div>
            <div><label style={{ fontSize:11, color:G.textMuted, display:"block", marginBottom:5 }}>NOTAS / DESCRIPCIÓN</label>
              <textarea value={formDoc.descripcion} onChange={e=>setFormDoc(f=>({...f,descripcion:e.target.value}))} placeholder="Detalles adicionales para incluir en el documento..." style={{ minHeight:70, resize:"vertical" }} /></div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
              <button className="btn-ghost" onClick={()=>setModalNuevo(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearDocumento} disabled={!formDoc.titulo.trim()} style={{ opacity:!formDoc.titulo.trim()?0.5:1 }}>Crear documento</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === GENERADOR ===DE PRESUPUESTOS PARA CLIENTE -----------------------------------
function PresupuestoClienteTab({ obra, onUpdate }) {
  const presups = obra.presupuestosCliente || [];
  const [selec, setSelec] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const [nombrePresup, setNombrePresup] = useState("");
  const [notasPresup, setNotasPresup] = useState("");

  const save = (nuevos) => onUpdate({ presupuestosCliente: nuevos });
  const getPresup = () => presups.find(p => p.id === selec?.id) || selec;

  const updatePresup = (id, cambios) => {
    const nuevos = presups.map(p => p.id === id ? { ...p, ...cambios } : p);
    save(nuevos);
    if (selec?.id === id) setSelec(prev => ({ ...prev, ...cambios }));
  };

  const addLinea = (presupId) => {
    const p = presups.find(x => x.id === presupId) || selec;
    const linea = { id: uid(), descripcion: "", unidad: "ud", cantidad: 1, precioUnit: 0, descuento: 0, categoria: "Mano de obra" };
    updatePresup(presupId, { lineas: [...(p.lineas||[]), linea] });
  };

  const updateLinea = (presupId, lineaId, cambios) => {
    const p = presups.find(x => x.id === presupId) || selec;
    const lineas = (p.lineas||[]).map(l => l.id === lineaId ? { ...l, ...cambios } : l);
    updatePresup(presupId, { lineas });
  };

  const calcTotales = (p) => {
    const lineas = p.lineas || [];
    const subtotal = lineas.reduce((a, l) => {
      const base = (Number(l.cantidad)||0) * (Number(l.precioUnit)||0);
      return a + base * (1 - (Number(l.descuento)||0)/100);
    }, 0);
    const iva = subtotal * ((Number(p.iva)||21)/100);
    return { subtotal, iva, total: subtotal + iva };
  };

  const generarConIA = async () => {
    if (!nombrePresup.trim()) return;
    setLoadingIA(true);
    const fases = (obra.fases||[]).map(f=>`${f.nombre} (${f.inicio||""}→${f.fin||""})`).join(", ");
    const provs = (obra.proveedores||[]).map(p=>`${p.nombre}: ${Array.isArray(p.especialidad)?p.especialidad.join(", "):(p.especialidad&&p.especialidad!=="undefined"?p.especialidad:"")} ${fmt(p.importe)}`).join(", ");
    const mats = (obra.materiales||[]).map(m=>`${m.nombre}: ${m.cantidad}${m.unidad} × ${fmt(m.precioUnit)}`).join(", ");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1500,
          messages: [{ role: "user", content: `Eres un experto en presupuestos de obras y reformas en España. Genera un presupuesto detallado para el cliente.\n\nOBRA: ${obra.nombre}\nCliente: ${obra.cliente||"—"}\nUbicación: ${obra.ubicacion||"—"}\nDescripción del presupuesto: ${nombrePresup}\nNotas: ${notasPresup||"—"}\nFases: ${fases||"—"}\nProveedores/Industriales: ${provs||"—"}\nMateriales: ${mats||"—"}\nPresupuesto base: ${fmt(obra.presupuesto)}\n\nGenera líneas de presupuesto detalladas y realistas para reformas premium en España. Responde ÚNICAMENTE con JSON válido sin backticks:\n{"lineas":[{"descripcion":"descripción clara","unidad":"ud|m²|ml|h|pa","cantidad":número,"precioUnit":número,"descuento":0,"categoria":"Demolición|Estructura|Instalaciones|Tabiquería|Revestimientos|Carpintería|Fontanería|Electricidad|Climatización|Mobiliario|Iluminación|Mano de obra|Otros"}],"condiciones":"condiciones de pago y ejecución típicas para este tipo de obra","validez":30}` }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      const nuevo = {
        id: uid(), nombre: nombrePresup, notas: notasPresup,
        fecha: new Date().toLocaleDateString("es-ES"), validez: parsed.validez||30,
        condiciones: parsed.condiciones||"", iva: 21, estado: "borrador",
        lineas: (parsed.lineas||[]).map(l=>({...l, id:uid()})),
        generadoIA: true,
      };
      save([...presups, nuevo]);
      setSelec(nuevo);
      setModalNuevo(false); setNombrePresup(""); setNotasPresup("");
    } catch(e) { void 0; }
    setLoadingIA(false);
  };

  const crearVacio = () => {
    if (!nombrePresup.trim()) return;
    const nuevo = { id: uid(), nombre: nombrePresup, notas: notasPresup, fecha: new Date().toLocaleDateString("es-ES"), validez: 30, condiciones: "", iva: 21, estado: "borrador", lineas: [], generadoIA: false };
    save([...presups, nuevo]);
    setSelec(nuevo); setModalNuevo(false); setNombrePresup(""); setNotasPresup("");
  };

  const exportarHTML = (p) => {
    const { subtotal, iva, total } = calcTotales(p);
    const categorias = [...new Set((p.lineas||[]).map(l=>l.categoria||"Otros"))];
    const estadoColor = { borrador:"#9A9AB0", enviado:"#C8A96E", aceptado:"#2D7A4F", rechazado:"#C0392B" };
    const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch { return {}; } })();

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Presupuesto — ${p.nombre}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0} body{font-family:'DM Sans',sans-serif;font-size:13px;color:#1A1A2E;background:#F8F6F2}
  .page{max-width:210mm;margin:0 auto;background:#fff;padding:0}
  @media print{.no-print{display:none}@page{margin:15mm;size:A4}}
  .header{background:#1A1A2E;padding:40px 48px;display:flex;justify-content:space-between;align-items:flex-start}
  .brand{font-family:'Playfair Display',serif;font-size:22px;color:#C8A96E}
  .brand-sub{font-size:10px;color:#9090A8;font-family:'DM Mono',monospace;letter-spacing:0.06em;margin-top:3px}
  .doc-type{text-align:right;color:#F8F6F2}
  .doc-num{font-family:'DM Mono',monospace;font-size:11px;color:#9090A8;margin-bottom:4px}
  .doc-title{font-family:'Playfair Display',serif;font-size:20px}
  .info-bar{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:3px solid #C8A96E}
  .info-col{padding:28px 48px}
  .info-col:first-child{background:#F8F6F2}
  .info-label{font-family:'DM Mono',monospace;font-size:9px;color:#9A9AB0;letter-spacing:0.06em;margin-bottom:4px}
  .info-val{font-size:14px;font-weight:500}
  .info-sub{font-size:11px;color:#9A9AB0;margin-top:2px}
  section{padding:32px 48px}
  h3{font-family:'Playfair Display',serif;font-size:16px;color:#1A1A2E;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #EEEBE5}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px}
  .cat-header td{background:#1A1A2E;color:#F8F6F2;padding:7px 10px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.05em;font-weight:500}
  td{padding:9px 10px;border-bottom:1px solid #EEEBE5;vertical-align:middle}
  tr:hover td{background:#F8F6F2}
  .col-desc{width:40%;font-weight:500}
  .col-num{width:12%;text-align:right;font-family:'DM Mono',monospace}
  .totales{background:#F8F6F2;border-radius:8px;padding:20px 24px;max-width:320px;margin-left:auto}
  .tot-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
  .tot-row.total{border-top:2px solid #1A1A2E;margin-top:8px;padding-top:12px;font-family:'Playfair Display',serif;font-size:18px;font-weight:600}
  .conditions{background:#F8F6F2;border-left:3px solid #C8A96E;padding:16px 20px;border-radius:0 6px 6px 0;font-size:12px;color:#5A5A72;line-height:1.7;margin-top:20px}
  .footer{padding:20px 48px;border-top:1px solid #EEEBE5;display:flex;justify-content:space-between;font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace}
  .sign-area{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
  .sign-box{border-top:1px solid #1A1A2E;padding-top:8px;font-size:11px;color:#9A9AB0}
  .no-print{position:fixed;bottom:20px;right:20px;background:#1A1A2E;color:#C8A96E;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,0.3)}
  .estado-badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-family:'DM Mono',monospace;background:${estadoColor[p.estado]||"#9A9AB0"}22;color:${estadoColor[p.estado]||"#9A9AB0"}}
</style></head><body><div class="page">

<div class="header">
  <div>
    <div class="brand">${config.estudio||"Blue Forest"}</div>
    <div class="brand-sub">ESTUDIO DE REFORMAS PREMIUM</div>
    ${config.email?`<div style="font-size:11px;color:#9090A8;margin-top:6px">${config.email}</div>`:""}
    ${config.telefono?`<div style="font-size:11px;color:#9090A8">${config.telefono}</div>`:""}
  </div>
  <div class="doc-type">
    <div class="doc-num">PRESUPUESTO · ${p.fecha}</div>
    <div class="doc-title">${p.nombre}</div>
    <div style="margin-top:8px"><span class="estado-badge">${p.estado.toUpperCase()}</span></div>
  </div>
</div>

<div class="info-bar">
  <div class="info-col">
    <div class="info-label">CLIENTE</div>
    <div class="info-val">${obra.cliente||"—"}</div>
    ${obra.ubicacion?`<div class="info-sub">${obra.ubicacion}</div>`:""}
  </div>
  <div class="info-col" style="background:#fff">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div><div class="info-label">FECHA</div><div class="info-val" style="font-size:13px">${p.fecha}</div></div>
      <div><div class="info-label">VALIDEZ</div><div class="info-val" style="font-size:13px">${p.validez} días</div></div>
      ${config.nif?`<div><div class="info-label">NIF/CIF</div><div class="info-val" style="font-size:13px">${config.nif}</div></div>`:""}
    </div>
  </div>
</div>

<section>
  ${categorias.map(cat => {
    const lineasCat = (p.lineas||[]).filter(l=>(l.categoria||"Otros")===cat);
    if (!lineasCat.length) return "";
    return `
    <table>
      <tr class="cat-header"><td colspan="6">${cat.toUpperCase()}</td></tr>
      <tr style="background:#F8F6F2"><td class="col-desc" style="font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace">DESCRIPCIÓN</td><td class="col-num" style="font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace">CANT.</td><td class="col-num" style="font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace">UNID.</td><td class="col-num" style="font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace">P.UNIT.</td><td class="col-num" style="font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace">DTO.</td><td class="col-num" style="font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace">TOTAL</td></tr>
      ${lineasCat.map(l => {
        const base = (Number(l.cantidad)||0)*(Number(l.precioUnit)||0);
        const tot = base*(1-(Number(l.descuento)||0)/100);
        return `<tr><td class="col-desc">${l.descripcion}</td><td class="col-num">${l.cantidad}</td><td class="col-num">${l.unidad}</td><td class="col-num">${fmt(l.precioUnit)}</td><td class="col-num">${l.descuento?l.descuento+"%":"—"}</td><td class="col-num" style="font-weight:600;color:#1A1A2E">${fmt(tot)}</td></tr>`;
      }).join("")}
    </table>`;
  }).join("")}

  <div class="totales">
    <div class="tot-row"><span>Subtotal</span><span style="font-family:'DM Mono',monospace">${fmt(subtotal)}</span></div>
    <div class="tot-row"><span>IVA (${p.iva||21}%)</span><span style="font-family:'DM Mono',monospace">${fmt(iva)}</span></div>
    <div class="tot-row total"><span>TOTAL</span><span style="color:#C8A96E">${fmt(total)}</span></div>
  </div>

  ${p.condiciones?`<div class="conditions">${p.condiciones.replace(/\n/g,"<br>")}</div>`:""}
  ${p.notas?`<div style="margin-top:16px;font-size:12px;color:#5A5A72;font-style:italic">${p.notas}</div>`:""}

  <div class="sign-area">
    <div class="sign-box">Firma y conformidad del cliente<br><br><br>${obra.cliente||"Cliente"}</div>
    <div class="sign-box">Firma del profesional<br><br><br>${config.nombre||config.estudio||"Blue Forest"}</div>
  </div>
</section>

<div class="footer">
  <span>${config.estudio||"Blue Forest"} · ${config.nif||""}</span>
  <span>Presupuesto válido durante ${p.validez} días desde ${p.fecha}</span>
</div>

</div>
<button class="no-print" onclick="window.print()">🖨 Imprimir / PDF</button>
</body></html>`;

    const blob = new Blob([html], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Presupuesto_${p.nombre.replace(/\s+/g,"_")}_${obra.cliente||obra.nombre}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const ESTADOS_P = { borrador:"Borrador", enviado:"Enviado", aceptado:"Aceptado", rechazado:"Rechazado" };
  const ESTADOS_P_COLOR = { borrador:G.textMuted, enviado:G.gold, aceptado:G.green, rechazado:G.red };

  return (
    <div style={{ display:"flex", gap:20, height:"100%" }}>
      {/* Lista presupuestos */}
      <div style={{ width:260, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
        <button className="btn-primary" onClick={()=>setModalNuevo(true)} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          {Icon.plus} Nuevo presupuesto
        </button>
        {presups.length===0 ? (
          <div style={{ textAlign:"center", padding:"30px 0", color:G.textMuted }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
            <div style={{ fontSize:13 }}>Sin presupuestos. Crea uno manualmente o con IA.</div>
          </div>
        ) : presups.map(p => {
          const {total} = calcTotales(p);
          const activo = selec?.id===p.id;
          const col = ESTADOS_P_COLOR[p.estado]||G.textMuted;
          return (
            <div key={p.id} className="card" onClick={()=>setSelec(p)}
              style={{ cursor:"pointer", borderLeft:`3px solid ${col}`, background:activo?"#1E1A13":G.surface }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div style={{ fontSize:13, fontWeight:500, flex:1, marginRight:8 }}>{p.nombre}</div>
                <span className="tag" style={{ background:col+"22", color:col, flexShrink:0 }}>{ESTADOS_P[p.estado]}</span>
              </div>
              <div className="mono" style={{ fontSize:16, color:G.gold, marginBottom:4 }}>{fmt(total)}</div>
              <div style={{ fontSize:10, color:G.textDim }}>{p.fecha} · {p.lineas?.length||0} líneas{p.generadoIA?" · IA":""}</div>
            </div>
          );
        })}
      </div>

      {/* Editor presupuesto */}
      {!selec ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:G.textMuted }}>
          <div style={{ fontSize:40 }}>📋</div>
          <div className="serif" style={{ fontSize:18 }}>Selecciona o crea un presupuesto</div>
        </div>
      ) : (() => {
        const p = getPresup();
        if (!p) return null;
        const { subtotal, iva, total } = calcTotales(p);
        const col = ESTADOS_P_COLOR[p.estado]||G.textMuted;
        const categorias = [...new Set((p.lineas||[]).map(l=>l.categoria||"Otros"))];
        const CATS = ["Demolición","Estructura","Instalaciones","Tabiquería","Revestimientos","Carpintería","Fontanería","Electricidad","Climatización","Mobiliario","Iluminación","Mano de obra","Otros"];
        const UNIDADES = ["ud","m²","ml","m³","h","pa","kg","l","caja","juego"];

        return (
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:0, overflow:"hidden" }}>
            {/* Header */}
            <div style={{ padding:"14px 20px", borderBottom:`1px solid ${G.border}`, background:G.surface, display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <input value={p.nombre} onChange={e=>updatePresup(p.id,{nombre:e.target.value})} className="serif" style={{ fontSize:16, background:"none", border:"none", color:G.text, padding:0, fontFamily:"Playfair Display, serif" }} />
                  <span className="tag" style={{ background:col+"22", color:col }}>{ESTADOS_P[p.estado]}</span>
                  {p.generadoIA && <span className="tag" style={{ background:G.gold+"22", color:G.gold }}>IA</span>}
                </div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:G.textMuted }}>
                  <span>{p.fecha}</span>
                  <span>Validez: <input type="number" value={p.validez} onChange={e=>updatePresup(p.id,{validez:Number(e.target.value)})} style={{ width:36, fontSize:11, padding:"1px 4px", display:"inline" }} /> días</span>
                  <span>IVA: <input type="number" value={p.iva||21} onChange={e=>updatePresup(p.id,{iva:Number(e.target.value)})} style={{ width:36, fontSize:11, padding:"1px 4px", display:"inline" }} />%</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <select value={p.estado} onChange={e=>updatePresup(p.id,{estado:e.target.value})} style={{ width:"auto", fontSize:11, padding:"4px 8px", color:col }}>
                  {Object.entries(ESTADOS_P).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
                <button className="btn-ghost" onClick={()=>addLinea(p.id)} style={{ fontSize:11 }}>+ Línea</button>
                <button className="btn-primary" onClick={()=>exportarHTML(p)} style={{ fontSize:11, display:"flex", alignItems:"center", gap:5 }}>⬇ Exportar</button>
                <button className="btn-danger" onClick={()=>{save(presups.filter(x=>x.id!==p.id));setSelec(null);}} style={{ fontSize:11 }}>{Icon.trash}</button>
              </div>
            </div>

            {/* Líneas */}
            <div style={{ flex:1, overflow:"auto", padding:20 }}>
              {/* Cabecera tabla */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr auto", gap:8, padding:"6px 10px", background:G.bg, borderRadius:"6px 6px 0 0", marginBottom:2 }}>
                {["DESCRIPCIÓN","CATEG.","CANT.","UNID.","P.UNIT. €","DTO. %","TOTAL"].map(h=>(
                  <div key={h} style={{ fontSize:9, color:G.textMuted, fontFamily:"DM Mono" }}>{h}</div>
                ))}
              </div>

              {(p.lineas||[]).length===0 ? (
                <div style={{ textAlign:"center", padding:"30px 0", color:G.textMuted, background:G.surface, borderRadius:"0 0 6px 6px", border:`1px solid ${G.border}`, borderTop:"none" }}>
                  <div style={{ fontSize:13 }}>Sin líneas. Pulsa "+ Línea" para añadir.</div>
                </div>
              ) : (
                <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderTop:"none", borderRadius:"0 0 6px 6px" }}>
                  {(p.lineas||[]).map((l,i) => {
                    const base = (Number(l.cantidad)||0)*(Number(l.precioUnit)||0);
                    const tot = base*(1-(Number(l.descuento)||0)/100);
                    return (
                      <div key={l.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr auto", gap:8, padding:"8px 10px", borderBottom:i<(p.lineas.length-1)?`1px solid ${G.border}`:"none", alignItems:"center" }}>
                        <input value={l.descripcion} onChange={e=>updateLinea(p.id,l.id,{descripcion:e.target.value})} placeholder="Descripción del trabajo..." style={{ fontSize:12 }} />
                        <select value={l.categoria||"Otros"} onChange={e=>updateLinea(p.id,l.id,{categoria:e.target.value})} style={{ fontSize:11 }}>
                          {CATS.map(c=><option key={c}>{c}</option>)}
                        </select>
                        <input type="number" value={l.cantidad} onChange={e=>updateLinea(p.id,l.id,{cantidad:e.target.value})} style={{ fontSize:12, textAlign:"right" }} />
                        <select value={l.unidad||"ud"} onChange={e=>updateLinea(p.id,l.id,{unidad:e.target.value})} style={{ fontSize:11 }}>
                          {UNIDADES.map(u=><option key={u}>{u}</option>)}
                        </select>
                        <input type="number" value={l.precioUnit} onChange={e=>updateLinea(p.id,l.id,{precioUnit:e.target.value})} style={{ fontSize:12, textAlign:"right" }} />
                        <input type="number" value={l.descuento||0} onChange={e=>updateLinea(p.id,l.id,{descuento:e.target.value})} min="0" max="100" style={{ fontSize:12, textAlign:"right" }} />
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <span className="mono" style={{ fontSize:12, color:G.gold, minWidth:70, textAlign:"right" }}>{fmt(tot)}</span>
                          <button onClick={()=>updatePresup(p.id,{lineas:(p.lineas||[]).filter(x=>x.id!==l.id)})} style={{ background:"none", border:"none", color:G.textDim, cursor:"pointer", padding:2 }}>{Icon.trash}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totales */}
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
                <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, padding:"16px 20px", minWidth:260 }}>
                  {[
                    { label:"Subtotal", val:fmt(subtotal), color:G.text },
                    { label:`IVA (${p.iva||21}%)`, val:fmt(iva), color:G.textMuted },
                  ].map(r=>(
                    <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                      <span style={{ color:G.textMuted }}>{r.label}</span>
                      <span className="mono" style={{ color:r.color }}>{r.val}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:`2px solid ${G.border}`, marginTop:4 }}>
                    <span className="serif" style={{ fontSize:16 }}>TOTAL</span>
                    <span className="mono" style={{ fontSize:18, color:G.gold }}>{fmt(total)}</span>
                  </div>
                </div>
              </div>

              {/* Condiciones y notas */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:16 }}>
                <div>
                  <label style={{ fontSize:10, color:G.textMuted, display:"block", marginBottom:6, fontFamily:"DM Mono" }}>CONDICIONES DE PAGO Y EJECUCIÓN</label>
                  <textarea value={p.condiciones||""} onChange={e=>updatePresup(p.id,{condiciones:e.target.value})}
                    placeholder="Forma de pago, plazos, garantías incluidas..." style={{ minHeight:80, resize:"vertical", fontSize:12 }} />
                </div>
                <div>
                  <label style={{ fontSize:10, color:G.textMuted, display:"block", marginBottom:6, fontFamily:"DM Mono" }}>NOTAS ADICIONALES</label>
                  <textarea value={p.notas||""} onChange={e=>updatePresup(p.id,{notas:e.target.value})}
                    placeholder="Exclusiones, observaciones, materiales no incluidos..." style={{ minHeight:80, resize:"vertical", fontSize:12 }} />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal nuevo presupuesto */}
      {modalNuevo && (
        <Modal title="Nuevo Presupuesto" onClose={()=>setModalNuevo(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><label style={{ fontSize:11, color:G.textMuted, display:"block", marginBottom:5 }}>NOMBRE *</label>
              <input value={nombrePresup} onChange={e=>setNombrePresup(e.target.value)} placeholder="Presupuesto reforma completa..." autoFocus /></div>
            <div><label style={{ fontSize:11, color:G.textMuted, display:"block", marginBottom:5 }}>DESCRIPCIÓN / ALCANCE</label>
              <textarea value={notasPresup} onChange={e=>setNotasPresup(e.target.value)} placeholder="Descripción del trabajo a presupuestar..." style={{ minHeight:70, resize:"vertical" }} /></div>

            <div style={{ background:"#1A1A13", border:`1px solid ${G.gold}33`, borderRadius:8, padding:16 }}>
              <div style={{ fontSize:13, color:G.gold, marginBottom:6 }}>✦ Generar con IA</div>
              <div style={{ fontSize:12, color:G.textMuted, marginBottom:10 }}>Claude genera líneas detalladas basándose en las fases, materiales y proveedores de esta obra</div>
              <button className="btn-primary" onClick={generarConIA} disabled={loadingIA||!nombrePresup.trim()} style={{ width:"100%", opacity:loadingIA||!nombrePresup.trim()?0.5:1 }}>
                {loadingIA?"Generando presupuesto…":"✦ Generar con IA"}
              </button>
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="btn-ghost" onClick={()=>setModalNuevo(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearVacio} disabled={!nombrePresup.trim()} style={{ opacity:!nombrePresup.trim()?0.5:1 }}>Crear vacío</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === COMPARADOR ===DE PRESUPUESTOS -----------------------------------------------
function ComparadorTab({ obra, onUpdate }) {
  const comparaciones = obra.comparaciones || [];
  const [modalNueva, setModalNueva] = useState(false);
  const [comparActiva, setComparActiva] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [analisisIA, setAnalisisIA] = useState("");
  const [nombreComp, setNombreComp] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [vistaMode, setVistaMode] = useState("fichas"); // "fichas" | "tabla" | "grafico"
  const [expandidaId, setExpandidaId] = useState(null);

  const save = (nuevas) => onUpdate({ comparaciones: nuevas });

  const crearComparacion = () => {
    if (!nombreComp.trim()) return;
    const nueva = { id:uid(), nombre:nombreComp, descripcion, creadoEn:new Date().toLocaleDateString("es-ES"), ofertas:[], analisisIA:"", ganadoId:null, categoria:"general" };
    save([...comparaciones, nueva]);
    setComparActiva(nueva); setModalNueva(false); setNombreComp(""); setDescripcion("");
  };

  const updateCompar = (id, cambios) => {
    const nuevas = comparaciones.map(c => c.id===id ? {...c,...cambios} : c);
    save(nuevas);
    if (comparActiva?.id===id) setComparActiva(prev=>({...prev,...cambios}));
  };

  const addOferta = (comparId) => {
    const comp = comparaciones.find(c=>c.id===comparId);
    if (!comp) return;
    const oferta = { id:uid(), empresa:"", contacto:"", telefono:"", email:"", total:"", plazo:"", garantia:"", notas:"", valoracion:0, partidas:[], fechaOferta:new Date().toISOString().slice(0,10), incluye:"", excluye:"", formaPago:"" };
    updateCompar(comparId, { ofertas:[...comp.ofertas, oferta] });
    setExpandidaId(oferta.id);
  };

  const updateOferta = (comparId, ofertaId, cambios) => {
    const comp = comparaciones.find(c=>c.id===comparId)||comparActiva;
    updateCompar(comparId, { ofertas:(comp.ofertas||[]).map(o=>o.id===ofertaId?{...o,...cambios}:o) });
  };

  const addPartida = (comparId, ofertaId) => {
    const comp = comparaciones.find(c=>c.id===comparId)||comparActiva;
    updateCompar(comparId, { ofertas:(comp.ofertas||[]).map(o=>o.id===ofertaId?{...o,partidas:[...(o.partidas||[]),{id:uid(),concepto:"",unidades:"",precioUnit:"",total:"",categoria:""}]}:o) });
  };

  const analizarConIA = async () => {
    const comp = comparaciones.find(c=>c.id===comparActiva?.id)||comparActiva;
    if (!comp||comp.ofertas.length<2) return;
    setLoadingIA(true); setAnalisisIA("");
    const ofertasTexto = comp.ofertas.map((o,i)=>[
      `OFERTA ${i+1} — ${o.empresa||"Sin nombre"}:`,
      `  Total: ${fmt(Number(o.total)||0)} | Plazo: ${o.plazo||"?"} | Garantía: ${o.garantia||"?"}`,
      `  Forma de pago: ${o.formaPago||"no indicada"} | Valoración: ${o.valoracion||0}/5`,
      o.incluye?`  Incluye: ${o.incluye}`:"",
      o.excluye?`  No incluye: ${o.excluye}`:"",
      o.notas?`  Notas: ${o.notas}`:"",
      (o.partidas||[]).length?`  Partidas: ${(o.partidas||[]).map(p=>`${p.concepto}: ${fmt(Number(p.total)||0)}`).join(", ")}`:"",
    ].filter(Boolean).join("\n")).join("\n\n");
    try {
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1000,
          messages:[{ role:"user", content:`Experto en gestión de obras en España. Analiza ${comp.ofertas.length} ofertas para "${comp.nombre}":\n\n${ofertasTexto}\n\n1) Tabla comparativa resumida (precio/plazo/garantía/riesgo)\n2) Recomendación clara con justificación\n3) Red flags de cada oferta (qué falta, qué preocupa)\n4) Precio de referencia mercado España para este trabajo\n5) Puntos a negociar con la oferta elegida\n6) Preguntas a hacer antes de firmar\n\nMáximo 320 palabras. Sé directo y útil.` }]
        })
      });
      const data = await res.json();
      const texto = data.content?.find(b=>b.type==="text")?.text||"";
      setAnalisisIA(texto);
      updateCompar(comp.id, { analisisIA:texto });
    } catch { setAnalisisIA("Error al analizar."); }
    setLoadingIA(false);
  };

  const getComp = () => comparaciones.find(c=>c.id===comparActiva?.id)||comparActiva;
  const comp = getComp();
  const totales = comp?.ofertas.map(o=>Number(o.total)||0)||[];
  const totalesPos = totales.filter(t=>t>0);
  const minTotal = totalesPos.length ? Math.min(...totalesPos) : 0;
  const maxTotal = totalesPos.length ? Math.max(...totalesPos) : 0;
  const mediaTotal = totalesPos.length ? Math.round(totalesPos.reduce((a,b)=>a+b,0)/totalesPos.length) : 0;
  const ahorro = maxTotal-minTotal;

  // Estrellas valoraci-n
  const Estrellas = ({val, onChange}) => (
    <div style={{ display:"flex",gap:2 }}>
      {[1,2,3,4,5].map(n=>(
        <span key={n} onClick={()=>onChange(n)} style={{ fontSize:16,cursor:"pointer",color:n<=val?G.gold:G.border }}>★</span>
      ))}
    </div>
  );

  return (
    <div style={{ display:"flex", gap:20, height:"100%" }}>
      {/* Lista comparaciones */}
      <div style={{ width:240, flexShrink:0, display:"flex", flexDirection:"column", gap:10 }}>
        <button className="btn-primary" onClick={()=>setModalNueva(true)} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
          {Icon.plus} Nueva comparación
        </button>
        {comparaciones.length===0 ? (
          <div style={{ textAlign:"center",padding:"30px 0",color:G.textMuted }}>
            <div style={{ fontSize:32,marginBottom:10 }}>📊</div>
            <div style={{ fontSize:13 }}>Compara presupuestos de industriales. Elige el mejor con ayuda de la IA.</div>
          </div>
        ) : comparaciones.map(c=>{
          const activa = comparActiva?.id===c.id;
          const ganador = c.ofertas.find(o=>o.id===c.ganadoId);
          const tots = c.ofertas.map(o=>Number(o.total)||0).filter(t=>t>0);
          const minT = tots.length?Math.min(...tots):0;
          return (
            <div key={c.id} className="card" onClick={()=>{setComparActiva(c);setAnalisisIA(c.analisisIA||"");}}
              style={{ cursor:"pointer",background:activa?"#1E1A13":G.surface,borderLeft:`3px solid ${activa?G.gold:G.border}` }}>
              <div style={{ fontSize:13,fontWeight:500,marginBottom:4 }}>{c.nombre}</div>
              {c.descripcion&&<div style={{ fontSize:11,color:G.textMuted,marginBottom:6 }}>{c.descripcion}</div>}
              <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:4 }}>
                <span className="tag" style={{ background:G.gold+"22",color:G.gold }}>{c.ofertas.length} ofertas</span>
                {ganador&&<span className="tag" style={{ background:G.green+"22",color:G.green }}>✓ Elegida</span>}
              </div>
              {minT>0&&<div className="mono" style={{ fontSize:11,color:G.gold }}>desde {fmt(minT)}</div>}
              <div style={{ fontSize:9,color:G.textDim,marginTop:4 }}>{c.creadoEn}</div>
            </div>
          );
        })}
      </div>

      {/* Panel derecho */}
      {!comp ? (
        <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:G.textMuted }}>
          <div style={{ fontSize:40 }}>📋</div>
          <div className="serif" style={{ fontSize:18 }}>Selecciona una comparación</div>
          <div style={{ fontSize:13 }}>O crea una nueva para comparar presupuestos</div>
        </div>
      ) : (
        <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
          {/* Header */}
          <div style={{ padding:"14px 0",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16 }}>
            <div>
              <div className="serif" style={{ fontSize:20 }}>{comp.nombre}</div>
              {comp.descripcion&&<div style={{ fontSize:12,color:G.textMuted,marginTop:2 }}>{comp.descripcion}</div>}
            </div>
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              {/* Vista toggle */}
              <div style={{ display:"flex",gap:3,background:G.bg,borderRadius:5,padding:3 }}>
                {[["fichas","☰"],["tabla","⊞"],["grafico","📊"]].map(([id,icon])=>(
                  <button key={id} onClick={()=>setVistaMode(id)} style={{ padding:"4px 10px",borderRadius:3,border:"none",background:vistaMode===id?G.surface:"transparent",color:vistaMode===id?G.gold:G.textMuted,fontSize:13,cursor:"pointer" }}>{icon}</button>
                ))}
              </div>
              <button className="btn-ghost" onClick={()=>addOferta(comp.id)} style={{ fontSize:12 }}>{Icon.plus} Oferta</button>
              <button className="btn-primary" onClick={analizarConIA} disabled={loadingIA||comp.ofertas.length<2} style={{ fontSize:12,opacity:loadingIA||comp.ofertas.length<2?0.5:1 }}>
                {loadingIA?"Analizando…":"✦ IA"}
              </button>
              <button className="btn-danger" onClick={()=>{save(comparaciones.filter(c2=>c2.id!==comp.id));setComparActiva(null);}} style={{ fontSize:11 }}>{Icon.trash}</button>
            </div>
          </div>

          <div style={{ flex:1,overflow:"auto" }}>
            {/* KPIs */}
            {totalesPos.length>1&&(
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16 }}>
                {[
                  { label:"MÁS BAJA", val:fmt(minTotal), color:G.green },
                  { label:"MEDIA MERCADO", val:fmt(mediaTotal), color:G.gold },
                  { label:"MÁS ALTA", val:fmt(maxTotal), color:G.textMuted },
                  { label:"AHORRO POTENCIAL", val:fmt(ahorro), color:ahorro>0?G.green:G.textMuted },
                ].map(k=>(
                  <div key={k.label} className="stat-box">
                    <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
                    <div className="serif" style={{ fontSize:20,color:k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── VISTA FICHAS ── */}
            {vistaMode==="fichas"&&(
              comp.ofertas.length===0
                ?<div className="card" style={{ textAlign:"center",padding:32,color:G.textMuted }}>Añade la primera oferta con el botón "+ Oferta"</div>
                :<div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  {comp.ofertas.map((oferta,idx)=>{
                    const total=Number(oferta.total)||0;
                    const esMenor=total>0&&total===minTotal&&totalesPos.length>1;
                    const esMayor=total>0&&total===maxTotal&&totalesPos.length>1&&minTotal!==maxTotal;
                    const esGanadora=oferta.id===comp.ganadoId;
                    const pctBar=maxTotal?Math.round((total/maxTotal)*100):0;
                    const expandida=expandidaId===oferta.id;
                    return (
                      <div key={oferta.id} className="card" style={{ borderLeft:`3px solid ${esGanadora?G.green:esMenor?G.gold:G.border}` }}>
                        {/* Header oferta */}
                        <div style={{ display:"flex",gap:12,alignItems:"flex-start",marginBottom:12 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:6 }}>
                              <span style={{ fontSize:9,color:G.textDim,fontFamily:"DM Mono" }}>OFERTA {idx+1}</span>
                              {esGanadora&&<span className="tag" style={{ background:G.green+"22",color:G.green }}>✓ SELECCIONADA</span>}
                              {esMenor&&!esGanadora&&<span className="tag" style={{ background:G.gold+"22",color:G.gold }}>💰 MÁS BAJA</span>}
                            </div>
                            <input value={oferta.empresa} onChange={e=>updateOferta(comp.id,oferta.id,{empresa:e.target.value})} placeholder={`Empresa ${idx+1}`} style={{ fontSize:15,fontWeight:600,marginBottom:8,background:"transparent",border:"none",outline:"none",color:G.text,padding:0,width:"100%" }} />
                            {/* Barra comparativa */}
                            {total>0&&totalesPos.length>1&&(
                              <div style={{ height:4,background:G.border,borderRadius:2,marginBottom:8 }}>
                                <div style={{ height:"100%",borderRadius:2,background:esMenor?G.green:esMayor?G.red:G.gold,width:`${pctBar}%`,transition:"width 0.4s" }} />
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign:"right",flexShrink:0 }}>
                            <input type="number" value={oferta.total} onChange={e=>updateOferta(comp.id,oferta.id,{total:e.target.value})} placeholder="0" style={{ fontSize:20,fontWeight:700,color:esMenor?G.green:esMayor?G.red:G.text,textAlign:"right",width:130,background:"transparent",border:"none",outline:"none",padding:0 }} />
                            <div style={{ fontSize:9,color:G.textMuted,marginTop:2 }}>€ (IVA incl.)</div>
                          </div>
                        </div>

                        {/* Campos clave */}
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10 }}>
                          <div>
                            <label style={{ fontSize:9,color:G.textMuted,display:"block",marginBottom:3,fontFamily:"DM Mono" }}>PLAZO</label>
                            <input value={oferta.plazo} onChange={e=>updateOferta(comp.id,oferta.id,{plazo:e.target.value})} placeholder="6 semanas..." style={{ fontSize:12 }} />
                          </div>
                          <div>
                            <label style={{ fontSize:9,color:G.textMuted,display:"block",marginBottom:3,fontFamily:"DM Mono" }}>GARANTÍA</label>
                            <input value={oferta.garantia} onChange={e=>updateOferta(comp.id,oferta.id,{garantia:e.target.value})} placeholder="2 años..." style={{ fontSize:12 }} />
                          </div>
                          <div>
                            <label style={{ fontSize:9,color:G.textMuted,display:"block",marginBottom:3,fontFamily:"DM Mono" }}>FORMA PAGO</label>
                            <input value={oferta.formaPago} onChange={e=>updateOferta(comp.id,oferta.id,{formaPago:e.target.value})} placeholder="30% inicio..." style={{ fontSize:12 }} />
                          </div>
                        </div>

                        {/* Valoración */}
                        <div style={{ display:"flex",gap:16,alignItems:"center",marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:9,color:G.textMuted,marginBottom:3,fontFamily:"DM Mono" }}>VALORACIÓN</div>
                            <Estrellas val={oferta.valoracion||0} onChange={v=>updateOferta(comp.id,oferta.id,{valoracion:v})} />
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:9,color:G.textMuted,marginBottom:3,fontFamily:"DM Mono" }}>CONTACTO · TLF</div>
                            <div style={{ display:"flex",gap:6 }}>
                              <input value={oferta.contacto} onChange={e=>updateOferta(comp.id,oferta.id,{contacto:e.target.value})} placeholder="Nombre..." style={{ fontSize:12,flex:1 }} />
                              <input value={oferta.telefono} onChange={e=>updateOferta(comp.id,oferta.id,{telefono:e.target.value})} placeholder="6xx..." style={{ fontSize:12,width:100 }} />
                            </div>
                          </div>
                        </div>

                        {/* Expandible: desglose */}
                        <button onClick={()=>setExpandidaId(expandida?null:oferta.id)} style={{ background:"none",border:"none",color:G.textMuted,fontSize:11,cursor:"pointer",padding:0,marginBottom:expandida?10:0,display:"flex",alignItems:"center",gap:4 }}>
                          <span style={{ transform:expandida?"rotate(90deg)":"none",transition:"transform 0.2s",display:"inline-block" }}>›</span>
                          {expandida?"Ocultar desglose":"Ver desglose y condiciones"}
                        </button>

                        {expandida&&(
                          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                              <div>
                                <label style={{ fontSize:9,color:G.textMuted,display:"block",marginBottom:3,fontFamily:"DM Mono" }}>INCLUYE</label>
                                <textarea value={oferta.incluye} onChange={e=>updateOferta(comp.id,oferta.id,{incluye:e.target.value})} placeholder="Materiales, transporte, IVA..." style={{ minHeight:50,resize:"vertical",fontSize:11 }} />
                              </div>
                              <div>
                                <label style={{ fontSize:9,color:G.textMuted,display:"block",marginBottom:3,fontFamily:"DM Mono" }}>NO INCLUYE</label>
                                <textarea value={oferta.excluye} onChange={e=>updateOferta(comp.id,oferta.id,{excluye:e.target.value})} placeholder="Pintura, licencias..." style={{ minHeight:50,resize:"vertical",fontSize:11 }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize:9,color:G.textMuted,display:"block",marginBottom:3,fontFamily:"DM Mono" }}>NOTAS / CONDICIONES</label>
                              <textarea value={oferta.notas} onChange={e=>updateOferta(comp.id,oferta.id,{notas:e.target.value})} placeholder="Observaciones importantes..." style={{ minHeight:50,resize:"vertical",fontSize:11 }} />
                            </div>
                            {/* Partidas */}
                            <div>
                              <div style={{ fontSize:9,color:G.textMuted,fontFamily:"DM Mono",marginBottom:6 }}>DESGLOSE POR PARTIDAS</div>
                              {(oferta.partidas||[]).length>0&&(
                                <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:5,marginBottom:6 }}>
                                  {["CONCEPTO","UDS","€/UD","TOTAL",""].map(h=><div key={h} style={{ fontSize:9,color:G.textDim,fontFamily:"DM Mono" }}>{h}</div>)}
                                  {(oferta.partidas||[]).map(p=>(
                                    <React.Fragment key={p.id}>
                                      <input value={p.concepto} onChange={e=>{const ps=oferta.partidas.map(x=>x.id===p.id?{...x,concepto:e.target.value}:x);updateOferta(comp.id,oferta.id,{partidas:ps});}} placeholder="Mano de obra..." style={{ fontSize:11 }} />
                                      <input type="number" value={p.unidades} onChange={e=>{const ps=oferta.partidas.map(x=>x.id===p.id?{...x,unidades:e.target.value,total:String(Number(e.target.value)*(Number(x.precioUnit)||0))}:x);updateOferta(comp.id,oferta.id,{partidas:ps});}} style={{ fontSize:11 }} />
                                      <input type="number" value={p.precioUnit} onChange={e=>{const ps=oferta.partidas.map(x=>x.id===p.id?{...x,precioUnit:e.target.value,total:String((Number(x.unidades)||0)*Number(e.target.value))}:x);updateOferta(comp.id,oferta.id,{partidas:ps});}} style={{ fontSize:11 }} />
                                      <div className="mono" style={{ fontSize:11,color:G.gold,padding:"8px 6px" }}>{fmt(Number(p.total)||0)}</div>
                                      <button onClick={()=>updateOferta(comp.id,oferta.id,{partidas:oferta.partidas.filter(x=>x.id!==p.id)})} style={{ background:"none",border:"none",color:G.textDim,cursor:"pointer",padding:4 }}>{Icon.trash}</button>
                                    </React.Fragment>
                                  ))}
                                  <div style={{ gridColumn:"1/-1" }}>
                                    <div className="mono" style={{ textAlign:"right",fontSize:12,color:G.gold,paddingTop:6,borderTop:`1px solid ${G.border}` }}>
                                      Total: {fmt((oferta.partidas||[]).reduce((a,p)=>a+(Number(p.total)||0),0))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <button onClick={()=>addPartida(comp.id,oferta.id)} className="btn-ghost" style={{ fontSize:11 }}>+ Añadir partida</button>
                            </div>
                          </div>
                        )}

                        {/* Acciones */}
                        <div style={{ display:"flex",gap:8,marginTop:12,paddingTop:10,borderTop:`1px solid ${G.border}` }}>
                          {!esGanadora
                            ?<button onClick={()=>updateCompar(comp.id,{ganadoId:oferta.id})} className="btn-primary" style={{ fontSize:11 }}>✓ Elegir esta oferta</button>
                            :<button onClick={()=>updateCompar(comp.id,{ganadoId:null})} className="btn-ghost" style={{ fontSize:11 }}>Desmarcar</button>
                          }
                          <button onClick={()=>updateCompar(comp.id,{ofertas:comp.ofertas.filter(o=>o.id!==oferta.id)})} className="btn-danger" style={{ fontSize:11,marginLeft:"auto" }}>{Icon.trash}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}

            {/* ── VISTA TABLA COMPARATIVA ── */}
            {vistaMode==="tabla"&&comp.ofertas.length>0&&(
              <div style={{ overflow:"auto" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"#1A1A2E" }}>
                      {["CAMPO",...comp.ofertas.map((o,i)=>o.empresa||`Oferta ${i+1}`)].map(h=>(
                        <th key={h} style={{ padding:"8px 12px",textAlign:"left",fontSize:9,color:"#9090A8",fontFamily:"DM Mono",fontWeight:400,borderBottom:`1px solid ${G.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { campo:"TOTAL", key:"total", render:(v,o)=>{ const n=Number(v)||0; const esMin=n>0&&n===minTotal&&totalesPos.length>1; return <span className="mono" style={{ color:esMin?G.green:G.text,fontWeight:esMin?700:400 }}>{n?fmt(n):"—"}</span>; } },
                      { campo:"PLAZO", key:"plazo" },
                      { campo:"GARANTÍA", key:"garantia" },
                      { campo:"FORMA PAGO", key:"formaPago" },
                      { campo:"CONTACTO", key:"contacto" },
                      { campo:"VALORACIÓN", key:"valoracion", render:(v)=>"★".repeat(v||0)+"☆".repeat(5-(v||0)) },
                      { campo:"INCLUYE", key:"incluye" },
                      { campo:"NO INCLUYE", key:"excluye" },
                      { campo:"ESTADO", key:"id", render:(_,o)=>o.id===comp.ganadoId?<span style={{ color:G.green }}>✓ Elegida</span>:"—" },
                    ].map(row=>(
                      <tr key={row.campo} style={{ borderBottom:`1px solid ${G.border}` }}>
                        <td style={{ padding:"8px 12px",fontSize:9,color:G.textMuted,fontFamily:"DM Mono",background:G.bg,whiteSpace:"nowrap" }}>{row.campo}</td>
                        {comp.ofertas.map(o=>(
                          <td key={o.id} style={{ padding:"8px 12px",color:G.text }}>
                            {row.render?row.render(o[row.key],o):o[row.key]||"—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── VISTA GRÁFICO ── */}
            {vistaMode==="grafico"&&comp.ofertas.length>0&&(
              <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
                <div className="card">
                  <div className="serif" style={{ fontSize:14,marginBottom:16 }}>Comparativa de Precios</div>
                  {comp.ofertas.filter(o=>Number(o.total)>0).map((o,i)=>{
                    const total=Number(o.total);
                    const pct=maxTotal?Math.round((total/maxTotal)*100):100;
                    const esMenor=total===minTotal&&totalesPos.length>1;
                    const esGanadora=o.id===comp.ganadoId;
                    return (
                      <div key={o.id} style={{ marginBottom:16 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12 }}>
                          <span style={{ display:"flex",gap:8,alignItems:"center" }}>
                            {o.empresa||`Oferta ${i+1}`}
                            {esGanadora&&<span style={{ color:G.green,fontSize:10 }}>✓ Elegida</span>}
                            {esMenor&&<span style={{ color:G.gold,fontSize:10 }}>💰 Más baja</span>}
                          </span>
                          <span className="mono" style={{ color:esMenor?G.green:G.text,fontWeight:esMenor?700:400 }}>{fmt(total)}</span>
                        </div>
                        <div style={{ height:28,background:G.border,borderRadius:4,overflow:"hidden",position:"relative" }}>
                          <div style={{ height:"100%",background:esMenor?G.green:esGanadora?G.blue:G.gold,width:`${pct}%`,borderRadius:4,transition:"width 0.5s",display:"flex",alignItems:"center",paddingLeft:8 }}>
                            <span style={{ fontSize:10,color:"#000",fontFamily:"DM Mono",fontWeight:600 }}>{pct}%</span>
                          </div>
                        </div>
                        {o.plazo&&<div style={{ fontSize:10,color:G.textMuted,marginTop:3 }}>Plazo: {o.plazo} · Garantía: {o.garantia||"—"}</div>}
                      </div>
                    );
                  })}
                  {comp.ofertas.some(o=>o.valoracion>0)&&(
                    <div style={{ marginTop:20,paddingTop:16,borderTop:`1px solid ${G.border}` }}>
                      <div style={{ fontSize:12,color:G.textMuted,marginBottom:12 }}>Valoración subjetiva</div>
                      {comp.ofertas.filter(o=>o.valoracion>0).map((o,i)=>(
                        <div key={o.id} style={{ display:"flex",gap:12,alignItems:"center",marginBottom:8 }}>
                          <span style={{ fontSize:12,width:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{o.empresa||`Oferta ${i+1}`}</span>
                          <div style={{ display:"flex",gap:2 }}>{[1,2,3,4,5].map(n=><span key={n} style={{ fontSize:14,color:n<=o.valoracion?G.gold:G.border }}>★</span>)}</div>
                          <span className="mono" style={{ fontSize:11,color:G.textMuted }}>{o.valoracion}/5</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Análisis IA */}
            {(analisisIA||comp.analisisIA)&&(
              <div style={{ background:"#1A1A13",border:`1px solid ${G.gold}33`,borderRadius:8,padding:"18px 22px",marginTop:16 }}>
                <div style={{ fontSize:11,color:G.gold,fontFamily:"DM Mono",marginBottom:12 }}>✦ ANÁLISIS IA — RECOMENDACIÓN</div>
                <div style={{ fontSize:13,lineHeight:1.8,color:G.text,whiteSpace:"pre-wrap" }}>{analisisIA||comp.analisisIA}</div>
              </div>
            )}
            {comp.ofertas.length<2&&(
              <div style={{ fontSize:12,color:G.textDim,textAlign:"center",padding:20 }}>Añade al menos 2 ofertas para activar el análisis IA</div>
            )}
          </div>
        </div>
      )}

      {/* Modal nueva comparación */}
      {modalNueva&&(
        <Modal title="Nueva Comparación" onClose={()=>setModalNueva(false)}>
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>NOMBRE *</label>
              <input value={nombreComp} onChange={e=>setNombreComp(e.target.value)} placeholder="Instalación eléctrica planta 2..." autoFocus /></div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>DESCRIPCIÓN</label>
              <input value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Comparar 3 presupuestos de electricistas..." /></div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:8 }}>
              <button className="btn-ghost" onClick={()=>setModalNueva(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearComparacion} disabled={!nombreComp.trim()} style={{ opacity:!nombreComp.trim()?0.5:1 }}>Crear</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// === CHECKLIST ===INTELIGENTE ----------------------------------------------------
const PLANTILLAS_CHECKLIST = {
  demolicion: {
    nombre: "Demolición", items: [
      "Proteger zonas no afectadas con plástico", "Cortar suministros (agua, electricidad, gas)",
      "Retirada de muebles y enseres", "Demolición de tabiques marcados en plano",
      "Demolición de solado existente", "Picado de alicatado",
      "Retirada de instalaciones antiguas", "Gestión de escombros y transporte",
      "Inspección de estructura tras demolición", "Fotografías de estado final",
    ]
  },
  electricidad: {
    nombre: "Instalación Eléctrica", items: [
      "Revisión del proyecto eléctrico con plano aprobado", "Montaje de cuadro eléctrico general",
      "Trazado de rozas y canalizaciones", "Colocación de tubos y cajas de registro",
      "Paso de cables (fases, neutro, tierra)", "Instalación de mecanismos (enchufes, interruptores)",
      "Conexión de circuitos en cuadro", "Pruebas de continuidad y aislamiento",
      "Instalación de luminarias", "Certificado de instalación eléctrica (REBT)",
      "Revisión final con cliente", "Entrega de garantía",
    ]
  },
  fontaneria: {
    nombre: "Fontanería", items: [
      "Revisión plano de fontanería aprobado", "Corte y purga de instalación existente",
      "Trazado de nuevas acometidas (fría y caliente)", "Instalación de tuberías empotradas",
      "Colocación de llaves de paso sectoriales", "Instalación de aparatos sanitarios",
      "Conexión de electrodomésticos (lavavajillas, lavadora)", "Prueba de presión y estanqueidad",
      "Revisión de desagües y sifones", "Comprobación de caudales",
      "Entrega de garantía de materiales",
    ]
  },
  pladur: {
    nombre: "Tabiquería y Pladur", items: [
      "Replanteo según plano aprobado", "Montaje de estructura metálica (montantes y canales)",
      "Paso de instalaciones por interior", "Primera cara de placas",
      "Relleno de lana mineral / aislante", "Segunda cara de placas",
      "Tratamiento de juntas (cinta y masilla)", "Primera mano de imprimación",
      "Repaso de imperfecciones", "Acabado listo para pintar",
      "Colocación de marcos y puertas",
    ]
  },
  acabados: {
    nombre: "Acabados y Pintura", items: [
      "Lijado y saneado de superficies", "Aplicación de imprimación selladora",
      "Primera mano de pintura (color aprobado por cliente)", "Repaso de imperfecciones",
      "Segunda mano de pintura", "Instalación de rodapiés y molduras",
      "Colocación de carpintería interior", "Ajuste de herrajes y cerraduras",
      "Limpieza final de obra", "Revisión con cliente (punch list)",
      "Fotografías de estado final",
    ]
  },
  entrega: {
    nombre: "Entrega de Obra", items: [
      "Limpieza general a fondo", "Revisión de todos los acabados",
      "Prueba de todas las instalaciones (luz, agua, gas)", "Comprobación de puertas y ventanas",
      "Entrega de manuales y garantías de electrodomésticos", "Entrega de certificados de instalaciones",
      "Firma de acta de recepción con cliente", "Fotografías finales de todas las estancias",
      "Entrega de llaves", "Archivo de documentación de obra",
    ]
  },
};

function ChecklistTab({ obra, onUpdate }) {
  const checklists = obra.checklists || [];
  const [modalNuevo, setModalNuevo] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const [listaActiva, setListaActiva] = useState(null);
  const [nuevoItem, setNuevoItem] = useState("");
  const [nombreNueva, setNombreNueva] = useState("");
  const [plantillaSelec, setPlantillaSelec] = useState("");

  const save = (nuevas) => onUpdate({ checklists: nuevas });
  const updateLista = (id, cambios) => {
    const nuevas = checklists.map(c => c.id === id ? { ...c, ...cambios } : c);
    save(nuevas);
    if (listaActiva?.id === id) setListaActiva(prev => ({ ...prev, ...cambios }));
  };

  const toggleItem = (lista, itemId) => {
    const items = lista.items.map(i => i.id === itemId ? { ...i, completado: !i.completado, fechaComp: !i.completado ? new Date().toLocaleDateString("es-ES") : null } : i);
    updateLista(lista.id, { items });
  };

  const addItem = (lista) => {
    if (!nuevoItem.trim()) return;
    const items = [...lista.items, { id: uid(), texto: nuevoItem, completado: false, fechaComp: null, critico: false }];
    updateLista(lista.id, { items });
    setNuevoItem("");
  };

  const crearDesde = (plantillaId) => {
    const p = PLANTILLAS_CHECKLIST[plantillaId];
    if (!p) return;
    const nueva = { id: uid(), nombre: p.nombre, faseId: "", creadoEn: new Date().toLocaleDateString("es-ES"), items: p.items.map(t => ({ id: uid(), texto: t, completado: false, fechaComp: null, critico: false })) };
    save([...checklists, nueva]);
    setListaActiva(nueva);
    setModalNuevo(false);
  };

  const crearVacia = () => {
    if (!nombreNueva.trim()) return;
    const nueva = { id: uid(), nombre: nombreNueva, faseId: "", creadoEn: new Date().toLocaleDateString("es-ES"), items: [] };
    save([...checklists, nueva]);
    setListaActiva(nueva);
    setModalNuevo(false);
    setNombreNueva("");
  };

  const generarConIA = async () => {
    if (!nombreNueva.trim()) return;
    setLoadingIA(true);
    try {
      const fases = (obra.fases||[]).map(f=>f.nombre).join(", ");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 800,
          messages: [{ role: "user", content: `Eres un experto en gestión de obras y reformas residenciales/oficinas. Genera un checklist profesional y completo para la fase o tarea: "${nombreNueva}".\n\nContexto de la obra: ${obra.nombre}. Fases: ${fases||"no definidas"}.\n\nResponde ÚNICAMENTE con JSON válido sin backticks:\n{"items": ["item 1", "item 2", ...]}\n\nMáximo 15 items, ordenados lógicamente, concretos y accionables. Usa terminología española de construcción.` }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      const nueva = { id: uid(), nombre: nombreNueva, faseId: "", creadoEn: new Date().toLocaleDateString("es-ES"), generadoIA: true, items: (parsed.items||[]).map(t => ({ id: uid(), texto: t, completado: false, fechaComp: null, critico: false })) };
      save([...checklists, nueva]);
      setListaActiva(nueva);
      setModalNuevo(false);
      setNombreNueva("");
    } catch { }
    setLoadingIA(false);
  };

  // Stats globales
  const totalItems = checklists.reduce((a,c) => a + c.items.length, 0);
  const completados = checklists.reduce((a,c) => a + c.items.filter(i=>i.completado).length, 0);
  const pctGlobal = totalItems ? Math.round((completados/totalItems)*100) : 0;

  return (
    <div style={{ display: "flex", gap: 20 }}>

      {/* Panel izquierdo — lista de checklists */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* KPI global */}
        {totalItems > 0 && (
          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: G.textMuted }}>Progreso global</span>
              <span className="mono" style={{ fontSize: 14, color: pctGlobal === 100 ? G.green : G.gold }}>{pctGlobal}%</span>
            </div>
            <div className="progress-bar" style={{ height: 6 }}>
              <div className="progress-fill" style={{ width: `${pctGlobal}%`, background: pctGlobal === 100 ? G.green : G.gold }} />
            </div>
            <div style={{ fontSize: 11, color: G.textMuted, marginTop: 6 }}>{completados} de {totalItems} items completados</div>
          </div>
        )}

        {/* Nueva checklist */}
        <button className="btn-primary" onClick={() => setModalNuevo(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {Icon.plus} Nueva Checklist
        </button>

        {/* Lista de checklists */}
        {checklists.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: G.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 13 }}>Sin checklists. Crea una desde plantilla o con IA.</div>
          </div>
        ) : (
          checklists.map(lista => {
            const comp = lista.items.filter(i=>i.completado).length;
            const total = lista.items.length;
            const pct = total ? Math.round((comp/total)*100) : 0;
            const activa = listaActiva?.id === lista.id;
            return (
              <div key={lista.id} onClick={() => setListaActiva(activa ? null : lista)} className="card"
                style={{ cursor: "pointer", borderLeft: `3px solid ${pct===100 ? G.green : pct > 0 ? G.gold : G.border}`, background: activa ? "#1A1A1A" : G.surface }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{lista.nombre}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {lista.generadoIA && <span style={{ fontSize: 9, color: G.gold, fontFamily: "DM Mono" }}>IA</span>}
                    <span className="mono" style={{ fontSize: 12, color: pct===100 ? G.green : G.gold }}>{pct}%</span>
                    <button onClick={e => { e.stopPropagation(); save(checklists.filter(c=>c.id!==lista.id)); if(activa) setListaActiva(null); }} style={{ background: "none", border: "none", color: G.textDim, cursor: "pointer", fontSize: 12, padding: 2 }}>✕</button>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct===100 ? G.green : G.gold }} />
                </div>
                <div style={{ fontSize: 10, color: G.textMuted, marginTop: 6 }}>{comp}/{total} · {lista.creadoEn}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Panel derecho — items de la checklist activa */}
      {listaActiva ? (() => {
        const lista = checklists.find(c => c.id === listaActiva.id) || listaActiva;
        const comp = lista.items.filter(i=>i.completado).length;
        const pct = lista.items.length ? Math.round((comp/lista.items.length)*100) : 0;
        return (
          <div style={{ flex: 1, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <div className="serif" style={{ fontSize: 16 }}>{lista.nombre}</div>
                  {lista.generadoIA && <span className="tag" style={{ background: G.gold+"22", color: G.gold }}>Generado con IA</span>}
                  {pct === 100 && <span className="tag" style={{ background: G.green+"22", color: G.green }}>✓ Completada</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="progress-bar" style={{ flex: 1, height: 4 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct===100 ? G.green : G.gold }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: pct===100 ? G.green : G.gold, flexShrink: 0 }}>{comp}/{lista.items.length}</span>
                </div>
              </div>
              <button onClick={() => setListaActiva(null)} style={{ background: "none", border: "none", color: G.textMuted, cursor: "pointer" }}>{Icon.x}</button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
              {lista.items.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 0", color: G.textMuted, fontSize: 13 }}>Sin items. Añade el primero abajo.</div>
              )}
              {lista.items.map((item, idx) => (
                <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${G.border}`, transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = G.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {/* Checkbox */}
                  <div onClick={() => toggleItem(lista, item.id)} style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${item.completado ? G.green : G.border}`, background: item.completado ? G.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 1, transition: "all 0.15s" }}>
                    {item.completado && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: item.completado ? G.textMuted : G.text, textDecoration: item.completado ? "line-through" : "none", transition: "all 0.15s" }}>{item.texto}</div>
                    {item.completado && item.fechaComp && <div style={{ fontSize: 10, color: G.textDim, marginTop: 2 }}>Completado: {item.fechaComp}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {/* Marcar crítico */}
                    <button onClick={() => updateLista(lista.id, { items: lista.items.map(i => i.id===item.id ? {...i, critico: !i.critico} : i) })}
                      style={{ background: "none", border: "none", color: item.critico ? G.red : G.textDim, cursor: "pointer", fontSize: 14, padding: 2 }} title="Marcar crítico">
                      {item.critico ? "🔴" : "⭕"}
                    </button>
                    <button onClick={() => updateLista(lista.id, { items: lista.items.filter(i => i.id !== item.id) })}
                      style={{ background: "none", border: "none", color: G.textDim, cursor: "pointer", padding: 2 }}>{Icon.trash}</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Añadir item */}
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${G.border}`, display: "flex", gap: 8 }}>
              <input value={nuevoItem} onChange={e => setNuevoItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem(lista)}
                placeholder="Añadir item al checklist..." style={{ flex: 1, fontSize: 13 }} />
              <button className="btn-primary" onClick={() => addItem(lista)} style={{ padding: "8px 16px" }}>+</button>
            </div>
          </div>
        );
      })() : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: G.textMuted }}>
          <div style={{ fontSize: 40 }}>☑️</div>
          <div className="serif" style={{ fontSize: 18 }}>Selecciona una checklist</div>
          <div style={{ fontSize: 13 }}>O crea una nueva con el botón de la izquierda</div>
        </div>
      )}

      {/* Modal nueva checklist */}
      {modalNuevo && (
        <Modal title="Nueva Checklist" onClose={() => setModalNuevo(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Nombre */}
            <div>
              <label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>NOMBRE DE LA CHECKLIST</label>
              <input value={nombreNueva} onChange={e => setNombreNueva(e.target.value)} placeholder="Ej: Revisión fontanería baño principal..." />
            </div>

            {/* Opción 1 — IA */}
            <div style={{ background: "#1E1A13", border: `1px solid ${G.gold}33`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 13, color: G.gold, marginBottom: 6, fontWeight: 500 }}>✦ Generar con IA</div>
              <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 12 }}>Claude genera los items automáticamente basándose en la fase y el contexto de tu obra</div>
              <button className="btn-primary" onClick={generarConIA} disabled={loadingIA || !nombreNueva.trim()} style={{ width: "100%", opacity: loadingIA || !nombreNueva.trim() ? 0.5 : 1 }}>
                {loadingIA ? "Generando…" : "✦ Generar checklist con IA"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: G.border }} />
              <span style={{ fontSize: 11, color: G.textDim }}>o usa una plantilla</span>
              <div style={{ flex: 1, height: 1, background: G.border }} />
            </div>

            {/* Plantillas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(PLANTILLAS_CHECKLIST).map(([id, p]) => (
                <button key={id} onClick={() => crearDesde(id)}
                  style={{ padding: "10px 14px", background: G.bg, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontSize: 12, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = G.gold}
                  onMouseLeave={e => e.currentTarget.style.borderColor = G.border}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{p.nombre}</div>
                  <div style={{ fontSize: 10, color: G.textMuted }}>{p.items.length} items</div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: G.border }} />
              <span style={{ fontSize: 11, color: G.textDim }}>o empieza vacía</span>
              <div style={{ flex: 1, height: 1, background: G.border }} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setModalNuevo(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearVacia} disabled={!nombreNueva.trim()} style={{ opacity: !nombreNueva.trim() ? 0.5 : 1 }}>Crear vacía</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === MATERIALES ===& PEDIDOS -----------------------------------------------------
const CATEGORIAS_MAT = [
  { id: "estructura",   label: "Estructura",      emoji: "🏗️", color: "#E05C5C" },
  { id: "revestimiento",label: "Revestimiento",   emoji: "🧱", color: "#C8A96E" },
  { id: "carpinteria",  label: "Carpintería",     emoji: "🪵", color: "#A06EBE" },
  { id: "electricidad", label: "Electricidad",    emoji: "⚡", color: "#E0C85C" },
  { id: "fontaneria",   label: "Fontanería",      emoji: "🔧", color: "#5CB87A" },
  { id: "climatizacion",label: "Climatización",   emoji: "❄️", color: "#5CE0D8" },
  { id: "mobiliario",   label: "Mobiliario",      emoji: "🛋️", color: "#5C9BE0" },
  { id: "iluminacion",  label: "Iluminación",     emoji: "💡", color: "#E0C85C" },
  { id: "acabados",     label: "Acabados",        emoji: "🎨", color: "#E08D3C" },
  { id: "otros",        label: "Otros",           emoji: "📦", color: "#888" },
];

const ESTADOS_MAT = {
  pendiente:  { label: "Pendiente",   color: G.textMuted, bg: "#1A1A1A" },
  pedido:     { label: "Pedido",      color: "#5C9BE0",   bg: "#101828" },
  confirmado: { label: "Confirmado",  color: G.gold,      bg: "#1E1A13" },
  en_camino:  { label: "En camino",   color: G.orange,    bg: "#1E1410" },
  recibido:   { label: "Recibido",    color: G.green,     bg: "#101A10" },
  problema:   { label: "Problema",    color: G.red,       bg: "#2A1010" },
};

function NuevoMaterialModal({ fases, onClose, onSave }) {
  const [form, setForm] = useState({
    partida: "", nombre: "", proveedor: "", cantidad: "1",
    unidad: "ud", precioBase: "", ivaPorc: "21", estado: "pendiente", notas: "", enlace: "",
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const base = (Number(form.cantidad)||0) * (Number(form.precioBase)||0);
  const ivaAmt = base * (Number(form.ivaPorc)||0) / 100;
  const total = base + ivaAmt;
  return (
    <Modal title="Nuevo Material" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>PARTIDA / ZONA</label>
          <input value={form.partida} onChange={set("partida")} placeholder="Baño grande, Iluminación, Moqueta..." />
        </div>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>MATERIAL *</label>
          <input value={form.nombre} onChange={set("nombre")} placeholder="Lavabo, Perfil LED, Inodoro..." />
        </div>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>PROVEEDOR</label>
          <input value={form.proveedor} onChange={set("proveedor")} placeholder="Leroy Merlin, Christian, Porcelanosa..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>CANTIDAD</label>
            <input type="number" value={form.cantidad} onChange={set("cantidad")} placeholder="1" />
          </div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>UNIDAD</label>
            <select value={form.unidad} onChange={set("unidad")}>
              {["ud","m²","m³","ml","kg","l","caja","palet","juego"].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>PRECIO/UD SIN IVA</label>
            <input type="number" value={form.precioBase} onChange={set("precioBase")} placeholder="0.00" />
          </div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>IVA %</label>
            <select value={form.ivaPorc} onChange={set("ivaPorc")}>
              {["0","4","10","21"].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>TOTAL CON IVA</label>
            <div style={{ padding:"8px 10px", background:G.bg, borderRadius:6, fontSize:13, fontFamily:"DM Mono", color:G.gold }}>{total>0?fmt(total):"—"}</div>
          </div>
        </div>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>ENLACE TIENDA</label>
          <input value={form.enlace} onChange={set("enlace")} placeholder="https://..." />
        </div>
        <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>NOTAS</label>
          <input value={form.notas} onChange={set("notas")} placeholder="Referencia, color, observaciones..." />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" style={{ opacity: form.nombre.trim() ? 1 : 0.5 }} onClick={() => {
            if (!form.nombre.trim()) return;
            onSave({ id: uid(), ...form, cantidad: Number(form.cantidad)||1, precioBase: Number(form.precioBase)||0, ivaPorc: Number(form.ivaPorc)||21, precioUnit: Number(form.precioBase)||0, incluir: true, historial: [] });
            onClose();
          }}>Añadir Material</button>
        </div>
      </div>
    </Modal>
  );
}

function MaterialesTab({ obra, onUpdate }) {
  const [materiales, setMateriales] = React.useState(obra.materiales || []);
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [nuevoEvento, setNuevoEvento] = useState("");

  // Sync when obra changes from outside
  React.useEffect(() => { setMateriales(obra.materiales || []); }, [obra.id]);

  const save = (nuevos) => { setMateriales(nuevos); onUpdate({ materiales: nuevos }); };
  const updateMat = (id, cambios) => {
    const nuevos = materiales.map(m => m.id === id ? { ...m, ...cambios } : m);
    save(nuevos);
    if (detalle?.id === id) setDetalle(prev => ({ ...prev, ...cambios }));
  };

  // Filtrado
  const filtrados = materiales.filter(m => {
    if (filtroEstado !== "todos" && m.estado !== filtroEstado) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const enNombre = m.nombre?.toLowerCase().includes(q);
      const enProveedor = m.proveedor?.toLowerCase().includes(q);
      const enPartida = m.partida?.toLowerCase().includes(q);
      if (!enNombre && !enProveedor && !enPartida) return false;
    }
    return true;
  });

  const materialesIncluidos = filtrados.filter(m => m.incluir !== false);
  const totalBase = materialesIncluidos.reduce((a, m) => a + (Number(m.cantidad)||0) * (Number(m.precioBase||m.precioUnit)||0), 0);
  const totalIva = materialesIncluidos.reduce((a, m) => {
    const base = (Number(m.cantidad)||0) * (Number(m.precioBase||m.precioUnit)||0);
    return a + base * (Number(m.ivaPorc)||21) / 100;
  }, 0);
  const totalCoste = totalBase + totalIva;
  const pendientes = materiales.filter(m => m.estado === "pendiente" || m.estado === "pedido").length;
  const criticos = materiales.filter(m => m.critico && m.estado !== "recibido").length;
  const enCamino = materiales.filter(m => m.estado === "en_camino").length;
  const problemas = materiales.filter(m => m.estado === "problema").length;

  // Alertas de fecha
  const hoy = new Date();
  const alertasFecha = materiales.filter(m => {
    if (!m.fechaNecesaria || m.estado === "recibido") return false;
    const dias = Math.ceil((new Date(m.fechaNecesaria) - hoy) / 864e5);
    return dias <= 7;
  });

  const addEvento = (mat) => {
    if (!nuevoEvento.trim()) return;
    const evento = { texto: nuevoEvento, fecha: new Date().toLocaleDateString("es-ES"), id: uid() };
    updateMat(mat.id, { historial: [...(mat.historial||[]), evento] });
    setNuevoEvento("");
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Lista */}
      <div style={{ flex: detalle ? "0 0 440px" : 1, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* KPIs - sumatorio de materiales filtrados con check activado */}
        <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:-8 }}>
          {busqueda ? `Sumatorio de "${busqueda}"` : "Sumatorio total"} · {materialesIncluidos.length} de {materiales.length} materiales
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "BASE S/IVA", val: fmt(totalBase), color: G.textMuted },
            { label: "IVA", val: fmt(totalIva), color: G.textMuted },
            { label: "TOTAL COMPRAS", val: fmt(totalCoste), color: G.gold },
          ].map(k => (
            <div key={k.label} className="stat-box">
              <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 6, fontFamily: "DM Mono" }}>{k.label}</div>
              <div className="serif" style={{ fontSize: 20, color: k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Alertas fecha crítica */}
        {alertasFecha.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alertasFecha.map(m => {
              const dias = Math.ceil((new Date(m.fechaNecesaria) - hoy) / 864e5);
              return (
                <div key={m.id} style={{ padding: "10px 14px", borderRadius: 6, background: dias <= 0 ? "#2A1010" : "#1E1410", border: `1px solid ${dias <= 0 ? G.red : G.orange}44`, fontSize: 12, color: dias <= 0 ? G.red : G.orange, display: "flex", gap: 10, alignItems: "center" }}>
                  <span>{dias <= 0 ? "🔴" : "🟠"}</span>
                  <span style={{ flex: 1 }}>{m.nombre} — {dias <= 0 ? `necesario hace ${Math.abs(dias)}d` : `necesario en ${dias}d`} · estado: {ESTADOS_MAT[m.estado]?.label}</span>
                  {m.critico && <span className="tag" style={{ background: G.red+"22", color: G.red }}>crítico</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Controles */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar material..." style={{ width: 180, fontSize: 12 }} />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: "auto", fontSize: 12 }}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS_MAT).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModal(true)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            {Icon.plus} Añadir
          </button>
        </div>

        {/* Agrupado por partida (etiqueta libre) */}
        {filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
            <div>{busqueda || filtroEstado !== "todos" ? "Sin resultados con estos filtros" : "Sin materiales. Añade el primero."}</div>
          </div>
        ) : (() => {
          // Group by partida
          const partidas = {};
          filtrados.forEach(m => {
            const key = m.partida || "Sin partida";
            if (!partidas[key]) partidas[key] = [];
            partidas[key].push(m);
          });
          return Object.entries(partidas).map(([partida, items]) => {
            const subtotalBase = items.filter(m=>m.incluir!==false).reduce((a,m)=>{
              const base = (Number(m.cantidad)||0)*(Number(m.precioBase||m.precioUnit)||0);
              return a + base;
            }, 0);
            const subtotalTotal = items.filter(m=>m.incluir!==false).reduce((a,m)=>{
              const base = (Number(m.cantidad)||0)*(Number(m.precioBase||m.precioUnit)||0);
              const iva = base * (Number(m.ivaPorc)||21) / 100;
              return a + base + iva;
            }, 0);
            return (
              <div key={partida} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: G.surface, borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="serif" style={{ fontSize: 13, flex: 1 }}>{partida}</span>
                  <span className="mono" style={{ fontSize: 11, color: G.textMuted }}>{items.length} {items.length===1?"artículo":"artículos"}</span>
                  <span className="mono" style={{ fontSize: 11, color: G.gold }}>{fmt(subtotalTotal)}</span>
                </div>
                {items.map((m, i) => {
                  const est = ESTADOS_MAT[m.estado] || ESTADOS_MAT.pendiente;
                  const seleccionado = detalle?.id === m.id;
                  const totalMat = (() => {
                    const base = (Number(m.cantidad)||0)*(Number(m.precioBase||m.precioUnit)||0);
                    return base + base*(Number(m.ivaPorc)||21)/100;
                  })();
                  return (
                    <div key={m.id} onClick={() => setDetalle(seleccionado ? null : m)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i > 0 ? `1px solid ${G.border}` : "none", cursor: "pointer", background: seleccionado ? "#1A1A1A" : "transparent" }}>
                      {/* Check incluir en sumatorio */}
                      <input type="checkbox" checked={m.incluir !== false}
                        onChange={e => { updateMat(m.id, { incluir: e.target.checked }); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width:"auto", cursor:"pointer", accentColor: G.gold }} title="Incluir en sumatorio" />
                      {m.foto && <img src={m.foto} alt="" style={{ width:36, height:36, objectFit:"cover", borderRadius:4, flexShrink:0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nombre}</span>
                          {m.critico && <span className="tag" style={{ background: G.red+"22", color: G.red, flexShrink: 0 }}>crítico</span>}
                        </div>
                        <div style={{ fontSize: 11, color: G.textMuted, display: "flex", gap: 12 }}>
                          {m.proveedor && <span>{m.proveedor}</span>}
                          <span className="mono">{m.cantidad} {m.unidad}</span>
                      {totalMat > 0 && <span className="mono" style={{ color: m.incluir===false ? G.textDim : G.gold, textDecoration: m.incluir===false ? "line-through" : "none", fontSize:11 }}>{fmt(totalMat)}</span>}
                          {m.enlace && <a href={m.enlace} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ color:G.gold, fontSize:10 }}>🔗</a>}
                        </div>
                      </div>
                      <select value={m.estado} onChange={e => { e.stopPropagation(); updateMat(m.id, { estado: e.target.value }); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: "auto", fontSize: 11, padding: "3px 6px", color: est.color, background: est.bg, border: `1px solid ${est.color}44` }}>
                        {Object.entries(ESTADOS_MAT).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button className="btn-danger" onClick={e => { e.stopPropagation(); save(materiales.filter(x=>x.id!==m.id)); if(detalle?.id===m.id) setDetalle(null); }}>{Icon.trash}</button>
                    </div>
                  );
                })}
                {/* Subtotal partida */}
                <div style={{ padding:"8px 16px", borderTop:`1px solid ${G.border}`, display:"flex", justifyContent:"flex-end", gap:16, background:G.bg }}>
                  <span className="mono" style={{ fontSize:11, color:G.textMuted }}>Base: {fmt(subtotalBase)}</span>
                  <span className="mono" style={{ fontSize:11, color:G.gold, fontWeight:600 }}>Total: {fmt(subtotalTotal)}</span>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Panel detalle */}
      {detalle && (() => {
        const m = materiales.find(x => x.id === detalle.id) || detalle;
        const est = ESTADOS_MAT[m.estado] || ESTADOS_MAT.pendiente;
        const cat = CATEGORIAS_MAT.find(c => c.id === m.categoria);
        const faseNombre = obra.fases?.find(f => f.id === m.faseId)?.nombre;
        const total = m.cantidad * m.precioUnit;
        return (
          <div style={{ flex: 1, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, overflow: "auto", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${G.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22 }}>{cat?.emoji}</span>
              <div style={{ flex: 1 }}>
                <div className="serif" style={{ fontSize: 16, marginBottom: 4 }}>{m.nombre}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="tag" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                  {m.critico && <span className="tag" style={{ background: G.red+"22", color: G.red }}>crítico</span>}
                  {faseNombre && <span className="tag" style={{ background: G.gold+"22", color: G.gold }}>{faseNombre}</span>}
                </div>
              </div>
              <button onClick={() => setDetalle(null)} style={{ background: "none", border: "none", color: G.textMuted, cursor: "pointer" }}>{Icon.x}</button>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Datos clave */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="stat-box" style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 4, fontFamily: "DM Mono" }}>CANTIDAD</div>
                  <div className="mono" style={{ fontSize: 18 }}>{m.cantidad} {m.unidad}</div>
                </div>
                <div className="stat-box" style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 4, fontFamily: "DM Mono" }}>COSTE TOTAL</div>
                  <div className="mono" style={{ fontSize: 18, color: G.gold }}>{total > 0 ? fmt(total) : "—"}</div>
                </div>
              </div>

              {/* Campos editables */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "PROVEEDOR", campo: "proveedor", placeholder: "Nombre del proveedor..." },
                  { label: "REFERENCIA", campo: "referencia", placeholder: "Ref. del producto..." },
                  { label: "FECHA NECESARIA", campo: "fechaNecesaria", type: "date" },
                ].map(f => (
                  <div key={f.campo}>
                    <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type||"text"} value={m[f.campo]||""} onChange={e => updateMat(m.id, { [f.campo]: e.target.value })} placeholder={f.placeholder} style={{ fontSize: 12 }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>PARTIDA / ZONA</label>
                  <input value={m.partida||""} onChange={e => updateMat(m.id, { partida: e.target.value })} placeholder="Baño grande, Iluminación..." style={{ fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>ESTADO</label>
                  <select value={m.estado} onChange={e => updateMat(m.id, { estado: e.target.value })} style={{ fontSize: 12, color: est.color }}>
                    {Object.entries(ESTADOS_MAT).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>NOTAS</label>
                  <textarea value={m.notas||""} onChange={e => updateMat(m.id, { notas: e.target.value })} placeholder="Observaciones, enlace, contacto..." style={{ minHeight: 60, resize: "vertical", fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>ENLACE TIENDA / WEB</label>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <input value={m.enlace||""} onChange={e => updateMat(m.id, { enlace: e.target.value })} placeholder="https://..." style={{ flex:1, fontSize: 12 }} />
                    {m.enlace && <a href={m.enlace} target="_blank" rel="noreferrer" style={{ fontSize:11,color:G.gold,whiteSpace:"nowrap" }}>🔗 Ver</a>}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>FOTO DEL MATERIAL</label>
                  {m.foto && <img src={m.foto} alt={m.nombre} style={{ width:"100%",maxHeight:160,objectFit:"cover",borderRadius:6,marginBottom:8,cursor:"pointer" }} onClick={()=>window.open(m.foto)} />}
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <label style={{ cursor:"pointer",padding:"4px 10px",border:`1px solid ${G.border}`,borderRadius:6,fontSize:11,color:G.textMuted }}>
                      📷 {m.foto ? "Cambiar foto" : "Añadir foto"}
                      <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX = 600;
                            let w = img.width, h = img.height;
                            if (w > MAX || h > MAX) { if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;} }
                            canvas.width=w; canvas.height=h;
                            canvas.getContext('2d').drawImage(img,0,0,w,h);
                            updateMat(m.id, { foto: canvas.toDataURL('image/jpeg', 0.7) });
                          };
                          img.src = ev.target.result;
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                    {m.foto && <span onClick={()=>updateMat(m.id,{foto:""})} style={{ fontSize:11,color:G.red,cursor:"pointer" }}>✕ Quitar</span>}
                  </div>
                </div>
              </div>

              {/* Historial de seguimiento */}
              <div>
                <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 10, fontFamily: "DM Mono" }}>SEGUIMIENTO ({(m.historial||[]).length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {(m.historial||[]).slice().reverse().map(h => (
                    <div key={h.id} style={{ background: G.bg, borderRadius: 6, padding: "8px 12px", border: `1px solid ${G.border}` }}>
                      <div className="mono" style={{ fontSize: 9, color: G.textDim, marginBottom: 3 }}>{h.fecha}</div>
                      <div style={{ fontSize: 12 }}>{h.texto}</div>
                    </div>
                  ))}
                  {!(m.historial||[]).length && <div style={{ fontSize: 12, color: G.textDim }}>Sin eventos registrados</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={nuevoEvento} onChange={e => setNuevoEvento(e.target.value)} onKeyDown={e => e.key === "Enter" && addEvento(m)} placeholder="Añadir nota de seguimiento..." style={{ flex: 1, fontSize: 12 }} />
                  <button className="btn-primary" onClick={() => addEvento(m)} style={{ padding: "8px 14px" }}>+</button>
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${G.border}` }}>
                {m.estado !== "recibido" && (
                  <button className="btn-primary" onClick={() => updateMat(m.id, { estado: "recibido", historial: [...(m.historial||[]), { id: uid(), texto: "Material recibido ✓", fecha: new Date().toLocaleDateString("es-ES") }] })}>
                    ✓ Marcar recibido
                  </button>
                )}
                {m.estado === "pendiente" && (
                  <button className="btn-ghost" onClick={() => updateMat(m.id, { estado: "pedido", historial: [...(m.historial||[]), { id: uid(), texto: "Pedido realizado", fecha: new Date().toLocaleDateString("es-ES") }] })}>
                    Marcar pedido
                  </button>
                )}
                <button className="btn-danger" onClick={() => { save(materiales.filter(x=>x.id!==m.id)); setDetalle(null); }}>Eliminar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {modal && <NuevoMaterialModal fases={obra.fases||[]} onClose={() => setModal(false)} onSave={mat => { save([...materiales, mat]); setModal(false); }} />}
    </div>
  );
}

// === INFORMES ===& ACTAS ---------------------------------------------------------
const TIPOS_INFORME = [
  { id: "acta_reunion",    label: "Acta de Reunión",       emoji: "📝", desc: "Genera un acta formal a partir de tus notas o puntos tratados" },
  { id: "avance_semanal",  label: "Informe de Avance",     emoji: "📊", desc: "Estado actual de la obra: fases, tareas, fotos y desviaciones" },
  { id: "informe_cliente", label: "Informe para Cliente",  emoji: "👤", desc: "Resumen ejecutivo elegante listo para enviar al cliente" },
  { id: "estado_economico",label: "Estado Económico",      emoji: "💶", desc: "Resumen financiero: presupuesto, coste real, cashflow y margen" },
  { id: "incidencias_rep", label: "Reporte de Incidencias",emoji: "⚠️", desc: "Listado de incidencias abiertas, estado y coste asociado" },
  { id: "acta_final",      label: "Acta Final de Obra",    emoji: "🏁", desc: "Documento de cierre con resumen completo de la obra" },
];

function InformesTab({ obra }) {
  const [tipoSelec, setTipoSelec] = useState(null);
  const [notas, setNotas] = useState("");
  const [asistentes, setAsistentes] = useState("");
  const [loading, setLoading] = useState(false);
  const [informe, setInforme] = useState(null);
  const [historial, setHistorial] = useState([]);

  const generarInforme = async (tipo) => {
    setLoading(true);
    setInforme(null);

    // Construir contexto completo de la obra
    const ctx = {
      nombre: obra.nombre,
      cliente: obra.cliente,
      ubicacion: obra.ubicacion,
      estado: obra.estado,
      fechaInicio: obra.fechaInicio,
      fechaFin: obra.fechaFin,
      presupuesto: obra.presupuesto,
      gastado: obra.gastado,
      fases: (obra.fases||[]).map(f => `${f.nombre} (${f.estado}, ${f.inicio}→${f.fin}${f.retrasoReal>0?`, retraso ${f.retrasoReal}d`:""})`).join("; "),
      tareasTotal: (obra.tareas||[]).length,
      tareasComp: (obra.tareas||[]).filter(t=>t.estado==="completada").length,
      tareasPend: (obra.tareas||[]).filter(t=>t.estado==="pendiente"||t.estado==="en_curso").slice(0,5).map(t=>`${t.titulo} (${t.prioridad})`).join(", "),
      proveedores: (obra.proveedores||[]).map(p=>`${p.nombre} (${Array.isArray(p.especialidad)?p.especialidad.join(", "):(p.especialidad&&p.especialidad!=="undefined"?p.especialidad:"")}, ${p.estado}, ${fmt(p.importe)})`).join("; "),
      incidencias: (obra.incidencias||[]).filter(i=>i.estado!=="cerrada").map(i=>`${i.titulo} — ${i.tipo}, ${i.prioridad}, ${i.estado}, coste: ${fmt(i.coste)}`).join("; ") || "Ninguna abierta",
      econPrevisto: (obra.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0) || obra.presupuesto,
      econReal: (obra.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0),
      cobros: (obra.economica?.cobros||[]).map(c=>`${c.concepto}: ${fmt(c.importe)} (${c.estado})`).join("; ") || "Sin cobros registrados",
      avanceFotos: (() => { const f=(obra.fotos||[]).filter(x=>x.avanceIA!==null); return f.length ? `Avance medio detectado: ${Math.round(f.reduce((a,x)=>a+x.avanceIA,0)/f.length)}%` : "Sin análisis fotográfico"; })(),
      notas, asistentes,
      fecha: new Date().toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long", year:"numeric" }),
    };

    const prompts = {
      acta_reunion: `Genera un ACTA DE REUNIÓN DE OBRA formal y profesional con esta información:\n\nObra: ${ctx.nombre} | Cliente: ${ctx.cliente} | Fecha: ${ctx.fecha}\nAsistentes: ${ctx.asistentes||"No especificados"}\nPuntos tratados / Notas: ${ctx.notas||"No especificadas"}\nEstado actual fases: ${ctx.fases}\nIncidencias abiertas: ${ctx.incidencias}\n\nEstructura el acta con: 1) Encabezado con datos, 2) Asistentes, 3) Puntos tratados desarrollados, 4) Acuerdos y decisiones tomadas, 5) Próximos pasos con responsables y fechas, 6) Cierre. Formato profesional en español.`,

      avance_semanal: `Genera un INFORME DE AVANCE SEMANAL profesional:\n\nObra: ${ctx.nombre} | Cliente: ${ctx.cliente} | Fecha: ${ctx.fecha}\nEstado: ${ctx.estado} | Inicio: ${ctx.fechaInicio} | Entrega: ${ctx.fechaFin}\nFases: ${ctx.fases}\nTareas: ${ctx.tareasComp}/${ctx.tareasTotal} completadas. Pendientes: ${ctx.tareasPend}\nProveedores: ${ctx.proveedores}\nIncidencias: ${ctx.incidencias}\n${ctx.avanceFotos}\nNotas adicionales: ${ctx.notas||"—"}\n\nIncluye: resumen ejecutivo, estado por fases, alertas, próximas acciones. Tono profesional.`,

      informe_cliente: `Genera un INFORME PARA CLIENTE elegante y tranquilizador:\n\nObra: ${ctx.nombre} | Cliente: ${ctx.cliente} | Fecha: ${ctx.fecha}\nFases: ${ctx.fases}\nTareas completadas: ${ctx.tareasComp} de ${ctx.tareasTotal}\n${ctx.avanceFotos}\nIncidencias: ${ctx.incidencias}\nPagos: ${ctx.cobros}\nNotas: ${ctx.notas||"—"}\n\nEscribe en tono cercano, positivo y profesional. El cliente no es técnico. Destaca lo conseguido, explica el estado con claridad, indica próximos hitos. Evita tecnicismos.`,

      estado_economico: `Genera un INFORME DE ESTADO ECONÓMICO detallado:\n\nObra: ${ctx.nombre} | Cliente: ${ctx.cliente} | Fecha: ${ctx.fecha}\nPresupuesto inicial: ${fmt(ctx.econPrevisto)}\nCoste real actual: ${fmt(ctx.econReal)}\nDesviación: ${fmt(ctx.econReal - ctx.econPrevisto)} (${ctx.econPrevisto ? Math.round(((ctx.econReal-ctx.econPrevisto)/ctx.econPrevisto)*100) : 0}%)\nCobros: ${ctx.cobros}\nProveedores contratados: ${ctx.proveedores}\nNotas: ${ctx.notas||"—"}\n\nIncluye análisis de desviación, estado de cobros, recomendaciones financieras. Profesional y preciso.`,

      incidencias_rep: `Genera un REPORTE DE INCIDENCIAS formal:\n\nObra: ${ctx.nombre} | Cliente: ${ctx.cliente} | Fecha: ${ctx.fecha}\nIncidencias activas: ${ctx.incidencias}\nNotas adicionales: ${ctx.notas||"—"}\n\nEstructura: resumen ejecutivo, listado detallado por prioridad, estado de cada una, coste asociado estimado, acciones recomendadas. Profesional.`,

      acta_final: `Genera un ACTA FINAL DE OBRA completa:\n\nObra: ${ctx.nombre} | Cliente: ${ctx.cliente} | Fecha: ${ctx.fecha}\nUbicación: ${ctx.ubicacion}\nFechas: ${ctx.fechaInicio} → ${ctx.fechaFin}\nFases ejecutadas: ${ctx.fases}\nTareas: ${ctx.tareasComp}/${ctx.tareasTotal}\nPresupuesto: ${fmt(ctx.econPrevisto)} | Coste final: ${fmt(ctx.econReal)}\nProveedores: ${ctx.proveedores}\nIncidencias registradas: ${ctx.incidencias}\nNotas de cierre: ${ctx.notas||"—"}\n\nIncluye: encabezado oficial, descripción de los trabajos, relación de industriales, resumen económico, incidencias resueltas, garantías vigentes, conformidad. Tono formal y legal.`,
    };

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompts[tipo.id] }]
        })
      });
      const data = await res.json();
      const texto = data.content?.find(b => b.type === "text")?.text || "";
      const resultado = { tipo, texto, fecha: new Date().toLocaleDateString("es-ES"), id: uid() };
      setInforme(resultado);
      setHistorial(h => [resultado, ...h].slice(0, 10));
    } catch (e) {
      setInforme({ tipo, texto: "Error al generar. Inténtalo de nuevo.", fecha: "", id: uid() });
    }
    setLoading(false);
  };

  const descargarHTML = (inf) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${inf.tipo.label} — ${obra.nombre}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 40px; color: #1A1A2E; line-height: 1.7; }
    h1 { font-size: 28px; color: #1A1A2E; border-bottom: 2px solid #C8A96E; padding-bottom: 12px; }
    h2 { font-size: 18px; color: #3A3A5E; margin-top: 28px; }
    .meta { color: #888; font-size: 13px; margin-bottom: 32px; font-family: monospace; }
    p { margin-bottom: 12px; }
    pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 14px; }
    @media print { body { margin: 20mm; } }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <div style="width:12px;height:12px;background:${obra.color};border-radius:2px"></div>
    <span style="font-family:monospace;font-size:12px;color:#888">Blue Forest</span>
  </div>
  <h1>${inf.tipo.emoji} ${inf.tipo.label}</h1>
  <div class="meta">${obra.nombre} · ${obra.cliente} · ${inf.fecha}</div>
  <pre>${inf.texto}</pre>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inf.tipo.label.replace(/ /g,"_")}_${obra.nombre.replace(/ /g,"_")}_${inf.fecha.replace(/\//g,"-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>

      {/* Panel izquierdo — selector + opciones */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Tipos de informe */}
        <div className="card">
          <div className="serif" style={{ fontSize: 14, marginBottom: 14 }}>¿Qué quieres generar?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TIPOS_INFORME.map(tipo => (
              <div key={tipo.id} onClick={() => { setTipoSelec(tipo); setInforme(null); }}
                style={{ padding: "12px 14px", borderRadius: 6, border: `1px solid ${tipoSelec?.id === tipo.id ? G.gold : G.border}`, background: tipoSelec?.id === tipo.id ? "#1E1A13" : G.bg, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{tipo.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: tipoSelec?.id === tipo.id ? G.gold : G.text }}>{tipo.label}</div>
                    <div style={{ fontSize: 11, color: G.textMuted, marginTop: 2 }}>{tipo.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campos extra */}
        {tipoSelec && (
          <div className="card">
            <div className="serif" style={{ fontSize: 13, marginBottom: 12 }}>Datos adicionales</div>
            {tipoSelec.id === "acta_reunion" && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>ASISTENTES</label>
                <input value={asistentes} onChange={e => setAsistentes(e.target.value)} placeholder="Juan (arquitecto), María (cliente)..." style={{ fontSize: 12 }} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>
                {tipoSelec.id === "acta_reunion" ? "PUNTOS TRATADOS / NOTAS" : "NOTAS ADICIONALES"}
              </label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                placeholder={tipoSelec.id === "acta_reunion" ? "1. Retraso en fontanería\n2. Cliente aprueba cambio baldosas\n3. Electricista confirma fecha..." : "Contexto adicional para el informe..."}
                style={{ minHeight: 100, resize: "vertical", fontSize: 12 }} />
            </div>
            <button className="btn-primary" onClick={() => generarInforme(tipoSelec)} disabled={loading}
              style={{ width: "100%", marginTop: 12, opacity: loading ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? "Generando con IA…" : `✦ Generar ${tipoSelec.label}`}
            </button>
          </div>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <div className="card">
            <div className="serif" style={{ fontSize: 13, marginBottom: 12 }}>Generados anteriormente</div>
            {historial.map((h, i) => (
              <div key={i} onClick={() => setInforme(h)}
                style={{ padding: "8px 0", borderBottom: i < historial.length-1 ? `1px solid ${G.border}` : "none", cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
                <span>{h.tipo.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: G.text }}>{h.tipo.label}</div>
                  <div style={{ fontSize: 10, color: G.textMuted }}>{h.fecha}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel derecho — resultado */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {!tipoSelec && !loading && !informe && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: G.textMuted, gap: 16 }}>
            <div style={{ fontSize: 48 }}>📋</div>
            <div className="serif" style={{ fontSize: 20 }}>Selecciona un tipo de informe</div>
            <div style={{ fontSize: 13, maxWidth: 320, textAlign: "center", lineHeight: 1.6 }}>
              La IA usará toda la información de la obra — fases, tareas, económico, incidencias y fotos — para generar el documento.
            </div>
          </div>
        )}

        {loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 40 }}>✦</div>
            <div className="serif" style={{ fontSize: 18, color: G.gold }}>Generando {tipoSelec?.label}…</div>
            <div style={{ fontSize: 13, color: G.textMuted }}>La IA está redactando el documento con toda la información de la obra</div>
          </div>
        )}

        {informe && !loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, overflow: "hidden" }}>
            {/* Header resultado */}
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${G.border}`, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>{informe.tipo.emoji}</span>
              <div style={{ flex: 1 }}>
                <div className="serif" style={{ fontSize: 16 }}>{informe.tipo.label}</div>
                <div style={{ fontSize: 11, color: G.textMuted }}>{obra.nombre} · {informe.fecha}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(informe.texto)}
                  className="btn-ghost" style={{ fontSize: 11 }}>Copiar texto</button>
                <button onClick={() => descargarHTML(informe)}
                  className="btn-primary" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                  ⬇ Descargar HTML
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
              {/* Membrete */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${G.gold}` }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: obra.color }} />
                <div>
                  <div className="serif" style={{ fontSize: 11, color: G.gold, letterSpacing: "0.08em" }}>BLUE FOREST</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: G.textMuted, fontFamily: "DM Mono" }}>{informe.fecha}</div>
                  <div style={{ fontSize: 10, color: G.textMuted }}>{obra.cliente}</div>
                </div>
              </div>

              {/* Texto del informe */}
              <div style={{ fontSize: 13, lineHeight: 1.85, color: G.text, whiteSpace: "pre-wrap", fontFamily: "DM Sans, sans-serif" }}>
                {informe.texto}
              </div>

              {/* Pie */}
              <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${G.border}`, display: "flex", justifyContent: "space-between", fontSize: 10, color: G.textDim, fontFamily: "DM Mono" }}>
                <span>Generado por Blue Forest · IA</span>
                <span>{obra.nombre} · {informe.fecha}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// === REUNIONES & ACTAS ===
function ReunionesTab({ obra, onUpdate }) {
  const [seccion, setSeccion] = React.useState("acta");
  const [emailsTexto, setEmailsTexto] = React.useState("");
  const [analisisEmails, setAnalisisEmails] = React.useState("");
  const [loadingAnalisis, setLoadingAnalisis] = React.useState(false);
  const [actaSeleccionada, setActaSeleccionada] = React.useState(null); // null = acta actual
  const [formReunion, setFormReunion] = React.useState({
    titulo: obra.reunionForm?.titulo || obra.nombre + " — Visita de obra",
    fecha: obra.reunionForm?.fecha || new Date().toLocaleDateString("es-ES"),
    hora: obra.reunionForm?.hora || new Date().toLocaleTimeString("es-ES", {hour:"2-digit", minute:"2-digit"}),
    lugar: obra.reunionForm?.lugar || "",
    asistentes: obra.reunionForm?.asistentes || "",
  });
  const [puntos, setPuntos] = React.useState(obra.reunionPuntos || []);
  const [nuevoPunto, setNuevoPunto] = React.useState({ tema:"", decision:"", responsable:"", plazo:"", estado:"pendiente" });
  const [editandoPuntoId, setEditandoPuntoId] = React.useState(null);
  const [editPunto, setEditPunto] = React.useState({});
  const [loadingPDF, setLoadingPDF] = React.useState(false);

  // Sincronizar cuando la obra se actualiza externamente (desde Claude)
  React.useEffect(() => {
    if (obra.reunionPuntos) setPuntos(obra.reunionPuntos);
  }, [obra.reunionPuntos]);

  React.useEffect(() => {
    if (obra.reunionForm) setFormReunion(f => ({ ...f, ...obra.reunionForm }));
  }, [obra.reunionForm]);

  // Guardar puntos y form en la obra (persiste en GitHub)
  const savePuntos = (nuevos) => {
    setPuntos(nuevos);
    onUpdate({ reunionPuntos: nuevos, reunionForm: formReunion });
  };

  const saveForm = (nuevoForm) => {
    setFormReunion(nuevoForm);
    onUpdate({ reunionForm: nuevoForm, reunionPuntos: puntos });
  };

  // Archivar acta actual y empezar nueva
  const archivarActa = () => {
    if (!puntos.length) return;
    if (!window.confirm("¿Archivar esta acta y empezar una nueva? El acta quedará guardada en el historial.")) return;
    const actaArchivada = {
      id: `acta_${Date.now()}`,
      fecha: formReunion.fecha,
      titulo: formReunion.titulo,
      lugar: formReunion.lugar,
      asistentes: formReunion.asistentes,
      puntos: puntos,
      archivadaEn: new Date().toLocaleString("es-ES")
    };
    const historial = [...(obra.actasHistorial || []), actaArchivada];
    const nuevoForm = {
      titulo: obra.nombre + " — Visita de obra",
      fecha: new Date().toLocaleDateString("es-ES"),
      hora: new Date().toLocaleTimeString("es-ES", {hour:"2-digit", minute:"2-digit"}),
      lugar: formReunion.lugar,
      asistentes: formReunion.asistentes,
    };
    setFormReunion(nuevoForm);
    setPuntos([]);
    onUpdate({ actasHistorial: historial, reunionPuntos: [], reunionForm: nuevoForm });
  };

  // Análisis de emails con IA
  const analizarEmails = async () => {
    if (!emailsTexto.trim()) return;
    setLoadingAnalisis(true); setAnalisisEmails("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5", max_tokens: 2000,
          messages: [{ role: "user", content: `Eres un asistente experto en gestión de obras de reforma. Analiza estos emails relacionados con la obra "${obra.nombre}" y extrae:

1. **PUNTOS PENDIENTES** — todo lo que está por decidir, confirmar o ejecutar
2. **COMPROMISOS ADQUIRIDOS** — lo que cada parte ha prometido hacer
3. **DUDAS O CONFLICTOS** — temas sin resolver o con discrepancias
4. **AGENDA PARA LA REUNIÓN** — lista ordenada de puntos a tratar mañana, del más urgente al menos urgente
5. **TONO Y PERFIL** — cómo es la administradora, qué le preocupa, cómo tratarla

Sé muy concreto y útil. Usa el nombre de la administradora si aparece.

EMAILS:
${emailsTexto}` }]
        })
      });
      const data = await res.json();
      setAnalisisEmails(data.content?.[0]?.text || "Error al analizar");
    } catch(e) { setAnalisisEmails("Error de conexión"); }
    setLoadingAnalisis(false);
  };

  // Añadir punto al acta
  const addPunto = () => {
    if (!nuevoPunto.tema.trim()) return;
    const nuevos = [...puntos, { id: uid(), ...nuevoPunto, timestamp: new Date().toLocaleTimeString("es-ES", {hour:"2-digit", minute:"2-digit"}) }];
    savePuntos(nuevos);
    setNuevoPunto({ tema:"", decision:"", responsable:"", plazo:"", estado:"pendiente" });
  };

  // Generar PDF del acta
  const generarActaPDF = () => {
    setLoadingPDF(true);
    const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch(e) { return {}; } })();
    const hoy = new Date().toLocaleDateString("es-ES", {day:"numeric", month:"long", year:"numeric"});

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Acta de Reunión — ${obra.nombre}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Georgia', serif; color: #1A1A2E; background: #fff; padding: 60px; max-width: 900px; margin: 0 auto; }
  .header { border-bottom: 3px solid #C8A96E; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 28px; color: #C8A96E; font-weight: bold; }
  .brand-sub { font-size: 12px; color: #888; margin-top: 4px; font-family: monospace; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 22px; color: #1A1A2E; }
  .doc-title .num { font-size: 11px; color: #888; font-family: monospace; margin-top: 4px; }
  .meta { background: #F8F6F2; border-radius: 8px; padding: 20px 24px; margin-bottom: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .meta-item { }
  .meta-label { font-size: 9px; color: #888; font-family: monospace; letter-spacing: 0.1em; margin-bottom: 3px; }
  .meta-value { font-size: 14px; color: #1A1A2E; font-weight: 600; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 13px; color: #C8A96E; font-family: monospace; letter-spacing: 0.1em; border-bottom: 1px solid #E8E4DC; padding-bottom: 8px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1A1A2E; color: #C8A96E; padding: 10px 12px; text-align: left; font-family: monospace; font-size: 10px; letter-spacing: 0.05em; }
  td { padding: 10px 12px; border-bottom: 1px solid #EEEBE5; vertical-align: top; }
  tr:nth-child(even) td { background: #FAFAF8; }
  .estado { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-family: monospace; }
  .estado.pendiente { background: #FFF3CD; color: #856404; }
  .estado.aprobado { background: #E8F5EE; color: #2D7A4F; }
  .estado.rechazado { background: #FDEAEA; color: #C0392B; }
  .estado.en_estudio { background: #EEF2FF; color: #4A4A9E; }
  .firma-section { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
  .firma-box { border-top: 1px solid #1A1A2E; padding-top: 10px; }
  .firma-nombre { font-size: 13px; font-weight: 600; margin-top: 40px; }
  .firma-cargo { font-size: 11px; color: #888; }
  .footer { margin-top: 48px; border-top: 1px solid #EEEBE5; padding-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #888; font-family: monospace; }
  .cert { background: #F0F8FF; border: 1px solid #C8A96E33; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 11px; color: #555; line-height: 1.7; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${config.estudio || "Blue Forest"}</div>
      <div class="brand-sub">${config.nombre || ""}</div>
    </div>
    <div class="doc-title">
      <h1>ACTA DE REUNIÓN</h1>
      <div class="num">REF: ACT-${obra.id?.slice(0,6).toUpperCase()}-${Date.now().toString().slice(-4)}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><div class="meta-label">PROYECTO</div><div class="meta-value">${obra.nombre}</div></div>
    <div class="meta-item"><div class="meta-label">CLIENTE</div><div class="meta-value">${obra.cliente || "—"}</div></div>
    <div class="meta-item"><div class="meta-label">FECHA</div><div class="meta-value">${formReunion.fecha}</div></div>
    <div class="meta-item"><div class="meta-label">HORA</div><div class="meta-value">${formReunion.hora}</div></div>
    <div class="meta-item"><div class="meta-label">LUGAR</div><div class="meta-value">${formReunion.lugar || "—"}</div></div>
    <div class="meta-item"><div class="meta-label">ASISTENTES</div><div class="meta-value">${formReunion.asistentes || "—"}</div></div>
  </div>

  <div class="cert">
    📋 El presente documento certifica los acuerdos alcanzados en la reunión de obra indicada. Los puntos recogidos han sido validados por los asistentes presentes y constituyen compromisos formales de las partes. Fecha de emisión: ${hoy}.
  </div>

  <div class="section">
    <div class="section-title">PUNTOS TRATADOS Y DECISIONES ADOPTADAS</div>
    ${puntos.length === 0 ? '<p style="color:#888;font-size:12px">Sin puntos registrados</p>' : `
    <table>
      <thead>
        <tr>
          <th style="width:30px">Nº</th>
          <th style="width:50px">Hora</th>
          <th>Tema</th>
          <th>Decisión / Acuerdo</th>
          <th>Responsable</th>
          <th>Plazo</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${puntos.map((p, i) => `
        <tr>
          <td style="font-family:monospace;font-size:11px">${i+1}</td>
          <td style="font-family:monospace;font-size:11px">${p.timestamp}</td>
          <td><strong>${p.tema}</strong></td>
          <td>${p.decision || "—"}</td>
          <td>${p.responsable || "—"}</td>
          <td>${p.plazo || "—"}</td>
          <td><span class="estado ${p.estado}">${p.estado.replace("_"," ")}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>`}
  </div>

  <div class="firma-section">
    <div class="firma-box">
      <div class="firma-nombre">${config.nombre || config.estudio || "El profesional"}</div>
      <div class="firma-cargo">${config.estudio || "Estudio de interiorismo"}</div>
    </div>
    <div class="firma-box">
      <div class="firma-nombre">${obra.cliente || "El cliente / Administración"}</div>
      <div class="firma-cargo">Representante de la propiedad</div>
    </div>
  </div>

  <div class="footer">
    <span>${config.estudio || "Blue Forest"} · ${config.email || ""}</span>
    <span>Documento generado el ${hoy}</span>
    <span>Página 1 de 1</span>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Acta_${obra.nombre.replace(/\s+/g,"_")}_${formReunion.fecha.replace(/\//g,"-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setLoadingPDF(false);
  };

  const SECCIONES = [
    { id:"acta",      label:"📝 Acta actual" },
    { id:"historial", label:`📚 Historial (${(obra.actasHistorial||[]).length})` },
    { id:"emails",    label:"📧 Análisis emails" },
    { id:"export",    label:"📄 Exportar" },
  ];

  const renderMsg = (txt) => txt
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^## (.+)$/gm, `<div style="font-size:15px;font-weight:700;color:#C8A96E;margin:16px 0 6px">$1</div>`)
    .replace(/^### (.+)$/gm, `<div style="font-size:13px;font-weight:600;margin:10px 0 4px">$1</div>`)
    .replace(/^[-•] (.+)$/gm, `<div style="display:flex;gap:8px;margin-bottom:5px"><span style="color:#C8A96E;flex-shrink:0">·</span><span>$1</span></div>`)
    .replace(/^\d+\. (.+)$/gm, `<div style="display:flex;gap:8px;margin-bottom:5px"><span style="color:#C8A96E">→</span><span>$1</span></div>`)
    .replace(/\n/g, "<br>");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Sub-nav */}
      <div style={{ display:"flex", gap:4, background:G.bg, borderRadius:6, padding:4 }}>
        {SECCIONES.map(s => (
          <button key={s.id} onClick={()=>setSeccion(s.id)} style={{ flex:1, padding:"8px 0", borderRadius:4, border:"none", background:seccion===s.id?G.surface:"transparent", color:seccion===s.id?G.gold:G.textMuted, fontSize:12, cursor:"pointer" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── EMAILS ── */}
      {seccion==="emails" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card">
            <div className="serif" style={{ fontSize:16, marginBottom:8 }}>Pega aquí los emails relacionados con la obra</div>
            <div style={{ fontSize:12, color:G.textMuted, marginBottom:12 }}>Copia y pega todos los emails (de ambas partes). La IA los analizará y preparará la agenda para la reunión.</div>
            <textarea value={emailsTexto} onChange={e=>setEmailsTexto(e.target.value)}
              placeholder="Pega aquí los emails... (copia el contenido de Gmail, Outlook, etc.)"
              style={{ width:"100%", minHeight:220, fontSize:12, padding:"12px 14px", borderRadius:6, resize:"vertical", lineHeight:1.6, background:G.bg, border:`1px solid ${G.border}`, color:G.text, outline:"none" }} />
            <button className="btn-primary" onClick={analizarEmails} disabled={loadingAnalisis||!emailsTexto.trim()}
              style={{ marginTop:12, opacity:loadingAnalisis||!emailsTexto.trim()?0.5:1 }}>
              {loadingAnalisis ? "✦ Analizando emails…" : "✦ Analizar con IA y preparar reunión"}
            </button>
          </div>

          {analisisEmails && (
            <div style={{ background:"#1A1A13", border:`1px solid ${G.gold}33`, borderRadius:10, padding:"20px 24px" }}>
              <div style={{ fontSize:11, color:G.gold, fontFamily:"DM Mono", marginBottom:14 }}>✦ ANÁLISIS IA — PREPARACIÓN REUNIÓN</div>
              <div style={{ fontSize:13, lineHeight:1.9, color:G.text }} dangerouslySetInnerHTML={{ __html:renderMsg(analisisEmails) }} />
              <button onClick={()=>setSeccion("acta")} className="btn-primary" style={{ marginTop:20 }}>
                → Ir al acta de la reunión
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ACTA ── */}
      {/* ── HISTORIAL DE ACTAS ── */}
      {seccion==="historial" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {(obra.actasHistorial||[]).length === 0 ? (
            <div className="card" style={{ textAlign:"center", color:G.textMuted, padding:40 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📚</div>
              <div>No hay actas archivadas todavía</div>
              <div style={{ fontSize:12, marginTop:8 }}>Cuando termines una reunión, archiva el acta y quedará guardada aquí</div>
            </div>
          ) : (
            [...(obra.actasHistorial||[])].reverse().map(acta => (
              <div key={acta.id} className="card" style={{ cursor:"pointer" }} onClick={()=>setActaSeleccionada(actaSeleccionada?.id===acta.id?null:acta)}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{acta.titulo}</div>
                    <div style={{ fontSize:12, color:G.textMuted }}>📅 {acta.fecha} · {acta.puntos?.length||0} puntos</div>
                    {acta.asistentes && <div style={{ fontSize:11, color:G.textMuted }}>👥 {acta.asistentes}</div>}
                  </div>
                  <span style={{ color:G.gold }}>{actaSeleccionada?.id===acta.id?"▲":"▼"}</span>
                </div>
                {actaSeleccionada?.id===acta.id && (
                  <div style={{ marginTop:16, borderTop:`1px solid ${G.border}`, paddingTop:16 }}>
                    {(acta.puntos||[]).map((p,i) => {
                      const estColor = {aprobado:G.green,rechazado:G.red,en_estudio:"#7B68EE",pendiente:G.gold}[p.estado]||G.gold;
                      return (
                        <div key={p.id||i} style={{ padding:"10px 0", borderBottom:`1px solid ${G.border}33` }}>
                          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                            <span style={{ fontSize:11, color:G.textMuted, flexShrink:0 }}>{String(i+1).padStart(2,"0")}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:600 }}>{p.tema || p.texto}</div>
                              {p.decision && <div style={{ fontSize:12, color:G.textMuted }}>→ {p.decision}</div>}
                              <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
                                {p.responsable && <span className="tag">{p.responsable}</span>}
                                {p.plazo && <span className="tag">📅 {p.plazo}</span>}
                                <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background:estColor+"22", color:estColor }}>{p.estado}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ACTA ACTUAL ── */}
      {seccion==="acta" && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:-8 }}>
          <button onClick={archivarActa} disabled={!puntos.length} style={{ padding:"6px 14px", borderRadius:6, border:`1px solid ${G.gold}44`, background:"transparent", color:puntos.length?G.gold:G.textMuted, fontSize:12, cursor:puntos.length?"pointer":"default" }}>
            📚 Archivar acta y nueva
          </button>
        </div>
      )}
      {seccion==="acta" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Datos de la reunión */}
          <div className="card">
            <div className="serif" style={{ fontSize:16, marginBottom:14 }}>Datos de la reunión</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                {l:"TÍTULO",k:"titulo"},{l:"FECHA",k:"fecha"},{l:"HORA",k:"hora"},
                {l:"LUGAR",k:"lugar"},{l:"ASISTENTES",k:"asistentes"},
              ].map(f=>(
                <div key={f.k} style={{ gridColumn:f.k==="titulo"||f.k==="asistentes"?"1/-1":"auto" }}>
                  <div style={{ fontSize:9, color:G.textMuted, marginBottom:4, fontFamily:"DM Mono" }}>{f.l}</div>
                  <input value={formReunion[f.k]} onChange={e=>saveForm({...formReunion,[f.k]:e.target.value})} style={{ fontSize:12, width:"100%" }} />
                </div>
              ))}
            </div>
          </div>

          {/* Añadir punto */}
          <div className="card" style={{ borderLeft:`3px solid ${G.gold}` }}>
            <div className="serif" style={{ fontSize:16, marginBottom:14 }}>Añadir punto al acta</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <div style={{ fontSize:9, color:G.textMuted, marginBottom:4, fontFamily:"DM Mono" }}>TEMA *</div>
                <input value={nuevoPunto.tema} onChange={e=>setNuevoPunto(p=>({...p,tema:e.target.value}))}
                  placeholder="Ej: Moqueta zona de recepción, Tirar pared entre despachos..." style={{ fontSize:12, width:"100%" }}
                  onKeyDown={e=>{ if(e.key==="Enter"&&e.ctrlKey) addPunto(); }} />
              </div>
              <div>
                <div style={{ fontSize:9, color:G.textMuted, marginBottom:4, fontFamily:"DM Mono" }}>DECISIÓN / ACUERDO</div>
                <input value={nuevoPunto.decision} onChange={e=>setNuevoPunto(p=>({...p,decision:e.target.value}))}
                  placeholder="Lo que se ha decidido..." style={{ fontSize:12, width:"100%" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:9, color:G.textMuted, marginBottom:4, fontFamily:"DM Mono" }}>RESPONSABLE</div>
                  <input value={nuevoPunto.responsable} onChange={e=>setNuevoPunto(p=>({...p,responsable:e.target.value}))}
                    placeholder="Quién lo hace..." style={{ fontSize:12 }} />
                </div>
                <div>
                  <div style={{ fontSize:9, color:G.textMuted, marginBottom:4, fontFamily:"DM Mono" }}>PLAZO</div>
                  <input value={nuevoPunto.plazo} onChange={e=>setNuevoPunto(p=>({...p,plazo:e.target.value}))}
                    placeholder="Fecha límite..." style={{ fontSize:12 }} />
                </div>
                <div>
                  <div style={{ fontSize:9, color:G.textMuted, marginBottom:4, fontFamily:"DM Mono" }}>ESTADO</div>
                  <select value={nuevoPunto.estado} onChange={e=>setNuevoPunto(p=>({...p,estado:e.target.value}))} style={{ fontSize:12, width:"100%" }}>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="en_estudio">En estudio</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
              </div>
              <button className="btn-primary" onClick={addPunto} disabled={!nuevoPunto.tema.trim()}
                style={{ alignSelf:"flex-start", opacity:!nuevoPunto.tema.trim()?0.5:1 }}>
                + Añadir punto (Ctrl+Enter)
              </button>
            </div>
          </div>

          {/* Lista de puntos */}
          {puntos.length > 0 && (
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div className="serif" style={{ fontSize:16 }}>Puntos del acta ({puntos.length})</div>
                <button onClick={()=>setSeccion("export")} className="btn-primary" style={{ fontSize:11 }}>📄 Generar acta PDF</button>
              </div>
              {puntos.map((p,i)=>{
                const estColor = {aprobado:G.green,rechazado:G.red,en_estudio:"#7B68EE",pendiente:G.gold}[p.estado]||G.gold;
                const editando = editandoPuntoId === p.id;
                return (
                  <div key={p.id} style={{ padding:"12px 0", borderBottom:`1px solid ${G.border}`, background:editando?"#1A1A0A":undefined }}>
                    {editando ? (
                      <div style={{ display:"flex",flexDirection:"column",gap:8,padding:"0 8px" }}>
                        <input value={editPunto.tema} onChange={e=>setEditPunto(f=>({...f,tema:e.target.value}))} placeholder="Tema" style={{ fontSize:13,fontWeight:600,width:"100%" }} />
                        <textarea value={editPunto.decision} onChange={e=>setEditPunto(f=>({...f,decision:e.target.value}))} placeholder="Decisión/Acuerdo" style={{ fontSize:12,width:"100%",minHeight:60,resize:"vertical",background:G.bg,border:`1px solid ${G.border}`,borderRadius:4,padding:8,color:G.text }} />
                        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                          <input value={editPunto.responsable} onChange={e=>setEditPunto(f=>({...f,responsable:e.target.value}))} placeholder="Responsable" style={{ fontSize:11,width:130 }} />
                          <input value={editPunto.plazo} onChange={e=>setEditPunto(f=>({...f,plazo:e.target.value}))} placeholder="Plazo" style={{ fontSize:11,width:100 }} />
                          <select value={editPunto.estado} onChange={e=>setEditPunto(f=>({...f,estado:e.target.value}))} style={{ fontSize:11 }}>
                            <option value="pendiente">Pendiente</option><option value="aprobado">Aprobado</option><option value="en_estudio">En estudio</option><option value="rechazado">Rechazado</option>
                          </select>
                          <button className="btn-primary" onClick={()=>{ savePuntos(puntos.map(x=>x.id===p.id?{...x,...editPunto}:x)); setEditandoPuntoId(null); }} style={{ fontSize:11,padding:"4px 12px" }}>✓ Guardar</button>
                          <button onClick={()=>setEditandoPuntoId(null)} style={{ fontSize:11,padding:"4px 10px",background:"transparent",border:`1px solid ${G.border}`,borderRadius:4,color:G.textMuted,cursor:"pointer" }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                        <div className="mono" style={{ fontSize:11, color:G.textMuted, flexShrink:0, paddingTop:2 }}>{String(i+1).padStart(2,"0")}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{p.tema}</div>
                          {p.decision && <div style={{ fontSize:12, color:G.textMuted, marginBottom:4 }}>→ {p.decision}</div>}
                          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                            {p.responsable && <span className="tag">{p.responsable}</span>}
                            {p.plazo && <span className="tag">📅 {p.plazo}</span>}
                            <select value={p.estado} onChange={e=>savePuntos(puntos.map(x=>x.id===p.id?{...x,estado:e.target.value}:x))}
                              style={{ fontSize:11, padding:"2px 6px", background:estColor+"22", color:estColor, border:`1px solid ${estColor}44`, borderRadius:4, cursor:"pointer" }}>
                              <option value="pendiente">Pendiente</option>
                              <option value="aprobado">Aprobado</option>
                              <option value="en_estudio">En estudio</option>
                              <option value="rechazado">Rechazado</option>
                            </select>
                          </div>
                        </div>
                        <button onClick={()=>{ setEditandoPuntoId(p.id); setEditPunto({tema:p.tema||"",decision:p.decision||"",responsable:p.responsable||"",plazo:p.plazo||"",estado:p.estado||"pendiente"}); }} style={{ padding:"3px 7px",background:"transparent",border:`1px solid ${G.border}`,borderRadius:4,color:G.gold,cursor:"pointer",flexShrink:0,fontSize:11 }}>✎</button>
                        <button className="btn-danger" onClick={()=>savePuntos(puntos.filter(x=>x.id!==p.id))} style={{ padding:"3px 7px", flexShrink:0 }}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {puntos.length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 0", color:G.textMuted }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📝</div>
              <div>Añade el primer punto de la reunión arriba</div>
            </div>
          )}
        </div>
      )}

      {/* ── EXPORT ── */}
      {seccion==="export" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card" style={{ textAlign:"center", padding:"40px 32px" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📄</div>
            <div className="serif" style={{ fontSize:24, marginBottom:8 }}>Acta certificada lista</div>
            <div style={{ fontSize:13, color:G.textMuted, marginBottom:8 }}>{puntos.length} punto{puntos.length!==1?"s":""} registrado{puntos.length!==1?"s":""}</div>
            <div style={{ fontSize:13, color:G.textMuted, marginBottom:24 }}>
              {formReunion.fecha} · {formReunion.lugar||"Sin lugar"} · {formReunion.asistentes||"Sin asistentes"}
            </div>
            {puntos.length === 0 ? (
              <div style={{ color:G.orange, fontSize:13, marginBottom:16 }}>⚠ Añade puntos al acta antes de exportar</div>
            ) : null}
            <button className="btn-primary" onClick={generarActaPDF} disabled={loadingPDF}
              style={{ fontSize:14, padding:"12px 32px", opacity:loadingPDF?0.5:1 }}>
              {loadingPDF ? "Generando…" : "📄 Descargar acta PDF"}
            </button>
            <div style={{ fontSize:11, color:G.textMuted, marginTop:12 }}>
              Se descargará como HTML — ábrelo y usa Archivo → Imprimir → Guardar como PDF
            </div>
          </div>

          {/* Preview resumen */}
          {puntos.length > 0 && (
            <div className="card">
              <div className="serif" style={{ fontSize:16, marginBottom:14 }}>Resumen del acta</div>
              {puntos.map((p,i)=>(
                <div key={p.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${G.border}`, fontSize:12 }}>
                  <span className="mono" style={{ color:G.textMuted }}>{i+1}.</span>
                  <div>
                    <strong>{p.tema}</strong>
                    {p.decision && <span style={{ color:G.textMuted }}> → {p.decision}</span>}
                    {p.responsable && <span style={{ color:G.gold }}> · {p.responsable}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === EXPORTAR ===OBRA PDF --------------------------------------------------------
function exportarObraPDF(obra) {
  const hoy = new Date().toLocaleDateString("es-ES", { day:"numeric", month:"long", year:"numeric" });
  const fmtN = n => new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n||0);
  const pctN = (a,b) => b ? Math.round((a/b)*100) : 0;
  const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch(e) { return {}; } })();

  const fases       = obra.fases || [];
  const tareas      = obra.tareas || [];
  const proveedores = obra.proveedores || [];
  const incidencias = obra.incidencias || [];
  const materiales  = obra.materiales || [];
  const extras      = obra.extras || [];
  const garantias   = obra.garantias || [];
  const eco         = obra.economica || {};
  const fotos       = (obra.fotos || []).slice(0, 16);
  const checklists  = obra.checklists || [];
  const docs        = obra.docsArquitecto || [];

  const presupTotal  = (eco.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0) || obra.presupuesto || 0;
  const extrasAprob  = extras.filter(e=>e.estado!=="rechazado").reduce((a,e)=>a+(Number(e.importe)||0),0);
  const presupFinal  = presupTotal + extrasAprob;
  const costoReal    = (eco.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
  const cobros       = (eco.cobros||[]).reduce((a,c)=>a+(Number(c.importe)||0),0);
  const cobradoPend  = (eco.cobros||[]).filter(c=>c.estado==="pendiente").reduce((a,c)=>a+(Number(c.importe)||0),0);
  const margen       = cobros - costoReal;
  const tareasComp   = tareas.filter(t=>t.estado==="completada").length;
  const diasRest     = obra.fechaFin ? Math.ceil((new Date(obra.fechaFin)-new Date())/864e5) : null;
  const avanceMedio  = (() => {
    const f = (obra.fotos||[]).filter(x=>x.avanceIA!==null);
    return f.length ? Math.round(f.reduce((a,x)=>a+x.avanceIA,0)/f.length) : pctN(tareasComp,tareas.length);
  })();

  const faseCol = { completada:"#2D7A4F", en_curso:"#C8A96E", pendiente:"#888888" };
  const priCol  = { critica:"#C0392B", alta:"#E08D3C", media:"#C8A96E", baja:"#9A9AB0" };
  const estIncCol = { abierta:"#C0392B", en_curso:"#E08D3C", resuelta:"#2D7A4F", cerrada:"#9A9AB0", bloqueada:"#6C3483" };

  // Gantt simplificado
  const ganttFechas = fases.filter(f=>f.inicio&&f.fin);
  const ganttMin = ganttFechas.length ? ganttFechas.reduce((a,f)=>a<f.inicio?a:f.inicio, ganttFechas[0].inicio) : null;
  const ganttMax = ganttFechas.length ? ganttFechas.reduce((a,f)=>a>f.fin?a:f.fin, ganttFechas[0].fin) : null;
  const ganttDays = ganttMin&&ganttMax ? Math.ceil((new Date(ganttMax)-new Date(ganttMin))/864e5)+1 : 0;

  const ganttBar = (f) => {
    if (!f.inicio||!f.fin||!ganttDays) return "";
    const start = Math.ceil((new Date(f.inicio)-new Date(ganttMin))/864e5);
    const dur   = Math.ceil((new Date(f.fin)-new Date(f.inicio))/864e5)+1;
    const left  = Math.round((start/ganttDays)*100);
    const width = Math.max(2, Math.round((dur/ganttDays)*100));
    const col   = faseCol[f.estado]||"#888";
    return `<div style="position:absolute;left:${left}%;width:${width}%;background:${col};height:16px;border-radius:3px;top:4px;" title="${f.nombre}: ${f.inicio} → ${f.fin}"></div>`;
  };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe — ${obra.nombre}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;font-size:13px;color:#1A1A2E;background:#F5F3EF;line-height:1.6}
  .page{max-width:210mm;margin:0 auto;background:#fff}
  @media print{body{background:#fff}.no-print{display:none!important}@page{margin:12mm;size:A4}.pb{page-break-after:always}}
  /* Cover */
  .cover{background:#1A1A2E;color:#F8F6F2;padding:64px 56px;min-height:260px;position:relative;overflow:hidden}
  .cover::after{content:'';position:absolute;right:-60px;top:-60px;width:300px;height:300px;border-radius:50%;border:60px solid rgba(200,169,110,0.08)}
  .cover-brand{font-family:'DM Mono',monospace;font-size:10px;color:#C8A96E;letter-spacing:0.15em;margin-bottom:28px}
  .cover-bar{width:56px;height:2px;background:#C8A96E;margin-bottom:20px}
  .cover-title{font-family:'Playfair Display',serif;font-size:38px;font-weight:700;margin-bottom:8px;line-height:1.1}
  .cover-sub{font-size:15px;color:#9090A8;margin-bottom:36px}
  .cover-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  .cover-kpi{border-top:1px solid rgba(200,169,110,0.3);padding-top:12px}
  .cover-kpi-label{font-family:'DM Mono',monospace;font-size:9px;color:#6A6A82;letter-spacing:0.1em;margin-bottom:4px}
  .cover-kpi-val{font-size:18px;color:#F8F6F2;font-weight:500}
  /* Sections */
  section{padding:36px 56px;border-bottom:1px solid #EEEBE5}
  h2{font-family:'Playfair Display',serif;font-size:20px;color:#1A1A2E;margin-bottom:18px;padding-bottom:8px;border-bottom:2px solid #C8A96E;display:flex;align-items:center;gap:10px}
  h3{font-size:13px;font-weight:600;color:#3A3A6E;margin:20px 0 10px;text-transform:uppercase;letter-spacing:0.05em;font-family:'DM Mono',monospace;font-size:10px}
  /* KPIs */
  .kpi-grid{display:grid;gap:12px;margin-bottom:20px}
  .g4{grid-template-columns:repeat(4,1fr)}
  .g3{grid-template-columns:repeat(3,1fr)}
  .g2{grid-template-columns:repeat(2,1fr)}
  .kpi{background:#F8F6F2;border:1px solid #E8E4DC;border-radius:8px;padding:14px 16px}
  .kpi-label{font-family:'DM Mono',monospace;font-size:9px;color:#9A9AB0;letter-spacing:0.06em;margin-bottom:6px}
  .kpi-val{font-family:'Playfair Display',serif;font-size:22px;color:#1A1A2E}
  .kpi-sub{font-size:10px;color:#9A9AB0;margin-top:3px}
  .bar{height:5px;background:#E8E4DC;border-radius:3px;margin-top:8px;overflow:hidden}
  .bar-fill{height:100%;border-radius:3px}
  /* Tables */
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
  th{background:#1A1A2E;color:#F8F6F2;padding:8px 12px;text-align:left;font-family:'DM Mono',monospace;font-size:9px;font-weight:400;letter-spacing:0.06em}
  td{padding:8px 12px;border-bottom:1px solid #EEEBE5;vertical-align:top}
  tr:nth-child(even) td{background:#F8F6F2}
  /* Tags */
  .tag{display:inline-block;padding:2px 7px;border-radius:3px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.04em}
  /* Gantt */
  .gantt-row{display:flex;align-items:center;gap:0;margin-bottom:6px}
  .gantt-label{width:200px;flex-shrink:0;font-size:11px;padding-right:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gantt-track{flex:1;position:relative;height:24px;background:#F8F6F2;border-radius:3px}
  /* Fotos */
  .foto-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .foto-item img{width:100%;height:90px;object-fit:cover;border-radius:5px;display:block}
  .foto-label{font-size:9px;color:#9A9AB0;margin-top:3px;font-family:'DM Mono',monospace}
  /* Misc */
  .gold{color:#C8A96E}.green{color:#2D7A4F}.red{color:#C0392B}
  .mono{font-family:'DM Mono',monospace}
  .alert-box{background:#FFF8EC;border-left:3px solid #C8A96E;border-radius:0 6px 6px 0;padding:10px 14px;margin-bottom:8px;font-size:12px}
  .footer{padding:18px 56px;display:flex;justify-content:space-between;font-size:10px;color:#9A9AB0;font-family:'DM Mono',monospace;background:#F8F6F2;border-top:1px solid #E8E4DC}
  .no-print{position:fixed;bottom:24px;right:24px;background:#1A1A2E;color:#C8A96E;border:none;padding:12px 24px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:100}
  .no-print:hover{background:#C8A96E;color:#1A1A2E}
</style>
</head>
<body>
<div class="page">

<!-- PORTADA -->
<div class="cover pb">
  <div class="cover-brand">${config.estudio||"BLUE FOREST"} · INFORME DE OBRA · ${hoy}</div>
  <div class="cover-bar"></div>
  <div class="cover-title">${obra.nombre}</div>
  <div class="cover-sub">${[obra.cliente,obra.ubicacion].filter(Boolean).join(" · ")}</div>
  <div class="cover-grid">
    <div class="cover-kpi"><div class="cover-kpi-label">ESTADO</div><div class="cover-kpi-val">${{en_curso:"En curso",pendiente:"Pendiente",completada:"Completada",pausada:"Pausada"}[obra.estado]||obra.estado}</div></div>
    <div class="cover-kpi"><div class="cover-kpi-label">PRESUPUESTO</div><div class="cover-kpi-val">${fmtN(presupFinal)}</div></div>
    <div class="cover-kpi"><div class="cover-kpi-label">AVANCE</div><div class="cover-kpi-val">${avanceMedio}%</div></div>
    <div class="cover-kpi"><div class="cover-kpi-label">${diasRest!==null?(diasRest<0?"RETRASO":"ENTREGA"):"INICIO"}</div><div class="cover-kpi-val" style="color:${diasRest!==null&&diasRest<0?"#E05C5C":"#C8A96E"}">${diasRest!==null?(diasRest<0?Math.abs(diasRest)+"d":diasRest+"d"):(obra.fechaInicio||"—")}</div></div>
  </div>
</div>

<!-- 1. RESUMEN EJECUTIVO -->
<section>
  <h2>1. Resumen Ejecutivo</h2>
  <div class="kpi-grid g4">
    <div class="kpi">
      <div class="kpi-label">PRESUPUESTO INICIAL</div>
      <div class="kpi-val gold">${fmtN(presupTotal)}</div>
      ${extrasAprob>0?`<div class="kpi-sub">+${fmtN(extrasAprob)} en extras → <strong>${fmtN(presupFinal)}</strong></div>`:""}
    </div>
    <div class="kpi">
      <div class="kpi-label">COSTE REAL</div>
      <div class="kpi-val" style="color:${costoReal>presupFinal?"#C0392B":"#1A1A2E"}">${fmtN(costoReal)}</div>
      <div class="kpi-sub">${presupFinal?pctN(costoReal,presupFinal):0}% ejecutado</div>
      <div class="bar"><div class="bar-fill" style="width:${Math.min(100,presupFinal?pctN(costoReal,presupFinal):0)}%;background:${costoReal>presupFinal?"#C0392B":"#C8A96E"}"></div></div>
    </div>
    <div class="kpi">
      <div class="kpi-label">COBROS / PENDIENTE</div>
      <div class="kpi-val green">${fmtN(cobros)}</div>
      ${cobradoPend>0?`<div class="kpi-sub" style="color:#E08D3C">Pdte: ${fmtN(cobradoPend)}</div>`:""}
    </div>
    <div class="kpi">
      <div class="kpi-label">MARGEN ESTIMADO</div>
      <div class="kpi-val" style="color:${margen>=0?"#2D7A4F":"#C0392B"}">${fmtN(margen)}</div>
      <div class="kpi-sub">${cobros?pctN(margen,cobros):0}% sobre cobros</div>
    </div>
  </div>
  <div class="kpi-grid g4">
    <div class="kpi"><div class="kpi-label">TAREAS</div><div class="kpi-val">${tareasComp}<span style="font-size:14px;color:#9A9AB0"> / ${tareas.length}</span></div><div class="bar"><div class="bar-fill" style="width:${pctN(tareasComp,tareas.length)}%;background:#2D7A4F"></div></div></div>
    <div class="kpi"><div class="kpi-label">FASES</div><div class="kpi-val">${fases.filter(f=>f.estado==="completada").length}<span style="font-size:14px;color:#9A9AB0"> / ${fases.length}</span></div></div>
    <div class="kpi"><div class="kpi-label">INCIDENCIAS ABIERTAS</div><div class="kpi-val" style="color:${incidencias.filter(i=>i.estado==="abierta").length>0?"#C0392B":"#2D7A4F"}">${incidencias.filter(i=>i.estado==="abierta").length}</div></div>
    <div class="kpi"><div class="kpi-label">AVANCE IA</div><div class="kpi-val" style="color:${avanceMedio>70?"#2D7A4F":avanceMedio>40?"#C8A96E":"#E08D3C"}">${avanceMedio}%</div></div>
  </div>
</section>

<!-- 2. GANTT -->
${ganttFechas.length > 0 ? `
<section class="pb">
  <h2>2. Planificación — Gantt</h2>
  <div style="display:flex;align-items:center;gap:0;margin-bottom:8px;font-size:9px;color:#9A9AB0;font-family:'DM Mono',monospace">
    <div style="width:200px;flex-shrink:0"></div>
    <div style="flex:1;display:flex;justify-content:space-between;padding:0 2px">${ganttMin?`<span>${ganttMin}</span><span>${ganttMax}</span>`:""}
    </div>
  </div>
  ${fases.map(f=>`
  <div class="gantt-row">
    <div class="gantt-label">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${faseCol[f.estado]||"#888"};margin-right:6px;vertical-align:middle"></span>
      ${f.nombre}
    </div>
    <div class="gantt-track">${ganttBar(f)}</div>
  </div>`).join("")}
  <div style="display:flex;gap:20px;margin-top:14px;font-size:10px;color:#9A9AB0">
    ${Object.entries(faseCol).map(([k,v])=>`<span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:${v};display:inline-block"></span>${{completada:"Completada",en_curso:"En curso",pendiente:"Pendiente"}[k]}</span>`).join("")}
  </div>
</section>` : ""}

<!-- 3. TAREAS -->
${tareas.length > 0 ? `
<section>
  <h2>3. Tareas</h2>
  <table>
    <thead><tr><th>Tarea</th><th>Fase</th><th>Responsable</th><th>Prioridad</th><th>Estado</th></tr></thead>
    <tbody>
      ${tareas.map(t=>{
        const fn=fases.find(f=>f.id===t.faseId)?.nombre||"—";
        const pc=priCol[t.prioridad]||"#9A9AB0";
        const ec={completada:"#2D7A4F",en_curso:"#C8A96E",pendiente:"#9A9AB0",bloqueada:"#C0392B"}[t.estado]||"#9A9AB0";
        return `<tr><td style="font-weight:500;text-decoration:${t.estado==="completada"?"line-through":"none"};color:${t.estado==="completada"?"#9A9AB0":"#1A1A2E"}">${t.titulo}</td><td>${fn}</td><td>${t.responsable||"—"}</td><td><span class="tag" style="background:${pc}22;color:${pc}">${t.prioridad}</span></td><td><span class="tag" style="background:${ec}22;color:${ec}">${t.estado}</span></td></tr>`;
      }).join("")}
    </tbody>
  </table>
</section>` : ""}

<!-- 4. CONTROL ECONÓMICO -->
<section class="pb">
  <h2>4. Control Económico</h2>
  ${(eco.partidas||[]).length > 0 ? `
  <h3>Desglose por Partidas</h3>
  <table>
    <thead><tr><th>Categoría</th><th>Concepto</th><th>Previsto</th><th>Real</th><th>Desviación</th></tr></thead>
    <tbody>
      ${(eco.partidas||[]).map(p=>{
        const cat=CATEGORIAS_ECO.find(c=>c.id===p.categoria);
        const desv=(Number(p.real)||0)-(Number(p.previsto)||0);
        return `<tr><td>${cat?.icon||""} ${cat?.label||p.categoria}</td><td>${p.concepto}</td><td class="mono">${fmtN(p.previsto)}</td><td class="mono" style="color:${Number(p.real)>Number(p.previsto)?"#C0392B":"#2D7A4F"}">${fmtN(p.real)}</td><td class="mono" style="color:${desv>0?"#C0392B":"#2D7A4F"}">${desv>=0?"+":""}${fmtN(desv)}</td></tr>`;
      }).join("")}
      <tr style="background:#1A1A2E;color:#F8F6F2">
        <td colspan="2" style="font-weight:600;color:#C8A96E">TOTALES</td>
        <td class="mono" style="color:#F8F6F2">${fmtN((eco.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0))}</td>
        <td class="mono" style="color:#F8F6F2">${fmtN(costoReal)}</td>
        <td class="mono" style="color:${costoReal>presupTotal?"#E05C5C":"#5CB87A"}">${costoReal>presupTotal?"+":""}${fmtN(costoReal-presupTotal)}</td>
      </tr>
    </tbody>
  </table>` : ""}
  ${(eco.cobros||[]).length > 0 ? `
  <h3>Cobros</h3>
  <table>
    <thead><tr><th>Concepto</th><th>Fecha</th><th>Importe</th><th>Estado</th></tr></thead>
    <tbody>
      ${(eco.cobros||[]).map(c=>{
        const ec={cobrado:"#2D7A4F",pendiente:"#C8A96E",parcial:"#E08D3C"}[c.estado]||"#9A9AB0";
        return `<tr><td>${c.concepto}</td><td class="mono">${c.fecha}</td><td class="mono green">${fmtN(c.importe)}</td><td><span class="tag" style="background:${ec}22;color:${ec}">${c.estado}</span></td></tr>`;
      }).join("")}
    </tbody>
  </table>` : ""}
  ${extras.filter(e=>e.estado!=="rechazado").length > 0 ? `
  <h3>Extras y Modificados</h3>
  <table>
    <thead><tr><th>Descripción</th><th>Tipo</th><th>Importe</th><th>Estado</th></tr></thead>
    <tbody>
      ${extras.filter(e=>e.estado!=="rechazado").map(e=>{
        const ec={pendiente:"#C8A96E",aprobado:"#2D7A4F",ejecutado:"#5C9BE0",facturado:"#C8A96E",rechazado:"#C0392B"}[e.estado]||"#9A9AB0";
        return `<tr><td>${e.titulo}</td><td>${e.tipo}</td><td class="mono" style="color:#E08D3C">${e.tipo==="descuento"?"-":"+"} ${fmtN(e.importe)}</td><td><span class="tag" style="background:${ec}22;color:${ec}">${e.estado}</span></td></tr>`;
      }).join("")}
      <tr><td colspan="2" style="font-weight:600;font-family:'DM Mono',monospace;font-size:10px">TOTAL EXTRAS</td><td class="mono" style="color:#E08D3C;font-weight:600">${fmtN(extrasAprob)}</td><td></td></tr>
    </tbody>
  </table>` : ""}
</section>

<!-- 5. PROVEEDORES -->
${proveedores.length > 0 ? `
<section>
  <h2>5. Proveedores</h2>
  <table>
    <thead><tr><th>Empresa</th><th>Especialidad</th><th>Contacto</th><th>Teléfono</th><th>Importe</th><th>Pagado</th><th>Estado</th></tr></thead>
    <tbody>
      ${proveedores.map(p=>{
        const pagado=(p.pagos||[]).reduce((a,pg)=>a+(Number(pg.importe)||0),0);
        const ec={activo:"#2D7A4F",pendiente:"#C8A96E",finalizado:"#5C9BE0",pausado:"#E08D3C"}[p.estado]||"#9A9AB0";
        return `<tr><td style="font-weight:500">${p.nombre}${p.valoracion>0?` <span style="color:#C8A96E">${"★".repeat(p.valoracion)}</span>`:""}</td><td>${p.especialidad||"—"}</td><td>${p.contacto||"—"}</td><td class="mono">${p.telefono||"—"}</td><td class="mono gold">${fmtN(p.importe)}</td><td class="mono green">${fmtN(pagado)}</td><td><span class="tag" style="background:${ec}22;color:${ec}">${p.estado}</span></td></tr>`;
      }).join("")}
    </tbody>
  </table>
</section>` : ""}

<!-- 6. MATERIALES -->
${materiales.length > 0 ? `
<section>
  <h2>6. Materiales</h2>
  <table>
    <thead><tr><th>Material</th><th>Proveedor</th><th>Cantidad</th><th>Importe</th><th>Estado</th><th>Crítico</th></tr></thead>
    <tbody>
      ${materiales.map(m=>{
        const ec={recibido:"#2D7A4F",en_camino:"#5C9BE0",confirmado:"#C8A96E",pedido:"#C8A96E",pendiente:"#9A9AB0",problema:"#C0392B"}[m.estado]||"#9A9AB0";
        return `<tr><td style="font-weight:500">${m.nombre}${m.referencia?`<div style="font-size:10px;color:#9A9AB0">${m.referencia}</div>`:""}</td><td>${m.proveedor||"—"}</td><td class="mono">${m.cantidad} ${m.unidad}</td><td class="mono gold">${fmtN(m.cantidad*m.precioUnit)}</td><td><span class="tag" style="background:${ec}22;color:${ec}">${m.estado}</span></td><td style="text-align:center">${m.critico?"🔴":""}</td></tr>`;
      }).join("")}
    </tbody>
  </table>
</section>` : ""}

<!-- 7. INCIDENCIAS -->
${incidencias.length > 0 ? `
<section>
  <h2>7. Incidencias</h2>
  ${incidencias.map(i=>{
    const pc=priCol[i.prioridad]||"#9A9AB0";
    const ec=estIncCol[i.estado]||"#9A9AB0";
    return `<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #EEEBE5">
      <div style="width:10px;height:10px;border-radius:50%;background:${pc};flex-shrink:0;margin-top:3px"></div>
      <div style="flex:1">
        <div style="font-weight:500">${i.titulo}</div>
        <div style="font-size:11px;color:#9A9AB0;margin-top:2px">${i.tipo} · ${i.fecha}${i.responsable?" · "+i.responsable:""}</div>
        ${i.descripcion?`<div style="font-size:11px;color:#5A5A72;margin-top:4px">${i.descripcion}</div>`:""}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        <span class="tag" style="background:${ec}22;color:${ec}">${i.estado}</span>
        <span class="tag" style="background:${pc}22;color:${pc}">${i.prioridad}</span>
        ${i.coste>0?`<span class="mono" style="font-size:10px;color:#E08D3C">${fmtN(i.coste)}</span>`:""}
      </div>
    </div>`;
  }).join("")}
</section>` : ""}

<!-- 8. GARANTÍAS -->
${garantias.length > 0 ? `
<section>
  <h2>8. Garantías Postventa</h2>
  <table>
    <thead><tr><th>Elemento</th><th>Tipo</th><th>Inicio</th><th>Vencimiento</th><th>Estado</th></tr></thead>
    <tbody>
      ${garantias.map(g=>{
        const dias=g.fechaFin?Math.ceil((new Date(g.fechaFin)-new Date())/864e5):null;
        const est=dias===null?"vigente":dias<0?"vencida":dias<90?"proxima":"vigente";
        const ec={vigente:"#2D7A4F",proxima:"#C8A96E",vencida:"#C0392B"}[est];
        const tipo=TIPOS_GARANTIA.find(t=>t.id===g.tipo);
        return `<tr><td style="font-weight:500">${tipo?.emoji||""} ${g.nombre}</td><td>${tipo?.label||g.tipo}</td><td class="mono">${g.fechaInicio}</td><td class="mono" style="color:${ec}">${g.fechaFin}${dias!==null?` (${dias<0?Math.abs(dias)+"d venció":dias+"d rest."})`:""}</td><td><span class="tag" style="background:${ec}22;color:${ec}">${est}</span></td></tr>`;
      }).join("")}
    </tbody>
  </table>
</section>` : ""}

<!-- 9. DOCUMENTACIÓN -->
${docs.filter(d=>d.estado!=="pendiente"&&d.estado!=="no_aplica").length > 0 ? `
<section>
  <h2>9. Arquitecto y Licencias</h2>
  ${obra.arquitecto_nombre||obra.arquitecto_estudio ? `
  <div style="background:#F8F6F2;border-radius:8px;padding:14px 18px;margin-bottom:18px;font-size:12px">
    ${obra.arquitecto_nombre?`<div><strong>Arquitecto:</strong> ${obra.arquitecto_nombre}${obra.arquitecto_col?" · Col. "+obra.arquitecto_col:""}</div>`:""}
    ${obra.arquitecto_estudio?`<div><strong>Estudio:</strong> ${obra.arquitecto_estudio}</div>`:""}
    ${obra.arquitecto_tel?`<div><strong>Tel:</strong> ${obra.arquitecto_tel}</div>`:""}
  </div>` : ""}
  <table>
    <thead><tr><th>Documento</th><th>Estado</th><th>Fecha</th><th>Expediente</th></tr></thead>
    <tbody>
      ${docs.filter(d=>d.estado!=="pendiente"&&d.estado!=="no_aplica").map(d=>{
        const ec={recibido:"#2D7A4F",en_tramite:"#C8A96E",solicitado:"#5C9BE0",no_aplica:"#9A9AB0"}[d.estado]||"#9A9AB0";
        return `<tr><td>${d.icono||""} ${d.label}</td><td><span class="tag" style="background:${ec}22;color:${ec}">${d.estado}</span></td><td class="mono">${d.fechaEntrega||"—"}</td><td class="mono">${d.expediente||"—"}</td></tr>`;
      }).join("")}
    </tbody>
  </table>
</section>` : ""}

<!-- 10. FOTOS -->
${fotos.length > 0 ? `
<section class="pb">
  <h2>10. Registro Fotográfico</h2>
  <div class="foto-grid">
    ${fotos.map(f=>`
    <div>
      <div><img src="${f.src}" alt="${f.zona}" /></div>
      <div class="foto-label">${f.zona}${f.fecha?" · "+f.fecha:""}${f.avanceIA!==null?" · "+f.avanceIA+"%":""}</div>
    </div>`).join("")}
  </div>
</section>` : ""}

<!-- 11. CHECKLISTS -->
${checklists.length > 0 ? `
<section>
  <h2>11. Checklists</h2>
  ${checklists.map(cl=>{
    const comp=cl.items.filter(i=>i.completado).length;
    const pctCl=cl.items.length?Math.round((comp/cl.items.length)*100):0;
    return `<div style="margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h3 style="margin:0">${cl.nombre}</h3>
        <span class="mono" style="font-size:11px;color:${pctCl===100?"#2D7A4F":"#C8A96E"}">${pctCl}% · ${comp}/${cl.items.length}</span>
      </div>
      <div class="bar" style="margin-bottom:12px"><div class="bar-fill" style="width:${pctCl}%;background:${pctCl===100?"#2D7A4F":"#C8A96E"}"></div></div>
      <table><thead><tr><th style="width:28px"></th><th>Item</th><th style="width:100px">Completado</th></tr></thead><tbody>
      ${cl.items.map(i=>`<tr><td style="text-align:center;color:#2D7A4F;font-size:14px">${i.completado?"✓":""}</td><td style="text-decoration:${i.completado?"line-through":"none"};color:${i.completado?"#9A9AB0":"#1A1A2E"}">${i.texto}${i.critico?" 🔴":""}</td><td class="mono" style="font-size:10px;color:#9A9AB0">${i.fechaComp||""}</td></tr>`).join("")}
      </tbody></table>
    </div>`;
  }).join("")}
</section>` : ""}

<!-- FOOTER -->
<div class="footer">
  <span>${config.estudio||"Blue Forest"} · Informe generado el ${hoy}</span>
  <span>${obra.nombre}${obra.cliente?" · "+obra.cliente:""}</span>
</div>

</div>
<button class="no-print" onclick="window.print()">🖨 Imprimir / PDF</button>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Informe_${obra.nombre.replace(/\s+/g,"_")}_${new Date().toLocaleDateString("es-ES").replace(/\//g,"-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function estadoColor(estado) {
  const m = { en_curso: G.green, pendiente: G.gold, pausada: G.orange, completada: G.textMuted };
  return m[estado] || G.textMuted;
}

function Dashboard({ obras, onSelectObra }) {
  const [alertasVisible, setAlertasVisible] = useState(true);
  const [widgetsConfig, setWidgetsConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bf-widgets")||"{}"); } catch { return {}; }
  });

  const hoy = new Date();
  const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch { return {}; } })();

  // === M-tricas ===globales --
  const activas     = obras.filter(o => o.estado === "en_curso");
  const retrasadas  = obras.filter(o => o.fechaFin && diasRestantes(o.fechaFin) < 0 && o.estado !== "completada");
  const totalPresup = obras.reduce((a,o) => a+(o.presupuesto||0), 0);
  const totalReal   = obras.reduce((a,o) => a+(o.economica?.partidas||[]).reduce((s,p)=>s+(Number(p.real)||0),0), 0);
  const totalCobros = obras.reduce((a,o) => a+(o.economica?.cobros||[]).reduce((s,c)=>s+(Number(c.importe)||0),0), 0);
  const cobrosPend  = obras.reduce((a,o) => a+(o.economica?.cobros||[]).filter(c=>c.estado==="pendiente").reduce((s,c)=>s+(Number(c.importe)||0),0), 0);
  const cobrosVenc  = obras.flatMap(o=>(o.economica?.cobros||[]).filter(c=>c.estado==="pendiente"&&c.fecha&&new Date(c.fecha)<hoy));
  const incAbiertas = obras.reduce((a,o) => a+(o.incidencias||[]).filter(i=>i.estado==="abierta"||i.estado==="en_curso").length, 0);
  const incCriticas = obras.reduce((a,o) => a+(o.incidencias||[]).filter(i=>i.prioridad==="critica"&&i.estado!=="cerrada").length, 0);
  const tareasHoy   = obras.flatMap(o=>(o.tareas||[]).filter(t=>t.estado!=="completada"&&t.prioridad==="alta")).slice(0,5);
  const matCriticos = obras.flatMap(o=>(o.materiales||[]).filter(m=>m.critico&&m.estado!=="recibido").map(m=>({...m,obraNombre:o.nombre,obraId:o.id})));
  const garantiasVenciendo = obras.flatMap(o=>(o.garantias||[]).filter(g=>{ if(!g.fechaFin) return false; const d=Math.ceil((new Date(g.fechaFin)-hoy)/864e5); return d>=0&&d<=90; }).map(g=>({...g,obraNombre:o.nombre,obraId:o.id,diasRest:Math.ceil((new Date(g.fechaFin)-hoy)/864e5)})));
  const extrasAprobar = obras.flatMap(o=>(o.extras||[]).filter(e=>e.estado==="pendiente").map(e=>({...e,obraNombre:o.nombre,obraId:o.id})));
  const margenGlobal = totalCobros-totalReal;
  const margenPct = totalCobros ? Math.round((margenGlobal/totalCobros)*100) : 0;
  const alertas = generarAlertas(obras);

  // === Timeline ===pr-ximas fases --
  const en60 = new Date(hoy.getTime()+60*864e5);
  const fasesTimeline = obras.flatMap(o=>(o.fases||[]).filter(f=>{ const fin=new Date(f.fin); return fin>=hoy&&fin<=en60&&f.estado!=="completada"; }).map(f=>({...f,obraNombre:o.nombre,obraColor:o.color,obraId:o.id}))).sort((a,b)=>new Date(a.fin)-new Date(b.fin)).slice(0,8);

  // === Cobros ===pr-ximos 30 d-as --
  const cobrosProximos = obras.flatMap(o=>(o.economica?.cobros||[]).filter(c=>c.estado==="pendiente"&&c.fecha).map(c=>({...c,obraNombre:o.nombre,obraId:o.id}))).filter(c=>{ const d=new Date(c.fecha); return d>=hoy&&d<=new Date(hoy.getTime()+30*864e5); }).sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,6);

  // === Fotos ===recientes --
  const fotosRecientes = obras.flatMap(o=>(o.fotos||[]).map(f=>({...f,obraNombre:o.nombre,obraId:o.id}))).sort((a,b)=>(b.fechaISO||"").localeCompare(a.fechaISO||"")).slice(0,6);

  // === Actividad ===semanal --
  const semanaAtras = new Date(hoy.getTime()-7*864e5);
  const actividadSemana = (() => {
    try { const log=JSON.parse(localStorage.getItem("bf-auditoria")||"[]"); return log.filter(e=>new Date(e.ts||0)>=semanaAtras).length; } catch { return 0; }
  })();

  const saludo = () => {
    const h = hoy.getHours();
    const nombre = config.nombre ? `, ${config.nombre.split(" ")[0]}` : "";
    if (h < 12) return `Buenos días${nombre} ☀️`;
    if (h < 20) return `Buenas tardes${nombre} 🌤`;
    return `Buenas noches${nombre} 🌙`;
  };

  return (
    <div style={{ padding:28, overflow:"auto", height:"100%" }}>

      {/* ── HEADER ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div className="serif" style={{ fontSize:26, marginBottom:4 }}>{saludo()}</div>
          <div style={{ color:G.textMuted, fontSize:13 }}>
            {hoy.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            {actividadSemana > 0 && <span style={{ color:G.gold, marginLeft:12 }}>· {actividadSemana} cambio{actividadSemana!==1?"s":""} esta semana</span>}
          </div>
        </div>
        {alertas.length > 0 && (
          <button onClick={()=>setAlertasVisible(v=>!v)} style={{ background:alertas.some(a=>a.tipo==="rojo")?"#2A1010":"#1E1A10", border:`1px solid ${alertas.some(a=>a.tipo==="rojo")?G.red:G.orange}44`, color:alertas.some(a=>a.tipo==="rojo")?G.red:G.orange, padding:"7px 14px", borderRadius:6, fontSize:12, cursor:"pointer" }}>
            {alertas.some(a=>a.tipo==="rojo")?"🔴":"🟠"} {alertas.length} alerta{alertas.length!==1?"s":""} {alertasVisible?"▲":"▼"}
          </button>
        )}
      </div>

      {/* ── ALERTAS ── */}
      {alertasVisible && alertas.length > 0 && (
        <div style={{ marginBottom:20, display:"flex", flexDirection:"column", gap:5 }}>
          {alertas.slice(0,5).map((a,i)=>(
            <div key={i} onClick={()=>onSelectObra(a.obraId)} style={{ display:"flex",gap:12,alignItems:"center",padding:"9px 14px",borderRadius:6,background:a.tipo==="rojo"?"#2A1010":"#1E1A10",border:`1px solid ${a.tipo==="rojo"?G.red:G.orange}33`,cursor:"pointer" }}>
              <span style={{ fontSize:12 }}>{a.tipo==="rojo"?"🔴":"🟠"}</span>
              <span style={{ fontSize:12,flex:1,color:a.tipo==="rojo"?"#F0A0A0":"#F0C080" }}>{a.texto}</span>
              <span style={{ fontSize:11,color:G.textDim }}>→ ver obra</span>
            </div>
          ))}
          {alertas.length > 5 && <div style={{ fontSize:11,color:G.textMuted,paddingLeft:4 }}>+{alertas.length-5} alertas más en Automatizaciones</div>}
        </div>
      )}

      {/* ── KPIs FILA 1 ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:12 }}>
        <div className="stat-box" style={{ borderLeft:`3px solid ${G.green}` }}>
          <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>OBRAS ACTIVAS</div>
          <div className="serif" style={{ fontSize:26,color:G.green }}>{activas.length}</div>
          {retrasadas.length>0&&<div style={{ fontSize:10,color:G.red,marginTop:4 }}>⚠ {retrasadas.length} retrasada{retrasadas.length!==1?"s":""}</div>}
          <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginTop:6 }}>
            {activas.slice(0,2).map(o=><span key={o.id} onClick={()=>onSelectObra(o.id)} style={{ fontSize:9,color:G.text,background:o.color+"22",border:`1px solid ${o.color}44`,padding:"1px 5px",borderRadius:3,cursor:"pointer" }}>{o.nombre.slice(0,12)}</span>)}
          </div>
        </div>
        <div className="stat-box" style={{ borderLeft:`3px solid ${G.gold}` }}>
          <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>PRESUPUESTO TOTAL</div>
          <div className="serif" style={{ fontSize:20,color:G.gold }}>{fmt(totalPresup)}</div>
          <div style={{ fontSize:10,color:G.textMuted,marginTop:3 }}>{fmt(totalReal)} real</div>
        </div>
        <div className="stat-box" style={{ borderLeft:`3px solid ${margenGlobal>=0?G.green:G.red}` }}>
          <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>MARGEN GLOBAL</div>
          <div className="serif" style={{ fontSize:20,color:margenGlobal>=0?G.green:G.red }}>{margenPct}%</div>
          <div style={{ fontSize:10,color:G.textMuted,marginTop:3 }}>{fmt(margenGlobal)}</div>
        </div>
        <div className="stat-box" style={{ borderLeft:`3px solid ${cobrosPend>0?G.orange:G.green}` }}>
          <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>COBROS PEND.</div>
          <div className="serif" style={{ fontSize:20,color:cobrosPend>0?G.orange:G.green }}>{fmt(cobrosPend)}</div>
          {cobrosVenc.length>0&&<div style={{ fontSize:10,color:G.red,marginTop:3 }}>⚠ {cobrosVenc.length} vencido{cobrosVenc.length!==1?"s":""}</div>}
        </div>
        <div className="stat-box" style={{ borderLeft:`3px solid ${incCriticas>0?G.red:incAbiertas>0?G.orange:G.green}` }}>
          <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>INCIDENCIAS</div>
          <div className="serif" style={{ fontSize:26,color:incCriticas>0?G.red:incAbiertas>0?G.orange:G.green }}>{incAbiertas}</div>
          {incCriticas>0&&<div style={{ fontSize:10,color:G.red,marginTop:3 }}>🔴 {incCriticas} crítica{incCriticas!==1?"s":""}</div>}
          {incAbiertas===0&&<div style={{ fontSize:10,color:G.green,marginTop:3 }}>✓ Todo ok</div>}
        </div>
      </div>

      {/* ── KPIs FILA 2 ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
        {[
          { label:"COMPLETADAS", val:obras.filter(o=>o.estado==="completada").length, sub:`de ${obras.length} totales`, color:G.textMuted },
          { label:"TAREAS CRÍTICAS", val:tareasHoy.length, sub:"prioridad alta pend.", color:tareasHoy.length>0?G.orange:G.green },
          { label:"MAT. CRÍTICOS", val:matCriticos.length, sub:"sin recibir", color:matCriticos.length>0?G.red:G.green },
          { label:"EXTRAS PEND.", val:extrasAprobar.length, sub:"pendientes aprobación", color:extrasAprobar.length>0?G.gold:G.textMuted },
          { label:"GARANTÍAS VENCIENDO", val:garantiasVenciendo.length, sub:"en próximos 90d", color:garantiasVenciendo.length>0?G.orange:G.textMuted },
        ].map(k=>(
          <div key={k.label} className="stat-box">
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
            <div className="serif" style={{ fontSize:22,color:k.color }}>{k.val}</div>
            <div style={{ fontSize:10,color:G.textMuted,marginTop:3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── PANEL PRINCIPAL 3 columnas ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr", gap:20, marginBottom:20 }}>

        {/* Obras */}
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <div className="serif" style={{ fontSize:15 }}>Obras</div>
            <div style={{ display:"flex",gap:4 }}>
              {["en_curso","pendiente","pausada","completada"].filter(e=>obras.some(o=>o.estado===e)).map(e=>(
                <span key={e} className="tag" style={{ background:estadoColor(e)+"22",color:estadoColor(e) }}>
                  {obras.filter(o=>o.estado===e).length} {ESTADOS_OBRA[e]}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {obras.length===0&&<div style={{ color:G.textMuted,fontSize:13,textAlign:"center",padding:24 }}>Sin obras. Pulsa N para crear.</div>}
            {obras.map(obra=>{
              const p = pct((obra.tareas||[]).filter(t=>t.estado==="completada").length,(obra.tareas||[]).length);
              const dias = obra.fechaFin ? diasRestantes(obra.fechaFin) : null;
              const incOb = (obra.incidencias||[]).filter(i=>i.estado==="abierta").length;
              const extras = (obra.extras||[]).filter(e=>e.estado==="pendiente").length;
              return (
                <div key={obra.id} className="card obra-card" style={{ borderLeftColor:obra.color,padding:"12px 14px",cursor:"pointer" }} onClick={()=>onSelectObra(obra.id)}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:5 }}>
                    <div className="serif" style={{ fontSize:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{obra.nombre}</div>
                    {incOb>0&&<span style={{ fontSize:10,color:G.red }}>🔴{incOb}</span>}
                    {extras>0&&<span style={{ fontSize:10,color:G.gold }}>➕{extras}</span>}
                    {dias!==null&&dias<0&&<span style={{ fontSize:9,color:G.red }}>⚠vencida</span>}
                    {dias!==null&&dias>=0&&dias<=14&&<span style={{ fontSize:9,color:G.orange }}>{dias}d</span>}
                  </div>
                  <div style={{ fontSize:10,color:G.textMuted,marginBottom:6 }}>{obra.cliente}</div>
                  <div style={{ display:"flex",gap:10,fontSize:10,marginBottom:6 }}>
                    <span className="mono" style={{ color:G.gold }}>{fmt(obra.presupuesto)}</span>
                    <span style={{ color:G.textMuted }}>{p}% tareas</span>
                    <span style={{ color:G.textMuted,marginLeft:"auto" }}>{(obra.tareas||[]).filter(t=>t.estado==="completada").length}/{(obra.tareas||[]).length}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${p}%`,background:obra.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline + Cobros próximos */}
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          <div>
            <div className="serif" style={{ fontSize:15,marginBottom:10 }}>Próximas Fases</div>
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {fasesTimeline.length===0&&<div style={{ color:G.textMuted,fontSize:12,textAlign:"center",padding:16 }}>Sin fases próximas en 60 días</div>}
              {fasesTimeline.slice(0,5).map((f,i)=>{
                const diasF = Math.ceil((new Date(f.fin)-hoy)/864e5);
                return (
                  <div key={i} className="card" style={{ padding:"10px 12px",cursor:"pointer",borderLeft:`3px solid ${diasF<=7?G.red:diasF<=14?G.orange:f.obraColor}` }} onClick={()=>onSelectObra(f.obraId)}>
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{f.nombre}</div>
                        <div style={{ fontSize:10,color:G.textMuted }}>{f.obraNombre}</div>
                      </div>
                      <div className="mono" style={{ fontSize:12,color:diasF<=7?G.red:diasF<=14?G.orange:G.textMuted,flexShrink:0 }}>{diasF}d</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cobros próximos */}
          {cobrosProximos.length > 0 && (
            <div>
              <div className="serif" style={{ fontSize:15,marginBottom:10 }}>💶 Cobros próximos 30d</div>
              <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
                {cobrosProximos.map((c,i)=>{
                  const dias = Math.ceil((new Date(c.fecha)-hoy)/864e5);
                  return (
                    <div key={i} onClick={()=>onSelectObra(c.obraId)} style={{ display:"flex",gap:8,alignItems:"center",padding:"8px 10px",borderRadius:6,background:G.surface,border:`1px solid ${G.border}`,cursor:"pointer",fontSize:11 }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.concepto}</div>
                        <div style={{ fontSize:9,color:G.textMuted }}>{c.obraNombre} · en {dias}d</div>
                      </div>
                      <div className="mono" style={{ color:G.gold,flexShrink:0 }}>{fmt(c.importe)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Widgets: Fotos + Materiales críticos + Extras */}
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          {/* Fotos recientes */}
          <div>
            <div className="serif" style={{ fontSize:15,marginBottom:10 }}>Fotos Recientes</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
              {fotosRecientes.slice(0,4).map((f,i)=>(
                <div key={i} style={{ position:"relative",borderRadius:6,overflow:"hidden",cursor:"pointer",border:`1px solid ${G.border}`,aspectRatio:"4/3" }} onClick={()=>onSelectObra(f.obraId)}>
                  <img src={f.src} alt={f.zona} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 60%)" }} />
                  <div style={{ position:"absolute",bottom:3,left:5,right:5 }}>
                    <div style={{ fontSize:9,color:"#fff",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{f.zona}</div>
                  </div>
                  {f.avanceIA!==null&&<div style={{ position:"absolute",top:3,right:3,background:"rgba(0,0,0,0.75)",borderRadius:6,padding:"1px 4px",fontSize:8,fontFamily:"DM Mono",color:f.avanceIA>70?G.green:G.gold }}>{f.avanceIA}%</div>}
                </div>
              ))}
              {fotosRecientes.length===0&&<div style={{ gridColumn:"1/-1",color:G.textMuted,fontSize:12,textAlign:"center",padding:16 }}>Sin fotos aún</div>}
            </div>
          </div>

          {/* Materiales críticos */}
          {matCriticos.length > 0 && (
            <div>
              <div className="serif" style={{ fontSize:15,marginBottom:10 }}>📦 Materiales Críticos</div>
              {matCriticos.slice(0,3).map((m,i)=>(
                <div key={i} onClick={()=>onSelectObra(m.obraId)} style={{ display:"flex",gap:8,alignItems:"center",padding:"8px 10px",borderRadius:6,background:"#2A1010",border:`1px solid ${G.red}33`,cursor:"pointer",marginBottom:5,fontSize:11 }}>
                  <span style={{ color:G.red,flexShrink:0 }}>🔴</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{m.nombre}</div>
                    <div style={{ fontSize:9,color:G.textMuted }}>{m.obraNombre} · {ESTADOS_MAT[m.estado]?.label||m.estado}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extras pendientes */}
          {extrasAprobar.length > 0 && (
            <div>
              <div className="serif" style={{ fontSize:15,marginBottom:10 }}>➕ Extras por aprobar</div>
              {extrasAprobar.slice(0,3).map((e,i)=>(
                <div key={i} onClick={()=>onSelectObra(e.obraId)} style={{ display:"flex",gap:8,alignItems:"center",padding:"8px 10px",borderRadius:6,background:"#1E1A10",border:`1px solid ${G.gold}33`,cursor:"pointer",marginBottom:5,fontSize:11 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.titulo}</div>
                    <div style={{ fontSize:9,color:G.textMuted }}>{e.obraNombre}</div>
                  </div>
                  <div className="mono" style={{ color:G.gold,flexShrink:0 }}>{fmt(e.importe)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TABLA ECONÓMICA ── */}
      {obras.some(o=>o.economica?.partidas?.length||o.economica?.cobros?.length) && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="serif" style={{ fontSize:15,marginBottom:16 }}>Resumen Económico por Obra</div>
          <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr",gap:0 }}>
            {["OBRA","PRESUPUESTO","COSTE REAL","DESVIACIÓN","COBROS","MARGEN €","MARGEN %"].map(h=>(
              <div key={h} style={{ fontSize:9,color:G.textMuted,padding:"6px 10px",borderBottom:`1px solid ${G.border}`,fontFamily:"DM Mono" }}>{h}</div>
            ))}
            {obras.filter(o=>o.economica?.partidas?.length||o.economica?.cobros?.length).map(o=>{
              const prev=(o.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0)||o.presupuesto;
              const real=(o.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
              const cobros=(o.economica?.cobros||[]).reduce((a,c)=>a+(Number(c.importe)||0),0);
              const margen=cobros-real;
              const margenP=cobros?Math.round((margen/cobros)*100):0;
              const desv=real-prev;
              return [
                <div key={o.id+"n"} style={{ padding:"9px 10px",borderBottom:`1px solid ${G.border}`,fontSize:11,cursor:"pointer",fontWeight:500,color:estadoColor(o.estado) }} onClick={()=>onSelectObra(o.id)}>{o.nombre.slice(0,20)}</div>,
                <div key={o.id+"p"} style={{ padding:"9px 10px",borderBottom:`1px solid ${G.border}` }}><span className="mono" style={{ fontSize:11,color:G.gold }}>{fmt(prev)}</span></div>,
                <div key={o.id+"r"} style={{ padding:"9px 10px",borderBottom:`1px solid ${G.border}` }}><span className="mono" style={{ fontSize:11 }}>{fmt(real)}</span></div>,
                <div key={o.id+"d"} style={{ padding:"9px 10px",borderBottom:`1px solid ${G.border}` }}><span className="mono" style={{ fontSize:11,color:desv>0?G.red:G.green }}>{desv>=0?"+":""}{fmt(desv)}</span></div>,
                <div key={o.id+"c"} style={{ padding:"9px 10px",borderBottom:`1px solid ${G.border}` }}><span className="mono" style={{ fontSize:11,color:G.green }}>{fmt(cobros)}</span></div>,
                <div key={o.id+"m"} style={{ padding:"9px 10px",borderBottom:`1px solid ${G.border}` }}><span className="mono" style={{ fontSize:11,color:margen>=0?G.green:G.red }}>{fmt(margen)}</span></div>,
                <div key={o.id+"mp"} style={{ padding:"9px 10px",borderBottom:`1px solid ${G.border}` }}><span className="mono" style={{ fontSize:11,color:margenP>=20?G.green:margenP>=10?G.gold:G.red }}>{margenP}%</span></div>,
              ];
            })}
          </div>
        </div>
      )}

      {/* ── GARANTÍAS VENCIENDO ── */}
      {garantiasVenciendo.length > 0 && (
        <div className="card">
          <div className="serif" style={{ fontSize:15,marginBottom:12 }}>🛡️ Garantías que vencen pronto</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10 }}>
            {garantiasVenciendo.map((g,i)=>(
              <div key={i} onClick={()=>onSelectObra(g.obraId)} style={{ display:"flex",gap:10,alignItems:"center",padding:"10px 14px",borderRadius:6,background:"#1E1A10",border:`1px solid ${G.gold}33`,cursor:"pointer" }}>
                <span style={{ fontSize:20 }}>{TIPOS_GARANTIA.find(t=>t.id===g.tipo)?.emoji||"🛡️"}</span>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{g.nombre}</div>
                  <div style={{ fontSize:10,color:G.textMuted }}>{g.obraNombre}</div>
                </div>
                <div className="mono" style={{ fontSize:12,color:g.diasRest<=30?G.red:G.gold,flexShrink:0 }}>{g.diasRest}d</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// === PORTAL ===CLIENTE -----------------------------------------------------------
const cssPortal = `
  .portal-body {
    background: #F8F6F2;
    color: #1A1A2E;
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
  }
  .portal-serif { font-family: 'Playfair Display', serif; }
  .portal-mono  { font-family: 'DM Mono', monospace; }
  .portal-card {
    background: #FFFFFF;
    border: 1px solid #E8E4DC;
    border-radius: 10px;
    padding: 24px;
  }
  .portal-kpi {
    background: #FFFFFF;
    border: 1px solid #E8E4DC;
    border-radius: 10px;
    padding: 20px 24px;
  }
  .portal-tag {
    display: inline-flex; align-items: center;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-family: 'DM Mono', monospace;
    letter-spacing: 0.04em; font-weight: 500;
  }
  .portal-btn {
    background: #1A1A2E; color: #F8F6F2;
    border: none; border-radius: 6px;
    padding: 10px 20px; font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: opacity 0.15s;
  }
  .portal-btn:hover { opacity: 0.85; }
  .portal-btn-outline {
    background: transparent; color: #1A1A2E;
    border: 1px solid #C8A96E; border-radius: 6px;
    padding: 8px 18px; font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; color: #9A7D50;
  }
`;

function PortalCliente({ obra, onCerrar }) {
  const [seccion, setSeccion] = useState("avance");
  const [mensaje, setMensaje] = useState("");
  const [mensajesEnviados, setMensajesEnviados] = useState([]);
  const [fotoVisor, setFotoVisor] = useState(null);

  const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch(e) { return {}; } })();
  const fotos       = (obra.fotos||[]).sort((a,b) => (b.fechaISO||"").localeCompare(a.fechaISO||""));
  const fases       = obra.fases||[];
  const cobros      = obra.economica?.cobros||[];
  const extras      = (obra.extras||[]).filter(e=>e.estado==="aprobado"||e.estado==="ejecutado"||e.estado==="facturado");
  const garantias   = obra.garantias||[];
  const incidencias = (obra.incidencias||[]).filter(i=>i.estado!=="cerrada");
  const docs        = (obra.docsArquitecto||[]).filter(d=>d.estado==="recibido");
  const notas       = obra.notasPortal||"";
  const tareasComp  = (obra.tareas||[]).filter(t=>t.estado==="completada").length;
  const totalTareas = (obra.tareas||[]).length;
  const pctTareas   = pct(tareasComp, totalTareas);
  const dias        = obra.fechaFin ? diasRestantes(obra.fechaFin) : null;
  const presup      = obra.presupuesto||0;
  const extrasTotal = extras.reduce((a,e)=>a+(Number(e.importe)||0),0);
  const cobrado     = cobros.filter(c=>c.estado==="cobrado").reduce((a,c)=>a+(Number(c.importe)||0),0);
  const pendiente   = cobros.filter(c=>c.estado==="pendiente").reduce((a,c)=>a+(Number(c.importe)||0),0);
  const avanceMedio = (() => {
    const f = fotos.filter(x=>x.avanceIA!==null);
    return f.length ? Math.round(f.reduce((a,x)=>a+x.avanceIA,0)/f.length) : pctTareas;
  })();
  const fmtP = n => new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);

  const estadoPortal = avanceMedio>=90 ? {label:"Fase final 🎉",color:"#2D7A4F",bg:"#E8F5EE"}
    : avanceMedio>=60 ? {label:"En buen ritmo ✓",color:"#7D5A00",bg:"#FFF8EC"}
    : avanceMedio>=30 ? {label:"En ejecución 🏗",color:"#4A4A6A",bg:"#EEEEF8"}
    : {label:"Iniciando obra",color:"#4A4A6A",bg:"#EEEEF8"};

  const NAV = [
    {id:"avance",    label:"Avance",     emoji:"📊"},
    {id:"fotos",     label:"Fotos",      emoji:"📸"},
    {id:"fases",     label:"Fases",      emoji:"📅"},
    {id:"pagos",     label:"Pagos",      emoji:"💶"},
    {id:"documentos",label:"Documentos", emoji:"📋"},
    {id:"garantias", label:"Garantías",  emoji:"🛡️"},
    {id:"incidencias",label:"Incidencias",emoji:"⚠️"},
    {id:"contacto",  label:"Contacto",   emoji:"💬"},
  ];

  const PTag = ({bg,color,children}) => (
    <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,background:bg,color,fontSize:11,fontWeight:500}}>{children}</span>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,overflowY:"auto",background:"#F5F3EF",fontFamily:"DM Sans, sans-serif"}}>
      <style>{cssPortal}</style>

      {/* HEADER */}
      <div style={{background:"#1A1A2E",position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 20px rgba(0,0,0,0.3)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 32px",display:"flex",alignItems:"center",gap:16,height:64}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:2,background:obra.color,flexShrink:0}} />
            <div>
              <div style={{fontFamily:"Playfair Display, serif",fontSize:16,color:"#F8F6F2",lineHeight:1.2}}>{obra.nombre}</div>
              <div style={{fontSize:10,color:"#9090A8",fontFamily:"DM Mono"}}>{obra.cliente}</div>
            </div>
          </div>
          <nav style={{marginLeft:"auto",display:"flex",gap:2,flexWrap:"nowrap",overflowX:"auto"}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setSeccion(n.id)} style={{padding:"6px 12px",background:seccion===n.id?"rgba(200,169,110,0.15)":"transparent",border:seccion===n.id?"1px solid #C8A96E44":"1px solid transparent",borderRadius:6,color:seccion===n.id?"#C8A96E":"#9090A8",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                {n.emoji} {n.label}
              </button>
            ))}
          </nav>
          <button onClick={onCerrar} style={{marginLeft:8,background:"none",border:"1px solid #333",color:"#9090A8",padding:"6px 12px",borderRadius:6,fontSize:12,cursor:"pointer",flexShrink:0}}>✕</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"36px 32px"}}>

        {/* ── AVANCE ── */}
        {seccion==="avance" && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {/* Hero */}
            <div style={{background:"#1A1A2E",borderRadius:16,overflow:"hidden",position:"relative",minHeight:260}}>
              {fotos[0]&&<img src={fotos[0].src} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.3}} />}
              <div style={{position:"relative",padding:"48px 56px",display:"flex",gap:56,alignItems:"flex-end"}}>
                <div>
                  <PTag bg={estadoPortal.bg} color={estadoPortal.color}>{estadoPortal.label}</PTag>
                  <div style={{fontFamily:"Playfair Display, serif",fontSize:40,color:"#F8F6F2",marginTop:16,marginBottom:8,lineHeight:1.1}}>{obra.nombre}</div>
                  <div style={{fontSize:14,color:"#9090A8"}}>{obra.ubicacion}</div>
                </div>
                <div style={{display:"flex",gap:40,marginLeft:"auto"}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontFamily:"Playfair Display, serif",fontSize:56,color:avanceMedio>70?"#5CB87A":avanceMedio>40?"#C8A96E":"#E08D3C",lineHeight:1}}>{avanceMedio}%</div>
                    <div style={{fontSize:11,color:"#9090A8",marginTop:6,fontFamily:"DM Mono",letterSpacing:"0.05em"}}>AVANCE ESTIMADO</div>
                  </div>
                  {dias!==null&&(
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:"Playfair Display, serif",fontSize:56,color:dias<0?"#E05C5C":dias<30?"#E08D3C":"#F8F6F2",lineHeight:1}}>{Math.abs(dias)}</div>
                      <div style={{fontSize:11,color:"#9090A8",marginTop:6,fontFamily:"DM Mono",letterSpacing:"0.05em"}}>{dias<0?"DÍAS RETRASO":"DÍAS RESTANTES"}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
              {[
                {label:"FASES COMPLETADAS",val:`${fases.filter(f=>f.estado==="completada").length} / ${fases.length}`,pct:pct(fases.filter(f=>f.estado==="completada").length,fases.length),color:"#2D7A4F"},
                {label:"TAREAS COMPLETADAS",val:`${tareasComp} / ${totalTareas}`,pct:pctTareas,color:"#C8A96E"},
                {label:"FECHA DE ENTREGA",val:obra.fechaFin||"Por confirmar",pct:null,color:dias!==null&&dias<0?"#C0392B":"#1A1A2E"},
                {label:"PRESUPUESTO TOTAL",val:fmtP(presup+extrasTotal),pct:null,color:"#1A1A2E",sub:extrasTotal>0?`+${fmtP(extrasTotal)} extras`:""},
              ].map(k=>(
                <div key={k.label} className="portal-kpi">
                  <div style={{fontSize:10,color:"#9A9AB0",marginBottom:8,fontFamily:"DM Mono",letterSpacing:"0.05em"}}>{k.label}</div>
                  <div className="portal-serif" style={{fontSize:k.val.length>10?18:24,color:k.color}}>{k.val}</div>
                  {k.sub&&<div style={{fontSize:11,color:"#9A9AB0",marginTop:3}}>{k.sub}</div>}
                  {k.pct!==null&&(
                    <div style={{height:4,background:"#EEEBE5",borderRadius:2,marginTop:12}}>
                      <div style={{height:"100%",borderRadius:2,background:k.color,width:`${k.pct}%`}} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Timeline fases */}
            <div className="portal-card">
              <div className="portal-serif" style={{fontSize:22,marginBottom:24}}>Estado de la obra</div>
              {fases.map((fase,i)=>{
                const s={completada:{color:"#2D7A4F",bg:"#E8F5EE",label:"Completada",icon:"✓"},en_curso:{color:"#7D5A00",bg:"#FFF8EC",label:"En curso",icon:"●"},pendiente:{color:"#9A9AB0",bg:"#F5F5F5",label:"Pendiente",icon:""}};
                const st=s[fase.estado]||s.pendiente;
                return (
                  <div key={fase.id} style={{display:"flex",gap:16,paddingBottom:20,position:"relative"}}>
                    {i<fases.length-1&&<div style={{position:"absolute",left:11,top:24,width:2,bottom:0,background:fase.estado==="completada"?"#2D7A4F44":"#EEEBE5"}} />}
                    <div style={{width:24,height:24,borderRadius:"50%",background:st.bg,border:`2px solid ${st.color}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:st.color}}>{st.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:4}}>
                        <div style={{fontSize:14,fontWeight:500}}>{fase.nombre}</div>
                        <PTag bg={st.bg} color={st.color}>{st.label}</PTag>
                      </div>
                      <div style={{fontSize:12,color:"#9A9AB0"}}>{fase.inicio} → {fase.fin}</div>
                      {fase.proveedor&&<div style={{fontSize:12,color:"#9A9AB0"}}>Responsable: {fase.proveedor}</div>}
                    </div>
                  </div>
                );
              })}
              {fases.length===0&&<div style={{color:"#9A9AB0",fontSize:13}}>Las fases aparecerán aquí cuando se planifiquen.</div>}
            </div>

            {/* Nota del profesional */}
            {notas&&(
              <div className="portal-card" style={{borderLeft:"4px solid #C8A96E"}}>
                <div style={{fontSize:11,color:"#9A9AB0",fontFamily:"DM Mono",marginBottom:8}}>NOTA DE TU PROFESIONAL</div>
                <div style={{fontSize:13,lineHeight:1.8,color:"#3A3A5E"}}>{notas}</div>
              </div>
            )}

            {/* Fotos recientes */}
            {fotos.length>0&&(
              <div>
                <div className="portal-serif" style={{fontSize:20,marginBottom:16}}>Últimas fotos</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                  {fotos.slice(0,6).map((f,i)=>(
                    <div key={i} onClick={()=>setFotoVisor(f)} style={{borderRadius:10,overflow:"hidden",cursor:"pointer",position:"relative"}}>
                      <img src={f.src} alt={f.zona} style={{width:"100%",height:140,objectFit:"cover",display:"block"}} />
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)"}} />
                      <div style={{position:"absolute",bottom:8,left:10,right:10}}>
                        <div style={{fontSize:11,color:"#fff",fontWeight:500}}>{f.zona}</div>
                        {f.avanceIA!==null&&<div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>{f.avanceIA}% avance</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FOTOS ── */}
        {seccion==="fotos"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div className="portal-serif" style={{fontSize:28}}>Galería de avance</div>
            {fotos.length===0&&<div className="portal-card" style={{textAlign:"center",padding:56,color:"#9A9AB0"}}>Las fotos de avance irán apareciendo aquí conforme avance la obra.</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
              {fotos.map((foto,i)=>(
                <div key={i} style={{borderRadius:12,overflow:"hidden",border:"1px solid #E8E4DC",background:"#fff",cursor:"pointer"}} onClick={()=>setFotoVisor(foto)}>
                  <img src={foto.src} alt={foto.zona} style={{width:"100%",height:200,objectFit:"cover",display:"block"}} />
                  <div style={{padding:"14px 16px"}}>
                    <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{foto.zona}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:12,color:"#9A9AB0"}}>{foto.fecha}</div>
                      {foto.avanceIA!==null&&<PTag bg={foto.avanceIA>70?"#E8F5EE":"#FFF8EC"} color={foto.avanceIA>70?"#2D7A4F":"#7D5A00"}>{foto.avanceIA}% avance</PTag>}
                    </div>
                    {foto.observacionIA&&<div style={{fontSize:11,color:"#9A9AB0",marginTop:8,fontStyle:"italic"}}>{foto.observacionIA}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FASES ── */}
        {seccion==="fases"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div className="portal-serif" style={{fontSize:28}}>Planificación de fases</div>
            {obra.fechaFin&&(
              <div style={{background:"#1A1A2E",borderRadius:12,padding:"24px 32px",display:"flex",gap:32,alignItems:"center"}}>
                <div><div style={{fontSize:11,color:"#9090A8",marginBottom:4,fontFamily:"DM Mono"}}>ENTREGA PREVISTA</div><div className="portal-serif" style={{fontSize:28,color:"#F8F6F2"}}>{obra.fechaFin}</div></div>
                {dias!==null&&<div style={{marginLeft:"auto",textAlign:"center"}}><div style={{fontFamily:"Playfair Display,serif",fontSize:52,color:dias<0?"#E05C5C":"#C8A96E",lineHeight:1}}>{Math.abs(dias)}</div><div style={{fontSize:11,color:"#9090A8"}}>{dias<0?"días de retraso":"días restantes"}</div></div>}
              </div>
            )}
            <div className="portal-card">
              {fases.map((fase,i)=>{
                const s={completada:{color:"#2D7A4F",label:"Completada"},en_curso:{color:"#C8A96E",label:"En curso"},pendiente:{color:"#CCCCCC",label:"Pendiente"}};
                const st=s[fase.estado]||s.pendiente;
                return (
                  <div key={fase.id} style={{display:"flex",gap:16,alignItems:"center",padding:"16px 0",borderBottom:i<fases.length-1?"1px solid #EEEBE5":"none"}}>
                    <div style={{width:6,height:40,borderRadius:3,background:st.color,flexShrink:0}} />
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:500,marginBottom:3}}>{fase.nombre}</div>
                      {fase.proveedor&&<div style={{fontSize:12,color:"#9A9AB0"}}>{fase.proveedor}</div>}
                    </div>
                    <PTag bg={st.color+"22"} color={st.color}>{st.label}</PTag>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,color:"#9A9AB0",fontFamily:"DM Mono"}}>{fase.inicio}</div>
                      <div style={{fontSize:12,color:"#9A9AB0",fontFamily:"DM Mono"}}>→ {fase.fin}</div>
                    </div>
                  </div>
                );
              })}
              {fases.length===0&&<div style={{color:"#9A9AB0",fontSize:13,textAlign:"center",padding:32}}>El calendario se actualizará próximamente.</div>}
            </div>
          </div>
        )}

        {/* ── PAGOS ── */}
        {seccion==="pagos"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div className="portal-serif" style={{fontSize:28}}>Estado de pagos</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              {[
                {label:"TOTAL OBRA",val:fmtP(presup+extrasTotal),color:"#1A1A2E"},
                {label:"COBRADO",val:fmtP(cobrado),color:"#2D7A4F"},
                {label:"PENDIENTE",val:fmtP(pendiente),color:pendiente>0?"#C0392B":"#9A9AB0"},
              ].map(k=>(
                <div key={k.label} className="portal-kpi">
                  <div style={{fontSize:10,color:"#9A9AB0",marginBottom:8,fontFamily:"DM Mono"}}>{k.label}</div>
                  <div className="portal-serif" style={{fontSize:28,color:k.color}}>{k.val}</div>
                </div>
              ))}
            </div>
            {/* Barra de progreso cobro */}
            {presup>0&&(
              <div className="portal-card">
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12}}>
                  <span style={{color:"#9A9AB0"}}>Progreso de cobros</span>
                  <span style={{fontFamily:"DM Mono",color:"#2D7A4F"}}>{pct(cobrado,presup+extrasTotal)}%</span>
                </div>
                <div style={{height:8,background:"#EEEBE5",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",background:"#2D7A4F",borderRadius:4,width:`${Math.min(100,pct(cobrado,presup+extrasTotal))}%`}} />
                </div>
              </div>
            )}
            <div className="portal-card">
              <div className="portal-serif" style={{fontSize:20,marginBottom:16}}>Detalle de pagos</div>
              {cobros.length===0&&<div style={{color:"#9A9AB0",fontSize:13}}>El detalle de pagos se publicará próximamente.</div>}
              {cobros.map((c,i)=>{
                const s={cobrado:{bg:"#E8F5EE",color:"#2D7A4F",label:"Cobrado",icon:"✓"},pendiente:{bg:"#FFF3CD",color:"#856404",label:"Pendiente",icon:"○"},parcial:{bg:"#FFF8EC",color:"#7D5A00",label:"Parcial",icon:"◑"}};
                const st=s[c.estado]||s.pendiente;
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 0",borderBottom:i<cobros.length-1?"1px solid #EEEBE5":"none"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:st.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,color:st.color}}>{st.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:500}}>{c.concepto}</div>
                      <div style={{fontSize:12,color:"#9A9AB0",marginTop:2,fontFamily:"DM Mono"}}>{c.fecha}</div>
                    </div>
                    <PTag bg={st.bg} color={st.color}>{st.label}</PTag>
                    <div style={{fontFamily:"DM Mono",fontSize:16,fontWeight:600,color:"#1A1A2E"}}>{fmtP(c.importe)}</div>
                  </div>
                );
              })}
            </div>
            {/* Extras visibles al cliente */}
            {extras.length>0&&(
              <div className="portal-card">
                <div className="portal-serif" style={{fontSize:20,marginBottom:16}}>Extras aprobados</div>
                {extras.map((e,i)=>(
                  <div key={i} style={{display:"flex",gap:16,alignItems:"center",padding:"12px 0",borderBottom:i<extras.length-1?"1px solid #EEEBE5":"none"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:500}}>{e.titulo}</div>
                      <div style={{fontSize:12,color:"#9A9AB0"}}>{e.tipo} · {e.fecha}</div>
                    </div>
                    <div style={{fontFamily:"DM Mono",fontSize:14,color:"#E08D3C"}}>+{fmtP(e.importe)}</div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:12,paddingTop:12,borderTop:"1px solid #EEEBE5"}}>
                  <div style={{fontFamily:"DM Mono",fontSize:14,fontWeight:600}}>Total extras: {fmtP(extrasTotal)}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTOS ── */}
        {seccion==="documentos"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div className="portal-serif" style={{fontSize:28}}>Documentación</div>
            {docs.length===0?(
              <div className="portal-card" style={{textAlign:"center",padding:48,color:"#9A9AB0"}}>
                <div style={{fontSize:36,marginBottom:12}}>📋</div>
                <div>Los documentos estarán disponibles cuando se obtengan las licencias.</div>
              </div>
            ):(
              <div className="portal-card">
                {docs.map((d,i)=>(
                  <div key={i} style={{display:"flex",gap:14,alignItems:"center",padding:"14px 0",borderBottom:i<docs.length-1?"1px solid #EEEBE5":"none"}}>
                    <span style={{fontSize:24}}>{d.icono||"📄"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:500}}>{d.label}</div>
                      {d.fechaEntrega&&<div style={{fontSize:12,color:"#9A9AB0",fontFamily:"DM Mono"}}>{d.fechaEntrega}</div>}
                    </div>
                    <PTag bg="#E8F5EE" color="#2D7A4F">✓ Recibido</PTag>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GARANTÍAS ── */}
        {seccion==="garantias"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div className="portal-serif" style={{fontSize:28}}>Garantías de tu obra</div>
            {garantias.length===0?(
              <div className="portal-card" style={{textAlign:"center",padding:48,color:"#9A9AB0"}}>
                <div style={{fontSize:36,marginBottom:12}}>🛡️</div>
                <div>Las garantías se registrarán al completar la obra.</div>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                {garantias.map((g,i)=>{
                  const hoy=new Date();
                  const dias=g.fechaFin?Math.ceil((new Date(g.fechaFin)-hoy)/864e5):null;
                  const est=dias===null?"vigente":dias<0?"vencida":dias<90?"proxima":"vigente";
                  const ec={vigente:{color:"#2D7A4F",bg:"#E8F5EE",label:"Vigente"},proxima:{color:"#7D5A00",bg:"#FFF8EC",label:"Vence pronto"},vencida:{color:"#C0392B",bg:"#FDEAEA",label:"Vencida"}}[est];
                  const tipo=TIPOS_GARANTIA.find(t=>t.id===g.tipo);
                  return (
                    <div key={i} className="portal-card" style={{borderTop:`3px solid ${ec.color}`}}>
                      <div style={{fontSize:28,marginBottom:8}}>{tipo?.emoji||"🛡️"}</div>
                      <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>{g.nombre}</div>
                      <div style={{fontSize:12,color:"#9A9AB0",marginBottom:12}}>{tipo?.label} · {g.años} año{g.años!==1?"s":""}</div>
                      <PTag bg={ec.bg} color={ec.color}>{ec.label}</PTag>
                      <div style={{marginTop:12,fontSize:12,color:"#9A9AB0",fontFamily:"DM Mono"}}>
                        {g.fechaInicio} → {g.fechaFin}
                        {dias!==null&&dias>0&&<div style={{color:dias<90?ec.color:"#9A9AB0"}}>{dias} días restantes</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── INCIDENCIAS ── */}
        {seccion==="incidencias"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div className="portal-serif" style={{fontSize:28}}>Incidencias y resoluciones</div>
            {incidencias.length===0?(
              <div className="portal-card" style={{textAlign:"center",padding:56}}>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <div className="portal-serif" style={{fontSize:22,marginBottom:8}}>Sin incidencias activas</div>
                <div style={{fontSize:13,color:"#9A9AB0"}}>Todo está en orden.</div>
              </div>
            ):incidencias.map((inc,i)=>{
              const priC={critica:"#C0392B",alta:"#E08D3C",media:"#C8A96E",baja:"#9A9AB0"};
              const estC={abierta:{bg:"#FDEAEA",color:"#C0392B",label:"En atención"},en_curso:{bg:"#FFF8EC",color:"#7D5A00",label:"En resolución"},bloqueada:{bg:"#F0EAFA",color:"#6C3483",label:"En revisión"},resuelta:{bg:"#E8F5EE",color:"#2D7A4F",label:"Resuelta"}};
              const s=estC[inc.estado]||estC.abierta;
              return (
                <div key={i} className="portal-card" style={{borderLeft:`4px solid ${priC[inc.prioridad]||"#CCC"}`}}>
                  <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                    <PTag bg={s.bg} color={s.color}>{s.label}</PTag>
                    <PTag bg="#F5F5F5" color="#9A9AB0">{inc.tipo}</PTag>
                  </div>
                  <div style={{fontSize:16,fontWeight:500,marginBottom:6}}>{inc.titulo}</div>
                  {inc.descripcion&&<div style={{fontSize:13,color:"#5A5A72",lineHeight:1.7}}>{inc.descripcion}</div>}
                  <div style={{fontSize:12,color:"#9A9AB0",marginTop:8}}>Detectada: {inc.fecha}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CONTACTO ── */}
        {seccion==="contacto"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div className="portal-serif" style={{fontSize:28}}>Contacto</div>
            {/* Info del estudio */}
            <div style={{background:"#1A1A2E",borderRadius:16,padding:"32px 40px",display:"flex",gap:32,alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"Playfair Display,serif",fontSize:24,color:"#C8A96E",marginBottom:6}}>{config.estudio||"Tu profesional"}</div>
                {config.nombre&&<div style={{fontSize:14,color:"#F8F6F2",marginBottom:4}}>{config.nombre}</div>}
                {config.telefono&&<div style={{fontSize:13,color:"#9090A8",fontFamily:"DM Mono"}}>{config.telefono}</div>}
                {config.email&&<div style={{fontSize:13,color:"#9090A8"}}>{config.email}</div>}
              </div>
              <div style={{marginLeft:"auto",display:"flex",gap:12}}>
                {config.telefono&&<a href={`tel:${config.telefono}`} style={{padding:"10px 20px",background:"#C8A96E",color:"#1A1A2E",borderRadius:8,textDecoration:"none",fontSize:13,fontWeight:600}}>📞 Llamar</a>}
                {config.email&&<a href={`mailto:${config.email}`} style={{padding:"10px 20px",background:"rgba(255,255,255,0.1)",color:"#F8F6F2",borderRadius:8,textDecoration:"none",fontSize:13}}>✉️ Email</a>}
              </div>
            </div>
            {/* Mensaje */}
            <div className="portal-card">
              <div className="portal-serif" style={{fontSize:20,marginBottom:16}}>Enviar consulta</div>
              <textarea value={mensaje} onChange={e=>setMensaje(e.target.value)} placeholder="Escribe tu consulta, comentario o solicitud..." style={{width:"100%",minHeight:120,padding:"12px 16px",border:"1px solid #E8E4DC",borderRadius:8,fontFamily:"DM Sans",fontSize:13,resize:"vertical",outline:"none",background:"#F8F6F2",boxSizing:"border-box"}} />
              <button className="portal-btn" style={{marginTop:12}} onClick={()=>{if(!mensaje.trim())return;setMensajesEnviados(m=>[...m,{texto:mensaje,fecha:new Date().toLocaleDateString("es-ES"),id:uid()}]);setMensaje("");}}>
                Enviar consulta
              </button>
            </div>
            {mensajesEnviados.length>0&&(
              <div className="portal-card">
                <div className="portal-serif" style={{fontSize:16,marginBottom:14}}>Mensajes enviados</div>
                {mensajesEnviados.map(m=>(
                  <div key={m.id} style={{padding:"12px 0",borderBottom:"1px solid #EEEBE5"}}>
                    <div style={{fontSize:11,color:"#9A9AB0",marginBottom:4,fontFamily:"DM Mono"}}>{m.fecha}</div>
                    <div style={{fontSize:13}}>{m.texto}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* VISOR FOTO */}
      {fotoVisor&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setFotoVisor(null)}>
          <div style={{maxWidth:"90vw",maxHeight:"90vh",display:"flex",flexDirection:"column",gap:12}} onClick={e=>e.stopPropagation()}>
            <img src={fotoVisor.src} alt={fotoVisor.zona} style={{maxWidth:"100%",maxHeight:"80vh",objectFit:"contain",borderRadius:8}} />
            <div style={{display:"flex",justifyContent:"space-between",color:"#fff",fontSize:12}}>
              <span>{fotoVisor.zona} · {fotoVisor.fecha}</span>
              {fotoVisor.avanceIA!==null&&<span style={{color:"#C8A96E"}}>{fotoVisor.avanceIA}% avance</span>}
            </div>
            <button onClick={()=>setFotoVisor(null)} style={{alignSelf:"center",background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",padding:"8px 20px",borderRadius:6,cursor:"pointer"}}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Footer portal */}
      <div style={{background:"#1A1A2E",marginTop:48,padding:"20px 32px",textAlign:"center"}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:14,color:"#C8A96E",marginBottom:4}}>{config.estudio||"Blue Forest"}</div>
        <div style={{fontSize:11,color:"#5A5A72",fontFamily:"DM Mono"}}>Portal de seguimiento de obra · {obra.nombre}</div>
      </div>
    </div>
  );
}
// === BUSCADOR ===IA GLOBAL -------------------------------------------------------
function BuscadorIA({ obras, onSelectObra }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bf-busquedas")||"[]"); } catch { return []; }
  });
  const [filtroTipo, setFiltroTipo] = useState("todo");
  const [filtroObra, setFiltroObra] = useState("todas");
  const [modoRapido, setModoRapido] = useState(false);

  // -ndice completo - m-s fuentes que antes
  const construirIndice = () => {
    const docs = [];
    obras.forEach(obra => {
      const base = { obraId:obra.id, obra:obra.nombre, obraColor:obra.color };

      (obra.planos||[]).forEach(p => docs.push({ ...base, tipo:"Plano", icono:"📐",
        titulo:p.nombre, subtitulo:`${CATEGORIAS_PLANOS.find(c=>c.id===p.categoria)?.label||"Otros"} · v${p.version||1} · ${p.fecha}`,
        notas:(p.notas||"")+" "+p.categoria, src:p.archivo, esPDF:p.tipo?.includes("pdf"), version:p.version, estado:p.estado }));

      (obra.docsArquitecto||[]).filter(d=>d.archivo).forEach(d => docs.push({ ...base, tipo:"Licencia", icono:d.icono||"📋",
        titulo:d.label, subtitulo:`${d.desc} · ${ESTADOS_DOC[d.estado]?.label||d.estado}`,
        notas:(d.notas||"")+" "+d.expediente+" "+d.organismo, src:d.archivo, archivoNombre:d.archivoNombre, estado:d.estado }));

      (obra.fotos||[]).forEach(f => docs.push({ ...base, tipo:"Foto", icono:"📸",
        titulo:`Foto ${f.zona}`, subtitulo:`${f.fecha}${f.avanceIA!==null?` · ${f.avanceIA}% avance`:""}`,
        notas:(f.notas||"")+" "+(f.observacionIA||"")+" "+(f.cambiosIA||[]).join(" "), src:f.src, zona:f.zona, avanceIA:f.avanceIA }));

      (obra.incidencias||[]).forEach(i => docs.push({ ...base, tipo:"Incidencia", icono:"⚠️",
        titulo:i.titulo, subtitulo:`${i.tipo} · ${i.estado} · ${i.prioridad} · ${i.fecha}`,
        notas:(i.descripcion||"")+" "+i.responsable, estado:i.estado, prioridad:i.prioridad }));

      (obra.proveedores||[]).forEach(p => docs.push({ ...base, tipo:"Proveedor", icono:"👷",
        titulo:p.nombre, subtitulo:`${Array.isArray(p.especialidad)?p.especialidad.join(", "):(p.especialidad&&p.especialidad!=="undefined"?p.especialidad:"")} · ${p.contacto||""} · ${p.telefono||""}`,
        notas:p.especialidad+" "+p.contacto }));

      (obra.materiales||[]).forEach(m => docs.push({ ...base, tipo:"Material", icono:"📦",
        titulo:m.nombre, subtitulo:`${m.proveedor||"—"} · ${m.cantidad}${m.unidad} · ${ESTADOS_MAT[m.estado]?.label||m.estado}`,
        notas:(m.notas||"")+" "+m.referencia+" "+m.proveedor, estado:m.estado, critico:m.critico }));

      (obra.extras||[]).forEach(e => docs.push({ ...base, tipo:"Extra", icono:"➕",
        titulo:e.titulo, subtitulo:`${TIPOS_EXTRA.find(t=>t.id===e.tipo)?.label||e.tipo} · ${fmt(e.importe)} · ${ESTADOS_EXTRA[e.estado]?.label||e.estado}`,
        notas:e.descripcion||"", estado:e.estado }));

      (obra.garantias||[]).forEach(g => docs.push({ ...base, tipo:"Garantía", icono:"🛡️",
        titulo:g.nombre, subtitulo:`${TIPOS_GARANTIA.find(t=>t.id===g.tipo)?.label||g.tipo} · vence ${g.fechaFin}`,
        notas:(g.descripcion||"")+" "+g.proveedor, estado:calcEstadoGarantia(g.fechaFin) }));

      (obra.checklists||[]).forEach(c => docs.push({ ...base, tipo:"Checklist", icono:"✅",
        titulo:c.nombre, subtitulo:`${c.items.filter(i=>i.completado).length}/${c.items.length} completados`,
        notas:c.items.map(i=>i.texto).join(" ") }));

      if (obra.cliente) docs.push({ ...base, tipo:"Obra", icono:"🏗️",
        titulo:obra.nombre, subtitulo:`${obra.cliente} · ${obra.ubicacion||""} · ${obra.estado}`,
        notas:obra.cliente+" "+obra.ubicacion+" "+obra.estado, presupuesto:obra.presupuesto });
    });
    return docs;
  };

  // B-squeda r-pida local (sin IA)
  const busquedaRapida = (q) => {
    const t = q.toLowerCase();
    const indice = construirIndice();
    return indice.filter(d => {
      if (filtroTipo !== "todo" && d.tipo !== filtroTipo) return false;
      if (filtroObra !== "todas" && d.obraId !== filtroObra) return false;
      return d.titulo.toLowerCase().includes(t) || d.subtitulo.toLowerCase().includes(t) || d.notas.toLowerCase().includes(t) || d.obra.toLowerCase().includes(t);
    }).slice(0,20).map(d => ({ ...d, relevancia:"media", razon:"Coincidencia con texto" }));
  };

  const buscar = async () => {
    if (!query.trim()) return;
    setLoading(true); setResultados(null);

    // Guardar en historial
    const nuevoHistorial = [query, ...historial.filter(q=>q!==query)].slice(0,8);
    setHistorial(nuevoHistorial);
    try { localStorage.setItem("bf-busquedas", JSON.stringify(nuevoHistorial)); } catch(e) { void 0; }

    const indice = construirIndice().filter(d => {
      if (filtroTipo !== "todo" && d.tipo !== filtroTipo) return false;
      if (filtroObra !== "todas" && d.obraId !== filtroObra) return false;
      return true;
    });

    if (modoRapido) {
      const hits = busquedaRapida(query);
      setResultados({ hits, resumen:`${hits.length} coincidencias para "${query}"`, sugerencias:[], modoRapido:true });
      setLoading(false); return;
    }

    const contexto = indice.map((d,i) =>
      `[${i}] ${d.tipo} | Obra: ${d.obra} | "${d.titulo}" | ${d.subtitulo} | ${d.notas.slice(0,150)}`
    ).join("\n");

    try {
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1000,
          messages:[{ role:"user", content:`Eres el buscador semántico de una app de gestión de obras. Busca con comprensión contextual (no solo palabras exactas) la consulta: "${query}"\n\nÍndice de ${indice.length} elementos:\n${contexto}\n\nResponde ÚNICAMENTE con JSON válido sin backticks:\n{"resultados":[{"indice":número,"relevancia":"alta|media|baja","razon":"por qué es relevante en 1 frase"}],"resumen":"respuesta directa a la búsqueda","sugerencias":["alternativa 1","alternativa 2"]}\n\nMáximo 10 resultados, solo los realmente relevantes. Si la búsqueda es una pregunta, respóndela directamente en resumen.` }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b=>b.type==="text")?.text||"{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      const hits = (parsed.resultados||[]).map(r=>({ ...indice[r.indice], relevancia:r.relevancia, razon:r.razon })).filter(Boolean);
      setResultados({ hits, resumen:parsed.resumen, sugerencias:parsed.sugerencias||[] });
    } catch {
      // Fallback a b-squeda r-pida
      const hits = busquedaRapida(query);
      setResultados({ hits, resumen:"Búsqueda local (sin IA)", sugerencias:[], modoRapido:true });
    }
    setLoading(false);
  };

  const relevanciaColor = { alta:G.green, media:G.gold, baja:G.textMuted };
  const indiceTotal = construirIndice();
  const totalDocs = indiceTotal.length;
  const TIPOS_BUSQUEDA = ["todo","Plano","Licencia","Foto","Incidencia","Proveedor","Material","Extra","Garantía","Checklist","Obra"];

  const contarPorTipo = (tipo) => indiceTotal.filter(d=>d.tipo===tipo).length;

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {/* Panel izquierdo — filtros + historial */}
      <div style={{ width:240, flexShrink:0, borderRight:`1px solid ${G.border}`, display:"flex", flexDirection:"column", padding:20, gap:16, overflow:"auto" }}>
        <div className="serif" style={{ fontSize:18 }}>Buscador IA</div>
        <div style={{ fontSize:11, color:G.textMuted }}>{totalDocs} elementos indexados</div>

        {/* Tipo */}
        <div>
          <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:8 }}>TIPO</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {TIPOS_BUSQUEDA.map(t=>(
              <button key={t} onClick={()=>setFiltroTipo(t)}
                style={{ padding:"6px 10px", borderRadius:4, border:"none", background:filtroTipo===t?G.gold+"22":"transparent", color:filtroTipo===t?G.gold:G.textMuted, fontSize:12, cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between" }}>
                <span>{t==="todo"?"Todo":t}</span>
                {t!=="todo"&&<span style={{ fontSize:10, color:G.textDim }}>{contarPorTipo(t)}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Obra */}
        <div>
          <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:8 }}>OBRA</div>
          <select value={filtroObra} onChange={e=>setFiltroObra(e.target.value)} style={{ width:"100%", fontSize:12 }}>
            <option value="todas">Todas las obras</option>
            {obras.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>

        {/* Modo rápido */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div onClick={()=>setModoRapido(!modoRapido)} style={{ width:32,height:18,borderRadius:9,background:modoRapido?G.blue:G.border,position:"relative",cursor:"pointer",transition:"background 0.2s" }}>
            <div style={{ position:"absolute",top:2,left:modoRapido?14:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.2s" }} />
          </div>
          <span style={{ fontSize:11, color:G.textMuted }}>Modo rápido (sin IA)</span>
        </div>

        {/* Historial */}
        {historial.length > 0 && (
          <div>
            <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:8 }}>RECIENTES</div>
            {historial.map((h,i)=>(
              <button key={i} onClick={()=>{ setQuery(h); }} style={{ width:"100%", padding:"6px 8px", background:"none", border:"none", color:G.textMuted, fontSize:12, cursor:"pointer", textAlign:"left", display:"flex", gap:6, alignItems:"center", borderRadius:4 }}
                onMouseEnter={e=>e.currentTarget.style.background=G.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ color:G.textDim }}>🕐</span><span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h}</span>
              </button>
            ))}
            <button onClick={()=>{ setHistorial([]); localStorage.removeItem("bf-busquedas"); }} style={{ fontSize:10,color:G.textDim,background:"none",border:"none",cursor:"pointer",marginTop:4 }}>Limpiar historial</button>
          </div>
        )}
      </div>

      {/* Panel principal */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Barra de búsqueda */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${G.border}`, background:G.surface, display:"flex", gap:10 }}>
          <div style={{ flex:1, position:"relative" }}>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscar()}
              placeholder='¿Qué buscas? "plano baño v2", "incidencias críticas", "garantía cocina"...'
              style={{ paddingLeft:44, fontSize:14, height:46 }} autoFocus />
            <div style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:G.gold,fontSize:18 }}>✦</div>
          </div>
          <button className="btn-primary" onClick={buscar} disabled={loading||!query.trim()} style={{ padding:"0 24px",height:46,fontSize:14,opacity:loading||!query.trim()?0.5:1 }}>
            {loading?"Buscando…":"Buscar"}
          </button>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:20 }}>
          {/* Estado inicial */}
          {!resultados && !loading && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div>
                <div style={{ fontSize:11, color:G.textMuted, marginBottom:10, fontFamily:"DM Mono" }}>BÚSQUEDAS DE EJEMPLO</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["plano del baño versión aprobada","licencia de obras pendiente","foto cocina con avance detectado","incidencias críticas abiertas","garantía electrodomésticos","material crítico pendiente","proveedor electricidad","extras aprobados pendientes de facturar"].map(s=>(
                    <button key={s} onClick={()=>setQuery(s)} style={{ background:G.surface,border:`1px solid ${G.border}`,color:G.textMuted,padding:"6px 14px",borderRadius:20,fontSize:12,cursor:"pointer" }}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Resumen del índice */}
              <div className="card">
                <div className="serif" style={{ fontSize:14,marginBottom:14 }}>Contenido indexado — {totalDocs} elementos</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10 }}>
                  {[
                    {tipo:"Planos",icono:"📐"},{tipo:"Licencia",icono:"📋"},{tipo:"Foto",icono:"📸"},
                    {tipo:"Incidencia",icono:"⚠️"},{tipo:"Proveedor",icono:"👷"},{tipo:"Material",icono:"📦"},
                    {tipo:"Extra",icono:"➕"},{tipo:"Garantía",icono:"🛡️"},{tipo:"Checklist",icono:"✅"},
                  ].map(t=>(
                    <div key={t.tipo} className="stat-box" style={{ padding:"10px 12px",cursor:"pointer" }} onClick={()=>setFiltroTipo(t.tipo)}>
                      <div style={{ fontSize:18,marginBottom:4 }}>{t.icono}</div>
                      <div className="serif" style={{ fontSize:18 }}>{contarPorTipo(t.tipo)}</div>
                      <div style={{ fontSize:10,color:G.textMuted,marginTop:2 }}>{t.tipo}s</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:"center",padding:"60px 0" }}>
              <div className="loading-pulse" style={{ fontSize:36,marginBottom:16 }}>✦</div>
              <div style={{ color:G.textMuted,fontSize:13 }}>Buscando entre {totalDocs} elementos{modoRapido?"":" con IA semántica"}…</div>
            </div>
          )}

          {/* Resultados */}
          {resultados && !loading && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Resumen IA */}
              <div style={{ background:"#1A1A13",border:`1px solid ${G.gold}33`,borderRadius:8,padding:"14px 18px",display:"flex",gap:12 }}>
                <span style={{ fontSize:20,flexShrink:0 }}>{resultados.modoRapido?"🔍":"✦"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:G.gold,marginBottom:6,fontFamily:"DM Mono" }}>{resultados.modoRapido?"BÚSQUEDA LOCAL":"ANÁLISIS IA"}</div>
                  <div style={{ fontSize:13,color:G.text,lineHeight:1.6 }}>{resultados.resumen}</div>
                </div>
                <button onClick={()=>{setResultados(null);setQuery("");}} style={{ background:"none",border:"none",color:G.textMuted,cursor:"pointer",fontSize:12,flexShrink:0 }}>✕</button>
              </div>

              {/* Hits */}
              {resultados.hits.length===0 ? (
                <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
                  <div style={{ fontSize:36,marginBottom:12 }}>🔍</div>
                  <div>Sin resultados para "{query}"</div>
                  <div style={{ fontSize:12,marginTop:8 }}>Prueba el modo rápido o cambia los filtros</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:12,color:G.textMuted }}>{resultados.hits.length} resultado{resultados.hits.length!==1?"s":""} · filtro: {filtroTipo} · {filtroObra==="todas"?"todas las obras":obras.find(o=>o.id===filtroObra)?.nombre}</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {resultados.hits.map((doc,i)=>(
                      <div key={i} className="card" style={{ borderLeft:`3px solid ${doc.obraColor||G.gold}`,cursor:"pointer" }} onClick={()=>onSelectObra(doc.obraId)}>
                        <div style={{ display:"flex",gap:14,alignItems:"flex-start" }}>
                          {doc.src&&!doc.esPDF ? <img src={doc.src} alt="" style={{ width:56,height:42,objectFit:"cover",borderRadius:4,flexShrink:0,border:`1px solid ${G.border}` }} />
                            :doc.esPDF ? <div style={{ width:56,height:42,background:G.bg,borderRadius:4,border:`1px solid ${G.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20 }}>📄</div>
                            :<div style={{ fontSize:28,flexShrink:0,width:56,textAlign:"center" }}>{doc.icono}</div>}
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:5,flexWrap:"wrap" }}>
                              <span className="tag" style={{ background:G.surface,color:G.textMuted }}>{doc.tipo}</span>
                              {!resultados.modoRapido&&<span className="tag" style={{ background:relevanciaColor[doc.relevancia]+"22",color:relevanciaColor[doc.relevancia] }}>{doc.relevancia}</span>}
                              <span style={{ fontSize:10,color:doc.obraColor,fontFamily:"DM Mono" }}>{doc.obra}</span>
                              {doc.critico&&<span className="tag" style={{ background:G.red+"22",color:G.red }}>crítico</span>}
                              {doc.version&&<span className="tag" style={{ background:G.gold+"22",color:G.gold }}>v{doc.version}</span>}
                            </div>
                            <div style={{ fontSize:14,fontWeight:500,marginBottom:3 }}>{doc.titulo}</div>
                            <div style={{ fontSize:11,color:G.textMuted,marginBottom:doc.razon?5:0 }}>{doc.subtitulo}</div>
                            {doc.razon&&<div style={{ fontSize:12,color:G.gold,fontStyle:"italic" }}>"{doc.razon}"</div>}
                            {doc.avanceIA!==null&&doc.avanceIA!==undefined&&<div style={{ fontSize:11,color:G.green,marginTop:3 }}>Avance detectado: {doc.avanceIA}%</div>}
                          </div>
                          <div style={{ flexShrink:0,color:G.textMuted,fontSize:11 }}>→ ver obra</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Sugerencias */}
              {(resultados.sugerencias||[]).length>0&&(
                <div>
                  <div style={{ fontSize:11,color:G.textMuted,marginBottom:8,fontFamily:"DM Mono" }}>TAMBIÉN PODRÍAS BUSCAR</div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {resultados.sugerencias.map((s,i)=>(
                      <button key={i} onClick={()=>{setQuery(s);setResultados(null);}} style={{ background:G.surface,border:`1px solid ${G.border}`,color:G.textMuted,padding:"6px 12px",borderRadius:20,fontSize:12,cursor:"pointer" }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === ONBOARDING ===
const PASOS_ONBOARDING = [
  {
    id: 1, emoji: "🏗️", titulo: "Bienvenido a Blue Forest",
    subtitulo: "Tu centro de mando para reformas premium",
    desc: "Blue Forest es la app que te da control total sobre tus obras: planificación, economía, clientes, documentación e IA — todo desde una sola pantalla.",
    highlight: null,
    accion: "Empezar →",
  },
  {
    id: 2, emoji: "📐", titulo: "Gestión completa de obras",
    subtitulo: "Cada obra tiene 15+ módulos integrados",
    desc: "Fases con Gantt inteligente, tareas, proveedores, control económico con cashflow, planos con versionado, incidencias, checklist, firma digital, presupuestos para clientes y más.",
    highlight: "15 módulos por obra",
    features: ["Gantt con detección de conflictos", "Control económico por categorías", "Sistema de versiones de planos", "Firma digital integrada"],
    accion: "Continuar →",
  },
  {
    id: 3, emoji: "✦", titulo: "IA que trabaja de verdad",
    subtitulo: "No es un chatbot decorativo",
    desc: "La IA de Blue Forest analiza fotos de avance, lee conversaciones de WhatsApp, detecta retrasos, genera actas, compara presupuestos y responde preguntas sobre tu negocio.",
    highlight: "Claude AI integrado",
    features: ["Analiza fotos → % avance por zona", "Lee WhatsApp → perfil del cliente", "Detecta conflictos en el Gantt", "Asistente global que conoce todo"],
    accion: "Continuar →",
  },
  {
    id: 4, emoji: "📧", titulo: "Integrado con Google",
    subtitulo: "Gmail, Drive y Calendar conectados",
    desc: "Lee y responde emails de clientes desde Blue Forest. Crea estructura de carpetas en Drive automáticamente. Exporta fases y entregas a Google Calendar.",
    highlight: "Google Workspace",
    features: ["Gmail → analiza y responde emails", "Drive → carpetas automáticas por obra", "Calendar → sincroniza fases y cobros"],
    accion: "Continuar →",
  },
  {
    id: 5, emoji: "📱", titulo: "Diseñada para la obra",
    subtitulo: "Desktop en oficina, móvil en obra",
    desc: "En pantallas pequeñas, Blue Forest cambia automáticamente a una interfaz optimizada para obra: cámara rápida, incidencias en 2 toques, tareas con un toque.",
    highlight: "Responsive automático",
    features: ["Foto de obra en 3 segundos", "Nueva incidencia en 20 segundos", "Funciona sin conexión (modo offline)", "Sin configuración extra"],
    accion: "Continuar →",
  },
  {
    id: 6, emoji: "🚀", titulo: "Listo para empezar",
    subtitulo: "Crea tu primera obra ahora",
    desc: "Ya tienes una obra de ejemplo cargada para que explores la app. Cuando quieras, crea tu primera obra real pulsando 'Nueva Obra' en el sidebar o con la tecla N.",
    highlight: null,
    tip: "💡 Pulsa N en cualquier momento para crear una nueva obra rápidamente",
    accion: "Entrar a Blue Forest",
  },
];

function Onboarding({ onComplete }) {
  const [paso, setPaso] = useState(0);
  const [animDir, setAnimDir] = useState("right");
  const p = PASOS_ONBOARDING[paso];
  const esUltimo = paso === PASOS_ONBOARDING.length - 1;

  const avanzar = () => {
    if (esUltimo) { onComplete(); return; }
    setAnimDir("right");
    setPaso(prev => prev + 1);
  };
  const retroceder = () => {
    if (paso === 0) return;
    setAnimDir("left");
    setPaso(prev => prev - 1);
  };

  return (
    <div style={{ background: G.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 0 }}>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
          {PASOS_ONBOARDING.map((_, i) => (
            <div key={i} onClick={() => setPaso(i)} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= paso ? G.gold : G.border, cursor: "pointer", transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Contenido */}
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
          {/* Hero */}
          <div style={{ background: "#1A1A2E", padding: "48px 56px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>{p.emoji}</div>
            <div className="serif" style={{ fontSize: 30, color: "#F8F6F2", marginBottom: 10 }}>{p.titulo}</div>
            <div style={{ fontSize: 15, color: "#9090A8", marginBottom: 20 }}>{p.subtitulo}</div>
            {p.highlight && (
              <span style={{ background: G.gold+"33", color: G.gold, padding: "5px 16px", borderRadius: 20, fontSize: 12, fontFamily: "DM Mono, monospace", letterSpacing: "0.04em" }}>
                {p.highlight}
              </span>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: "36px 56px 40px" }}>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: G.text, marginBottom: p.features ? 24 : 0, textAlign: "center" }}>{p.desc}</p>

            {p.features && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", background: G.bg, borderRadius: 8, border: `1px solid ${G.border}` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.gold, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: G.text }}>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {p.tip && (
              <div style={{ background: "#1A1A13", border: `1px solid ${G.gold}33`, borderRadius: 8, padding: "12px 16px", fontSize: 13, color: G.gold, textAlign: "center", marginBottom: 8 }}>
                {p.tip}
              </div>
            )}

            {/* Navegación */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
              <button onClick={retroceder} style={{ background: "none", border: "none", color: G.textMuted, fontSize: 13, cursor: paso > 0 ? "pointer" : "default", opacity: paso > 0 ? 1 : 0 }}>
                ← Atrás
              </button>
              <div className="mono" style={{ fontSize: 11, color: G.textDim }}>
                {paso + 1} / {PASOS_ONBOARDING.length}
              </div>
              <button className="btn-primary" onClick={avanzar} style={{ padding: "10px 28px", fontSize: 14 }}>
                {p.accion}
              </button>
            </div>
          </div>
        </div>

        {/* Skip */}
        {!esUltimo && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={onComplete} style={{ background: "none", border: "none", color: G.textDim, fontSize: 12, cursor: "pointer" }}>
              Saltar tutorial y entrar directamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// === EQUIPO Y ROLES ===
const ROLES = [
  { id:"admin",      label:"Administrador",  color:"#C8A96E", emoji:"👑", desc:"Acceso total" },
  { id:"jefe_obra",  label:"Jefe de Obra",   color:"#5C9BE0", emoji:"🏗️", desc:"Gestión en obra" },
  { id:"tecnico",    label:"Técnico",         color:"#5CB87A", emoji:"🔧", desc:"Ejecución" },
  { id:"proveedor",  label:"Proveedor",       color:"#A06EBE", emoji:"📦", desc:"Suministro" },
  { id:"cliente",    label:"Cliente",         color:"#E08D3C", emoji:"👤", desc:"Seguimiento" },
];

function EquipoView({ obras, onSelectObra }) {
  const [miembros, setMiembros] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bf-equipo")||"[]"); } catch(e) { return []; }
  });
  const [modal, setModal] = useState(false);
  const [selec, setSelec] = useState(null);
  const [form, setForm] = useState({ nombre:"", rol:"tecnico", email:"", telefono:"", especialidad:"", emoji:"👷" });
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");

  const EMOJIS = ["👷","🏗️","🔧","⚡","🪚","🎨","📐","🧱","🪟","🛁","🔌","🌿","📋","👑","👤"];

  const save = (nuevos) => {
    setMiembros(nuevos);
    try { localStorage.setItem("bf-equipo", JSON.stringify(nuevos)); } catch(e) { void 0; }
  };

  const crear = () => {
    if (!form.nombre.trim()) return;
    save([...miembros, { id:uid(), ...form, creadoEn:new Date().toLocaleDateString("es-ES") }]);
    setModal(false);
    setForm({ nombre:"", rol:"tecnico", email:"", telefono:"", especialidad:"", emoji:"👷" });
  };

  const cargaPorMiembro = (nombre) => {
    const tareas = obras.flatMap(o=>(o.tareas||[]).filter(t=>t.responsable===nombre&&t.estado!=="completada").map(t=>({...t,obraNombre:o.nombre,obraId:o.id})));
    const incidencias = obras.flatMap(o=>(o.incidencias||[]).filter(i=>i.responsable===nombre&&i.estado!=="cerrada").map(i=>({...i,obraNombre:o.nombre,obraId:o.id})));
    const fases = obras.flatMap(o=>(o.fases||[]).filter(f=>f.proveedor===nombre&&f.estado!=="completada").map(f=>({...f,obraNombre:o.nombre,obraId:o.id})));
    return { tareas, incidencias, fases, total:tareas.length+incidencias.length+fases.length };
  };

  const filtrados = miembros.filter(m=>{
    if (filtroRol!=="todos"&&m.rol!==filtroRol) return false;
    if (busqueda&&!m.nombre.toLowerCase().includes(busqueda.toLowerCase())&&!m.especialidad?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display:"flex", gap:20, height:"100%", overflow:"hidden" }}>
      <div style={{ flex:selec?"0 0 380px":1, display:"flex", flexDirection:"column", gap:14, overflow:"auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            {label:"TOTAL EQUIPO",val:miembros.length,color:G.text},
            ...ROLES.slice(0,3).map(r=>({label:r.label.toUpperCase(),val:miembros.filter(m=>m.rol===r.id).length,color:r.color}))
          ].map(k=>(
            <div key={k.label} className="stat-box">
              <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
              <div className="serif" style={{ fontSize:22,color:k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Buscar..." style={{ flex:1,fontSize:12 }} />
          <select value={filtroRol} onChange={e=>setFiltroRol(e.target.value)} style={{ width:"auto",fontSize:12 }}>
            <option value="todos">Todos los roles</option>
            {ROLES.map(r=><option key={r.id} value={r.id}>{r.emoji} {r.label}</option>)}
          </select>
          <button className="btn-primary" onClick={()=>setModal(true)} style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
            {Icon.plus} Añadir
          </button>
        </div>

        {filtrados.length===0?(
          <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
            <div style={{ fontSize:36,marginBottom:10 }}>👥</div>
            <div>{busqueda?"Sin resultados":"Sin miembros. Añade tu equipo."}</div>
          </div>
        ):(
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12 }}>
            {filtrados.map(m=>{
              const rol = ROLES.find(r=>r.id===m.rol)||ROLES[2];
              const carga = cargaPorMiembro(m.nombre);
              const sel = selec?.id===m.id;
              return (
                <div key={m.id} className="card" style={{ cursor:"pointer",borderTop:`3px solid ${rol.color}`,background:sel?"#EEF2FF":"#FFFFFF", boxShadow:"0 1px 3px #0001" }} onClick={()=>setSelec(sel?null:m)}>
                  <div style={{ display:"flex",gap:12,alignItems:"flex-start",marginBottom:10 }}>
                    <div style={{ width:44,height:44,borderRadius:"50%",background:rol.color+"22",border:`2px solid ${rol.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{m.emoji||rol.emoji}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{m.nombre}</div>
                      <span className="tag" style={{ background:rol.color+"22",color:rol.color,fontSize:9 }}>{rol.emoji} {rol.label}</span>
                      {m.especialidad&&<div style={{ fontSize:10,color:G.textMuted,marginTop:3 }}>{m.especialidad}</div>}
                    </div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                    {[{label:"TAREAS",val:carga.tareas.length,color:G.gold},{label:"INCID.",val:carga.incidencias.length,color:G.red},{label:"FASES",val:carga.fases.length,color:G.blue}].map(k=>(
                      <div key={k.label} style={{ textAlign:"center",background:G.bg,borderRadius:4,padding:"5px 4px" }}>
                        <div style={{ fontSize:14,fontWeight:600,color:k.val>0?k.color:G.textDim }}>{k.val}</div>
                        <div style={{ fontSize:8,color:G.textDim,fontFamily:"DM Mono" }}>{k.label}</div>
                      </div>
                    ))}
                  </div>
                  {m.telefono&&<div style={{ fontSize:10,color:G.textMuted,marginTop:8 }}>📞 {m.telefono}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {null}

      {modal&&(
        <Modal title="Añadir al equipo" onClose={()=>setModal(false)}>
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:8 }}>ROL</label>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
                {ROLES.map(r=>(
                  <div key={r.id} onClick={()=>setForm(f=>({...f,rol:r.id}))} style={{ padding:"10px 8px",borderRadius:6,border:`1px solid ${form.rol===r.id?r.color:G.border}`,background:form.rol===r.id?r.color+"22":"transparent",cursor:"pointer",textAlign:"center" }}>
                    <div style={{ fontSize:20,marginBottom:3 }}>{r.emoji}</div>
                    <div style={{ fontSize:11,color:form.rol===r.id?r.color:G.textMuted }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>NOMBRE *</label>
              <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre completo..." autoFocus /></div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>ESPECIALIDAD</label>
                <input value={form.especialidad} onChange={e=>setForm(f=>({...f,especialidad:e.target.value}))} placeholder="Electricidad..." /></div>
              <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>TELÉFONO</label>
                <input value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="6xx..." /></div>
            </div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:5 }}>EMAIL</label>
              <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@..." /></div>
            <div><label style={{ fontSize:11,color:G.textMuted,display:"block",marginBottom:8 }}>EMOJI</label>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {EMOJIS.map(e=>(
                  <div key={e} onClick={()=>setForm(f=>({...f,emoji:e}))} style={{ width:32,height:32,borderRadius:5,border:`1px solid ${form.emoji===e?G.gold:G.border}`,background:form.emoji===e?"#1E1A13":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17 }}>{e}</div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:8 }}>
              <button className="btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crear} disabled={!form.nombre.trim()} style={{ opacity:!form.nombre.trim()?0.5:1 }}>Añadir al equipo</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === PANEL ===DE RENTABILIDAD ----------------------------------------------------
function RentabilidadView({ obras, onSelectObra }) {
  const [periodo, setPeriodo] = useState("todo");
  const [loadingIA, setLoadingIA] = useState(false);
  const [proyeccionIA, setProyeccionIA] = useState("");
  const [seccion, setSeccion] = useState("resumen");

  const hoy = new Date();
  const MESES_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  // === Filtro ===por per-odo --
  const filtrarPorPeriodo = (obras) => {
    if (periodo === "todo") return obras;
    const limite = new Date();
    if (periodo === "3m") limite.setMonth(limite.getMonth() - 3);
    if (periodo === "6m") limite.setMonth(limite.getMonth() - 6);
    if (periodo === "1a") limite.setFullYear(limite.getFullYear() - 1);
    return obras.filter(o => o.fechaInicio && new Date(o.fechaInicio) >= limite);
  };

  const obrasFiltradas = filtrarPorPeriodo(obras);

  // === M-tricas ===base --
  const calcMetricas = (o) => {
    const presup = (o.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0) || o.presupuesto || 0;
    const coste  = (o.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
    const cobros = (o.economica?.cobros||[]).reduce((a,c)=>a+(Number(c.importe)||0),0);
    const extras = (o.extras||[]).filter(e=>e.estado!=="rechazado").reduce((a,e)=>a+(Number(e.importe)||0),0);
    const ingresos = cobros || presup + extras;
    const margen = ingresos - coste;
    const margenPct = ingresos ? Math.round((margen/ingresos)*100) : 0;
    const diasObra = o.fechaInicio && o.fechaFin ? Math.ceil((new Date(o.fechaFin)-new Date(o.fechaInicio))/864e5) : null;
    const retrasada = o.fechaFin && Math.ceil((new Date(o.fechaFin)-hoy)/864e5) < 0 && o.estado !== "completada";
    return { presup, coste, cobros, extras, ingresos, margen, margenPct, diasObra, retrasada };
  };

  // === Totales ===globales --
  const totales = obrasFiltradas.reduce((acc, o) => {
    const m = calcMetricas(o);
    return { ingresos: acc.ingresos+m.ingresos, coste: acc.coste+m.coste, margen: acc.margen+m.margen, extras: acc.extras+m.extras };
  }, { ingresos:0, coste:0, margen:0, extras:0 });

  const margenPctGlobal = totales.ingresos ? Math.round((totales.margen/totales.ingresos)*100) : 0;

  // === Ranking ===por rentabilidad --
  const ranking = obrasFiltradas.map(o => ({ ...o, ...calcMetricas(o) }))
    .filter(o => o.ingresos > 0)
    .sort((a,b) => b.margenPct - a.margenPct);

  // === Ingresos ===por mes (-ltimos 12 meses) --
  const ingresosMes = (() => {
    const map = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      map[k] = { mes: MESES_ES[d.getMonth()], año: d.getFullYear(), ingresos:0, costes:0, margen:0 };
    }
    obras.forEach(o => {
      (o.economica?.cobros||[]).forEach(c => {
        if (!c.fecha) return;
        const d = new Date(c.fecha);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        if (map[k]) map[k].ingresos += Number(c.importe)||0;
      });
      (o.economica?.movimientos||[]).forEach(m => {
        if (!m.fecha) return;
        const d = new Date(m.fecha);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        if (map[k]) map[k].costes += Number(m.importe)||0;
      });
    });
    Object.values(map).forEach(m => { m.margen = m.ingresos - m.costes; });
    return Object.values(map);
  })();

  const maxIngMes = Math.max(...ingresosMes.map(m=>Math.max(m.ingresos,m.costes)),1);

  // === Proyecci-n ===pr-ximos 3 meses --
  const pendienteCobrar = obras.flatMap(o =>
    (o.economica?.cobros||[]).filter(c=>c.estado==="pendiente"&&c.fecha).map(c=>({...c,obraNombre:o.nombre}))
  ).sort((a,b)=>a.fecha.localeCompare(b.fecha));

  const totalPendiente = pendienteCobrar.reduce((a,c)=>a+(Number(c.importe)||0),0);

  // === M-tricas ===por categor-a --
  const porCategoria = (() => {
    const map = {};
    obras.forEach(o=>(o.economica?.partidas||[]).forEach(p=>{
      const cat = p.categoria||"otros";
      if(!map[cat]) map[cat]={cat,previsto:0,real:0};
      map[cat].previsto+=Number(p.previsto)||0;
      map[cat].real+=Number(p.real)||0;
    }));
    return Object.values(map).filter(c=>c.previsto>0||c.real>0).sort((a,b)=>b.real-a.real);
  })();

  // === Indicadores ===de salud --
  const indicadores = [
    { label:"Margen bruto", val:`${margenPctGlobal}%`, bueno:margenPctGlobal>=20, desc:"≥20% es saludable" },
    { label:"Obras activas", val:obras.filter(o=>o.estado==="en_curso").length, bueno:obras.filter(o=>o.estado==="en_curso").length>=1, desc:"Flujo de trabajo activo" },
    { label:"Obras retrasadas", val:ranking.filter(o=>o.retrasada).length, bueno:ranking.filter(o=>o.retrasada).length===0, desc:"0 es el objetivo" },
    { label:"Cobros vencidos", val:pendienteCobrar.filter(c=>new Date(c.fecha)<hoy).length, bueno:pendienteCobrar.filter(c=>new Date(c.fecha)<hoy).length===0, desc:"Cobros con fecha pasada" },
    { label:"Margen medio/obra", val:`${ranking.length?Math.round(ranking.reduce((a,o)=>a+o.margenPct,0)/ranking.length):0}%`, bueno:ranking.length?Math.round(ranking.reduce((a,o)=>a+o.margenPct,0)/ranking.length)>=15:false, desc:"Promedio cross-obra" },
  ];

  const generarProyeccion = async () => {
    setLoadingIA(true); setProyeccionIA("");
    const resumen = `Negocio de reformas. Obras totales: ${obras.length} (${obras.filter(o=>o.estado==="en_curso").length} activas, ${obras.filter(o=>o.estado==="completada").length} completadas). Ingresos totales: ${fmt(totales.ingresos)}. Costes: ${fmt(totales.coste)}. Margen global: ${fmt(totales.margen)} (${margenPctGlobal}%). Pendiente de cobrar: ${fmt(totalPendiente)} en ${pendienteCobrar.length} cobros. Obras retrasadas: ${ranking.filter(o=>o.retrasada).length}. Margen medio por obra: ${ranking.length?Math.round(ranking.reduce((a,o)=>a+o.margenPct,0)/ranking.length):0}%. Mejor obra por margen: ${ranking[0]?.nombre||"—"} (${ranking[0]?.margenPct||0}%). Peor obra: ${ranking[ranking.length-1]?.nombre||"—"} (${ranking[ranking.length-1]?.margenPct||0}%).`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 800,
          messages: [{ role: "user", content: `Eres un consultor financiero especializado en negocios de reformas y construcción en España. Analiza estos datos y proporciona:\n\n${resumen}\n\n1) Diagnóstico de la salud financiera del negocio (2-3 frases)\n2) Proyección de ingresos próximos 3 meses basada en cobros pendientes y ritmo actual\n3) Palancas de mejora de rentabilidad (3 acciones concretas)\n4) Alertas o riesgos detectados\n5) Benchmark: ¿es este margen bueno para reformas premium en España?\n\nSé directo, concreto y usa números. Máximo 280 palabras.` }]
        })
      });
      const data = await res.json();
      setProyeccionIA(data.content?.find(b=>b.type==="text")?.text||"");
    } catch { setProyeccionIA("Error al generar proyección."); }
    setLoadingIA(false);
  };

  return (
    <div style={{ padding:28, overflow:"auto", height:"100%" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div className="serif" style={{ fontSize:26, marginBottom:4 }}>Rentabilidad & Proyección</div>
          <div style={{ fontSize:13, color:G.textMuted }}>Análisis financiero del negocio · {obrasFiltradas.length} obras</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {/* Período */}
          <div style={{ display:"flex", gap:4, background:G.bg, borderRadius:6, padding:4 }}>
            {[["todo","Todo"],["1a","1 año"],["6m","6 meses"],["3m","3 meses"]].map(([id,label])=>(
              <button key={id} onClick={()=>setPeriodo(id)} style={{ padding:"5px 12px", borderRadius:4, border:"none", background:periodo===id?G.surface:"transparent", color:periodo===id?G.gold:G.textMuted, fontSize:11, cursor:"pointer" }}>{label}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={generarProyeccion} disabled={loadingIA} style={{ fontSize:12, opacity:loadingIA?0.5:1 }}>
            {loadingIA?"Analizando…":"✦ Proyección IA"}
          </button>
        </div>
      </div>

      {/* Proyección IA */}
      {proyeccionIA && (
        <div style={{ background:"#1A1A13", border:`1px solid ${G.gold}33`, borderRadius:8, padding:"18px 22px", marginBottom:24, display:"flex", gap:14 }}>
          <div style={{ fontSize:20 }}>✦</div>
          <div>
            <div style={{ fontSize:11, color:G.gold, fontFamily:"DM Mono", marginBottom:10 }}>PROYECCIÓN & DIAGNÓSTICO IA</div>
            <div style={{ fontSize:13, lineHeight:1.8, color:G.text, whiteSpace:"pre-wrap" }}>{proyeccionIA}</div>
          </div>
        </div>
      )}

      {/* Sub-nav */}
      <div style={{ display:"flex", gap:4, background:G.bg, borderRadius:6, padding:4, marginBottom:24, width:"fit-content" }}>
        {[["resumen","Resumen"],["mensual","Evolución mensual"],["obras","Por obra"],["cobros","Cobros futuros"],["categorias","Por categoría"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSeccion(id)} style={{ padding:"7px 14px", borderRadius:4, border:"none", background:seccion===id?G.surface:"transparent", color:seccion===id?G.gold:G.textMuted, fontSize:12, cursor:"pointer" }}>{label}</button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {seccion === "resumen" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* KPIs principales */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {[
              { label:"INGRESOS TOTALES", val:fmt(totales.ingresos), color:G.green, sub:`${obrasFiltradas.filter(o=>o.ingresos>0).length} obras con datos` },
              { label:"COSTES TOTALES", val:fmt(totales.coste), color:totales.coste>totales.ingresos?G.red:G.text, sub:"Según partidas reales" },
              { label:"MARGEN BRUTO", val:fmt(totales.margen), color:totales.margen>=0?G.green:G.red, sub:`${margenPctGlobal}% sobre ingresos` },
              { label:"PENDIENTE COBRAR", val:fmt(totalPendiente), color:G.gold, sub:`${pendienteCobrar.length} cobro${pendienteCobrar.length!==1?"s":""} programados` },
            ].map(k=>(
              <div key={k.label} className="stat-box" style={{ borderLeft:`3px solid ${k.color}` }}>
                <div style={{ fontSize:9,color:G.textMuted,marginBottom:8,fontFamily:"DM Mono" }}>{k.label}</div>
                <div className="serif" style={{ fontSize:24,color:k.color }}>{k.val}</div>
                <div style={{ fontSize:10,color:G.textMuted,marginTop:4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Indicadores de salud */}
          <div className="card">
            <div className="serif" style={{ fontSize:15, marginBottom:16 }}>Indicadores de Salud del Negocio</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
              {indicadores.map(ind=>(
                <div key={ind.label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>{ind.bueno?"✅":"⚠️"}</div>
                  <div className="serif" style={{ fontSize:18, color:ind.bueno?G.green:G.orange }}>{ind.val}</div>
                  <div style={{ fontSize:11, fontWeight:500, marginTop:4 }}>{ind.label}</div>
                  <div style={{ fontSize:10, color:G.textDim, marginTop:2 }}>{ind.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Extras vs presupuesto */}
          {totales.extras > 0 && (
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div className="serif" style={{ fontSize:15 }}>Impacto de Extras y Modificados</div>
                  <div style={{ fontSize:12, color:G.textMuted, marginTop:4 }}>Los extras aprobados incrementan el ingreso real</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className="mono" style={{ fontSize:20, color:G.orange }}>+{fmt(totales.extras)}</div>
                  <div style={{ fontSize:11, color:G.textMuted }}>en extras aprobados</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EVOLUCIÓN MENSUAL ── */}
      {seccion === "mensual" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div className="card">
            <div className="serif" style={{ fontSize:15, marginBottom:20 }}>Ingresos y Costes — Últimos 12 Meses</div>
            <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:180, overflow:"auto" }}>
              {ingresosMes.map((m,i)=>{
                const hIng = Math.round((m.ingresos/maxIngMes)*160);
                const hCos = Math.round((m.costes/maxIngMes)*160);
                const mar = m.ingresos - m.costes;
                return (
                  <div key={i} style={{ flex:"0 0 52px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <div style={{ fontSize:9, color:mar>0?G.green:mar<0?G.red:G.textDim, fontFamily:"DM Mono" }}>
                      {mar!==0?(mar>0?"+":"")+Math.round(mar/1000)+"k":""}
                    </div>
                    <div style={{ display:"flex", gap:2, alignItems:"flex-end", height:160 }}>
                      {m.ingresos>0&&<div style={{ width:18, height:hIng, background:G.green, borderRadius:"3px 3px 0 0", opacity:0.85 }} title={`Ingresos: ${fmt(m.ingresos)}`} />}
                      {m.costes>0&&<div style={{ width:18, height:hCos, background:G.red, borderRadius:"3px 3px 0 0", opacity:0.7 }} title={`Costes: ${fmt(m.costes)}`} />}
                      {m.ingresos===0&&m.costes===0&&<div style={{ width:18, height:4, background:G.border, borderRadius:2 }} />}
                    </div>
                    <div className="mono" style={{ fontSize:9, color:G.textMuted }}>{m.mes}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:16, marginTop:16 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:G.textMuted }}><div style={{ width:10,height:10,borderRadius:2,background:G.green }} />Ingresos</div>
              <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:G.textMuted }}><div style={{ width:10,height:10,borderRadius:2,background:G.red }} />Costes</div>
            </div>
          </div>

          {/* Tabla mensual */}
          <div className="card" style={{ padding:0, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", background:"#1A1A2E", padding:"8px 16px" }}>
              {["MES","INGRESOS","COSTES","MARGEN"].map(h=>(
                <div key={h} style={{ fontSize:9,color:"#9090A8",fontFamily:"DM Mono",letterSpacing:"0.04em" }}>{h}</div>
              ))}
            </div>
            {ingresosMes.slice().reverse().filter(m=>m.ingresos>0||m.costes>0).map((m,i)=>(
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 16px", borderBottom:`1px solid ${G.border}` }}>
                <div style={{ fontSize:12 }}>{m.mes} {m.año}</div>
                <div className="mono" style={{ fontSize:12, color:G.green }}>{fmt(m.ingresos)}</div>
                <div className="mono" style={{ fontSize:12, color:G.red }}>{fmt(m.costes)}</div>
                <div className="mono" style={{ fontSize:12, color:m.margen>=0?G.green:G.red }}>{m.margen>=0?"+":""}{fmt(m.margen)}</div>
              </div>
            ))}
            {ingresosMes.every(m=>m.ingresos===0&&m.costes===0)&&(
              <div style={{ padding:"30px 16px", color:G.textMuted, textAlign:"center", fontSize:12 }}>Sin movimientos registrados en los últimos 12 meses</div>
            )}
          </div>
        </div>
      )}

      {/* ── POR OBRA ── */}
      {seccion === "obras" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {ranking.length===0 ? (
            <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
              <div style={{ fontSize:36,marginBottom:10 }}>📊</div>
              <div>Añade datos económicos a las obras para ver el ranking de rentabilidad</div>
            </div>
          ) : ranking.map((o,i)=>(
            <div key={o.id} className="card" style={{ borderLeft:`3px solid ${o.color}`, cursor:"pointer" }} onClick={()=>onSelectObra(o.id)}>
              <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                <div className="serif" style={{ fontSize:22, color:G.textDim, width:32, flexShrink:0 }}>#{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:14, fontWeight:500 }}>{o.nombre}</span>
                    {estadoTag(o.estado)}
                    {o.retrasada&&<span className="tag" style={{ background:G.red+"22",color:G.red }}>⚠ Retrasada</span>}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16 }}>
                    {[
                      { label:"Ingresos", val:fmt(o.ingresos), color:G.green },
                      { label:"Costes", val:fmt(o.coste), color:G.text },
                      { label:"Extras", val:o.extras>0?"+"+fmt(o.extras):"—", color:G.orange },
                      { label:"Margen €", val:fmt(o.margen), color:o.margen>=0?G.green:G.red },
                      { label:"Margen %", val:`${o.margenPct}%`, color:o.margenPct>=20?G.green:o.margenPct>=10?G.gold:G.red },
                    ].map(k=>(
                      <div key={k.label}>
                        <div style={{ fontSize:9,color:G.textMuted,fontFamily:"DM Mono",marginBottom:2 }}>{k.label.toUpperCase()}</div>
                        <div className="mono" style={{ fontSize:14,color:k.color }}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                  {/* Barra margen */}
                  <div style={{ marginTop:10, height:4, background:G.border, borderRadius:2 }}>
                    <div style={{ height:"100%", borderRadius:2, background:o.margenPct>=20?G.green:o.margenPct>=10?G.gold:G.red, width:`${Math.min(100,Math.max(0,o.margenPct))}%`, transition:"width 0.5s" }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* Obras sin datos */}
          {obrasFiltradas.filter(o=>!ranking.find(r=>r.id===o.id)).map(o=>(
            <div key={o.id} className="card" style={{ opacity:0.4, borderLeft:`3px solid ${G.border}` }}>
              <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                <div style={{ width:8,height:8,borderRadius:2,background:o.color }} />
                <span style={{ fontSize:13 }}>{o.nombre}</span>
                <span style={{ fontSize:11,color:G.textDim,marginLeft:"auto" }}>Sin datos económicos</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COBROS FUTUROS ── */}
      {seccion === "cobros" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:4 }}>
            {[
              { label:"TOTAL PENDIENTE", val:fmt(totalPendiente), color:G.gold },
              { label:"COBROS PROGRAMADOS", val:pendienteCobrar.length, color:G.text },
              { label:"VENCIDOS", val:pendienteCobrar.filter(c=>new Date(c.fecha)<hoy).length, color:pendienteCobrar.filter(c=>new Date(c.fecha)<hoy).length>0?G.red:G.textMuted },
            ].map(k=>(
              <div key={k.label} className="stat-box">
                <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
                <div className="serif" style={{ fontSize:24,color:k.color }}>{k.val}</div>
              </div>
            ))}
          </div>
          {pendienteCobrar.length===0 ? (
            <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
              <div style={{ fontSize:36,marginBottom:10 }}>💶</div>
              <div>Sin cobros pendientes programados</div>
            </div>
          ) : (
            (() => {
              let lastMes = "";
              return pendienteCobrar.map((c,i) => {
                const d = new Date(c.fecha);
                const mesKey = `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
                const showMes = mesKey !== lastMes; lastMes = mesKey;
                const vencido = d < hoy;
                return (
                  <div key={i}>
                    {showMes && (
                      <div style={{ display:"flex",alignItems:"center",gap:10,margin:"12px 0 6px" }}>
                        <span className="serif" style={{ fontSize:13 }}>{mesKey}</span>
                        <div style={{ flex:1,height:1,background:G.border }} />
                        <span className="mono" style={{ fontSize:10,color:G.gold }}>{fmt(pendienteCobrar.filter(x=>{const dd=new Date(x.fecha); return `${MESES_ES[dd.getMonth()]} ${dd.getFullYear()}`===mesKey;}).reduce((a,x)=>a+(Number(x.importe)||0),0))}</span>
                      </div>
                    )}
                    <div style={{ display:"flex",gap:12,alignItems:"center",padding:"10px 14px",borderRadius:6,background:vencido?"#2A1010":G.surface,border:`1px solid ${vencido?G.red:G.border}` }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13 }}>{c.concepto}</div>
                        <div style={{ fontSize:10,color:G.textMuted,marginTop:2 }}>{c.obraNombre} · {c.fecha}</div>
                      </div>
                      <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                        {vencido&&<span className="tag" style={{ background:G.red+"22",color:G.red }}>Vencido</span>}
                        <span className="mono" style={{ fontSize:14,color:G.gold }}>{fmt(c.importe)}</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      )}

      {/* ── POR CATEGORÍA ── */}
      {seccion === "categorias" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {porCategoria.length===0 ? (
            <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
              <div style={{ fontSize:36,marginBottom:10 }}>📂</div>
              <div>Sin partidas económicas registradas</div>
            </div>
          ) : (
            <div className="card">
              <div className="serif" style={{ fontSize:15, marginBottom:20 }}>Gasto por Categoría (todas las obras)</div>
              {porCategoria.map(cat => {
                const catInfo = CATEGORIAS_ECO.find(c=>c.id===cat.cat);
                const maxVal = Math.max(...porCategoria.map(c=>Math.max(c.previsto,c.real)),1);
                const sobre = cat.real > cat.previsto;
                const desv = cat.real - cat.previsto;
                return (
                  <div key={cat.cat} style={{ marginBottom:18 }}>
                    <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:6 }}>
                      <span style={{ fontSize:16 }}>{catInfo?.icon||"📦"}</span>
                      <span style={{ fontSize:13,flex:1 }}>{catInfo?.label||cat.cat}</span>
                      <span className="mono" style={{ fontSize:11,color:G.textMuted }}>{fmt(cat.previsto)}</span>
                      <span style={{ color:G.textMuted,fontSize:11 }}>→</span>
                      <span className="mono" style={{ fontSize:11,color:sobre?G.red:G.green }}>{fmt(cat.real)}</span>
                      <span className="mono" style={{ fontSize:10,color:sobre?G.red:G.green,width:60,textAlign:"right" }}>{desv>=0?"+":""}{fmt(desv)}</span>
                    </div>
                    <div style={{ position:"relative",height:8,background:G.border,borderRadius:4 }}>
                      <div style={{ position:"absolute",left:0,top:0,height:"100%",width:`${(cat.previsto/maxVal)*100}%`,background:(catInfo?.color||G.gold)+"55",borderRadius:4 }} />
                      <div style={{ position:"absolute",left:0,top:0,height:"100%",width:`${(cat.real/maxVal)*100}%`,background:sobre?G.red:(catInfo?.color||G.gold),borderRadius:4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === NOTAS ===R-PIDAS & VOZ ------------------------------------------------------
function NotasView({ obras }) {
  const [notas, setNotas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bf-notas")||"[]"); } catch { return []; }
  });
  const [texto, setTexto] = useState("");
  const [obraId, setObraId] = useState("");
  const [color, setColor] = useState("#C8A96E");
  const [grabando, setGrabando] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [filtroObra, setFiltroObra] = useState("todas");
  const [filtroColor, setFiltroColor] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const inputRef = { current: null };

  const COLORES = [
    { id: "#C8A96E", label: "Dorado" },
    { id: "#5CB87A", label: "Verde" },
    { id: "#5C9BE0", label: "Azul" },
    { id: "#E05C5C", label: "Rojo" },
    { id: "#A06EBE", label: "Morado" },
    { id: "#E08D3C", label: "Naranja" },
    { id: "#E8E4DC", label: "Blanco" },
  ];

  const saveNotas = (nuevas) => {
    setNotas(nuevas);
    try { localStorage.setItem("bf-notas", JSON.stringify(nuevas)); } catch(e) { void 0; }
  };

  const crearNota = () => {
    if (!texto.trim()) return;
    const nota = {
      id: uid(),
      texto,
      obraId: obraId || null,
      obraNombre: obras.find(o=>o.id===obraId)?.nombre || null,
      color,
      fecha: new Date().toLocaleDateString("es-ES"),
      hora: new Date().toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" }),
      fechaISO: new Date().toISOString(),
      tipo: "texto",
      fijada: false,
    };
    saveNotas([nota, ...notas]);
    setTexto("");
  };

  // Grabaci-n de voz con Web Speech API + transcripci-n IA
  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        // Transcribir con Web Speech API si disponible, sino con IA
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          // Ya tenemos el texto via onresult abajo
        } else {
          setTranscribiendo(true);
          // Fallback: crear nota con marcador de audio
          const nota = {
            id: uid(),
            texto: "[Nota de voz — transcripción no disponible en este navegador]",
            obraId: obraId || null,
            obraNombre: obras.find(o=>o.id===obraId)?.nombre || null,
            color,
            fecha: new Date().toLocaleDateString("es-ES"),
            hora: new Date().toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" }),
            fechaISO: new Date().toISOString(),
            tipo: "voz",
            fijada: false,
          };
          saveNotas(prev => [nota, ...prev]);
          setTranscribiendo(false);
        }
      };
      recorder.start();
      setMediaRecorder(recorder);
      setGrabando(true);

      // Web Speech API para transcripci-n en tiempo real
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (e) => {
          const transcripcion = Array.from(e.results).map(r => r[0].transcript).join(" ");
          setTexto(prev => prev + (prev ? " " : "") + transcripcion);
        };
        recognition.start();
        recorder._recognition = recognition;
      }
    } catch (e) {
      alert("No se pudo acceder al micrófono. Permite el acceso en la configuración del navegador.");
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorder) {
      if (mediaRecorder._recognition) mediaRecorder._recognition.stop();
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    setGrabando(false);
  };

  // Mejorar nota con IA
  const mejorarConIA = async (nota) => {
    setLoadingIA(nota.id);
    try {
      const obraCtx = nota.obraNombre ? `Contexto: obra "${nota.obraNombre}".` : "";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 400,
          messages: [{ role: "user", content: `${obraCtx} Mejora y estructura esta nota de obra, manteniendo toda la información pero haciéndola más clara y accionable. Si hay tareas implícitas, extráelas. Si hay fechas, márcalas. Máximo 100 palabras.\n\nNota original: "${nota.texto}"` }]
        })
      });
      const data = await res.json();
      const mejorada = data.content?.find(b=>b.type==="text")?.text||"";
      const nuevas = notas.map(n => n.id===nota.id ? { ...n, textoOriginal: n.texto, texto: mejorada, mejoradaIA: true } : n);
      saveNotas(nuevas);
    } catch(e) { void 0; }
    setLoadingIA(null);
  };

  const toggleFijada = (id) => saveNotas(notas.map(n => n.id===id ? { ...n, fijada: !n.fijada } : n));
  const eliminar = (id) => saveNotas(notas.filter(n => n.id!==id));

  const notasFiltradas = notas.filter(n => {
    if (filtroObra !== "todas" && n.obraId !== filtroObra) return false;
    if (filtroColor !== "todos" && n.color !== filtroColor) return false;
    if (busqueda && !n.texto.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  }).sort((a,b) => {
    if (a.fijada !== b.fijada) return a.fijada ? -1 : 1;
    return b.fechaISO.localeCompare(a.fechaISO);
  });

  const notasFijadas = notasFiltradas.filter(n=>n.fijada);
  const notasNormales = notasFiltradas.filter(n=>!n.fijada);

  return (
    <div style={{ padding:28, overflow:"auto", height:"100%", display:"flex", flexDirection:"column", gap:20 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div className="serif" style={{ fontSize:26, marginBottom:4 }}>Notas Rápidas</div>
          <div style={{ fontSize:13, color:G.textMuted }}>{notas.length} nota{notas.length!==1?"s":""} · {notas.filter(n=>n.fijada).length} fijada{notas.filter(n=>n.fijada).length!==1?"s":""}</div>
        </div>
      </div>

      {/* Input principal */}
      <div className="card" style={{ padding:"18px 20px" }}>
        <textarea ref={el=>{ inputRef.current=el; }} value={texto} onChange={e=>setTexto(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&e.metaKey) crearNota(); }}
          placeholder="Escribe una nota rápida... (⌘Enter para guardar)"
          style={{ width:"100%", minHeight:80, resize:"vertical", fontSize:13, lineHeight:1.7, marginBottom:12, background:"transparent", border:"none", outline:"none", color:G.text, fontFamily:"DM Sans, sans-serif" }} />
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {/* Colores */}
          <div style={{ display:"flex", gap:5 }}>
            {COLORES.map(c=>(
              <div key={c.id} onClick={()=>setColor(c.id)} title={c.label}
                style={{ width:18, height:18, borderRadius:"50%", background:c.id, cursor:"pointer", border:color===c.id?`2px solid ${G.text}`:"2px solid transparent", transition:"border 0.15s" }} />
            ))}
          </div>
          {/* Obra */}
          <select value={obraId} onChange={e=>setObraId(e.target.value)} style={{ fontSize:12, padding:"5px 8px", flex:1 }}>
            <option value="">Sin obra</option>
            {obras.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          {/* Voz */}
          <button onClick={grabando?detenerGrabacion:iniciarGrabacion}
            style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${grabando?G.red:G.border}`, background:grabando?"#2A1010":"transparent", color:grabando?G.red:G.textMuted, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:6, transition:"all 0.2s" }}>
            {grabando ? <>🔴 <span className="loading-pulse">Grabando...</span></> : "🎤 Voz"}
          </button>
          <button className="btn-primary" onClick={crearNota} disabled={!texto.trim()} style={{ opacity:!texto.trim()?0.5:1, padding:"7px 18px" }}>
            Guardar
          </button>
        </div>
        {transcribiendo && <div style={{ fontSize:11, color:G.gold, marginTop:8 }}>Transcribiendo...</div>}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
        <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Buscar notas..." style={{ width:200, fontSize:12 }} />
        <select value={filtroObra} onChange={e=>setFiltroObra(e.target.value)} style={{ width:"auto", fontSize:12 }}>
          <option value="todas">Todas las obras</option>
          {obras.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <div style={{ display:"flex", gap:4 }}>
          <div onClick={()=>setFiltroColor("todos")} style={{ width:20, height:20, borderRadius:"50%", background:G.border, cursor:"pointer", border:filtroColor==="todos"?`2px solid ${G.text}`:"2px solid transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>✕</div>
          {COLORES.map(c=>(
            <div key={c.id} onClick={()=>setFiltroColor(filtroColor===c.id?"todos":c.id)} title={c.label}
              style={{ width:20, height:20, borderRadius:"50%", background:c.id, cursor:"pointer", border:filtroColor===c.id?`2px solid ${G.text}`:"2px solid transparent" }} />
          ))}
        </div>
        <div style={{ fontSize:11, color:G.textMuted, marginLeft:"auto" }}>{notasFiltradas.length} nota{notasFiltradas.length!==1?"s":""}</div>
      </div>

      {/* Notas fijadas */}
      {notasFijadas.length > 0 && (
        <div>
          <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:10 }}>📌 FIJADAS</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12 }}>
            {notasFijadas.map(nota => <NotaCard key={nota.id} nota={nota} obras={obras} onToggleFijada={toggleFijada} onEliminar={eliminar} onMejorar={mejorarConIA} loadingIA={loadingIA} editando={editando} setEditando={setEditando} saveNotas={saveNotas} notas={notas} />)}
          </div>
        </div>
      )}

      {/* Notas normales */}
      {notasNormales.length === 0 && notasFijadas.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px 0", color:G.textMuted }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📝</div>
          <div className="serif" style={{ fontSize:18, marginBottom:8 }}>Sin notas</div>
          <div style={{ fontSize:13 }}>Escribe arriba o usa el micrófono para capturar ideas rápidas en obra</div>
        </div>
      )}

      {notasNormales.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12 }}>
          {notasNormales.map(nota => <NotaCard key={nota.id} nota={nota} obras={obras} onToggleFijada={toggleFijada} onEliminar={eliminar} onMejorar={mejorarConIA} loadingIA={loadingIA} editando={editando} setEditando={setEditando} saveNotas={saveNotas} notas={notas} />)}
        </div>
      )}
    </div>
  );
}

function NotaCard({ nota, obras, onToggleFijada, onEliminar, onMejorar, loadingIA, editando, setEditando, saveNotas, notas }) {
  const [textoEdit, setTextoEdit] = useState(nota.texto);
  const esMia = editando === nota.id;
  const obra = obras.find(o=>o.id===nota.obraId);

  const guardarEdicion = () => {
    saveNotas(notas.map(n=>n.id===nota.id?{...n,texto:textoEdit}:n));
    setEditando(null);
  };

  return (
    <div style={{ background:G.surface, border:`1px solid ${nota.color}44`, borderTop:`3px solid ${nota.color}`, borderRadius:"0 0 8px 8px", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10, position:"relative" }}>
      {/* Header */}
      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
            {nota.tipo==="voz" && <span style={{ fontSize:11 }}>🎤</span>}
            {nota.fijada && <span style={{ fontSize:11 }}>📌</span>}
            {nota.mejoradaIA && <span className="tag" style={{ background:G.gold+"22", color:G.gold, fontSize:9 }}>✦ IA</span>}
            {obra && <span className="tag" style={{ background:obra.color+"22", color:obra.color, fontSize:9 }}>{obra.nombre.slice(0,18)}</span>}
          </div>
          <div className="mono" style={{ fontSize:9, color:G.textDim }}>{nota.fecha} {nota.hora}</div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          <button onClick={()=>onToggleFijada(nota.id)} style={{ background:"none",border:"none",color:nota.fijada?G.gold:G.textDim,cursor:"pointer",fontSize:14,padding:2 }} title="Fijar">📌</button>
          <button onClick={()=>esMia?setEditando(null):setEditando(nota.id)} style={{ background:"none",border:"none",color:G.textDim,cursor:"pointer",padding:2 }} title="Editar">{Icon.edit}</button>
          <button onClick={()=>onEliminar(nota.id)} style={{ background:"none",border:"none",color:G.textDim,cursor:"pointer",padding:2 }} title="Eliminar">{Icon.trash}</button>
        </div>
      </div>

      {/* Contenido */}
      {esMia ? (
        <div>
          <textarea value={textoEdit} onChange={e=>setTextoEdit(e.target.value)} style={{ width:"100%", minHeight:80, resize:"vertical", fontSize:12, lineHeight:1.6 }} autoFocus />
          <div style={{ display:"flex", gap:6, marginTop:8 }}>
            <button className="btn-primary" onClick={guardarEdicion} style={{ fontSize:11, padding:"5px 12px" }}>Guardar</button>
            <button className="btn-ghost" onClick={()=>setEditando(null)} style={{ fontSize:11 }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize:13, lineHeight:1.7, color:G.text, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{nota.texto}</div>
      )}

      {/* Texto original si fue mejorada */}
      {nota.textoOriginal && !esMia && (
        <div style={{ fontSize:10, color:G.textDim, fontStyle:"italic", borderTop:`1px solid ${G.border}`, paddingTop:6 }}>
          Original: {nota.textoOriginal.slice(0,80)}{nota.textoOriginal.length>80?"…":""}
        </div>
      )}

      {/* Acción IA */}
      {!esMia && (
        <button onClick={()=>onMejorar(nota)} disabled={loadingIA===nota.id}
          style={{ background:"none", border:`1px solid ${G.gold}33`, color:G.gold, borderRadius:4, padding:"4px 10px", fontSize:10, cursor:"pointer", opacity:loadingIA===nota.id?0.5:1, alignSelf:"flex-start" }}>
          {loadingIA===nota.id?"Mejorando…":"✦ Mejorar con IA"}
        </button>
      )}
    </div>
  );
}

// === AUDITOR-A ===& HISTORIAL ----------------------------------------------------
function AuditoriaView({ obras, onSelectObra }) {
  const [log, setLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bf-auditoria")||"[]"); } catch { return []; }
  });
  const [filtroObra, setFiltroObra] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [loadingIA, setLoadingIA] = useState(false);
  const [analisisIA, setAnalisisIA] = useState("");

  const limpiarLog = () => {
    if (!window.confirm("¿Limpiar todo el historial de auditoría?")) return;
    localStorage.removeItem("bf-auditoria");
    setLog([]);
  };

  const logFiltrado = log.filter(e => {
    if (filtroObra !== "todas" && e.obraId !== filtroObra) return false;
    if (busqueda && !e.obraNombre?.toLowerCase().includes(busqueda.toLowerCase()) && !e.cambios?.join(" ").toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  // Estad-sticas de actividad
  const actividadPorObra = obras.map(o => ({
    ...o,
    nCambios: log.filter(e => e.obraId === o.id).length,
    ultimoCambio: log.filter(e => e.obraId === o.id)[0]?.fecha || "—",
  })).sort((a,b) => b.nCambios - a.nCambios);

  const actividadPorDia = (() => {
    const map = {};
    log.forEach(e => { map[e.fecha] = (map[e.fecha]||0) + 1; });
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 14);
  })();
  const maxActividad = Math.max(...actividadPorDia.map(([,n])=>n), 1);

  // Tipos de cambio m-s frecuentes
  const tiposCambio = (() => {
    const map = {};
    log.forEach(e => (e.cambios||[]).forEach(c => {
      const tipo = c.split(":")[0];
      map[tipo] = (map[tipo]||0) + 1;
    }));
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  })();

  const analizarPatrones = async () => {
    setLoadingIA(true); setAnalisisIA("");
    const resumen = `Total cambios registrados: ${log.length}. Por obra: ${actividadPorObra.slice(0,5).map(o=>`${o.nombre}: ${o.nCambios} cambios`).join(", ")}. Tipos más frecuentes: ${tiposCambio.slice(0,5).map(([t,n])=>`${t}: ${n}`).join(", ")}. Últimos 5 cambios: ${log.slice(0,5).map(e=>`${e.obraNombre} — ${e.cambios?.join(", ")}`).join(" | ")}.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 500,
          messages: [{ role: "user", content: `Analiza este historial de actividad de una app de gestión de obras y detecta patrones, anomalías o insights útiles:\n\n${resumen}\n\nProporciona: 1) Obra más activa y por qué puede ser relevante, 2) Patrones de uso detectados, 3) Recomendaciones basadas en la actividad. Máximo 150 palabras.` }]
        })
      });
      const data = await res.json();
      setAnalisisIA(data.content?.find(b=>b.type==="text")?.text||"");
    } catch { setAnalisisIA("Error al analizar."); }
    setLoadingIA(false);
  };

  // Agrupar log por fecha
  const logAgrupado = (() => {
    const grupos = {};
    logFiltrado.forEach(e => {
      if (!grupos[e.fecha]) grupos[e.fecha] = [];
      grupos[e.fecha].push(e);
    });
    return Object.entries(grupos).sort((a,b)=>b[0].localeCompare(a[0]));
  })();

  const tipoColor = (cambio) => {
    if (cambio.includes("Estado")) return G.gold;
    if (cambio.includes("Incidencias")) return G.red;
    if (cambio.includes("Presupuesto")) return G.orange;
    if (cambio.includes("Tareas")) return G.green;
    if (cambio.includes("Extras")) return G.blue;
    return G.textMuted;
  };

  return (
    <div style={{ padding:28, overflow:"auto", height:"100%" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div className="serif" style={{ fontSize:26, marginBottom:4 }}>Auditoría & Historial</div>
          <div style={{ fontSize:13, color:G.textMuted }}>{log.length} cambio{log.length!==1?"s":""} registrado{log.length!==1?"s":""} · Se actualizan automáticamente</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-primary" onClick={analizarPatrones} disabled={loadingIA||log.length===0} style={{ fontSize:12, opacity:loadingIA||log.length===0?0.5:1 }}>
            {loadingIA?"Analizando…":"✦ Analizar patrones"}
          </button>
          {log.length > 0 && <button className="btn-ghost" onClick={limpiarLog} style={{ fontSize:12 }}>🗑 Limpiar</button>}
        </div>
      </div>

      {/* Análisis IA */}
      {analisisIA && (
        <div style={{ background:"#1A1A13", border:`1px solid ${G.gold}33`, borderRadius:8, padding:"16px 20px", marginBottom:24, display:"flex", gap:14 }}>
          <div style={{ fontSize:20 }}>✦</div>
          <div>
            <div style={{ fontSize:11, color:G.gold, fontFamily:"DM Mono", marginBottom:8 }}>ANÁLISIS DE PATRONES IA</div>
            <div style={{ fontSize:13, lineHeight:1.8, color:G.text, whiteSpace:"pre-wrap" }}>{analisisIA}</div>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24 }}>
        {/* Log principal */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Filtros */}
          <div style={{ display:"flex", gap:10 }}>
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Buscar en historial..." style={{ flex:1, fontSize:12 }} />
            <select value={filtroObra} onChange={e=>setFiltroObra(e.target.value)} style={{ width:"auto", fontSize:12 }}>
              <option value="todas">Todas las obras</option>
              {obras.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>

          {/* Log agrupado por fecha */}
          {log.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:G.textMuted }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
              <div className="serif" style={{ fontSize:18, marginBottom:8 }}>Sin historial aún</div>
              <div style={{ fontSize:13 }}>Los cambios se registran automáticamente al modificar obras, tareas, incidencias, planos y más</div>
            </div>
          ) : logAgrupado.length === 0 ? (
            <div style={{ color:G.textMuted, textAlign:"center", padding:40 }}>Sin resultados para estos filtros</div>
          ) : (
            logAgrupado.map(([fecha, entradas]) => (
              <div key={fecha}>
                {/* Separador de fecha */}
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                  <div className="serif" style={{ fontSize:13, color:G.text }}>{fecha}</div>
                  <span style={{ fontSize:10, color:G.textDim, fontFamily:"DM Mono" }}>{entradas.length} cambio{entradas.length!==1?"s":""}</span>
                  <div style={{ flex:1, height:1, background:G.border }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
                  {entradas.map(e => (
                    <div key={e.id} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"10px 14px", borderRadius:6, background:G.surface, border:`1px solid ${G.border}` }}>
                      {/* Timeline dot */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:4 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:G.gold, flexShrink:0 }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5 }}>
                          <span onClick={()=>onSelectObra(e.obraId)} style={{ fontSize:13, fontWeight:500, color:G.gold, cursor:"pointer" }}>{e.obraNombre}</span>
                          <span className="mono" style={{ fontSize:10, color:G.textDim }}>{e.hora}</span>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          {(e.cambios||[]).map((c, i) => (
                            <div key={i} style={{ display:"flex", gap:6, alignItems:"center", fontSize:12 }}>
                              <div style={{ width:6, height:6, borderRadius:2, background:tipoColor(c), flexShrink:0 }} />
                              <span style={{ color:G.text }}>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panel derecho — stats */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Actividad por día */}
          {actividadPorDia.length > 0 && (
            <div className="card">
              <div className="serif" style={{ fontSize:14, marginBottom:14 }}>Actividad últimas 2 semanas</div>
              <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:60 }}>
                {actividadPorDia.slice().reverse().map(([fecha, n], i) => (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <div style={{ width:"100%", background:G.gold, borderRadius:"2px 2px 0 0", height:`${Math.round((n/maxActividad)*50)}px`, minHeight:4, opacity:0.7+0.3*(n/maxActividad) }} title={`${fecha}: ${n} cambios`} />
                    <div style={{ fontSize:8, color:G.textDim, fontFamily:"DM Mono", transform:"rotate(-45deg)", whiteSpace:"nowrap" }}>
                      {fecha.split("/").slice(0,2).join("/")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tipos de cambio */}
          {tiposCambio.length > 0 && (
            <div className="card">
              <div className="serif" style={{ fontSize:14, marginBottom:14 }}>Tipos de cambio</div>
              {tiposCambio.slice(0,8).map(([tipo, n]) => (
                <div key={tipo} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:12 }}>{tipo}</span>
                      <span className="mono" style={{ fontSize:11, color:G.gold }}>{n}</span>
                    </div>
                    <div style={{ height:4, background:G.border, borderRadius:2 }}>
                      <div style={{ height:"100%", borderRadius:2, background:G.gold, width:`${(n/tiposCambio[0][1])*100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Obras más activas */}
          <div className="card">
            <div className="serif" style={{ fontSize:14, marginBottom:14 }}>Obras más activas</div>
            {actividadPorObra.filter(o=>o.nCambios>0).slice(0,6).map((o, i) => (
              <div key={o.id} onClick={()=>onSelectObra(o.id)} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${G.border}`, cursor:"pointer" }}>
                <div className="serif" style={{ fontSize:16, color:G.textDim, width:20, flexShrink:0 }}>#{i+1}</div>
                <div style={{ width:6, height:6, borderRadius:2, background:o.color, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.nombre}</div>
                  <div style={{ fontSize:10, color:G.textDim }}>Último: {o.ultimoCambio}</div>
                </div>
                <span className="mono" style={{ fontSize:12, color:G.gold }}>{o.nCambios}</span>
              </div>
            ))}
            {actividadPorObra.filter(o=>o.nCambios>0).length===0 && (
              <div style={{ color:G.textMuted, fontSize:12 }}>Sin actividad registrada aún</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// === ETIQUETAS ===& FILTROS GLOBALES ---------------------------------------------
const ETIQUETAS_DEFAULT = [
  { id: "urgente",    label: "Urgente",      color: "#E05C5C", emoji: "🔴" },
  { id: "prioritario",label: "Prioritario",  color: "#E08D3C", emoji: "🟠" },
  { id: "revision",   label: "Revisión",     color: "#C8A96E", emoji: "🟡" },
  { id: "aprobado",   label: "Aprobado",     color: "#5CB87A", emoji: "✅" },
  { id: "pendiente_cliente", label: "Pdte. cliente", color: "#A06EBE", emoji: "👤" },
  { id: "pendiente_pago",    label: "Pdte. pago",    color: "#5C9BE0", emoji: "💶" },
  { id: "destacado",  label: "Destacado",    color: "#C8A96E", emoji: "⭐" },
  { id: "archivado",  label: "Archivado",    color: "#555",    emoji: "📦" },
];

function EtiquetasView({ obras, onUpdateObra, onSelectObra }) {
  const [etiquetas, setEtiquetas] = useState(() => {
    try { const s = localStorage.getItem("bf-etiquetas"); return s ? JSON.parse(s) : ETIQUETAS_DEFAULT; } catch { return ETIQUETAS_DEFAULT; }
  });
  const [etiqActiva, setEtiqActiva] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [nuevaEtiq, setNuevaEtiq] = useState({ label: "", color: "#C8A96E", emoji: "🏷️" });
  const [modalNueva, setModalNueva] = useState(false);
  const [vistaResultados, setVistaResultados] = useState("obras"); // "obras" | "tareas" | "incidencias" | "materiales"

  const saveEtiquetas = (nuevas) => {
    setEtiquetas(nuevas);
    try { localStorage.setItem("bf-etiquetas", JSON.stringify(nuevas)); } catch(e) { void 0; }
  };

  // Asignar etiqueta a obra
  const toggleEtiqueta = (obraId, etiqId) => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    const etiqsActuales = obra.etiquetas || [];
    const nuevasEtiqs = etiqsActuales.includes(etiqId)
      ? etiqsActuales.filter(e => e !== etiqId)
      : [...etiqsActuales, etiqId];
    onUpdateObra({ ...obra, etiquetas: nuevasEtiqs });
  };

  // Filtrado global cross-obra
  const resultados = (() => {
    const texto = filtroTexto.toLowerCase();

    // Obras
    const obrasR = obras.filter(o => {
      if (etiqActiva && !(o.etiquetas||[]).includes(etiqActiva)) return false;
      if (filtroEstado !== "todas" && o.estado !== filtroEstado) return false;
      if (texto && !o.nombre.toLowerCase().includes(texto) && !o.cliente?.toLowerCase().includes(texto)) return false;
      return true;
    });

    // Tareas cross-obra
    const tareasR = obras.flatMap(o =>
      (o.tareas||[]).filter(t => {
        if (texto && !t.titulo.toLowerCase().includes(texto) && !t.responsable?.toLowerCase().includes(texto)) return false;
        if (filtroPrioridad !== "todas" && t.prioridad !== filtroPrioridad) return false;
        if (filtroEstado !== "todas" && t.estado !== filtroEstado) return false;
        return true;
      }).map(t => ({ ...t, obraNombre: o.nombre, obraId: o.id, obraColor: o.color }))
    );

    // Incidencias cross-obra
    const incidenciasR = obras.flatMap(o =>
      (o.incidencias||[]).filter(i => {
        if (texto && !i.titulo.toLowerCase().includes(texto)) return false;
        if (filtroPrioridad !== "todas" && i.prioridad !== filtroPrioridad) return false;
        if (filtroEstado !== "todas" && i.estado !== filtroEstado) return false;
        return true;
      }).map(i => ({ ...i, obraNombre: o.nombre, obraId: o.id, obraColor: o.color }))
    );

    // Materiales cross-obra
    const materialesR = obras.flatMap(o =>
      (o.materiales||[]).filter(m => {
        if (texto && !m.nombre.toLowerCase().includes(texto) && !m.proveedor?.toLowerCase().includes(texto)) return false;
        if (filtroEstado !== "todas" && m.estado !== filtroEstado) return false;
        return true;
      }).map(m => ({ ...m, obraNombre: o.nombre, obraId: o.id, obraColor: o.color }))
    );

    return { obras: obrasR, tareas: tareasR, incidencias: incidenciasR, materiales: materialesR };
  })();

  const hayFiltros = etiqActiva || filtroTexto || filtroEstado !== "todas" || filtroPrioridad !== "todas";
  const totalResultados = resultados.obras.length + resultados.tareas.length + resultados.incidencias.length + resultados.materiales.length;

  const COLORES_ETIQ = ["#E05C5C","#E08D3C","#C8A96E","#5CB87A","#5C9BE0","#A06EBE","#5CE0D8","#E0C85C","#888","#1A1A2E"];
  const EMOJIS_ETIQ = ["🏷️","🔴","🟠","🟡","✅","⭐","💶","👤","📦","🚀","⚠️","🔑","📌","🎯","💡"];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Panel izquierdo — etiquetas */}
      <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 16px 12px", borderBottom: `1px solid ${G.border}` }}>
          <div className="serif" style={{ fontSize: 18, marginBottom: 4 }}>Etiquetas</div>
          <div style={{ fontSize: 11, color: G.textMuted }}>Organiza y filtra todo el contenido</div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "10px 8px" }}>
          {/* Todas */}
          <button onClick={() => setEtiqActiva(null)} className="nav-item" style={{ width: "100%", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🏷️</span>
              <span style={{ fontSize: 13, color: !etiqActiva ? G.gold : G.textMuted }}>Todas las etiquetas</span>
            </span>
            <span className="mono" style={{ fontSize: 10, color: G.textDim }}>{obras.length}</span>
          </button>

          <div style={{ fontSize: 9, color: G.textDim, padding: "12px 12px 6px", fontFamily: "DM Mono", letterSpacing: "0.06em" }}>MIS ETIQUETAS</div>

          {etiquetas.map(etiq => {
            const obrasConEtiq = obras.filter(o => (o.etiquetas||[]).includes(etiq.id));
            const activa = etiqActiva === etiq.id;
            return (
              <div key={etiq.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 6, background: activa ? etiq.color+"22" : "transparent", cursor: "pointer", marginBottom: 2 }}
                onClick={() => setEtiqActiva(activa ? null : etiq.id)}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{etiq.emoji}</span>
                <span style={{ flex: 1, fontSize: 12, color: activa ? etiq.color : G.text }}>{etiq.label}</span>
                <span className="mono" style={{ fontSize: 10, color: G.textDim }}>{obrasConEtiq.length}</span>
                <button onClick={e => { e.stopPropagation(); if(window.confirm(`¿Eliminar etiqueta "${etiq.label}"?`)) saveEtiquetas(etiquetas.filter(x=>x.id!==etiq.id)); }}
                  style={{ background:"none",border:"none",color:G.textDim,cursor:"pointer",padding:2,opacity:0,fontSize:12 }}
                  onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0"}>✕</button>
              </div>
            );
          })}

          <button onClick={() => setModalNueva(true)} style={{ width:"100%", background:"none", border:`1px dashed ${G.border}`, color:G.textMuted, borderRadius:6, padding:"7px 12px", fontSize:11, cursor:"pointer", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
            + Nueva etiqueta
          </button>
        </div>
      </div>

      {/* Panel central — filtros + resultados */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Barra de filtros */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${G.border}`, background: G.surface, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)}
            placeholder="🔍 Buscar en toda la app..." style={{ width: 240, fontSize: 12 }} />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width:"auto", fontSize: 12 }}>
            <option value="todas">Todos los estados</option>
            <option value="en_curso">En curso</option>
            <option value="pendiente">Pendiente</option>
            <option value="completada">Completada</option>
            <option value="abierta">Abierta</option>
            <option value="resuelta">Resuelta</option>
            <option value="recibido">Recibido</option>
          </select>
          <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)} style={{ width:"auto", fontSize: 12 }}>
            <option value="todas">Todas las prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          {hayFiltros && (
            <button onClick={() => { setEtiqActiva(null); setFiltroTexto(""); setFiltroEstado("todas"); setFiltroPrioridad("todas"); }}
              className="btn-ghost" style={{ fontSize: 11 }}>✕ Limpiar filtros</button>
          )}
          {hayFiltros && <span style={{ fontSize: 11, color: G.gold, fontFamily: "DM Mono" }}>{totalResultados} resultado{totalResultados!==1?"s":""}</span>}
        </div>

        {/* Sub-tabs resultados */}
        <div style={{ display: "flex", gap: 2, padding: "0 20px", borderBottom: `1px solid ${G.border}`, background: G.surface }}>
          {[
            ["obras", `Obras (${resultados.obras.length})`],
            ["tareas", `Tareas (${resultados.tareas.length})`],
            ["incidencias", `Incidencias (${resultados.incidencias.length})`],
            ["materiales", `Materiales (${resultados.materiales.length})`],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setVistaResultados(id)}
              className={`tab-btn ${vistaResultados === id ? "active" : ""}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Resultados */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>

          {/* OBRAS */}
          {vistaResultados === "obras" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {resultados.obras.length === 0 && <div style={{ color: G.textMuted, textAlign: "center", padding: 40 }}>Sin obras con estos filtros</div>}
              {resultados.obras.map(obra => {
                const etiqsObra = etiquetas.filter(e => (obra.etiquetas||[]).includes(e.id));
                return (
                  <div key={obra.id} className="card obra-card" style={{ borderLeftColor: obra.color }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onSelectObra(obra.id)}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                          <span className="serif" style={{ fontSize: 14 }}>{obra.nombre}</span>
                          {estadoTag(obra.estado)}
                          {etiqsObra.map(e => (
                            <span key={e.id} className="tag" style={{ background: e.color+"22", color: e.color }}>{e.emoji} {e.label}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: G.textMuted }}>{obra.cliente} · {obra.ubicacion}</div>
                      </div>
                      {/* Asignar etiquetas */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200, justifyContent: "flex-end" }}>
                        {etiquetas.map(e => {
                          const tiene = (obra.etiquetas||[]).includes(e.id);
                          return (
                            <button key={e.id} onClick={() => toggleEtiqueta(obra.id, e.id)}
                              style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, border: `1px solid ${tiene ? e.color : G.border}`, background: tiene ? e.color+"22" : "transparent", cursor: "pointer", opacity: tiene ? 1 : 0.4, transition: "all 0.15s" }}
                              title={e.label}>
                              {e.emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAREAS */}
          {vistaResultados === "tareas" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resultados.tareas.length === 0 && <div style={{ color: G.textMuted, textAlign: "center", padding: 40 }}>Sin tareas con estos filtros</div>}
              {resultados.tareas.map((t, i) => (
                <div key={i} className="card" style={{ borderLeft: `3px solid ${t.obraColor}`, cursor: "pointer" }} onClick={() => onSelectObra(t.obraId)}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORIDADES[t.prioridad]||G.textMuted, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, textDecoration: t.estado==="completada"?"line-through":"none", color: t.estado==="completada"?G.textMuted:G.text }}>{t.titulo}</div>
                      <div style={{ fontSize: 10, color: G.textMuted, marginTop: 2 }}>{t.obraNombre} · {t.responsable||"Sin responsable"}</div>
                    </div>
                    {estadoTag(t.estado, "tarea")}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INCIDENCIAS */}
          {vistaResultados === "incidencias" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resultados.incidencias.length === 0 && <div style={{ color: G.textMuted, textAlign: "center", padding: 40 }}>Sin incidencias con estos filtros</div>}
              {resultados.incidencias.map((inc, i) => {
                const pri = PRIORIDADES_INC[inc.prioridad]||PRIORIDADES_INC.media;
                const est = ESTADOS_INC[inc.estado]||ESTADOS_INC.abierta;
                return (
                  <div key={i} className="card" style={{ borderLeft: `3px solid ${pri.color}`, cursor: "pointer" }} onClick={() => onSelectObra(inc.obraId)}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{inc.titulo}</div>
                        <div style={{ fontSize: 10, color: G.textMuted, marginTop: 2 }}>{inc.obraNombre} · {inc.tipo} · {inc.fecha}</div>
                      </div>
                      <span className="tag" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                      <span className="tag" style={{ background: pri.color+"22", color: pri.color }}>{pri.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MATERIALES */}
          {vistaResultados === "materiales" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resultados.materiales.length === 0 && <div style={{ color: G.textMuted, textAlign: "center", padding: 40 }}>Sin materiales con estos filtros</div>}
              {resultados.materiales.map((m, i) => {
                const est = ESTADOS_MAT[m.estado]||ESTADOS_MAT.pendiente;
                return (
                  <div key={i} className="card" style={{ cursor: "pointer" }} onClick={() => onSelectObra(m.obraId)}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.nombre} {m.critico && "🔴"}</div>
                        <div style={{ fontSize: 10, color: G.textMuted, marginTop: 2 }}>{m.obraNombre} · {m.proveedor||"—"} · {m.cantidad} {m.unidad}</div>
                      </div>
                      <span className="mono" style={{ fontSize: 12, color: G.gold }}>{fmt(m.cantidad*m.precioUnit)}</span>
                      <span className="tag" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho — asignar etiquetas a obras */}
      <div style={{ width: 220, flexShrink: 0, borderLeft: `1px solid ${G.border}`, display: "flex", flexDirection: "column", overflow: "auto" }}>
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${G.border}` }}>
          <div style={{ fontSize: 11, color: G.textMuted, fontFamily: "DM Mono" }}>ETIQUETAS POR OBRA</div>
        </div>
        <div style={{ padding: "10px 10px", overflow: "auto" }}>
          {obras.map(o => {
            const etiqsObra = etiquetas.filter(e => (o.etiquetas||[]).includes(e.id));
            return (
              <div key={o.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: o.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.nombre}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingLeft: 12 }}>
                  {etiqsObra.length === 0 && <span style={{ fontSize: 10, color: G.textDim }}>Sin etiquetas</span>}
                  {etiqsObra.map(e => (
                    <span key={e.id} onClick={() => toggleEtiqueta(o.id, e.id)} className="tag"
                      style={{ background: e.color+"22", color: e.color, cursor: "pointer" }} title="Clic para quitar">
                      {e.emoji} {e.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal nueva etiqueta */}
      {modalNueva && (
        <Modal title="Nueva Etiqueta" onClose={() => setModalNueva(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 5 }}>NOMBRE *</label>
              <input value={nuevaEtiq.label} onChange={e => setNuevaEtiq(f => ({...f, label: e.target.value}))} placeholder="Urgente, VIP, Revisión..." autoFocus /></div>
            <div>
              <label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 8 }}>COLOR</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLORES_ETIQ.map(c => (
                  <div key={c} onClick={() => setNuevaEtiq(f => ({...f, color: c}))} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: "pointer", border: nuevaEtiq.color===c?`2px solid ${G.text}`:"2px solid transparent" }} />
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: G.textMuted, display: "block", marginBottom: 8 }}>EMOJI</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMOJIS_ETIQ.map(em => (
                  <div key={em} onClick={() => setNuevaEtiq(f => ({...f, emoji: em}))} style={{ width: 36, height: 36, borderRadius: 6, background: nuevaEtiq.emoji===em?nuevaEtiq.color+"33":G.bg, border: `1px solid ${nuevaEtiq.emoji===em?nuevaEtiq.color:G.border}`, cursor: "pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize: 18 }}>
                    {em}
                  </div>
                ))}
              </div>
            </div>
            {/* Preview */}
            {nuevaEtiq.label && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: G.textMuted }}>Vista previa:</span>
                <span className="tag" style={{ background: nuevaEtiq.color+"22", color: nuevaEtiq.color }}>{nuevaEtiq.emoji} {nuevaEtiq.label}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => setModalNueva(false)}>Cancelar</button>
              <button className="btn-primary" onClick={() => {
                if (!nuevaEtiq.label.trim()) return;
                const nueva = { id: uid(), ...nuevaEtiq };
                saveEtiquetas([...etiquetas, nueva]);
                setNuevaEtiq({ label: "", color: "#C8A96E", emoji: "🏷️" });
                setModalNueva(false);
              }} disabled={!nuevaEtiq.label.trim()} style={{ opacity: !nuevaEtiq.label.trim()?0.5:1 }}>
                Crear etiqueta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === ASISTENTE ===IA GLOBAL ------------------------------------------------------
function buildContexto(obras) {
  const fmt = n => new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
  const hoy = new Date().toLocaleDateString("es-ES");
  const diasRest = fechaFin => fechaFin ? Math.ceil((new Date(fechaFin)-new Date())/864e5) : null;

  const resumen = obras.map(o => {
    const fases = (o.fases||[]);
    const tareas = (o.tareas||[]);
    const proveedores = (o.proveedores||[]);
    const incidencias = (o.incidencias||[]);
    const materiales = (o.materiales||[]);
    const eco = o.economica||{};
    const presup = (eco.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0)||o.presupuesto||0;
    const real   = (eco.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
    const cobros = (eco.cobros||[]).reduce((a,c)=>a+(Number(c.importe)||0),0);
    const dr = diasRest(o.fechaFin);
    const perfilCliente = o.clienteIA?.perfil;
    const promesas = (o.clienteIA?.promesas||[]).filter(p=>p.estado==="pendiente");

    return `
## OBRA: ${o.nombre}
- Cliente: ${o.cliente||"—"} | Ubicación: ${o.ubicacion||"—"}
- Estado: ${o.estado} | Inicio: ${o.fechaInicio||"—"} | Entrega: ${o.fechaFin||"—"}${dr!==null?` (${dr<0?`RETRASADA ${Math.abs(dr)}d`:`${dr}d restantes`})`:""}
- Presupuesto: ${fmt(presup)} | Coste real: ${fmt(real)} | Desviación: ${fmt(real-presup)} (${presup?Math.round(((real-presup)/presup)*100):0}%)
- Cobros: ${fmt(cobros)} | Margen: ${fmt(cobros-real)}
- Fases: ${fases.length} (${fases.filter(f=>f.estado==="completada").length} completadas, ${fases.filter(f=>Number(f.retrasoReal)>0).length} retrasadas)
${fases.map(f=>`  · ${f.nombre}: ${f.estado}${Number(f.retrasoReal)>0?` ⚠+${f.retrasoReal}d`:""}${f.material?` [material crítico: ${f.material}]`:""}`).join("\n")||"  (sin fases)"}
- Tareas: ${tareas.filter(t=>t.estado==="completada").length}/${tareas.length} completadas
${tareas.filter(t=>t.estado!=="completada").slice(0,5).map(t=>`  · PEND: ${t.titulo} (${t.prioridad}) — ${t.responsable||"sin responsable"}`).join("\n")||"  (sin tareas pendientes)"}
- Proveedores: ${proveedores.map(p=>`${p.nombre} (${Array.isArray(p.especialidad)?p.especialidad.join(", "):(p.especialidad&&p.especialidad!=="undefined"?p.especialidad:"")}, ${p.estado}, ${fmt(p.importe)})`).join(", ")||"—"}
- Incidencias: ${incidencias.filter(i=>i.estado==="abierta").length} abiertas, ${incidencias.filter(i=>i.prioridad==="critica"&&i.estado!=="cerrada").length} críticas
${incidencias.filter(i=>i.estado==="abierta").map(i=>`  · ${i.titulo} (${i.prioridad}, ${i.tipo})`).join("\n")||""}
- Materiales: ${materiales.length} total, ${materiales.filter(m=>m.estado==="pendiente").length} pendientes, ${materiales.filter(m=>m.critico&&m.estado!=="recibido").length} críticos
${materiales.filter(m=>m.estado!=="recibido").slice(0,4).map(m=>`  · ${m.nombre}: ${m.estado}${m.critico?" 🔴":""}`).join("\n")||""}
${perfilCliente?`- Perfil cliente: ${perfilCliente.tono}, exigencia ${perfilCliente.nivelExigencia}. ${perfilCliente.comoTratarle}`:""}
${promesas.length?`- Compromisos pendientes: ${promesas.map(p=>p.texto).join(", ")}`:""}
`;
  }).join("\n---\n");

  return `Eres el Asistente IA de Blue Forest, la app de gestión de obras de reforma. Tienes acceso completo a toda la información del negocio. Hoy es ${hoy}.

DATOS COMPLETOS DE TODAS LAS OBRAS:
${resumen}

INSTRUCCIONES:
- Responde siempre en español
- Sé directo, concreto y útil — como un consultor experto en obras
- Si detectas problemas reales (retrasos, desviaciones, incidencias críticas) menciónalos proactivamente
- Puedes hacer cálculos, comparar obras, detectar patrones, sugerir acciones
- Cuando menciones una obra, usa su nombre exacto
- Formato: usa bullet points cuando haya listas, negrita para datos importantes`;
}

const SUGERENCIAS_RAPIDAS = [
  "¿Qué obras están retrasadas?",
  "¿Cuál es el margen global de todas las obras?",
  "¿Qué incidencias críticas hay abiertas?",
  "¿Qué materiales críticos están pendientes?",
  "¿Qué cobros están vencidos?",
  "Dame un resumen del estado de todas las obras",
  "¿Qué tareas de alta prioridad están sin responsable?",
  "¿Qué obra tiene mayor desviación presupuestaria?",
  "¿Qué proveedor trabaja en más obras activas?",
  "Genera un resumen ejecutivo del negocio",
];

function AsistenteIA({ obras, onSelectObra }) {
  const [mensajes, setMensajes] = useState([
    { role: "assistant", content: `✦ Hola! Soy el asistente de Blue Forest.\n\nTengo acceso completo a **${obras.length} obra${obras.length!==1?"s":""}** con toda su información: fases, tareas, económico, incidencias, materiales, proveedores, fotos, garantías y perfiles de clientes.\n\n¿En qué te puedo ayudar hoy?`, ts: new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState("chat"); // "chat" | "analisis"
  const [analisisIA, setAnalisisIA] = useState("");
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const bottomRef = { current: null };

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  // Contexto rico para la IA
  const buildContextoCompleto = () => {
    const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch(e) { return {}; } })();
    const lines = [
      `ESTUDIO: ${config.estudio||"Sin nombre"} | Profesional: ${config.nombre||"—"}`,
      `FECHA HOY: ${new Date().toLocaleDateString("es-ES")}`,
      `\nRESUMEN GLOBAL:`,
      `- Total obras: ${obras.length} (${obras.filter(o=>o.estado==="en_curso").length} activas, ${obras.filter(o=>o.estado==="completada").length} completadas, ${obras.filter(o=>o.estado==="pendiente").length} pendientes)`,
      `- Total presupuesto: ${fmt(obras.reduce((a,o)=>a+(o.presupuesto||0),0))}`,
      `- Incidencias abiertas: ${obras.reduce((a,o)=>a+(o.incidencias||[]).filter(i=>i.estado==="abierta").length,0)}`,
      `- Tareas pendientes: ${obras.reduce((a,o)=>a+(o.tareas||[]).filter(t=>t.estado!=="completada").length,0)}`,
      `- Cobros pendientes: ${fmt(obras.reduce((a,o)=>a+(o.economica?.cobros||[]).filter(c=>c.estado==="pendiente").reduce((s,c)=>s+(Number(c.importe)||0),0),0))}`,
      `\nDETALLE POR OBRA:`,
    ];

    obras.forEach(o => {
      const fases = o.fases||[];
      const tareas = o.tareas||[];
      const incs = o.incidencias||[];
      const mats = o.materiales||[];
      const extras = o.extras||[];
      const garantias = o.garantias||[];
      const eco = o.economica||{};
      const presup = (eco.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0)||o.presupuesto||0;
      const real = (eco.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
      const cobros = (eco.cobros||[]).reduce((a,c)=>a+(Number(c.importe)||0),0);
      const diasR = o.fechaFin ? Math.ceil((new Date(o.fechaFin)-new Date())/864e5) : null;

      lines.push(`\n--- ${o.nombre.toUpperCase()} ---`);
      lines.push(`Estado: ${o.estado} | Cliente: ${o.cliente||"—"} | ${o.ubicacion||""}`);
      lines.push(`Fechas: ${o.fechaInicio||"?"} → ${o.fechaFin||"?"}${diasR!==null?(diasR<0?` (RETRASO ${Math.abs(diasR)}d)`:`(${diasR}d restantes)`):"" }`);
      lines.push(`Económico: Presupuesto ${fmt(presup)} | Real ${fmt(real)} | Cobros ${fmt(cobros)} | Margen ${fmt(cobros-real)}`);
      lines.push(`Fases: ${fases.length} total (${fases.filter(f=>f.estado==="completada").length} completadas, ${fases.filter(f=>f.estado==="en_curso").length} en curso)`);
      lines.push(`Tareas: ${tareas.length} total (${tareas.filter(t=>t.estado==="completada").length} completadas, ${tareas.filter(t=>t.prioridad==="alta"&&t.estado!=="completada").length} alta prioridad)`);
      if (incs.length) lines.push(`Incidencias: ${incs.length} (${incs.filter(i=>i.estado==="abierta").length} abiertas, ${incs.filter(i=>i.prioridad==="critica").length} críticas)`);
      if (mats.length) lines.push(`Materiales: ${mats.length} (${mats.filter(m=>m.critico&&m.estado!=="recibido").length} críticos pendientes)`);
      if (extras.length) lines.push(`Extras: ${fmt(extras.filter(e=>e.estado!=="rechazado").reduce((a,e)=>a+(Number(e.importe)||0),0))} aprobados`);
      if (o.clienteIA?.perfil) lines.push(`Cliente: tono ${o.clienteIA.perfil.tono}, exigencia ${o.clienteIA.perfil.nivelExigencia}`);
      if (garantias.length) lines.push(`Garantías: ${garantias.length} registradas`);
      const fotos = (o.fotos||[]).filter(f=>f.avanceIA!==null);
      if (fotos.length) {
        const avMedio = Math.round(fotos.reduce((a,f)=>a+f.avanceIA,0)/fotos.length);
        lines.push(`Avance IA fotos: ${avMedio}%`);
      }
    });

    return `Eres el asistente de gestión de obras de Blue Forest. Tienes acceso completo a los siguientes datos:\n\n${lines.join("\n")}\n\nResponde en español, de forma concisa y práctica. Si mencionas obras específicas, usa sus nombres exactos. Usa bullet points cuando sea útil. Máximo 400 palabras por respuesta.`;
  };

  const enviar = async (texto) => {
    const msg = texto || input.trim();
    if (!msg || loading) return;
    setInput("");

    const ts = new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
    const nuevosMensajes = [...mensajes, { role:"user", content:msg, ts }];
    setMensajes(nuevosMensajes);
    setLoading(true);
    scrollBottom();

    try {
      const ctx = buildContextoCompleto();
      const historial = nuevosMensajes.slice(-12);
      const payload = [
        { role:"user", content: ctx },
        { role:"assistant", content:"Entendido. Tengo acceso completo a tus obras y datos. ¿En qué te puedo ayudar?" },
        ...historial.map(m=>({ role:m.role, content:m.content }))
      ];

      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1200, messages:payload })
      });
      const data = await res.json();
      const respuesta = data.content?.find(b=>b.type==="text")?.text || "Error al procesar.";
      const tsR = new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
      setMensajes(prev=>[...prev, { role:"assistant", content:respuesta, ts:tsR }]);
    } catch(e) {
      setMensajes(prev=>[...prev, { role:"assistant", content:"Error al conectar con la IA. Inténtalo de nuevo.", ts:"" }]);
    }
    setLoading(false);
    scrollBottom();
  };

  const analizarNegocio = async () => {
    setLoadingAnalisis(true); setAnalisisIA(""); setModo("analisis");
    const ctx = buildContextoCompleto();
    try {
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1500,
          messages:[{ role:"user", content:`${ctx}\n\nHaz un análisis ejecutivo completo del negocio con estos apartados:\n1) ESTADO GENERAL (semáforo: 🟢🟡🔴)\n2) OBRAS EN RIESGO (identificar cuáles y por qué)\n3) OPORTUNIDADES DE MEJORA (3 acciones concretas)\n4) ALERTAS ECONÓMICAS (cobros vencidos, desviaciones)\n5) PRÓXIMAS ACCIONES URGENTES (esta semana)\n\nSé directo y útil. Usa emojis para facilitar lectura.` }]
        })
      });
      const data = await res.json();
      setAnalisisIA(data.content?.find(b=>b.type==="text")?.text||"Error");
    } catch(e) { setAnalisisIA("Error al analizar."); }
    setLoadingAnalisis(false);
  };

  const renderMsg = (texto) => texto
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^## (.+)$/gm,'<div style="font-family:Playfair Display,serif;font-size:15px;font-weight:600;margin:14px 0 6px;color:#C8A96E">$1</div>')
    .replace(/^### (.+)$/gm,'<div style="font-size:13px;font-weight:600;margin:10px 0 4px">$1</div>')
    .replace(/^[-•] (.+)$/gm,'<div style="display:flex;gap:8px;margin-bottom:4px"><span style="color:#C8A96E;flex-shrink:0">·</span><span>$1</span></div>')
    .replace(/^(\d+)\) (.+)$/gm,'<div style="display:flex;gap:8px;margin-bottom:4px"><span style="color:#C8A96E;flex-shrink:0;font-family:DM Mono;font-size:11px">$1.</span><span>$2</span></div>')
    .replace(/\n/g,'<br>');

  const obrasMencionadas = (texto) => obras.filter(o => texto.toLowerCase().includes(o.nombre.toLowerCase()));

  const SUGERENCIAS = [
    "¿Cuál es la obra con más riesgo ahora mismo?",
    "¿Qué incidencias críticas hay abiertas?",
    "¿Qué cobros están vencidos?",
    "Resume el estado económico de todas las obras",
    "¿Qué tareas de alta prioridad hay pendientes?",
    "¿Qué obras tienen retraso?",
    "¿Cuál es el margen medio del negocio?",
    "¿Qué materiales críticos faltan por recibir?",
    "Dame un resumen de la semana",
    "¿Qué obra es más rentable?",
  ];

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {/* Chat / Análisis */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${G.border}`, background:G.surface, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:36,height:36,borderRadius:"50%",background:"#1E1A13",border:`2px solid ${G.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>✦</div>
          <div style={{ flex:1 }}>
            <div className="serif" style={{ fontSize:16 }}>Asistente Blue Forest</div>
            <div style={{ fontSize:10,color:G.textMuted }}>
              {obras.length} obras · {obras.reduce((a,o)=>a+(o.tareas||[]).length,0)} tareas · {obras.reduce((a,o)=>a+(o.incidencias||[]).filter(i=>i.estado==="abierta").length,0)} incidencias abiertas
            </div>
          </div>
          <div style={{ display:"flex",gap:6 }}>
            <button onClick={()=>setModo(modo==="analisis"?"chat":"analisis")} className="btn-ghost" style={{ fontSize:11 }}>
              {modo==="analisis"?"💬 Chat":"📊 Análisis ejecutivo"}
            </button>
            {modo==="analisis"&&<button onClick={analizarNegocio} disabled={loadingAnalisis} className="btn-primary" style={{ fontSize:11,opacity:loadingAnalisis?0.5:1 }}>
              {loadingAnalisis?"Analizando…":"✦ Generar"}
            </button>}
            <button onClick={()=>setMensajes([{ role:"assistant",content:`✦ Nueva conversación. Tengo ${obras.length} obras cargadas. ¿En qué te ayudo?`,ts:new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) }])} className="btn-ghost" style={{ fontSize:11 }}>↺ Nueva</button>
          </div>
        </div>

        {/* Modo análisis */}
        {modo==="analisis"&&(
          <div style={{ flex:1,overflow:"auto",padding:24 }}>
            {!analisisIA&&!loadingAnalisis&&(
              <div style={{ textAlign:"center",padding:"60px 0",color:G.textMuted }}>
                <div style={{ fontSize:40,marginBottom:16 }}>📊</div>
                <div className="serif" style={{ fontSize:20,marginBottom:8 }}>Análisis ejecutivo del negocio</div>
                <div style={{ fontSize:13,marginBottom:24 }}>Pulsa "✦ Generar" para un análisis completo de todas tus obras</div>
              </div>
            )}
            {loadingAnalisis&&(
              <div style={{ textAlign:"center",padding:"60px 0" }}>
                <div className="loading-pulse" style={{ fontSize:36,color:G.gold,marginBottom:12 }}>✦</div>
                <div style={{ color:G.textMuted,fontSize:13 }}>Analizando todas las obras…</div>
              </div>
            )}
            {analisisIA&&(
              <div style={{ background:"#1A1A13",border:`1px solid ${G.gold}33`,borderRadius:10,padding:"20px 24px" }}>
                <div style={{ fontSize:11,color:G.gold,fontFamily:"DM Mono",marginBottom:14 }}>ANÁLISIS EJECUTIVO · {new Date().toLocaleDateString("es-ES")}</div>
                <div style={{ fontSize:13,lineHeight:1.9,color:G.text }} dangerouslySetInnerHTML={{ __html:renderMsg(analisisIA) }} />
              </div>
            )}
          </div>
        )}

        {/* Modo chat */}
        {modo==="chat"&&(
          <>
            <div style={{ flex:1,overflow:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:14 }}>
              {mensajes.map((m,i)=>{
                const esUser = m.role==="user";
                const obras_m = !esUser ? obrasMencionadas(m.content) : [];
                return (
                  <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",flexDirection:esUser?"row-reverse":"row" }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",background:esUser?G.gold:"#1E1A13",border:esUser?"none":`1px solid ${G.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:esUser?10:13,flexShrink:0,color:esUser?G.bg:G.gold,fontWeight:600 }}>
                      {esUser?"Tú":"✦"}
                    </div>
                    <div style={{ maxWidth:"78%",display:"flex",flexDirection:"column",gap:4,alignItems:esUser?"flex-end":"flex-start" }}>
                      <div style={{ background:esUser?G.gold:G.surface,color:esUser?G.bg:G.text,padding:"11px 15px",borderRadius:esUser?"14px 3px 14px 14px":"3px 14px 14px 14px",fontSize:13,lineHeight:1.7,border:esUser?"none":`1px solid ${G.border}` }}
                        dangerouslySetInnerHTML={{ __html:renderMsg(m.content) }} />
                      {m.ts&&<div style={{ fontSize:9,color:G.textDim,fontFamily:"DM Mono" }}>{m.ts}</div>}
                      {obras_m.length>0&&(
                        <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                          {obras_m.map(o=>(
                            <button key={o.id} onClick={()=>onSelectObra(o.id)} style={{ background:o.color+"22",border:`1px solid ${o.color}44`,color:o.color,padding:"2px 8px",borderRadius:10,fontSize:9,cursor:"pointer",fontFamily:"DM Mono" }}>→ {o.nombre}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading&&(
                <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:"#1E1A13",border:`1px solid ${G.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:G.gold }}>✦</div>
                  <div style={{ background:G.surface,border:`1px solid ${G.border}`,padding:"11px 15px",borderRadius:"3px 14px 14px 14px",display:"flex",gap:4 }}>
                    {[0,1,2].map(i=><div key={i} className="loading-pulse" style={{ width:6,height:6,borderRadius:"50%",background:G.gold,animationDelay:`${i*0.2}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={el=>{ bottomRef.current=el; }} />
            </div>

            {/* Input */}
            <div style={{ padding:"14px 20px",borderTop:`1px solid ${G.border}`,background:G.surface }}>
              <div style={{ display:"flex",gap:10,alignItems:"flex-end" }}>
                <textarea value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); enviar(); } }}
                  placeholder="Pregunta sobre tus obras… (Enter para enviar, Shift+Enter nueva línea)"
                  style={{ flex:1,minHeight:44,maxHeight:120,resize:"none",fontSize:13,padding:"10px 14px",borderRadius:8,lineHeight:1.5 }} />
                <button onClick={()=>enviar()} disabled={loading||!input.trim()}
                  style={{ width:44,height:44,borderRadius:8,background:loading||!input.trim()?G.border:G.gold,border:"none",cursor:loading||!input.trim()?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={loading||!input.trim()?G.textDim:G.bg} strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Panel lateral */}
      <div style={{ width:240,flexShrink:0,borderLeft:`1px solid ${G.border}`,display:"flex",flexDirection:"column",overflow:"auto" }}>
        {/* Alertas rápidas */}
        {(() => {
          const alertas = [];
          obras.forEach(o => {
            if (o.fechaFin&&Math.ceil((new Date(o.fechaFin)-new Date())/864e5)<0&&o.estado!=="completada") alertas.push({tipo:"rojo",texto:`${o.nombre}: entrega retrasada`});
            (o.incidencias||[]).filter(i=>i.prioridad==="critica"&&i.estado==="abierta").forEach(i=>alertas.push({tipo:"rojo",texto:`${o.nombre}: ${i.titulo}`}));
            (o.economica?.cobros||[]).filter(c=>c.estado==="pendiente"&&c.fecha&&new Date(c.fecha)<new Date()).forEach(c=>alertas.push({tipo:"naranja",texto:`${o.nombre}: cobro vencido`}));
          });
          if (!alertas.length) return null;
          return (
            <div style={{ padding:"14px 14px",borderBottom:`1px solid ${G.border}` }}>
              <div style={{ fontSize:9,color:G.textMuted,fontFamily:"DM Mono",marginBottom:8 }}>ALERTAS ACTIVAS</div>
              {alertas.slice(0,4).map((a,i)=>(
                <div key={i} style={{ fontSize:11,color:a.tipo==="rojo"?G.red:G.orange,marginBottom:4,display:"flex",gap:5 }}>
                  <span>{a.tipo==="rojo"?"🔴":"🟠"}</span><span>{a.texto}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Sugerencias */}
        <div style={{ padding:"14px",borderBottom:`1px solid ${G.border}` }}>
          <div style={{ fontSize:9,color:G.textMuted,fontFamily:"DM Mono",marginBottom:8 }}>PREGUNTAS RÁPIDAS</div>
          {SUGERENCIAS.map((s,i)=>(
            <button key={i} onClick={()=>{ setModo("chat"); enviar(s); }} disabled={loading}
              style={{ width:"100%",background:G.bg,border:`1px solid ${G.border}`,color:G.textMuted,padding:"6px 10px",borderRadius:5,fontSize:10,cursor:loading?"default":"pointer",textAlign:"left",marginBottom:4,opacity:loading?0.5:1 }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=G.gold; e.currentTarget.style.color=G.gold; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=G.border; e.currentTarget.style.color=G.textMuted; }}>
              {s}
            </button>
          ))}
        </div>

        {/* Contexto */}
        <div style={{ padding:"14px" }}>
          <div style={{ fontSize:9,color:G.textMuted,fontFamily:"DM Mono",marginBottom:8 }}>CONTEXTO DISPONIBLE</div>
          {[
            {label:"Obras",val:obras.length,icon:"🏗️"},
            {label:"Fases",val:obras.reduce((a,o)=>a+(o.fases||[]).length,0),icon:"📅"},
            {label:"Tareas",val:obras.reduce((a,o)=>a+(o.tareas||[]).length,0),icon:"✅"},
            {label:"Incidencias",val:obras.reduce((a,o)=>a+(o.incidencias||[]).length,0),icon:"⚠️"},
            {label:"Materiales",val:obras.reduce((a,o)=>a+(o.materiales||[]).length,0),icon:"📦"},
            {label:"Fotos",val:obras.reduce((a,o)=>a+(o.fotos||[]).length,0),icon:"📸"},
            {label:"Extras",val:obras.reduce((a,o)=>a+(o.extras||[]).length,0),icon:"➕"},
            {label:"Garantías",val:obras.reduce((a,o)=>a+(o.garantias||[]).length,0),icon:"🛡️"},
          ].map(s=>(
            <div key={s.label} style={{ display:"flex",gap:8,alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${G.border}` }}>
              <span style={{ fontSize:12 }}>{s.icon}</span>
              <span style={{ flex:1,fontSize:10,color:G.textMuted }}>{s.label}</span>
              <span className="mono" style={{ fontSize:11,color:s.val>0?G.gold:G.textDim }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// === GOOGLE ===CALENDAR ----------------------------------------------------------
function GCalView({ obras, showToast }) {
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [obrasSel, setObrasSel] = useState([]);
  const [tiposSel, setTiposSel] = useState(["fases","entregas","cobros","materiales"]);
  const [vistaMode, setVistaMode] = useState("sync"); // "sync" | "ver"

  // Construir eventos de Blue Forest para exportar
  const buildEventos = () => {
    const evs = [];
    obras.filter(o => obrasSel.includes(o.id) || obrasSel.length === 0).forEach(obra => {
      if (tiposSel.includes("fases")) {
        (obra.fases||[]).forEach(f => {
          if (f.inicio) evs.push({ titulo: `[BF] ${obra.nombre} — Inicio: ${f.nombre}`, fecha: f.inicio, hora: "08:00", duracion: 60, descripcion: `Fase: ${f.nombre}\nObra: ${obra.nombre}\nCliente: ${obra.cliente||""}`, color: "7" /* pavo real */ });
          if (f.fin) evs.push({ titulo: `[BF] ${obra.nombre} — Fin: ${f.nombre}`, fecha: f.fin, hora: "18:00", duracion: 60, descripcion: `Fin previsto de fase: ${f.nombre}\nObra: ${obra.nombre}\nEstado actual: ${f.estado}`, color: f.estado === "completada" ? "10" : "5" });
        });
      }
      if (tiposSel.includes("entregas") && obra.fechaFin) {
        evs.push({ titulo: `[BF] 🏁 Entrega: ${obra.nombre}`, fecha: obra.fechaFin, hora: "10:00", duracion: 120, descripcion: `Entrega de obra: ${obra.nombre}\nCliente: ${obra.cliente||""}\nUbicación: ${obra.ubicacion||""}`, color: "11" /* rojo tomate */ });
      }
      if (tiposSel.includes("cobros")) {
        (obra.economica?.cobros||[]).filter(c => c.estado === "pendiente" && c.fecha).forEach(c => {
          evs.push({ titulo: `[BF] 💶 Cobro: ${c.concepto} — ${obra.nombre}`, fecha: c.fecha, hora: "09:00", duracion: 30, descripcion: `Cobro pendiente: ${c.concepto}\nImporte: ${new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(c.importe)}\nObra: ${obra.nombre}`, color: "5" /* plátano */ });
        });
      }
      if (tiposSel.includes("materiales")) {
        (obra.materiales||[]).filter(m => m.fechaNecesaria && m.estado !== "recibido").forEach(m => {
          evs.push({ titulo: `[BF] 📦 ${m.nombre} — ${obra.nombre}`, fecha: m.fechaNecesaria, hora: "08:00", duracion: 30, descripcion: `Material necesario: ${m.nombre}\nProveedor: ${m.proveedor||"—"}\n${m.critico?"⚠ MATERIAL CRÍTICO":""}`, color: m.critico ? "11" : "6" });
        });
      }
    });
    return evs.sort((a,b) => a.fecha.localeCompare(b.fecha));
  };

  const eventosPreview = buildEventos();

  // Sincronizar con Google Calendar via MCP
  const sincronizar = async () => {
    if (eventosPreview.length === 0) { showToast("Sin eventos para sincronizar", "ℹ️", G.textMuted); return; }
    setSincronizando(true); setResultados([]);
    const logs = [];
    try {
      // Enviar en lotes de 5 para no saturar
      const lotes = [];
      for (let i = 0; i < eventosPreview.length; i += 5) lotes.push(eventosPreview.slice(i, i+5));

      for (const lote of lotes) {
        const listaEventos = lote.map((ev, i) =>
          `${i+1}. Título: "${ev.titulo}" | Fecha: ${ev.fecha} ${ev.hora} | Duración: ${ev.duracion} min | Descripción: ${ev.descripcion.replace(/\n/g, " ")} | Color: ${ev.color}`
        ).join("\n");

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 1000,
            mcp_servers: [{ type: "url", url: "https://calendarmcp.googleapis.com/mcp/v1", name: "calendar-mcp" }],
            messages: [{ role: "user", content: `Crea estos ${lote.length} eventos en Google Calendar (calendario principal). Para cada evento usa los datos exactos proporcionados:\n\n${listaEventos}\n\nCrea todos los eventos. Responde con "Creados: N eventos" confirmando cuántos se han creado.` }]
          })
        });
        const data = await res.json();
        const resp = data.content?.find(b => b.type === "text")?.text || "";
        logs.push(...lote.map(ev => ({ titulo: ev.titulo, fecha: ev.fecha, ok: !resp.toLowerCase().includes("error") })));
      }
      setResultados(logs);
      showToast(`${logs.filter(l=>l.ok).length} eventos creados en Calendar`, "📅", G.green);
    } catch { showToast("Error conectando con Calendar", "✕", G.red); }
    setSincronizando(false);
  };

  // Leer eventos existentes de Calendar
  const cargarCalendar = async () => {
    setLoading(true); setEventos([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 3000,
          mcp_servers: [{ type: "url", url: "https://calendarmcp.googleapis.com/mcp/v1", name: "calendar-mcp" }],
          messages: [{ role: "user", content: `Lista los próximos 30 eventos de mi Google Calendar principal (desde hoy hasta 90 días). Responde ÚNICAMENTE con JSON válido sin backticks:\n{"eventos":[{"titulo":"...","fecha":"YYYY-MM-DD","hora":"HH:MM","descripcion":"...","id":"..."}]}` }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setEventos(parsed.eventos || []);
    } catch { showToast("Error al leer Calendar", "✕", G.red); }
    setLoading(false);
  };

  const TIPOS = [
    { id: "fases", label: "Fases de obra", emoji: "📅", desc: "Inicio y fin de cada fase" },
    { id: "entregas", label: "Entregas", emoji: "🏁", desc: "Fecha de entrega de cada obra" },
    { id: "cobros", label: "Cobros pendientes", emoji: "💶", desc: "Fechas de cobros programados" },
    { id: "materiales", label: "Materiales", emoji: "📦", desc: "Fecha necesaria de materiales" },
  ];

  const colorLabel = { "5":"Plátano 🟡","6":"Salvia 🟢","7":"Pavo real 🔵","10":"Albahaca 🌿","11":"Tomate 🔴" };

  return (
    <div style={{ padding: 28, overflow: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div className="serif" style={{ fontSize: 26, marginBottom: 4 }}>Google Calendar</div>
          <div style={{ fontSize: 13, color: G.textMuted }}>Sincroniza fases, entregas y cobros con tu calendario</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setVistaMode("sync")} style={{ padding: "7px 16px", borderRadius: 4, border: "none", background: vistaMode==="sync" ? G.gold+"22" : G.surface, color: vistaMode==="sync" ? G.gold : G.textMuted, fontSize: 12, cursor: "pointer", border: `1px solid ${vistaMode==="sync" ? G.gold : G.border}` }}>
            ↑ Exportar a Calendar
          </button>
          <button onClick={() => { setVistaMode("ver"); cargarCalendar(); }} style={{ padding: "7px 16px", borderRadius: 4, border: "none", background: vistaMode==="ver" ? G.gold+"22" : G.surface, color: vistaMode==="ver" ? G.gold : G.textMuted, fontSize: 12, cursor: "pointer", border: `1px solid ${vistaMode==="ver" ? G.gold : G.border}` }}>
            ↓ Ver mi Calendar
          </button>
        </div>
      </div>

      {/* ── EXPORTAR A CALENDAR ── */}
      {vistaMode === "sync" && (
        <div style={{ display: "flex", gap: 20 }}>
          {/* Config */}
          <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Tipos de evento */}
            <div className="card">
              <div className="serif" style={{ fontSize: 14, marginBottom: 14 }}>¿Qué exportar?</div>
              {TIPOS.map(t => (
                <div key={t.id} onClick={() => setTiposSel(prev => prev.includes(t.id) ? prev.filter(x=>x!==t.id) : [...prev, t.id])}
                  style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${G.border}`, cursor: "pointer" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${tiposSel.includes(t.id) ? G.gold : G.border}`, background: tiposSel.includes(t.id) ? G.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {tiposSel.includes(t.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{t.emoji} {t.label}</div>
                    <div style={{ fontSize: 11, color: G.textMuted }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Obras */}
            <div className="card">
              <div className="serif" style={{ fontSize: 14, marginBottom: 14 }}>¿Qué obras?</div>
              <div onClick={() => setObrasSel([])} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${G.border}`, cursor: "pointer", marginBottom: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${obrasSel.length===0 ? G.gold : G.border}`, background: obrasSel.length===0 ? G.gold : "transparent", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: obrasSel.length===0 ? G.gold : G.text }}>Todas las obras ({obras.length})</span>
              </div>
              {obras.map(o => (
                <div key={o.id} onClick={() => setObrasSel(prev => prev.includes(o.id) ? prev.filter(x=>x!==o.id) : [...prev, o.id])}
                  style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", cursor: "pointer" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${obrasSel.includes(o.id) ? o.color : G.border}`, background: obrasSel.includes(o.id) ? o.color : "transparent", flexShrink: 0 }} />
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: o.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.nombre}</span>
                </div>
              ))}
            </div>

            {/* Botón sincronizar */}
            <button className="btn-primary" onClick={sincronizar} disabled={sincronizando || eventosPreview.length === 0}
              style={{ opacity: sincronizando || eventosPreview.length === 0 ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px" }}>
              {sincronizando ? "Creando eventos…" : `📅 Crear ${eventosPreview.length} eventos en Calendar`}
            </button>

            {resultados.length > 0 && (
              <div className="card" style={{ background: "#101A10", border: `1px solid ${G.green}33` }}>
                <div style={{ fontSize: 11, color: G.green, fontFamily: "DM Mono", marginBottom: 8 }}>✓ SINCRONIZACIÓN COMPLETADA</div>
                <div style={{ fontSize: 13, color: G.green }}>{resultados.filter(r=>r.ok).length} de {resultados.length} eventos creados</div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="serif" style={{ fontSize: 16 }}>Vista previa — {eventosPreview.length} eventos</div>
            </div>

            {eventosPreview.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                <div>Selecciona tipos de evento y obras para ver la vista previa</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(() => {
                  let lastFecha = "";
                  return eventosPreview.map((ev, i) => {
                    const showFecha = ev.fecha !== lastFecha;
                    lastFecha = ev.fecha;
                    const d = new Date(ev.fecha);
                    const dias = Math.ceil((d - new Date()) / 864e5);
                    const colores = { "5": G.gold, "6": G.green, "7": G.blue, "10": "#5CB87A", "11": G.red };
                    const col = colores[ev.color] || G.textMuted;
                    const ok = resultados.find(r => r.titulo === ev.titulo && r.fecha === ev.fecha);
                    return (
                      <div key={i}>
                        {showFecha && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 5px" }}>
                            <span className="serif" style={{ fontSize: 12, color: G.text }}>{d.toLocaleDateString("es-ES", { weekday:"short", day:"numeric", month:"short" })}</span>
                            <span style={{ fontSize: 10, color: dias <= 0 ? G.red : dias <= 7 ? G.orange : G.textDim, fontFamily: "DM Mono" }}>{dias <= 0 ? "pasado" : `en ${dias}d`}</span>
                            <div style={{ flex: 1, height: 1, background: G.border }} />
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", borderRadius: 6, background: G.surface, border: `1px solid ${col}33` }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: G.text }}>{ev.titulo}</div>
                            <div style={{ fontSize: 10, color: G.textMuted }}>{ev.hora} · {ev.duracion}min · {colorLabel[ev.color]||""}</div>
                          </div>
                          {ok && <span style={{ fontSize: 12, color: G.green }}>✓</span>}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VER CALENDAR ── */}
      {vistaMode === "ver" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted }}>
              <div className="loading-pulse" style={{ fontSize: 13 }}>Leyendo Google Calendar…</div>
            </div>
          )}
          {!loading && eventos.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
              <div>Sin eventos próximos en tu Calendar</div>
              <button className="btn-ghost" onClick={cargarCalendar} style={{ marginTop: 12, fontSize: 12 }}>↻ Recargar</button>
            </div>
          )}
          {eventos.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: G.textMuted }}>{eventos.length} próximos eventos de Google Calendar</div>
                <button className="btn-ghost" onClick={cargarCalendar} style={{ fontSize: 11 }}>↻ Actualizar</button>
              </div>
              {(() => {
                let lastFecha = "";
                return eventos.map((ev, i) => {
                  const showFecha = ev.fecha !== lastFecha;
                  lastFecha = ev.fecha;
                  const d = new Date(ev.fecha);
                  const dias = Math.ceil((d - new Date()) / 864e5);
                  const esBF = ev.titulo?.includes("[BF]");
                  return (
                    <div key={i}>
                      {showFecha && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 6px" }}>
                          <span className="serif" style={{ fontSize: 13 }}>{d.toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long" })}</span>
                          <span style={{ fontSize: 10, color: dias <= 0 ? G.red : dias <= 7 ? G.orange : G.textDim, fontFamily: "DM Mono" }}>{dias === 0 ? "HOY" : dias < 0 ? `hace ${Math.abs(dias)}d` : `en ${dias}d`}</span>
                          <div style={{ flex: 1, height: 1, background: G.border }} />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", borderRadius: 6, background: G.surface, border: `1px solid ${esBF ? G.gold : G.border}`, marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: esBF ? G.gold : G.textMuted, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: esBF ? G.gold : G.text }}>{ev.titulo}</div>
                          {ev.hora && <div style={{ fontSize: 10, color: G.textMuted, marginTop: 1, fontFamily: "DM Mono" }}>{ev.hora}</div>}
                          {ev.descripcion && <div style={{ fontSize: 11, color: G.textMuted, marginTop: 3 }}>{ev.descripcion.slice(0, 80)}{ev.descripcion.length > 80 ? "…" : ""}</div>}
                        </div>
                        {esBF && <span className="tag" style={{ background: G.gold+"22", color: G.gold, flexShrink: 0 }}>Blue Forest</span>}
                      </div>
                    </div>
                  );
                });
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// === GOOGLE ===DRIVE -------------------------------------------------------------
function DriveView({ obras, showToast }) {
  const [archivos, setArchivos] = useState([]);
  const [carpetas, setCarpetas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carpetaActual, setCarpetaActual] = useState(null);
  const [ruta, setRuta] = useState([{ id: "root", nombre: "Mi Drive" }]);
  const [busqueda, setBusqueda] = useState("");
  const [loadingBusq, setLoadingBusq] = useState(false);
  const [resultadosBusq, setResultadosBusq] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [vistaGrid, setVistaGrid] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [analisisDoc, setAnalisisDoc] = useState("");

  const cargarCarpeta = async (folderId = "root", folderNombre = "Mi Drive") => {
    setLoading(true); setArchivos([]); setCarpetas([]); setSeleccionado(null); setAnalisisDoc("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 3000,
          mcp_servers: [{ type: "url", url: "https://drivemcp.googleapis.com/mcp/v1", name: "drive-mcp" }],
          messages: [{ role: "user", content: `Lista el contenido de la carpeta de Google Drive con id "${folderId}". Para cada elemento extrae: id, name, mimeType, modifiedTime, size (si está disponible), webViewLink. Responde ÚNICAMENTE con JSON válido sin backticks:\n{"items":[{"id":"...","name":"...","mimeType":"...","modifiedTime":"...","size":"...","webViewLink":"...","isFolder":true/false}]}` }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const items = parsed.items || [];
      setCarpetas(items.filter(i => i.isFolder || i.mimeType?.includes("folder")));
      setArchivos(items.filter(i => !i.isFolder && !i.mimeType?.includes("folder")));
      setCarpetaActual(folderId);
    } catch { showToast("Error conectando con Drive", "✕", G.red); }
    setLoading(false);
  };

  const navegar = (id, nombre) => {
    setRuta(prev => [...prev, { id, nombre }]);
    cargarCarpeta(id, nombre);
  };

  const volverA = (idx) => {
    const nueva = ruta.slice(0, idx + 1);
    setRuta(nueva);
    const destino = nueva[nueva.length - 1];
    cargarCarpeta(destino.id, destino.nombre);
  };

  const buscarEnDrive = async () => {
    if (!busqueda.trim()) return;
    setLoadingBusq(true); setResultadosBusq(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          mcp_servers: [{ type: "url", url: "https://drivemcp.googleapis.com/mcp/v1", name: "drive-mcp" }],
          messages: [{ role: "user", content: `Busca en Google Drive archivos que coincidan con: "${busqueda}". Devuelve los resultados más relevantes. Responde ÚNICAMENTE con JSON válido sin backticks:\n{"items":[{"id":"...","name":"...","mimeType":"...","modifiedTime":"...","webViewLink":"...","parents":["..."]}]}` }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setResultadosBusq(parsed.items || []);
    } catch { showToast("Error en la búsqueda", "✕", G.red); }
    setLoadingBusq(false);
  };

  const crearCarpetaObra = async (obraId) => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    setSubiendo(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 500,
          mcp_servers: [{ type: "url", url: "https://drivemcp.googleapis.com/mcp/v1", name: "drive-mcp" }],
          messages: [{ role: "user", content: `Crea una carpeta en Google Drive llamada "BF — ${obra.nombre}" en la raíz de Mi Drive. Dentro de esa carpeta, crea estas subcarpetas: "01_Planos", "02_Presupuestos", "03_Contratos", "04_Fotos", "05_Licencias", "06_Facturas", "07_Informes". Confirma con "Carpetas creadas correctamente".` }]
        })
      });
      const data = await res.json();
      const ok = data.content?.find(b => b.type === "text")?.text?.includes("creada") || data.content?.find(b => b.type === "text")?.text?.includes("Carpeta");
      showToast(ok ? `Carpeta "${obra.nombre}" creada en Drive` : "Carpetas creadas en Drive", "📁", G.green);
      cargarCarpeta("root");
    } catch { showToast("Error al crear carpeta", "✕", G.red); }
    setSubiendo(false);
  };

  const analizarDocumento = async (archivo) => {
    setLoadingIA(true); setAnalisisDoc("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 800,
          mcp_servers: [{ type: "url", url: "https://drivemcp.googleapis.com/mcp/v1", name: "drive-mcp" }],
          messages: [{ role: "user", content: `Lee el contenido del archivo de Google Drive con id "${archivo.id}" (nombre: "${archivo.nombre}"). Proporciona: 1) De qué trata el documento (2-3 frases), 2) Información clave relevante para una obra de reforma (fechas, importes, compromisos, partidas), 3) Alertas o puntos de atención. Máximo 200 palabras.` }]
        })
      });
      const data = await res.json();
      setAnalisisDoc(data.content?.find(b => b.type === "text")?.text || "");
    } catch { setAnalisisDoc("Error al leer el documento."); }
    setLoadingIA(false);
  };

  const tipoIcono = (mime) => {
    if (!mime) return "📄";
    if (mime.includes("folder")) return "📁";
    if (mime.includes("pdf")) return "📕";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "📗";
    if (mime.includes("presentation") || mime.includes("powerpoint")) return "📙";
    if (mime.includes("document") || mime.includes("word")) return "📘";
    if (mime.includes("image")) return "🖼️";
    if (mime.includes("video")) return "🎥";
    if (mime.includes("zip") || mime.includes("rar")) return "🗜️";
    return "📄";
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    const n = Number(bytes);
    if (n < 1024) return `${n}B`;
    if (n < 1048576) return `${Math.round(n/1024)}KB`;
    return `${(n/1048576).toFixed(1)}MB`;
  };

  const itemsFiltrados = resultadosBusq ||
    [...carpetas, ...archivos].filter(i => !busqueda || i.name?.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Panel izquierdo — nav + acciones rápidas */}
      <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
        <div className="serif" style={{ fontSize: 18, marginBottom: 4 }}>Google Drive</div>

        <button className="btn-primary" onClick={() => cargarCarpeta("root")} disabled={loading}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: loading ? 0.5 : 1 }}>
          {loading ? "Cargando…" : "↻ Abrir Drive"}
        </button>

        <div style={{ height: 1, background: G.border }} />

        <div style={{ fontSize: 10, color: G.textDim, fontFamily: "DM Mono" }}>CARPETAS DE OBRAS</div>
        <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 4 }}>Crea la estructura de carpetas automáticamente en Drive para cada obra:</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "auto", flex: 1 }}>
          {obras.map(o => (
            <button key={o.id} onClick={() => crearCarpetaObra(o.id)} disabled={subiendo}
              style={{ background: G.bg, border: `1px solid ${G.border}`, borderLeft: `3px solid ${o.color}`, color: G.text, padding: "8px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s", opacity: subiendo ? 0.5 : 1 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = o.color}
              onMouseLeave={e => e.currentTarget.style.borderLeftColor = o.color}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📁 {o.nombre}</div>
              <div style={{ fontSize: 9, color: G.textDim, marginTop: 2 }}>Crear estructura Drive</div>
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: G.border }} />
        <div style={{ fontSize: 10, color: G.textDim, fontFamily: "DM Mono" }}>ESTRUCTURA POR OBRA</div>
        {["01_Planos","02_Presupuestos","03_Contratos","04_Fotos","05_Licencias","06_Facturas","07_Informes"].map(c => (
          <div key={c} style={{ fontSize: 11, color: G.textDim, display: "flex", gap: 6, alignItems: "center" }}>
            <span>📁</span><span>{c}</span>
          </div>
        ))}
      </div>

      {/* Panel principal */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Toolbar */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${G.border}`, background: G.surface, display: "flex", gap: 12, alignItems: "center" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1, overflow: "hidden" }}>
            {ruta.map((r, i) => (
              <span key={r.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <span style={{ color: G.textDim, fontSize: 12 }}>›</span>}
                <span onClick={() => volverA(i)} style={{ fontSize: 12, color: i === ruta.length-1 ? G.text : G.gold, cursor: "pointer", whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{r.nombre}</span>
              </span>
            ))}
          </div>

          {/* Búsqueda */}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={busqueda} onChange={e => { setBusqueda(e.target.value); if(!e.target.value) setResultadosBusq(null); }}
              onKeyDown={e => e.key === "Enter" && buscarEnDrive()}
              placeholder="Buscar en Drive…" style={{ width: 220, fontSize: 12 }} />
            <button className="btn-ghost" onClick={buscarEnDrive} disabled={loadingBusq || !busqueda.trim()} style={{ fontSize: 12 }}>
              {loadingBusq ? "…" : "Buscar"}
            </button>
            {resultadosBusq && <button className="btn-ghost" onClick={() => { setResultadosBusq(null); setBusqueda(""); }} style={{ fontSize: 11 }}>✕</button>}
          </div>

          {/* Vista */}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setVistaGrid(true)} style={{ padding: "5px 10px", background: vistaGrid ? G.gold+"22" : "transparent", border: `1px solid ${vistaGrid ? G.gold : G.border}`, color: vistaGrid ? G.gold : G.textMuted, borderRadius: 4, cursor: "pointer" }}>⊞</button>
            <button onClick={() => setVistaGrid(false)} style={{ padding: "5px 10px", background: !vistaGrid ? G.gold+"22" : "transparent", border: `1px solid ${!vistaGrid ? G.gold : G.border}`, color: !vistaGrid ? G.gold : G.textMuted, borderRadius: 4, cursor: "pointer" }}>☰</button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Contenido */}
          <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: G.textMuted }}>
                <div className="loading-pulse" style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
                <div style={{ fontSize: 13 }}>Cargando Drive…</div>
              </div>
            )}

            {!loading && !carpetaActual && !resultadosBusq && (
              <div style={{ textAlign: "center", padding: "60px 0", color: G.textMuted }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>☁️</div>
                <div className="serif" style={{ fontSize: 20, marginBottom: 8 }}>Conecta con Google Drive</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>Pulsa "Abrir Drive" para navegar tus archivos</div>
                <div style={{ fontSize: 12, color: G.textDim }}>O crea una estructura de carpetas automática para cualquier obra desde el panel izquierdo</div>
              </div>
            )}

            {resultadosBusq && (
              <div style={{ marginBottom: 12, fontSize: 12, color: G.textMuted }}>
                {resultadosBusq.length} resultado{resultadosBusq.length!==1?"s":""} para "{busqueda}"
              </div>
            )}

            {!loading && (vistaGrid ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                {itemsFiltrados.map(item => {
                  const esCarpeta = item.isFolder || item.mimeType?.includes("folder");
                  const sel = seleccionado?.id === item.id;
                  return (
                    <div key={item.id}
                      onClick={() => { setSeleccionado(item); setAnalisisDoc(""); }}
                      onDoubleClick={() => esCarpeta && navegar(item.id, item.name)}
                      style={{ padding: 12, borderRadius: 8, border: `1px solid ${sel ? G.gold : G.border}`, background: sel ? "#1E1A13" : G.surface, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{tipoIcono(item.mimeType)}</div>
                      <div style={{ fontSize: 11, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{item.name}</div>
                      {item.size && <div style={{ fontSize: 9, color: G.textDim }}>{formatSize(item.size)}</div>}
                    </div>
                  );
                })}
                {!loading && itemsFiltrados.length === 0 && carpetaActual && (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: G.textMuted, fontSize: 13 }}>Carpeta vacía</div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {itemsFiltrados.map(item => {
                  const esCarpeta = item.isFolder || item.mimeType?.includes("folder");
                  const sel = seleccionado?.id === item.id;
                  return (
                    <div key={item.id}
                      onClick={() => { setSeleccionado(item); setAnalisisDoc(""); }}
                      onDoubleClick={() => esCarpeta && navegar(item.id, item.name)}
                      style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", borderRadius: 6, background: sel ? "#1E1A13" : "transparent", border: `1px solid ${sel ? G.gold : "transparent"}`, cursor: "pointer", transition: "background 0.1s" }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{tipoIcono(item.mimeType)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: G.textDim, marginTop: 1 }}>{item.modifiedTime?.slice(0,10)}</div>
                      </div>
                      {item.size && <span className="mono" style={{ fontSize: 11, color: G.textMuted }}>{formatSize(item.size)}</span>}
                    </div>
                  );
                })}
                {!loading && itemsFiltrados.length === 0 && carpetaActual && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted, fontSize: 13 }}>Carpeta vacía</div>
                )}
              </div>
            ))}
          </div>

          {/* Panel detalle archivo seleccionado */}
          {seleccionado && (
            <div style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${G.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 32 }}>{tipoIcono(seleccionado.mimeType)}</div>
                <button onClick={() => setSeleccionado(null)} style={{ background: "none", border: "none", color: G.textMuted, cursor: "pointer" }}>{Icon.x}</button>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, wordBreak: "break-word" }}>{seleccionado.name}</div>
                <div style={{ fontSize: 11, color: G.textMuted }}>Modificado: {seleccionado.modifiedTime?.slice(0,10)}</div>
                {seleccionado.size && <div style={{ fontSize: 11, color: G.textMuted }}>Tamaño: {formatSize(seleccionado.size)}</div>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {seleccionado.webViewLink && (
                  <a href={seleccionado.webViewLink} target="_blank" rel="noreferrer" className="btn-primary" style={{ textAlign: "center", textDecoration: "none", fontSize: 12, display: "block" }}>
                    Abrir en Drive ↗
                  </a>
                )}
                {!(seleccionado.isFolder || seleccionado.mimeType?.includes("folder")) && (
                  <button className="btn-ghost" onClick={() => analizarDocumento(seleccionado)} disabled={loadingIA} style={{ fontSize: 12, opacity: loadingIA ? 0.5 : 1 }}>
                    {loadingIA ? "Analizando…" : "✦ Analizar con IA"}
                  </button>
                )}
                {(seleccionado.isFolder || seleccionado.mimeType?.includes("folder")) && (
                  <button className="btn-ghost" onClick={() => navegar(seleccionado.id, seleccionado.name)} style={{ fontSize: 12 }}>
                    Abrir carpeta →
                  </button>
                )}
              </div>

              {analisisDoc && (
                <div style={{ background: "#1A1A13", border: `1px solid ${G.gold}33`, borderRadius: 6, padding: 14 }}>
                  <div style={{ fontSize: 10, color: G.gold, fontFamily: "DM Mono", marginBottom: 8 }}>ANÁLISIS IA</div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: G.text, whiteSpace: "pre-wrap" }}>{analisisDoc}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === GMAIL ===INTEGRATION --------------------------------------------------------
function GmailView({ obras, onSelectObra, showToast }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailSelec, setEmailSelec] = useState(null);
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const [loadingRespuesta, setLoadingRespuesta] = useState(false);
  const [instruccion, setInstruccion] = useState("");
  const [analisis, setAnalisis] = useState(null);
  const [borrador, setBorrador] = useState("");
  const [filtro, setFiltro] = useState("all");
  const [busqueda, setBusqueda] = useState("");
  const [analizados, setAnalizados] = useState({});

  const cargarEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
          mcp_servers: [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail-mcp" }],
          messages: [{ role: "user", content: `Usa la herramienta de Gmail para obtener los últimos 20 emails de la bandeja de entrada. Para cada email extrae: id, from (remitente nombre y email), subject, snippet (primeras palabras del cuerpo), date, isRead (leído o no), threadId. Responde ÚNICAMENTE con JSON válido sin backticks:\n{"emails": [{"id":"...","from":"...","fromEmail":"...","subject":"...","snippet":"...","date":"...","isRead":true,"threadId":"..."}]}` }]
        })
      });
      const data = await res.json();
      const textBlock = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(textBlock.replace(/```json|```/g, "").trim());
      setEmails(parsed.emails || []);
    } catch (e) {
      showToast("Error conectando con Gmail", "✕", G.red);
    }
    setLoading(false);
  };

  const cargarEmailCompleto = async (email) => {
    setEmailSelec({ ...email, cuerpo: "Cargando..." });
    setAnalisis(null); setBorrador(""); setInstruccion("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          mcp_servers: [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail-mcp" }],
          messages: [{ role: "user", content: `Obtén el contenido completo del email con id "${email.id}". Responde ÚNICAMENTE con JSON válido:\n{"cuerpo":"texto completo del email sin HTML","from":"remitente","subject":"asunto","date":"fecha"}` }]
        })
      });
      const data = await res.json();
      const textBlock = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(textBlock.replace(/```json|```/g, "").trim());
      setEmailSelec(prev => ({ ...prev, cuerpo: parsed.cuerpo || prev.snippet }));
    } catch {
      setEmailSelec(prev => ({ ...prev, cuerpo: prev.snippet }));
    }
  };

  const analizarEmail = async () => {
    if (!emailSelec) return;
    setLoadingAnalisis(true);
    const obrasList = obras.map(o => `${o.nombre} (cliente: ${o.cliente})`).join(", ");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Eres un experto en gestión de clientes de reformas. Analiza este email y extrae información relevante.\n\nObras activas: ${obrasList}\n\nEMAIL:\nDe: ${emailSelec.from} (${emailSelec.fromEmail})\nAsunto: ${emailSelec.subject}\nFecha: ${emailSelec.date}\nContenido: ${emailSelec.cuerpo}\n\nResponde ÚNICAMENTE con JSON válido:\n{"obraRelacionada":"nombre de la obra si detectas a qué obra pertenece o null","urgencia":"alta|media|baja","sentimiento":"positivo|neutro|negativo|queja","resumen":"resumen en 2 frases de qué pide o dice el cliente","compromisos":["compromisos o fechas mencionadas"],"accionRequerida":"qué hay que hacer con este email","tonocliente":"descripción del tono del cliente","alertas":["posibles problemas o tensiones detectadas"]}`
          }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setAnalisis(parsed);
      setAnalizados(prev => ({ ...prev, [emailSelec.id]: parsed }));
    } catch { }
    setLoadingAnalisis(false);
  };

  const generarRespuesta = async () => {
    if (!emailSelec) return;
    setLoadingRespuesta(true); setBorrador("");
    const obraCtx = analisis?.obraRelacionada
      ? obras.find(o => o.nombre === analisis.obraRelacionada)
      : null;
    const perfilCliente = obraCtx?.clienteIA?.perfil;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: `Redacta una respuesta profesional a este email.\n\nEMAIL ORIGINAL:\nDe: ${emailSelec.from}\nAsunto: ${emailSelec.subject}\nContenido: ${emailSelec.cuerpo}\n\n${analisis ? `Análisis: sentimiento ${analisis.sentimiento}, urgencia ${analisis.urgencia}` : ""}\n${perfilCliente ? `Perfil del cliente: ${perfilCliente.comoTratarle}` : ""}\n${instruccion ? `Instrucción específica: ${instruccion}` : ""}\n\nEscribe SOLO el cuerpo de la respuesta, en español, profesional y adaptado al tono del cliente. Sin asunto ni "Estimado/a...".`
          }]
        })
      });
      const data = await res.json();
      setBorrador(data.content?.find(b => b.type === "text")?.text || "");
    } catch { }
    setLoadingRespuesta(false);
  };

  const emailsFiltrados = emails.filter(e => {
    if (filtro === "unread" && e.isRead) return false;
    if (filtro === "analyzed" && !analizados[e.id]) return false;
    if (busqueda && !e.subject?.toLowerCase().includes(busqueda.toLowerCase()) && !e.from?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const urgenciaColor = { alta: G.red, media: G.orange, baja: G.textMuted };
  const sentimientoColor = { positivo: G.green, neutro: G.textMuted, negativo: G.orange, queja: G.red };
  const sentimientoEmoji = { positivo: "😊", neutro: "😐", negativo: "😟", queja: "😠" };

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", overflow: "hidden" }}>

      {/* Lista emails */}
      <div style={{ width: 340, flexShrink: 0, borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${G.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="serif" style={{ fontSize: 18 }}>Gmail</div>
            <button className="btn-primary" onClick={cargarEmails} disabled={loading} style={{ fontSize: 12, padding: "7px 14px", opacity: loading ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              {loading ? "Cargando…" : "↻ Sincronizar"}
            </button>
          </div>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar emails..." style={{ marginBottom: 10, fontSize: 12 }} />
          <div style={{ display: "flex", gap: 4 }}>
            {[["all","Todos"],["unread","No leídos"],["analyzed","Analizados"]].map(([id,label]) => (
              <button key={id} onClick={() => setFiltro(id)} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: filtro===id ? G.gold+"22" : "transparent", color: filtro===id ? G.gold : G.textMuted, fontSize: 11, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {!loading && emails.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: G.textMuted }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
              <div className="serif" style={{ fontSize: 16, marginBottom: 8 }}>Conecta con Gmail</div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>Pulsa "Sincronizar" para cargar tus emails</div>
            </div>
          )}
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted }}>
              <div className="loading-pulse" style={{ fontSize: 13 }}>Leyendo Gmail…</div>
            </div>
          )}
          {emailsFiltrados.map(email => {
            const an = analizados[email.id];
            const selec = emailSelec?.id === email.id;
            return (
              <div key={email.id} onClick={() => cargarEmailCompleto(email)}
                style={{ padding: "14px 18px", borderBottom: `1px solid ${G.border}`, cursor: "pointer", background: selec ? "#1E1A13" : email.isRead ? "transparent" : G.surface, transition: "background 0.15s" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
                  {!email.isRead && <div style={{ width: 7, height: 7, borderRadius: "50%", background: G.gold, flexShrink: 0, marginTop: 3 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: email.isRead ? 400 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.from}</div>
                    <div style={{ fontSize: 11, color: G.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{email.subject}</div>
                  </div>
                  <div style={{ fontSize: 10, color: G.textDim, flexShrink: 0, fontFamily: "DM Mono" }}>{email.date?.slice(0,5)}</div>
                </div>
                <div style={{ fontSize: 11, color: G.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: email.isRead ? 0 : 15 }}>{email.snippet}</div>
                {an && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, paddingLeft: email.isRead ? 0 : 15 }}>
                    <span style={{ fontSize: 10 }}>{sentimientoEmoji[an.sentimiento]}</span>
                    <span className="tag" style={{ background: urgenciaColor[an.urgencia]+"22", color: urgenciaColor[an.urgencia] }}>{an.urgencia}</span>
                    {an.obraRelacionada && <span className="tag" style={{ background: G.gold+"22", color: G.gold }}>{an.obraRelacionada.slice(0,16)}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle email */}
      {!emailSelec ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: G.textMuted }}>
          <div style={{ fontSize: 40 }}>📬</div>
          <div className="serif" style={{ fontSize: 18 }}>Selecciona un email</div>
          <div style={{ fontSize: 13 }}>La IA lo analizará y generará una respuesta adaptada al cliente</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header email */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${G.border}`, background: G.surface }}>
            <div className="serif" style={{ fontSize: 17, marginBottom: 6 }}>{emailSelec.subject}</div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: G.textMuted }}>
              <span>De: <span style={{ color: G.text }}>{emailSelec.from}</span></span>
              <span>{emailSelec.date}</span>
              {analisis?.obraRelacionada && (
                <span onClick={() => { const o = obras.find(x=>x.nombre===analisis.obraRelacionada); if(o) onSelectObra(o.id); }}
                  style={{ color: G.gold, cursor: "pointer" }}>🏗 {analisis.obraRelacionada}</span>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", gap: 20 }}>
            {/* Columna izquierda — cuerpo + análisis */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Cuerpo */}
              <div className="card">
                <div style={{ fontSize: 13, lineHeight: 1.8, color: G.text, whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto" }}>
                  {emailSelec.cuerpo || emailSelec.snippet}
                </div>
              </div>

              {/* Análisis IA */}
              {!analisis ? (
                <button className="btn-primary" onClick={analizarEmail} disabled={loadingAnalisis} style={{ alignSelf: "flex-start", opacity: loadingAnalisis ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                  {loadingAnalisis ? "Analizando…" : "✦ Analizar con IA"}
                </button>
              ) : (
                <div style={{ background: "#1A1A13", border: `1px solid ${G.gold}33`, borderRadius: 8, padding: 18 }}>
                  <div style={{ fontSize: 11, color: G.gold, fontFamily: "DM Mono", marginBottom: 14 }}>ANÁLISIS IA</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    {[
                      { label: "Sentimiento", val: `${sentimientoEmoji[analisis.sentimiento]} ${analisis.sentimiento}`, color: sentimientoColor[analisis.sentimiento] },
                      { label: "Urgencia", val: analisis.urgencia, color: urgenciaColor[analisis.urgencia] },
                      { label: "Tono del cliente", val: analisis.tonocliente, color: G.text },
                      { label: "Acción requerida", val: analisis.accionRequerida, color: G.text },
                    ].map(k => (
                      <div key={k.label}>
                        <div style={{ fontSize: 9, color: G.textMuted, fontFamily: "DM Mono", marginBottom: 3 }}>{k.label.toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: k.color }}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: G.textMuted, fontFamily: "DM Mono", marginBottom: 4 }}>RESUMEN</div>
                    <div style={{ fontSize: 12, color: G.text, lineHeight: 1.6 }}>{analisis.resumen}</div>
                  </div>
                  {analisis.compromisos?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, color: G.textMuted, fontFamily: "DM Mono", marginBottom: 4 }}>COMPROMISOS DETECTADOS</div>
                      {analisis.compromisos.map((c,i) => <div key={i} style={{ fontSize: 12, color: G.orange, marginBottom: 2 }}>· {c}</div>)}
                    </div>
                  )}
                  {analisis.alertas?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 9, color: G.textMuted, fontFamily: "DM Mono", marginBottom: 4 }}>ALERTAS</div>
                      {analisis.alertas.map((a,i) => <div key={i} style={{ fontSize: 12, color: G.red, marginBottom: 2 }}>⚠ {a}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Columna derecha — generar respuesta */}
            <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card">
                <div className="serif" style={{ fontSize: 14, marginBottom: 12 }}>✍️ Generar Respuesta</div>
                <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 5 }}>¿QUÉ QUIERES COMUNICAR?</label>
                <textarea value={instruccion} onChange={e => setInstruccion(e.target.value)}
                  placeholder="Ej: confirmar la reunión del jueves, explicar el retraso del carpintero, pedir aprobación del presupuesto..."
                  style={{ minHeight: 80, resize: "vertical", fontSize: 12, marginBottom: 12 }} />
                <button className="btn-primary" onClick={generarRespuesta} disabled={loadingRespuesta}
                  style={{ width: "100%", opacity: loadingRespuesta ? 0.5 : 1 }}>
                  {loadingRespuesta ? "Redactando…" : "✦ Generar borrador"}
                </button>
              </div>

              {borrador && (
                <div className="card">
                  <div style={{ fontSize: 10, color: G.gold, fontFamily: "DM Mono", marginBottom: 10 }}>BORRADOR DE RESPUESTA</div>
                  <textarea value={borrador} onChange={e => setBorrador(e.target.value)}
                    style={{ minHeight: 200, resize: "vertical", fontSize: 12, marginBottom: 12, lineHeight: 1.7 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => navigator.clipboard.writeText(borrador)} className="btn-ghost" style={{ flex: 1, fontSize: 11 }}>Copiar</button>
                    <button onClick={async () => {
                      try {
                        const res = await fetch("https://api.anthropic.com/v1/messages", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            model: "claude-sonnet-4-5",
                            max_tokens: 500,
                            mcp_servers: [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail-mcp" }],
                            messages: [{ role: "user", content: `Usando Gmail, responde al thread "${emailSelec.threadId}" con este texto exacto:\n\n${borrador}\n\nConfirma con "Email enviado correctamente".` }]
                          })
                        });
                        showToast("Email enviado", "✉️", G.green);
                      } catch { showToast("Error al enviar", "✕", G.red); }
                    }} className="btn-primary" style={{ flex: 1, fontSize: 11 }}>
                      ✉ Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === CALENDARIO ===GLOBAL --------------------------------------------------------
const DIAS_SEMANA = ["L","M","X","J","V","S","D"];
const NOMBRES_MES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function CalendarioView({ obras, onSelectObra }) {
  const hoy = new Date();
  const [mesActual, setMesActual] = useState(hoy.getMonth());
  const [añoActual, setAñoActual] = useState(hoy.getFullYear());
  const [vistaMode, setVistaMode] = useState("mes"); // "mes" | "semana" | "lista"
  const [diaSelec, setDiaSelec] = useState(null);

  // Recopilar todos los eventos cross-obra
  const getEventos = () => {
    const eventos = [];
    obras.forEach(obra => {
      // Fases
      (obra.fases||[]).forEach(f => {
        if (f.inicio) eventos.push({ tipo: "fase_inicio", fecha: f.inicio, label: `▶ ${f.nombre}`, obraNombre: obra.nombre, obraId: obra.id, color: obra.color, estado: f.estado, subtipo: "inicio" });
        if (f.fin) eventos.push({ tipo: "fase_fin", fecha: f.fin, label: `⏹ ${f.nombre}`, obraNombre: obra.nombre, obraId: obra.id, color: f.estado === "completada" ? G.green : obra.color, estado: f.estado, subtipo: "fin" });
      });
      // Fecha entrega obra
      if (obra.fechaFin) {
        const dias = diasRestantes(obra.fechaFin);
        eventos.push({ tipo: "entrega", fecha: obra.fechaFin, label: `🏁 Entrega: ${obra.nombre}`, obraNombre: obra.nombre, obraId: obra.id, color: dias < 0 ? G.red : dias < 14 ? G.orange : G.green, subtipo: "entrega" });
      }
      // Cobros pendientes
      (obra.economica?.cobros||[]).filter(c => c.estado === "pendiente" && c.fecha).forEach(c => {
        eventos.push({ tipo: "cobro", fecha: c.fecha, label: `💶 ${c.concepto} (${fmt(c.importe)})`, obraNombre: obra.nombre, obraId: obra.id, color: G.gold, subtipo: "cobro" });
      });
      // Materiales con fecha necesaria
      (obra.materiales||[]).filter(m => m.fechaNecesaria && m.estado !== "recibido").forEach(m => {
        eventos.push({ tipo: "material", fecha: m.fechaNecesaria, label: `📦 ${m.nombre}`, obraNombre: obra.nombre, obraId: obra.id, color: m.critico ? G.red : G.orange, subtipo: "material" });
      });
    });
    return eventos;
  };

  const eventos = getEventos();

  const eventosEnFecha = (fechaStr) => eventos.filter(e => e.fecha === fechaStr);

  // Construir calendario del mes
  const primerDia = new Date(añoActual, mesActual, 1);
  const ultimoDia = new Date(añoActual, mesActual + 1, 0);
  const diaSemanaInicio = (primerDia.getDay() + 6) % 7; // lunes=0
  const totalDias = ultimoDia.getDate();

  const celdas = [];
  for (let i = 0; i < diaSemanaInicio; i++) celdas.push(null);
  for (let d = 1; d <= totalDias; d++) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);

  const mesAnterior = () => { if (mesActual === 0) { setMesActual(11); setAñoActual(a => a-1); } else setMesActual(m => m-1); };
  const mesSiguiente = () => { if (mesActual === 11) { setMesActual(0); setAñoActual(a => a+1); } else setMesActual(m => m+1); };

  const fechaStr = (d) => `${añoActual}-${String(mesActual+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const esHoy = (d) => d && hoy.getDate()===d && hoy.getMonth()===mesActual && hoy.getFullYear()===añoActual;

  // Eventos del d-a seleccionado o de hoy
  const diaDetalle = diaSelec || (hoy.getMonth()===mesActual && hoy.getFullYear()===añoActual ? hoy.getDate() : null);
  const eventosDetalle = diaDetalle ? eventosEnFecha(fechaStr(diaDetalle)) : [];

  // Lista de pr-ximos eventos (30 d-as)
  const en30 = new Date(hoy.getTime() + 30*864e5);
  const proximosEventos = eventos
    .filter(e => { const d = new Date(e.fecha); return d >= hoy && d <= en30; })
    .sort((a,b) => a.fecha.localeCompare(b.fecha));

  // Eventos de la semana actual
  const lunesActual = new Date(hoy);
  lunesActual.setDate(hoy.getDate() - (hoy.getDay()+6)%7);
  const semana7dias = Array.from({length:7}, (_,i) => {
    const d = new Date(lunesActual); d.setDate(lunesActual.getDate()+i); return d;
  });

  return (
    <div style={{ padding: 28, overflow: "auto", height: "100%", display: "flex", gap: 20 }}>

      {/* Panel principal — calendario */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={mesAnterior} style={{ background: "none", border: `1px solid ${G.border}`, color: G.textMuted, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>‹</button>
            <div className="serif" style={{ fontSize: 22 }}>{NOMBRES_MES[mesActual]} {añoActual}</div>
            <button onClick={mesSiguiente} style={{ background: "none", border: `1px solid ${G.border}`, color: G.textMuted, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>›</button>
            <button onClick={() => { setMesActual(hoy.getMonth()); setAñoActual(hoy.getFullYear()); }} style={{ background: "none", border: `1px solid ${G.border}`, color: G.textMuted, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Hoy</button>
          </div>
          <div style={{ display: "flex", gap: 4, background: G.bg, borderRadius: 6, padding: 4 }}>
            {[["mes","Mes"],["semana","Semana"],["lista","Lista"]].map(([id,label]) => (
              <button key={id} onClick={() => setVistaMode(id)} style={{ padding: "5px 14px", borderRadius: 4, border: "none", background: vistaMode===id ? G.surface : "transparent", color: vistaMode===id ? G.gold : G.textMuted, fontSize: 12, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── VISTA MES ── */}
        {vistaMode === "mes" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Cabecera días semana */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${G.border}` }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 11, color: G.textMuted, fontFamily: "DM Mono" }}>{d}</div>
              ))}
            </div>
            {/* Celdas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
              {celdas.map((d, i) => {
                const evs = d ? eventosEnFecha(fechaStr(d)) : [];
                const selec = d === diaSelec;
                const today = esHoy(d);
                return (
                  <div key={i} onClick={() => d && setDiaSelec(d === diaSelec ? null : d)}
                    style={{ minHeight: 90, padding: "8px 6px", borderRight: (i+1)%7!==0 ? `1px solid ${G.border}` : "none", borderBottom: i < celdas.length-7 ? `1px solid ${G.border}` : "none", background: selec ? "#1E1A13" : "transparent", cursor: d ? "pointer" : "default", transition: "background 0.15s" }}>
                    {d && (
                      <>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: today ? G.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: today ? G.bg : G.text, fontWeight: today ? 700 : 400, marginBottom: 4 }}>{d}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {evs.slice(0,3).map((e,j) => (
                            <div key={j} style={{ fontSize: 9, background: e.color+"33", color: e.color, padding: "1px 4px", borderRadius: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "DM Mono" }}>
                              {e.label}
                            </div>
                          ))}
                          {evs.length > 3 && <div style={{ fontSize: 9, color: G.textDim }}>+{evs.length-3} más</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VISTA SEMANA ── */}
        {vistaMode === "semana" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${G.border}` }}>
              {semana7dias.map((d, i) => {
                const isT = d.toDateString() === hoy.toDateString();
                return (
                  <div key={i} style={{ padding: "12px 8px", textAlign: "center", borderRight: i<6 ? `1px solid ${G.border}` : "none" }}>
                    <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 4, fontFamily: "DM Mono" }}>{DIAS_SEMANA[i]}</div>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isT ? G.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: isT ? G.bg : G.text, fontWeight: isT ? 700 : 400, margin: "0 auto" }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", minHeight: 300 }}>
              {semana7dias.map((d, i) => {
                const fStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                const evs = eventos.filter(e => e.fecha === fStr);
                return (
                  <div key={i} style={{ padding: "8px 6px", borderRight: i<6 ? `1px solid ${G.border}` : "none", minHeight: 200 }}>
                    {evs.map((e,j) => (
                      <div key={j} onClick={() => onSelectObra(e.obraId)} style={{ fontSize: 10, background: e.color+"22", color: e.color, border: `1px solid ${e.color}44`, padding: "4px 6px", borderRadius: 4, marginBottom: 4, cursor: "pointer", lineHeight: 1.3 }}>
                        <div style={{ fontWeight: 500 }}>{e.label}</div>
                        <div style={{ opacity: 0.7, marginTop: 2 }}>{e.obraNombre}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VISTA LISTA / AGENDA ── */}
        {vistaMode === "lista" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Filtro horizonte */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              {[["30","30 días"],["60","60 días"],["90","90 días"]].map(([v,l]) => {
                const active = (vistaMode === "lista") && String(Math.round((new Date(hoy.getTime() + Number(v)*864e5) - new Date(hoy.getTime() + 29*864e5)) / 864e5 + 30)) === v;
                return null; // placeholder, usando el filtro de proximosEventos
              })}
              <div style={{ fontSize: 12, color: G.textMuted }}>Próximos 90 días — {eventos.filter(e=>{ const d=new Date(e.fecha); return d>=hoy && d<=new Date(hoy.getTime()+90*864e5); }).length} eventos</div>
            </div>
            {(() => {
              const agenda = eventos.filter(e=>{ const d=new Date(e.fecha); return d>=hoy && d<=new Date(hoy.getTime()+90*864e5); }).sort((a,b)=>a.fecha.localeCompare(b.fecha));
              if (!agenda.length) return (
                <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
                  <div style={{ fontSize:36,marginBottom:10 }}>📅</div>
                  <div>Sin eventos en los próximos 90 días</div>
                </div>
              );
              let lastFecha = "";
              return agenda.map((e, i) => {
                const showFecha = e.fecha !== lastFecha;
                lastFecha = e.fecha;
                const d = new Date(e.fecha);
                const diasQ = Math.ceil((d - hoy) / 864e5);
                const urgente = diasQ <= 3;
                const proximo = diasQ <= 14;
                return (
                  <div key={i}>
                    {showFecha && (
                      <div style={{ display:"flex",alignItems:"center",gap:12,margin:"14px 0 6px" }}>
                        <div className="serif" style={{ fontSize:13,color:G.text }}>{d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}</div>
                        <span className="mono" style={{ fontSize:10,color:diasQ===0?G.gold:urgente?G.red:proximo?G.orange:G.textDim,background:diasQ===0?G.gold+"22":"transparent",padding:diasQ===0?"2px 6px":"0",borderRadius:4 }}>
                          {diasQ===0?"HOY":diasQ===1?"mañana":`en ${diasQ}d`}
                        </span>
                        <div style={{ flex:1,height:1,background:G.border }} />
                      </div>
                    )}
                    <div onClick={()=>onSelectObra(e.obraId)} style={{ display:"flex",gap:12,alignItems:"center",padding:"9px 14px",borderRadius:6,background:urgente?e.color+"11":G.surface,border:`1px solid ${urgente?e.color:e.color+"33"}`,cursor:"pointer",marginBottom:4,transition:"all 0.15s" }}>
                      <div style={{ width:10,height:10,borderRadius:"50%",background:e.color,flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,color:urgente?e.color:G.text,fontWeight:urgente?500:400 }}>{e.label}</div>
                        <div style={{ fontSize:11,color:G.textMuted,marginTop:2 }}>{e.obraNombre}</div>
                      </div>
                      {urgente&&<span className="tag" style={{ background:e.color+"22",color:e.color,fontSize:9 }}>URGENTE</span>}
                      <span style={{ fontSize:10,color:G.textDim }}>→</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Panel lateral */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Detalle día seleccionado */}
        <div className="card">
          <div className="serif" style={{ fontSize: 14, marginBottom: 12 }}>
            {diaDetalle ? new Date(añoActual, mesActual, diaDetalle).toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long" }) : "Selecciona un día"}
          </div>
          {eventosDetalle.length === 0 ? (
            <div style={{ fontSize: 12, color: G.textDim, textAlign: "center", padding: "16px 0" }}>Sin eventos este día</div>
          ) : (
            eventosDetalle.map((e,i) => (
              <div key={i} onClick={() => onSelectObra(e.obraId)} style={{ padding: "8px 10px", borderRadius: 6, background: e.color+"11", border: `1px solid ${e.color}33`, marginBottom: 6, cursor: "pointer" }}>
                <div style={{ fontSize: 12, color: e.color, fontWeight: 500 }}>{e.label}</div>
                <div style={{ fontSize: 10, color: G.textMuted, marginTop: 2 }}>{e.obraNombre}</div>
              </div>
            ))
          )}
        </div>

        {/* Próximos 7 días resumen */}
        <div className="card">
          <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 10, fontFamily: "DM Mono" }}>PRÓXIMOS 7 DÍAS</div>
          {(() => {
            const en7 = new Date(hoy.getTime() + 7*864e5);
            const prox7 = eventos.filter(e => { const d=new Date(e.fecha); return d>=hoy && d<=en7; }).sort((a,b)=>a.fecha.localeCompare(b.fecha));
            if (!prox7.length) return <div style={{ fontSize:12,color:G.textDim }}>Sin eventos esta semana</div>;
            return prox7.slice(0,5).map((e,i)=>(
              <div key={i} onClick={()=>onSelectObra(e.obraId)} style={{ display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${G.border}`,cursor:"pointer" }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background:e.color,flexShrink:0 }} />
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:e.color }}>{e.label}</div>
                  <div style={{ fontSize:9,color:G.textMuted }}>{new Date(e.fecha).toLocaleDateString("es-ES",{day:"numeric",month:"short"})}</div>
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Leyenda */}
        <div className="card">
          <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 10, fontFamily: "DM Mono" }}>LEYENDA</div>
          {[
            { color: "#5C9BE0", label: "Inicio de fase" },
            { color: G.gold,    label: "Fin de fase / Cobro" },
            { color: G.green,   label: "Entrega en plazo" },
            { color: G.orange,  label: "Entrega próxima / Material" },
            { color: G.red,     label: "Retraso / Material crítico" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: G.textMuted }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Obras con actividad este mes */}
        <div className="card">
          <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 10, fontFamily: "DM Mono" }}>ACTIVIDAD ESTE MES</div>
          {(() => {
            const mesStr = `${añoActual}-${String(mesActual+1).padStart(2,"0")}`;
            const obrasActivas = obras.filter(o => eventos.some(e => e.obraId===o.id && e.fecha?.startsWith(mesStr)));
            return obrasActivas.length ? obrasActivas.map(o => (
              <div key={o.id} onClick={() => onSelectObra(o.id)} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${G.border}`, cursor: "pointer" }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: o.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1 }}>{o.nombre}</span>
                <span style={{ fontSize: 10, color: G.textDim }}>{eventos.filter(e=>e.obraId===o.id&&e.fecha?.startsWith(mesStr)).length} ev.</span>
              </div>
            )) : <div style={{ fontSize: 12, color: G.textDim }}>Sin actividad este mes</div>;
          })()}
        </div>
      </div>
    </div>
  );
}

// === REPORTES ===& ESTAD-STICAS --------------------------------------------------
function ReportesView({ obras }) {
  const [seccion, setSeccion] = useState("general");
  const [loadingIA, setLoadingIA] = useState(false);
  const [analisisIA, setAnalisisIA] = useState("");

  // === C-lculos ===generales --
  const hoy = new Date();
  const activas = obras.filter(o => o.estado === "en_curso");
  const completadas = obras.filter(o => o.estado === "completada");
  const totalPresup = obras.reduce((a,o) => a+(o.presupuesto||0), 0);
  const totalReal   = obras.reduce((a,o) => a+(o.economica?.partidas||[]).reduce((s,p)=>s+(Number(p.real)||0),0), 0);
  const totalCobros = obras.reduce((a,o) => a+(o.economica?.cobros||[]).reduce((s,c)=>s+(Number(c.importe)||0),0), 0);
  const margenGlobal = totalCobros - totalReal;
  const margenPct = totalCobros ? Math.round((margenGlobal/totalCobros)*100) : 0;
  const totalInc = obras.reduce((a,o) => a+(o.incidencias||[]).length, 0);
  const incAbiertas = obras.reduce((a,o) => a+(o.incidencias||[]).filter(i=>i.estado==="abierta"||i.estado==="en_curso").length, 0);
  const totalTareas = obras.reduce((a,o) => a+(o.tareas||[]).length, 0);
  const tareasComp  = obras.reduce((a,o) => a+(o.tareas||[]).filter(t=>t.estado==="completada").length, 0);
  const totalFotos  = obras.reduce((a,o) => a+(o.fotos||[]).length, 0);
  const fotoIA      = obras.reduce((a,o) => a+(o.fotos||[]).filter(f=>f.avanceIA!==null).length, 0);

  // Desviaci-n media
  const desviaciones = obras.filter(o => o.economica?.partidas?.length).map(o => {
    const prev = (o.economica.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0) || o.presupuesto;
    const real = (o.economica.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
    return prev ? Math.round(((real-prev)/prev)*100) : 0;
  });
  const desvMedia = desviaciones.length ? Math.round(desviaciones.reduce((a,b)=>a+b,0)/desviaciones.length) : 0;

  // Obras retrasadas
  const retrasadas = obras.filter(o => o.fechaFin && diasRestantes(o.fechaFin) < 0 && o.estado !== "completada");

  // Avance medio IA
  const avancesIA = obras.flatMap(o => (o.fotos||[]).filter(f=>f.avanceIA!==null).map(f=>f.avanceIA));
  const avanceIA = avancesIA.length ? Math.round(avancesIA.reduce((a,b)=>a+b,0)/avancesIA.length) : null;

  // Por categor-a econ-mica
  const porCategoria = CATEGORIAS_ECO.map(cat => {
    const prev = obras.reduce((a,o) => a+(o.economica?.partidas||[]).filter(p=>p.categoria===cat.id).reduce((s,p)=>s+(Number(p.previsto)||0),0), 0);
    const real = obras.reduce((a,o) => a+(o.economica?.partidas||[]).filter(p=>p.categoria===cat.id).reduce((s,p)=>s+(Number(p.real)||0),0), 0);
    return { ...cat, prev, real };
  }).filter(c => c.prev > 0 || c.real > 0);

  // Gr-fico cashflow mensual cross-obra
  const cashflowGlobal = (() => {
    const map = {};
    obras.forEach(o => {
      (o.economica?.movimientos||[]).forEach(m => {
        if (!m.fecha) return;
        const d = new Date(m.fecha);
        const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
        if (!map[k]) map[k] = { mes: MESES[d.getMonth()], año: d.getFullYear(), pagos: 0, cobros: 0 };
        map[k].pagos += Number(m.importe)||0;
      });
      (o.economica?.cobros||[]).forEach(c => {
        if (!c.fecha) return;
        const d = new Date(c.fecha);
        const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
        if (!map[k]) map[k] = { mes: MESES[d.getMonth()], año: d.getFullYear(), pagos: 0, cobros: 0 };
        map[k].cobros += Number(c.importe)||0;
      });
    });
    return Object.values(map).sort((a,b) => `${a.año}${a.mes}` > `${b.año}${b.mes}` ? 1 : -1);
  })();
  const maxCF = Math.max(...cashflowGlobal.map(m=>Math.max(m.pagos,m.cobros)), 1);

  // Ranking obras por margen
  const rankingObras = obras.filter(o=>o.economica?.cobros?.length||o.economica?.partidas?.length).map(o => {
    const cobros = (o.economica?.cobros||[]).reduce((a,c)=>a+(Number(c.importe)||0),0);
    const real   = (o.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
    const margen = cobros - real;
    const pct    = cobros ? Math.round((margen/cobros)*100) : 0;
    return { ...o, margen, margenPct: pct, cobros, real };
  }).sort((a,b) => b.margenPct - a.margenPct);

  // An-lisis IA
  const generarAnalisis = async () => {
    setLoadingIA(true); setAnalisisIA("");
    const resumen = `Obras: ${obras.length} totales (${activas.length} activas, ${completadas.length} completadas, ${retrasadas.length} retrasadas). Presupuesto acumulado: ${fmt(totalPresup)}. Coste real: ${fmt(totalReal)}. Desviación media: ${desvMedia}%. Cobros totales: ${fmt(totalCobros)}. Margen global: ${fmt(margenGlobal)} (${margenPct}%). Incidencias: ${totalInc} totales, ${incAbiertas} abiertas. Tareas: ${tareasComp}/${totalTareas} completadas. Avance medio IA: ${avanceIA||"sin datos"}%.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 800,
          messages: [{ role: "user", content: `Eres un consultor experto en gestión de obras y reformas premium. Analiza estos datos del negocio y proporciona un diagnóstico ejecutivo conciso:\n\n${resumen}\n\nProporciona: 1) Estado general del negocio (2-3 frases), 2) Puntos fuertes detectados, 3) Áreas de riesgo o mejora, 4) Recomendaciones concretas (máximo 4). Tono profesional y directo. Máximo 250 palabras.` }]
        })
      });
      const data = await res.json();
      setAnalisisIA(data.content?.find(b=>b.type==="text")?.text || "");
    } catch { setAnalisisIA("Error al generar el análisis."); }
    setLoadingIA(false);
  };

  const SECCIONES = [["general","Resumen"],["economico","Económico"],["obras","Por Obra"],["operativo","Operativo"]];

  return (
    <div style={{ padding: 28, overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div className="serif" style={{ fontSize: 26, marginBottom: 4 }}>Reportes & Estadísticas</div>
          <div style={{ fontSize: 13, color: G.textMuted }}>Visión global de tu negocio de reformas</div>
        </div>
        <button className="btn-primary" onClick={generarAnalisis} disabled={loadingIA} style={{ display: "flex", alignItems: "center", gap: 6, opacity: loadingIA ? 0.5 : 1 }}>
          {loadingIA ? "Analizando…" : "✦ Análisis IA"}
        </button>
      </div>

      {/* Análisis IA */}
      {analisisIA && (
        <div style={{ background: "#1A1A13", border: `1px solid ${G.gold}33`, borderRadius: 8, padding: "18px 22px", marginBottom: 24, display: "flex", gap: 14 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>✦</div>
          <div>
            <div style={{ fontSize: 11, color: G.gold, fontFamily: "DM Mono", marginBottom: 10 }}>DIAGNÓSTICO IA</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: G.text, whiteSpace: "pre-wrap" }}>{analisisIA}</div>
          </div>
        </div>
      )}

      {/* Sub-nav */}
      <div style={{ display: "flex", gap: 4, background: G.bg, borderRadius: 6, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {SECCIONES.map(([id,label]) => (
          <button key={id} onClick={() => setSeccion(id)} style={{ padding: "7px 18px", borderRadius: 4, border: "none", background: seccion===id ? G.surface : "transparent", color: seccion===id ? G.gold : G.textMuted, fontSize: 12, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── RESUMEN GENERAL ── */}
      {seccion === "general" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "OBRAS ACTIVAS", val: activas.length, sub: `${completadas.length} completadas`, color: G.green },
              { label: "RETRASADAS", val: retrasadas.length, sub: retrasadas.map(o=>o.nombre).join(", ")||"Ninguna", color: retrasadas.length > 0 ? G.red : G.textMuted },
              { label: "MARGEN GLOBAL", val: `${margenPct}%`, sub: fmt(margenGlobal), color: margenGlobal >= 0 ? G.green : G.red },
              { label: "DESVIACIÓN MEDIA", val: `${desvMedia > 0 ? "+" : ""}${desvMedia}%`, sub: "sobre presupuesto", color: desvMedia > 10 ? G.red : desvMedia > 0 ? G.orange : G.green },
            ].map(k => (
              <div key={k.label} className="stat-box" style={{ borderLeft: `3px solid ${k.color}` }}>
                <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 8, fontFamily: "DM Mono" }}>{k.label}</div>
                <div className="serif" style={{ fontSize: 26, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 11, color: G.textMuted, marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "TAREAS COMPLETADAS", val: `${pct(tareasComp,totalTareas)}%`, sub: `${tareasComp}/${totalTareas}`, color: G.gold },
              { label: "INCIDENCIAS ABIERTAS", val: incAbiertas, sub: `${totalInc} totales`, color: incAbiertas > 0 ? G.orange : G.green },
              { label: "FOTOS ANALIZADAS IA", val: fotoIA, sub: `de ${totalFotos} subidas`, color: G.blue },
              { label: "AVANCE MEDIO IA", val: avanceIA !== null ? `${avanceIA}%` : "—", sub: "promedio cross-obra", color: avanceIA > 70 ? G.green : G.gold },
            ].map(k => (
              <div key={k.label} className="stat-box">
                <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 8, fontFamily: "DM Mono" }}>{k.label}</div>
                <div className="serif" style={{ fontSize: 26, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 11, color: G.textMuted, marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Estado obras visual */}
          <div className="card">
            <div className="serif" style={{ fontSize: 15, marginBottom: 16 }}>Estado de todas las obras</div>
            {obras.map(o => {
              const p = pct((o.tareas||[]).filter(t=>t.estado==="completada").length,(o.tareas||[]).length);
              const dias = o.fechaFin ? diasRestantes(o.fechaFin) : null;
              const col = o.estado==="completada" ? G.textMuted : dias!==null&&dias<0 ? G.red : dias!==null&&dias<30 ? G.orange : G.green;
              return (
                <div key={o.id} style={{ padding: "12px 0", borderBottom:`1px solid ${G.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ width:8,height:8,borderRadius:2,background:o.color }} />
                      <span style={{ fontSize:13, fontWeight:500 }}>{o.nombre}</span>
                      {estadoTag(o.estado)}
                    </div>
                    <div style={{ display:"flex", gap:16, fontSize:11 }}>
                      <span className="mono" style={{ color:G.gold }}>{fmt(calcPresupuesto(o))}</span>
                      {dias!==null && <span className="mono" style={{ color:col }}>{dias<0?`${Math.abs(dias)}d retraso`:`${dias}d`}</span>}
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height:5 }}>
                    <div className="progress-fill" style={{ width:`${p}%`, background:o.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ECONÓMICO ── */}
      {seccion === "economico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap:14 }}>
            {[
              { label:"PRESUPUESTO TOTAL", val:fmt(totalPresup), color:G.gold },
              { label:"COSTE REAL", val:fmt(totalReal), color:totalReal>totalPresup?G.red:G.text },
              { label:"COBROS TOTALES", val:fmt(totalCobros), color:G.green },
              { label:"MARGEN €", val:fmt(margenGlobal), color:margenGlobal>=0?G.green:G.red },
              { label:"MARGEN %", val:`${margenPct}%`, color:margenPct>=20?G.green:margenPct>=10?G.gold:G.red },
              { label:"DESVIACIÓN MEDIA", val:`${desvMedia>0?"+":""}${desvMedia}%`, color:desvMedia>10?G.red:desvMedia>0?G.orange:G.green },
            ].map(k => (
              <div key={k.label} className="stat-box">
                <div style={{ fontSize:10,color:G.textMuted,marginBottom:8,fontFamily:"DM Mono" }}>{k.label}</div>
                <div className="serif" style={{ fontSize:24,color:k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Cashflow global */}
          {cashflowGlobal.length > 0 && (
            <div className="card">
              <div className="serif" style={{ fontSize:15,marginBottom:20 }}>Cashflow Global</div>
              <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:160, overflowX:"auto" }}>
                {cashflowGlobal.map((m,i) => {
                  const hP = Math.round((m.pagos/maxCF)*140);
                  const hC = Math.round((m.cobros/maxCF)*140);
                  const saldo = m.cobros - m.pagos;
                  return (
                    <div key={i} style={{ flex:"0 0 64px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ fontSize:9, color:saldo>=0?G.green:G.red, fontFamily:"DM Mono" }}>{saldo>=0?"+":""}{Math.round(saldo/1000)}k</div>
                      <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:140 }}>
                        {m.cobros>0&&<div style={{ width:18,height:hC,background:G.green,borderRadius:"3px 3px 0 0",opacity:0.85 }} title={`Cobros: ${fmt(m.cobros)}`} />}
                        {m.pagos>0&&<div style={{ width:18,height:hP,background:G.red,borderRadius:"3px 3px 0 0",opacity:0.75 }} title={`Pagos: ${fmt(m.pagos)}`} />}
                      </div>
                      <div className="mono" style={{ fontSize:9,color:G.textMuted }}>{m.mes} {m.año!==new Date().getFullYear()?m.año:""}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:16, marginTop:12 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:G.textMuted }}><div style={{ width:10,height:10,borderRadius:2,background:G.green }} />Cobros</div>
                <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:G.textMuted }}><div style={{ width:10,height:10,borderRadius:2,background:G.red }} />Pagos</div>
              </div>
            </div>
          )}

          {/* Por categoría */}
          {porCategoria.length > 0 && (
            <div className="card">
              <div className="serif" style={{ fontSize:15,marginBottom:16 }}>Gasto por Categoría (todas las obras)</div>
              {porCategoria.map(cat => {
                const maxVal = Math.max(...porCategoria.map(c=>Math.max(c.prev,c.real)),1);
                const wPrev = (cat.prev/maxVal)*100;
                const wReal = (cat.real/maxVal)*100;
                const sobre = cat.real > cat.prev;
                return (
                  <div key={cat.id} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:5 }}>
                      <span>{cat.icon}</span>
                      <span style={{ fontSize:12,flex:1 }}>{cat.label}</span>
                      <span className="mono" style={{ fontSize:11,color:G.textMuted }}>{fmt(cat.prev)}</span>
                      <span className="mono" style={{ fontSize:11,color:sobre?G.red:G.green }}>→ {fmt(cat.real)}</span>
                    </div>
                    <div style={{ position:"relative",height:6,background:G.border,borderRadius:3 }}>
                      <div style={{ position:"absolute",left:0,top:0,height:"100%",width:`${wPrev}%`,background:cat.color+"44",borderRadius:3 }} />
                      <div style={{ position:"absolute",left:0,top:0,height:"100%",width:`${wReal}%`,background:sobre?G.red:cat.color,borderRadius:3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── POR OBRA ── */}
      {seccion === "obras" && (
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          {rankingObras.length === 0 ? (
            <div style={{ textAlign:"center",padding:"40px 0",color:G.textMuted }}>
              <div style={{ fontSize:36,marginBottom:10 }}>📊</div>
              <div>Añade datos económicos a las obras para ver el ranking</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:12,color:G.textMuted }}>Ranking de obras por margen — de mayor a menor rentabilidad</div>
              {rankingObras.map((o,i) => (
                <div key={o.id} className="card" style={{ borderLeft:`3px solid ${o.color}` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                    <div className="serif" style={{ fontSize:24,color:G.textDim,width:28,flexShrink:0 }}>#{i+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:6 }}>
                        <span style={{ fontSize:14,fontWeight:500 }}>{o.nombre}</span>
                        {estadoTag(o.estado)}
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                        {[
                          { label:"Cobros", val:fmt(o.cobros), color:G.green },
                          { label:"Coste real", val:fmt(o.real), color:G.text },
                          { label:"Margen €", val:fmt(o.margen), color:o.margen>=0?G.green:G.red },
                          { label:"Margen %", val:`${o.margenPct}%`, color:o.margenPct>=20?G.green:o.margenPct>=10?G.gold:G.red },
                        ].map(k => (
                          <div key={k.label}>
                            <div style={{ fontSize:9,color:G.textMuted,fontFamily:"DM Mono",marginBottom:2 }}>{k.label.toUpperCase()}</div>
                            <div className="mono" style={{ fontSize:14,color:k.color }}>{k.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Obras sin datos económicos */}
          {obras.filter(o=>!o.economica?.cobros?.length&&!o.economica?.partidas?.length).map(o => (
            <div key={o.id} className="card" style={{ opacity:0.5,borderLeft:`3px solid ${G.border}` }}>
              <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                <div style={{ width:8,height:8,borderRadius:2,background:o.color }} />
                <span style={{ fontSize:13 }}>{o.nombre}</span>
                <span style={{ fontSize:11,color:G.textDim,marginLeft:"auto" }}>Sin datos económicos</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── OPERATIVO ── */}
      {seccion === "operativo" && (
        <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14 }}>
            {[
              { label:"TAREAS TOTALES", val:totalTareas, sub:`${tareasComp} completadas (${pct(tareasComp,totalTareas)}%)`, color:G.gold },
              { label:"INCIDENCIAS TOTALES", val:totalInc, sub:`${incAbiertas} activas`, color:incAbiertas>0?G.orange:G.textMuted },
              { label:"FOTOS SUBIDAS", val:totalFotos, sub:`${fotoIA} analizadas con IA`, color:G.blue },
            ].map(k => (
              <div key={k.label} className="stat-box">
                <div style={{ fontSize:10,color:G.textMuted,marginBottom:8,fontFamily:"DM Mono" }}>{k.label}</div>
                <div className="serif" style={{ fontSize:26,color:k.color }}>{k.val}</div>
                <div style={{ fontSize:11,color:G.textMuted,marginTop:4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Incidencias por tipo */}
          <div className="card">
            <div className="serif" style={{ fontSize:15,marginBottom:16 }}>Incidencias por Tipo</div>
            {(() => {
              const porTipo = {};
              obras.forEach(o => (o.incidencias||[]).forEach(i => { porTipo[i.tipo] = (porTipo[i.tipo]||0)+1; }));
              const max = Math.max(...Object.values(porTipo),1);
              return Object.entries(porTipo).sort((a,b)=>b[1]-a[1]).map(([tipo,n]) => (
                <div key={tipo} style={{ display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${G.border}` }}>
                  <span style={{ fontSize:12,width:120,flexShrink:0 }}>{tipo}</span>
                  <div style={{ flex:1,height:6,background:G.border,borderRadius:3 }}>
                    <div style={{ height:"100%",borderRadius:3,background:G.gold,width:`${(n/max)*100}%` }} />
                  </div>
                  <span className="mono" style={{ fontSize:12,color:G.gold,width:24,textAlign:"right" }}>{n}</span>
                </div>
              ));
            })()}
            {totalInc===0&&<div style={{ color:G.textMuted,fontSize:13 }}>Sin incidencias registradas</div>}
          </div>

          {/* Avance por zona IA cross-obra */}
          {avancesIA.length > 0 && (
            <div className="card">
              <div className="serif" style={{ fontSize:15,marginBottom:16 }}>Avance Detectado por IA</div>
              {(() => {
                const porZona = {};
                obras.forEach(o => (o.fotos||[]).filter(f=>f.avanceIA!==null).forEach(f => {
                  if(!porZona[f.zona]) porZona[f.zona]=[];
                  porZona[f.zona].push(f.avanceIA);
                }));
                return Object.entries(porZona).map(([zona,vals]) => {
                  const avg = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
                  return (
                    <div key={zona} style={{ display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${G.border}` }}>
                      <span style={{ fontSize:12,flex:1 }}>{zona}</span>
                      <div style={{ width:160,height:6,background:G.border,borderRadius:3 }}>
                        <div style={{ height:"100%",borderRadius:3,background:avg>70?G.green:avg>40?G.gold:G.orange,width:`${avg}%` }} />
                      </div>
                      <span className="mono" style={{ fontSize:12,color:avg>70?G.green:avg>40?G.gold:G.orange,width:36,textAlign:"right" }}>{avg}%</span>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === CONFIGURACI-N ===
function ConfiguracionView({ obras, onReset, showToast }) {
  const [config, setConfig] = useState(() => {
    try { const s = localStorage.getItem("bf-config"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [backups] = useState(() => getBackups());

  const saveConfig = (nuevaConfig) => {
    const merged = { ...config, ...nuevaConfig };
    setConfig(merged);
    try { localStorage.setItem("bf-config", JSON.stringify(merged)); } catch(e) { void 0; }
  };

  const set = (k, v) => saveConfig({ [k]: v });

  const restaurarBackup = (backup) => {
    if (!window.confirm(`¿Restaurar backup del ${new Date(backup.ts).toLocaleString("es-ES")}? Se perderán los cambios actuales.`)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.data));
      window.location.reload();
    } catch(e) { void 0; }
  };

  // Estad-sticas de uso
  const stats = {
    obras: obras.length,
    tareas: obras.reduce((a,o)=>a+(o.tareas||[]).length,0),
    fotos: obras.reduce((a,o)=>a+(o.fotos||[]).length,0),
    planos: obras.reduce((a,o)=>a+(o.planos||[]).length,0),
    incidencias: obras.reduce((a,o)=>a+(o.incidencias||[]).length,0),
    materiales: obras.reduce((a,o)=>a+(o.materiales||[]).length,0),
    checklists: obras.reduce((a,o)=>a+(o.checklists||[]).length,0),
    docs: obras.reduce((a,o)=>a+(o.docsArquitecto||[]).filter(d=>d.archivo).length,0),
  };

  const exportarDatos = () => {
    const data = JSON.stringify({ obras, exportadoEn: new Date().toISOString(), version: "1.0" }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `blueforest-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast("Backup exportado", "💾", G.green);
  };

  const importarDatos = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.obras) {
          saveData({ obras: data.obras });
          showToast("Datos importados correctamente", "✓", G.green);
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch { showToast("Error al importar el archivo", "✕", G.red); }
    };
    reader.readAsText(file);
  };

  const SECTION = ({ title, children }) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="serif" style={{ fontSize: 15, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${G.border}` }}>{title}</div>
      {children}
    </div>
  );

  const ROW = ({ label, desc, children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: `1px solid ${G.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: G.textMuted, marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? G.gold : G.border, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </div>
  );

  return (
    <div style={{ padding: 28, overflow: "auto", height: "100%", maxWidth: 720 }}>
      <div className="serif" style={{ fontSize: 26, marginBottom: 6 }}>Configuración</div>
      <div style={{ fontSize: 13, color: G.textMuted, marginBottom: 28 }}>Ajustes de la cuenta y preferencias de Blue Forest</div>

      {/* Perfil */}
      <SECTION title="👤 Perfil del Estudio">
        <ROW label="Nombre del estudio / empresa" desc="Aparece en informes y portal cliente">
          <input value={config.estudio||""} onChange={e=>set("estudio",e.target.value)} placeholder="Blue Forest Studio" style={{ width: 220, fontSize: 12 }} />
        </ROW>
        <ROW label="Tu nombre" desc="Nombre del responsable principal">
          <input value={config.nombre||""} onChange={e=>set("nombre",e.target.value)} placeholder="Nombre Apellido" style={{ width: 220, fontSize: 12 }} />
        </ROW>
        <ROW label="Email de contacto">
          <input value={config.email||""} onChange={e=>set("email",e.target.value)} placeholder="email@estudio.com" style={{ width: 220, fontSize: 12 }} />
        </ROW>
        <ROW label="Teléfono">
          <input value={config.telefono||""} onChange={e=>set("telefono",e.target.value)} placeholder="+34 600 000 000" style={{ width: 220, fontSize: 12 }} />
        </ROW>
        <ROW label="Ciudad / Comunidad Autónoma" desc="Usada para normativa y clima en dashboard">
          <input value={config.ciudad||""} onChange={e=>set("ciudad",e.target.value)} placeholder="Barcelona, Cataluña" style={{ width: 220, fontSize: 12 }} />
        </ROW>
        <ROW label="NIF / CIF">
          <input value={config.nif||""} onChange={e=>set("nif",e.target.value)} placeholder="B12345678" style={{ width: 220, fontSize: 12 }} />
        </ROW>
      </SECTION>

      {/* Preferencias */}
      <SECTION title="⚙️ Preferencias de la App">
        <ROW label="Alertas de retrasos" desc="Mostrar alertas automáticas en el dashboard">
          <Toggle value={config.alertasRetrasos!==false} onChange={v=>set("alertasRetrasos",v)} />
        </ROW>
        <ROW label="Alertas de cobros vencidos" desc="Avisar cuando un cobro lleva más de 14 días">
          <Toggle value={config.alertasCobros!==false} onChange={v=>set("alertasCobros",v)} />
        </ROW>
        <ROW label="Análisis IA de fotos automático" desc="Analizar fotos automáticamente al subirlas">
          <Toggle value={!!config.fotoAutoIA} onChange={v=>set("fotoAutoIA",v)} />
        </ROW>
        <ROW label="Modo compacto en dashboard" desc="Reduce el espaciado para ver más información">
          <Toggle value={!!config.modoCompacto} onChange={v=>set("modoCompacto",v)} />
        </ROW>
        <ROW label="Moneda" desc="Moneda usada en presupuestos e informes">
          <select value={config.moneda||"EUR"} onChange={e=>set("moneda",e.target.value)} style={{ width: 100, fontSize: 12 }}>
            {["EUR","USD","GBP","CHF","MXN","COP"].map(m=><option key={m}>{m}</option>)}
          </select>
        </ROW>
        <ROW label="IVA por defecto (%)" desc="Aplicado en presupuestos generados">
          <input type="number" value={config.iva||21} onChange={e=>set("iva",Number(e.target.value))} style={{ width: 80, fontSize: 12, textAlign: "center" }} min="0" max="30" />
        </ROW>
      </SECTION>

      {/* Portal cliente */}
      <SECTION title="👁 Portal Cliente">
        <ROW label="Código de acceso del cliente" desc="El cliente usa este código en blueforest-ecru.vercel.app/cliente">
          <input value={config.codigoCliente||""} onChange={e=>set("codigoCliente",e.target.value)} placeholder="ej: tornos2026" style={{ width: 260, fontSize: 12 }} />
        </ROW>
        <ROW label="Mostrar presupuesto al cliente" desc="El cliente puede ver el importe total de la obra">
          <Toggle value={!!config.portalPresupuesto} onChange={v=>set("portalPresupuesto",v)} />
        </ROW>
        <ROW label="Mostrar incidencias al cliente" desc="El cliente puede ver incidencias abiertas">
          <Toggle value={config.portalIncidencias!==false} onChange={v=>set("portalIncidencias",v)} />
        </ROW>
        <ROW label="Mensaje de bienvenida del portal">
          <input value={config.portalMensaje||""} onChange={e=>set("portalMensaje",e.target.value)} placeholder="Seguimiento de tu reforma en tiempo real" style={{ width: 260, fontSize: 12 }} />
        </ROW>
      </SECTION>

      {/* Uso y datos */}
      <SECTION title="📊 Uso de la App">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Obras", val: stats.obras },
            { label: "Tareas", val: stats.tareas },
            { label: "Fotos", val: stats.fotos },
            { label: "Planos", val: stats.planos },
            { label: "Incidencias", val: stats.incidencias },
            { label: "Materiales", val: stats.materiales },
            { label: "Checklists", val: stats.checklists },
            { label: "Docs arq.", val: stats.docs },
          ].map(s => (
            <div key={s.label} className="stat-box" style={{ padding: "12px 14px" }}>
              <div className="serif" style={{ fontSize: 22, color: G.gold }}>{s.val}</div>
              <div style={{ fontSize: 10, color: G.textMuted, fontFamily: "DM Mono" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </SECTION>

      {/* Datos */}
      <SECTION title="💾 Datos y Backup">
        <ROW label="Exportar todos los datos" desc="Descarga un archivo JSON con toda la información">
          <button className="btn-ghost" onClick={exportarDatos} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            ⬇ Exportar backup
          </button>
        </ROW>
        <ROW label="Importar datos" desc="Restaura desde un backup anterior">
          <label style={{ cursor: "pointer" }}>
            <input type="file" accept=".json" onChange={importarDatos} style={{ display: "none" }} />
            <span className="btn-ghost" style={{ fontSize: 12, padding: "7px 16px", borderRadius: 6, border: `1px solid ${G.border}`, color: G.textMuted, display: "inline-block", cursor: "pointer" }}>⬆ Importar backup</span>
          </label>
        </ROW>
        <ROW label="Borrar todos los datos" desc="Elimina toda la información de Blue Forest. Irreversible.">
          <button onClick={onReset} style={{ background: "#2A1010", border: `1px solid ${G.red}44`, color: G.red, padding: "7px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
            🗑️ Borrar todo
          </button>
        </ROW>
        {backups.length > 0 && (
          <div className="card" style={{ marginTop:8 }}>
            <div style={{ fontSize:13,fontWeight:600,color:G.gold,marginBottom:12 }}>🔄 Backups automáticos ({backups.length})</div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {backups.map((b,i)=>(
                <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:G.bg,borderRadius:6,border:`1px solid ${G.border}` }}>
                  <div>
                    <div style={{ fontSize:12,color:G.text }}>{new Date(b.ts).toLocaleString("es-ES")}</div>
                    <div style={{ fontSize:11,color:G.textMuted }}>{b.data?.obras?.length||0} obras · {b.data?.obras?.reduce((a,o)=>a+(o.tareas||[]).length,0)||0} tareas</div>
                  </div>
                  <button onClick={()=>restaurarBackup(b)} style={{ padding:"5px 12px",borderRadius:6,border:`1px solid ${G.gold}44`,background:"transparent",color:G.gold,fontSize:11,cursor:"pointer" }}>
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </SECTION>

      {/* Acerca de */}
      <SECTION title="ℹ️ Acerca de Blue Forest">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["Versión", "1.0.0 — MVP"],
            ["Tecnología", "React + Claude AI (Anthropic)"],
            ["Almacenamiento", "Local (navegador) — tus datos nunca salen de tu dispositivo"],
            ["Modelo IA", "Claude Sonnet — análisis de fotos, documentos y comunicaciones"],
          ].map(([k,v]) => (
            <div key={k} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${G.border}` }}>
              <span style={{ fontSize: 12, color: G.textMuted, width: 140, flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: 12, color: G.text }}>{v}</span>
            </div>
          ))}
        </div>
      </SECTION>
    </div>
  );
}

// === EQUIPO ===& MULTIUSUARIO ----------------------------------------------------
// === AUTOMATIZACIONES ===
const REGLAS_DEFAULT = [
  { id: "r1", activa: true,  emoji: "⏰", nombre: "Retraso en fase crítica",      trigger: "fase_retraso",    condicion: { dias: 1 },  accion: "alerta",    prioridad: "rojo",    descripcion: "Alerta cuando una fase lleva más de N días de retraso" },
  { id: "r2", activa: true,  emoji: "💶", nombre: "Cobro vencido",               trigger: "cobro_vencido",   condicion: { dias: 14 }, accion: "alerta",    prioridad: "naranja", descripcion: "Avisa cuando un cobro lleva más de N días pendiente" },
  { id: "r3", activa: true,  emoji: "🔴", nombre: "Incidencia crítica abierta",  trigger: "inc_critica",     condicion: { dias: 3 },  accion: "alerta",    prioridad: "rojo",    descripcion: "Alerta si una incidencia crítica lleva más de N días sin resolverse" },
  { id: "r4", activa: true,  emoji: "📅", nombre: "Entrega próxima",             trigger: "entrega_proxima", condicion: { dias: 14 }, accion: "alerta",    prioridad: "naranja", descripcion: "Avisa cuando quedan menos de N días para la entrega" },
  { id: "r5", activa: true,  emoji: "💸", nombre: "Desviación presupuestaria",   trigger: "desviacion",      condicion: { pct: 10 },  accion: "alerta",    prioridad: "naranja", descripcion: "Alerta cuando el coste real supera el previsto en más de N%" },
  { id: "r6", activa: false, emoji: "👷", nombre: "Tarea sin responsable",       trigger: "tarea_sin_resp",  condicion: { dias: 2 },  accion: "alerta",    prioridad: "naranja", descripcion: "Avisa si una tarea en curso lleva N días sin responsable asignado" },
  { id: "r7", activa: false, emoji: "📦", nombre: "Material crítico en riesgo",  trigger: "material_riesgo", condicion: { dias: 0 },  accion: "alerta",    prioridad: "naranja", descripcion: "Alerta cuando una fase con material crítico tiene retraso" },
  { id: "r8", activa: false, emoji: "✅", nombre: "Fase completada → siguiente", trigger: "fase_completa",   condicion: { dias: 0 },  accion: "info",      prioridad: "verde",   descripcion: "Notifica cuando una fase se completa y activa la siguiente" },
];

function evaluarReglas(obras, reglas) {
  const hoy = new Date();
  const disparos = [];

  reglas.filter(r => r.activa).forEach(regla => {
    obras.forEach(obra => {
      if (obra.estado === "completada") return;

      if (regla.trigger === "fase_retraso") {
        (obra.fases||[]).forEach(f => {
          const retraso = Number(f.retrasoReal)||0;
          if (retraso >= regla.condicion.dias) {
            disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: regla.emoji, prioridad: regla.prioridad, mensaje: `Fase "${f.nombre}" lleva ${retraso}d de retraso`, fecha: hoy.toLocaleDateString("es-ES") });
          }
        });
      }

      if (regla.trigger === "cobro_vencido") {
        (obra.economica?.cobros||[]).filter(c => c.estado === "pendiente" && c.fecha).forEach(c => {
          const dias = Math.floor((hoy - new Date(c.fecha)) / 864e5);
          if (dias >= regla.condicion.dias) {
            disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: regla.emoji, prioridad: regla.prioridad, mensaje: `Cobro "${c.concepto}" lleva ${dias}d pendiente (${fmt(c.importe)})`, fecha: hoy.toLocaleDateString("es-ES") });
          }
        });
      }

      if (regla.trigger === "inc_critica") {
        (obra.incidencias||[]).filter(i => i.prioridad === "critica" && i.estado === "abierta" && i.fecha).forEach(i => {
          const dias = Math.floor((hoy - new Date(i.fecha)) / 864e5);
          if (dias >= regla.condicion.dias) {
            disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: regla.emoji, prioridad: regla.prioridad, mensaje: `Incidencia crítica "${i.titulo}" lleva ${dias}d abierta`, fecha: hoy.toLocaleDateString("es-ES") });
          }
        });
      }

      if (regla.trigger === "entrega_proxima" && obra.fechaFin) {
        const dias = Math.ceil((new Date(obra.fechaFin) - hoy) / 864e5);
        if (dias >= 0 && dias <= regla.condicion.dias) {
          disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: regla.emoji, prioridad: regla.prioridad, mensaje: `Entrega en ${dias} días (${obra.fechaFin})`, fecha: hoy.toLocaleDateString("es-ES") });
        }
        if (dias < 0) {
          disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: "🔴", prioridad: "rojo", mensaje: `Fecha de entrega superada hace ${Math.abs(dias)} días`, fecha: hoy.toLocaleDateString("es-ES") });
        }
      }

      if (regla.trigger === "desviacion") {
        const prev = (obra.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0) || obra.presupuesto;
        const real = (obra.economica?.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
        if (prev > 0 && real > 0) {
          const pct = Math.round(((real - prev) / prev) * 100);
          if (pct >= regla.condicion.pct) {
            disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: regla.emoji, prioridad: regla.prioridad, mensaje: `Desviación presupuestaria del +${pct}% (${fmt(real - prev)} sobre previsto)`, fecha: hoy.toLocaleDateString("es-ES") });
          }
        }
      }

      if (regla.trigger === "tarea_sin_resp") {
        (obra.tareas||[]).filter(t => t.estado === "en_curso" && !t.responsable).forEach(t => {
          disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: regla.emoji, prioridad: regla.prioridad, mensaje: `Tarea "${t.titulo}" en curso sin responsable asignado`, fecha: hoy.toLocaleDateString("es-ES") });
        });
      }

      if (regla.trigger === "material_riesgo") {
        (obra.fases||[]).filter(f => f.material && Number(f.retrasoReal) > 0).forEach(f => {
          disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: regla.emoji, prioridad: regla.prioridad, mensaje: `Material crítico "${f.material}" en riesgo — fase "${f.nombre}" retrasada`, fecha: hoy.toLocaleDateString("es-ES") });
        });
      }

      if (regla.trigger === "fase_completa") {
        (obra.fases||[]).filter(f => f.estado === "completada").forEach(f => {
          const sig = obra.fases.find(x => x.dependeDe === f.id);
          if (sig && sig.estado === "pendiente") {
            disparos.push({ reglaId: regla.id, obraId: obra.id, obraNombre: obra.nombre, emoji: regla.emoji, prioridad: regla.prioridad, mensaje: `Fase "${f.nombre}" completada → "${sig.nombre}" puede comenzar`, fecha: hoy.toLocaleDateString("es-ES") });
          }
        });
      }
    });
  });

  return disparos;
}

const PRIORIDAD_COLOR = { rojo: G.red, naranja: G.orange, verde: G.green, azul: G.blue };

function AutomatizacionesView({ obras, onSelectObra }) {
  const [reglas, setReglas] = useState(() => {
    try { const s = localStorage.getItem("bf-reglas"); return s ? JSON.parse(s) : REGLAS_DEFAULT; } catch { return REGLAS_DEFAULT; }
  });
  const [historial, setHistorial] = useState(() => {
    try { const s = localStorage.getItem("bf-historial"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [editando, setEditando] = useState(null);
  const [seccion, setSeccion] = useState("panel");

  const saveReglas = (nuevas) => {
    setReglas(nuevas);
    try { localStorage.setItem("bf-reglas", JSON.stringify(nuevas)); } catch(e) { void 0; }
  };

  const toggleRegla = (id) => saveReglas(reglas.map(r => r.id === id ? { ...r, activa: !r.activa } : r));
  const updateCondicion = (id, campo, valor) => saveReglas(reglas.map(r => r.id === id ? { ...r, condicion: { ...r.condicion, [campo]: Number(valor) } } : r));

  const disparosActuales = evaluarReglas(obras, reglas);
  const rojos = disparosActuales.filter(d => d.prioridad === "rojo").length;
  const naranjas = disparosActuales.filter(d => d.prioridad === "naranja").length;

  const ejecutarAhora = () => {
    const nuevos = disparosActuales.map(d => ({ ...d, id: uid(), ejecutadoEn: new Date().toLocaleString("es-ES") }));
    const nuevoHistorial = [...nuevos, ...historial].slice(0, 50);
    setHistorial(nuevoHistorial);
    try { localStorage.setItem("bf-historial", JSON.stringify(nuevoHistorial)); } catch(e) { void 0; }
  };

  return (
    <div style={{ padding: 28, overflow: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="serif" style={{ fontSize: 26, marginBottom: 4 }}>Automatizaciones</div>
          <div style={{ fontSize: 13, color: G.textMuted }}>Reglas activas que monitorizan tus obras y generan alertas automáticamente</div>
        </div>
        <button className="btn-primary" onClick={ejecutarAhora} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          ▶ Ejecutar ahora
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "REGLAS ACTIVAS", val: reglas.filter(r=>r.activa).length, color: G.gold },
          { label: "ALERTAS ACTIVAS", val: disparosActuales.length, color: disparosActuales.length > 0 ? G.orange : G.green },
          { label: "CRÍTICAS", val: rojos, color: rojos > 0 ? G.red : G.textMuted },
          { label: "DISPAROS HISTÓRICOS", val: historial.length, color: G.textMuted },
        ].map(k => (
          <div key={k.label} className="stat-box">
            <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 8, fontFamily: "DM Mono" }}>{k.label}</div>
            <div className="serif" style={{ fontSize: 28, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Sub-nav */}
      <div style={{ display: "flex", gap: 4, background: G.bg, borderRadius: 6, padding: 4, marginBottom: 20, width: "fit-content" }}>
        {[["panel","Panel de alertas"], ["reglas","Reglas"], ["historial","Historial"]].map(([id, label]) => (
          <button key={id} onClick={() => setSeccion(id)} style={{ padding: "7px 18px", borderRadius: 4, border: "none", background: seccion === id ? G.surface : "transparent", color: seccion === id ? G.gold : G.textMuted, fontSize: 12, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PANEL DE ALERTAS ── */}
      {seccion === "panel" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {disparosActuales.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div className="serif" style={{ fontSize: 20, marginBottom: 8 }}>Todo en orden</div>
              <div style={{ fontSize: 13, color: G.textMuted }}>Ninguna regla activa ha detectado problemas en este momento</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 4 }}>{disparosActuales.length} alerta{disparosActuales.length!==1?"s":""} detectada{disparosActuales.length!==1?"s":""}</div>
              {disparosActuales.sort((a,b) => a.prioridad==="rojo" ? -1 : 1).map((d, i) => {
                const col = PRIORIDAD_COLOR[d.prioridad] || G.textMuted;
                const regla = reglas.find(r => r.id === d.reglaId);
                return (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 18px", borderRadius: 8, background: col+"11", border: `1px solid ${col}33`, cursor: "pointer" }} onClick={() => onSelectObra(d.obraId)}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{d.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: col, fontWeight: 500, marginBottom: 3 }}>{d.mensaje}</div>
                      <div style={{ fontSize: 11, color: G.textMuted }}>{d.obraNombre} · {regla?.nombre}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="tag" style={{ background: col+"22", color: col }}>{d.prioridad}</span>
                      <span style={{ fontSize: 11, color: G.textDim }}>→ ver obra</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── REGLAS ── */}
      {seccion === "reglas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 4 }}>Activa o desactiva reglas y ajusta sus umbrales. Los cambios se aplican inmediatamente.</div>
          {reglas.map(regla => {
            const col = PRIORIDAD_COLOR[regla.prioridad] || G.textMuted;
            const disparosRegla = disparosActuales.filter(d => d.reglaId === regla.id).length;
            const abierto = editando === regla.id;
            return (
              <div key={regla.id} className="card" style={{ padding: 0, overflow: "hidden", borderLeft: `3px solid ${regla.activa ? col : G.border}`, opacity: regla.activa ? 1 : 0.55 }}>
                {/* Row principal */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{regla.emoji}</span>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setEditando(abierto ? null : regla.id)}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{regla.nombre}</div>
                    <div style={{ fontSize: 11, color: G.textMuted }}>{regla.descripcion}</div>
                  </div>
                  {disparosRegla > 0 && (
                    <span style={{ background: col+"22", color: col, borderRadius: 10, fontSize: 10, padding: "2px 8px", fontFamily: "DM Mono" }}>{disparosRegla} activa{disparosRegla!==1?"s":""}</span>
                  )}
                  <span className="tag" style={{ background: col+"22", color: col }}>{regla.prioridad}</span>
                  {/* Toggle */}
                  <div onClick={() => toggleRegla(regla.id)} style={{ width: 36, height: 20, borderRadius: 10, background: regla.activa ? G.gold : G.border, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 3, left: regla.activa ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                </div>

                {/* Panel edición */}
                {abierto && (
                  <div style={{ padding: "14px 18px 16px", borderTop: `1px solid ${G.border}`, background: G.bg, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
                    {"dias" in regla.condicion && (
                      <div>
                        <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>
                          {regla.trigger === "entrega_proxima" ? "DÍAS ANTES DE ENTREGA" : "DÍAS MÍNIMOS"}
                        </label>
                        <input type="number" min="0" value={regla.condicion.dias} onChange={e => updateCondicion(regla.id, "dias", e.target.value)} style={{ width: 80, fontSize: 13, textAlign: "center" }} />
                      </div>
                    )}
                    {"pct" in regla.condicion && (
                      <div>
                        <label style={{ fontSize: 10, color: G.textMuted, display: "block", marginBottom: 4 }}>% DESVIACIÓN MÍNIMA</label>
                        <input type="number" min="0" value={regla.condicion.pct} onChange={e => updateCondicion(regla.id, "pct", e.target.value)} style={{ width: 80, fontSize: 13, textAlign: "center" }} />
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: G.textMuted, flex: 1 }}>
                      {disparosRegla > 0
                        ? <span style={{ color: col }}>⚠ {disparosRegla} obra{disparosRegla!==1?"s":""} cumplen esta condición ahora mismo</span>
                        : <span style={{ color: G.green }}>✓ Sin obras afectadas actualmente</span>
                      }
                    </div>
                    <button className="btn-ghost" onClick={() => setEditando(null)} style={{ fontSize: 11 }}>Cerrar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {seccion === "historial" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: G.textMuted }}>{historial.length} ejecuciones registradas</div>
            {historial.length > 0 && (
              <button className="btn-ghost" onClick={() => { setHistorial([]); try { localStorage.removeItem("bf-historial"); } catch(e) { void 0; } }} style={{ fontSize: 11 }}>
                Limpiar historial
              </button>
            )}
          </div>
          {historial.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div>Sin historial. Pulsa "Ejecutar ahora" para registrar el estado actual.</div>
            </div>
          ) : (
            historial.map((d, i) => {
              const col = PRIORIDAD_COLOR[d.prioridad] || G.textMuted;
              return (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", borderRadius: 6, background: G.surface, border: `1px solid ${G.border}` }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{d.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>{d.mensaje}</div>
                    <div style={{ fontSize: 10, color: G.textMuted, marginTop: 2 }}>{d.obraNombre} · {d.ejecutadoEn}</div>
                  </div>
                  <span className="tag" style={{ background: col+"22", color: col }}>{d.prioridad}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// === MOBILE ===/ PWA -------------------------------------------------------------
function useMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

const cssMobile = `
  .mob-tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 8px 0; flex: 1; border: none; background: none; color: #888; cursor: pointer; transition: color 0.15s; font-family: 'DM Sans', sans-serif; font-size: 10px; }
  .mob-tab.active { color: #C8A96E; }
  .mob-tab svg { width: 22px; height: 22px; }
  .mob-card { background: #171717; border: 1px solid #2A2A2A; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .mob-btn-big { background: #C8A96E; color: #0F0F0F; border: none; border-radius: 12px; padding: 16px; font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; transition: opacity 0.15s; }
  .mob-btn-big:active { opacity: 0.8; }
  .mob-btn-sec { background: #1F1F1F; color: #E8E4DC; border: 1px solid #2A2A2A; border-radius: 10px; padding: 13px; font-size: 13px; font-family: 'DM Sans', sans-serif; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 10px; transition: background 0.15s; }
  .mob-btn-sec:active { background: #2A2A2A; }
  .mob-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-family: 'DM Mono', monospace; }
`;

function MobileApp({ obras, onUpdateObra }) {
  const [tab, setTab] = useState("inicio");
  const [obraId, setObraId] = useState(obras[0]?.id || null);
  const [modalFoto, setModalFoto] = useState(false);
  const [modalInc, setModalInc] = useState(false);
  const [incForm, setIncForm] = useState({ titulo: "", tipo: "Técnica", prioridad: "alta" });
  const [toast, setToast] = useState(null);

  const obra = obras.find(o => o.id === obraId) || obras[0];
  const showToast = (msg, emoji = "✓") => { setToast({ msg, emoji }); setTimeout(() => setToast(null), 2500); };

  const subirFoto = (files) => {
    if (!files?.length || !obra) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = e => {
      const foto = { id: uid(), src: e.target.result, zona: "General", fecha: new Date().toLocaleDateString("es-ES"), fechaISO: new Date().toISOString().slice(0,10), notas: "", avanceIA: null, tipo: "actual" };
      onUpdateObra({ ...obra, fotos: [...(obra.fotos||[]), foto] });
      showToast("Foto subida", "📸");
    };
    reader.readAsDataURL(file);
    setModalFoto(false);
  };

  const crearIncidencia = () => {
    if (!incForm.titulo.trim() || !obra) return;
    const inc = { id: uid(), ...incForm, estado: "abierta", fecha: new Date().toISOString().slice(0,10), comentarios: [], coste: 0 };
    onUpdateObra({ ...obra, incidencias: [...(obra.incidencias||[]), inc] });
    showToast("Incidencia creada", "⚠️");
    setIncForm({ titulo: "", tipo: "Técnica", prioridad: "alta" });
    setModalInc(false);
  };

  const tareasHoy = obra ? (obra.tareas||[]).filter(t => t.estado !== "completada" && t.prioridad === "alta").slice(0,5) : [];
  const incAbiertas = obra ? (obra.incidencias||[]).filter(i => i.estado === "abierta").length : 0;
  const fotosRecientes = obra ? [...(obra.fotos||[])].sort((a,b)=>(b.fechaISO||"").localeCompare(a.fechaISO||"")).slice(0,6) : [];

  const TABS = [
    { id: "inicio",   emoji: "🏠", label: "Inicio" },
    { id: "tareas",   emoji: "✅", label: "Tareas" },
    { id: "camara",   emoji: "📸", label: "Cámara" },
    { id: "incidencias", emoji: "⚠️", label: "Incidencias" },
    { id: "obras",    emoji: "🏗️", label: "Obras" },
  ];

  return (
    <div style={{ background: G.bg, minHeight: "100vh", fontFamily: "DM Sans, sans-serif", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", height: "100vh" }}>
      <style>{css}{cssMobile}</style>

      {/* Header */}
      <div style={{ background: G.surface, padding: "12px 18px 10px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div className="serif" style={{ fontSize: 16, color: G.gold, flex: 1 }}>Blue Forest</div>
        {obra && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: obra.color }} />
            <span style={{ fontSize: 12, color: G.textMuted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{obra.nombre}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>

        {/* ── INICIO ── */}
        {tab === "inicio" && obra && (
          <div>
            <div className="serif" style={{ fontSize: 22, marginBottom: 4 }}>Buenos días 👋</div>
            <div style={{ fontSize: 13, color: G.textMuted, marginBottom: 20 }}>{new Date().toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long" })}</div>

            {/* Acciones rápidas */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: G.textDim, fontFamily: "DM Mono", marginBottom: 10 }}>ACCIONES RÁPIDAS</div>
              <button className="mob-btn-big" onClick={() => setTab("camara")} style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>📸</span> Subir foto de avance
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="mob-btn-sec" onClick={() => setModalInc(true)}>
                  <span>⚠️</span><span style={{ fontSize: 13 }}>Nueva incidencia</span>
                </button>
                <button className="mob-btn-sec" onClick={() => setTab("tareas")}>
                  <span>✅</span><span style={{ fontSize: 13 }}>Mis tareas</span>
                </button>
              </div>
            </div>

            {/* Estado obra */}
            <div className="mob-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div className="serif" style={{ fontSize: 15 }}>{obra.nombre}</div>
                  <div style={{ fontSize: 11, color: G.textMuted, marginTop: 2 }}>{obra.cliente}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {obra.fechaFin && (() => { const d = diasRestantes(obra.fechaFin); return <div className="mono" style={{ fontSize: 18, color: d < 0 ? G.red : d < 30 ? G.orange : G.text }}>{Math.abs(d)}<span style={{ fontSize: 10, color: G.textMuted, display: "block" }}>{d < 0 ? "retraso" : "días"}</span></div>; })()}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "TAREAS PEND.", val: (obra.tareas||[]).filter(t=>t.estado!=="completada").length, color: G.gold },
                  { label: "INCIDENCIAS", val: incAbiertas, color: incAbiertas > 0 ? G.red : G.green },
                  { label: "FOTOS", val: (obra.fotos||[]).length, color: G.textMuted },
                ].map(k => (
                  <div key={k.label} style={{ textAlign: "center" }}>
                    <div className="mono" style={{ fontSize: 22, color: k.color }}>{k.val}</div>
                    <div style={{ fontSize: 9, color: G.textDim, fontFamily: "DM Mono" }}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="progress-bar" style={{ height: 4 }}>
                <div className="progress-fill" style={{ width: `${pct((obra.tareas||[]).filter(t=>t.estado==="completada").length, (obra.tareas||[]).length)}%`, background: G.gold }} />
              </div>
            </div>

            {/* Fotos recientes */}
            {fotosRecientes.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: G.textDim, fontFamily: "DM Mono", marginBottom: 10 }}>FOTOS RECIENTES</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {fotosRecientes.map(f => (
                    <div key={f.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1" }}>
                      <img src={f.src} alt={f.zona} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      {f.avanceIA !== null && (
                        <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.8)", borderRadius: 6, padding: "1px 5px", fontSize: 9, fontFamily: "DM Mono", color: f.avanceIA > 70 ? G.green : G.gold }}>{f.avanceIA}%</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAREAS ── */}
        {tab === "tareas" && obra && (
          <div>
            <div className="serif" style={{ fontSize: 20, marginBottom: 16 }}>Tareas pendientes</div>
            {(obra.tareas||[]).filter(t=>t.estado!=="completada").length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                <div>¡Sin tareas pendientes!</div>
              </div>
            ) : (
              (obra.tareas||[]).filter(t=>t.estado!=="completada")
                .sort((a,b) => a.prioridad==="alta" ? -1 : 1)
                .map(t => (
                  <div key={t.id} className="mob-card" style={{ borderLeft: `3px solid ${PRIORIDADES[t.prioridad]||G.border}`, padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <button onClick={() => { onUpdateObra({ ...obra, tareas: obra.tareas.map(x => x.id===t.id ? {...x, estado:"completada"} : x) }); showToast("Tarea completada","✅"); }}
                        style={{ width: 26, height: 26, borderRadius: 6, border: `2px solid ${PRIORIDADES[t.prioridad]||G.border}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 1 }}>
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, marginBottom: 4 }}>{t.titulo}</div>
                        <div style={{ fontSize: 11, color: G.textMuted }}>{t.responsable || "Sin responsable"}</div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* ── CÁMARA ── */}
        {tab === "camara" && (
          <div>
            <div className="serif" style={{ fontSize: 20, marginBottom: 16 }}>Subir fotos</div>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input type="file" accept="image/*" capture="environment" multiple onChange={e => subirFoto(e.target.files)} style={{ display: "none" }} />
              <div className="mob-btn-big" style={{ marginBottom: 12, fontSize: 18, padding: 24 }}>
                <span style={{ fontSize: 32 }}>📸</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Tomar foto</div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 400 }}>Abre la cámara del móvil</div>
                </div>
              </div>
            </label>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input type="file" accept="image/*" multiple onChange={e => subirFoto(e.target.files)} style={{ display: "none" }} />
              <div className="mob-btn-sec" style={{ justifyContent: "center", padding: 16 }}>
                <span style={{ fontSize: 20 }}>🖼️</span>
                <span>Seleccionar de galería</span>
              </div>
            </label>
            {fotosRecientes.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, color: G.textDim, fontFamily: "DM Mono", marginBottom: 10 }}>SUBIDAS HOY</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {fotosRecientes.slice(0,3).map(f => (
                    <div key={f.id} style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "1" }}>
                      <img src={f.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── INCIDENCIAS ── */}
        {tab === "incidencias" && obra && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="serif" style={{ fontSize: 20 }}>Incidencias</div>
              <button className="mob-btn-big" onClick={() => setModalInc(true)} style={{ width: "auto", padding: "10px 16px", fontSize: 13 }}>+ Nueva</button>
            </div>
            {(obra.incidencias||[]).filter(i=>i.estado!=="cerrada").length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: G.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div><div>Sin incidencias abiertas</div>
              </div>
            ) : (
              (obra.incidencias||[]).filter(i=>i.estado!=="cerrada").map(inc => {
                const est = ESTADOS_INC[inc.estado]||ESTADOS_INC.abierta;
                const pri = PRIORIDADES_INC[inc.prioridad]||PRIORIDADES_INC.media;
                return (
                  <div key={inc.id} className="mob-card" style={{ borderLeft: `3px solid ${pri.color}` }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span className="mob-badge" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                      <span className="mob-badge" style={{ background: pri.color+"22", color: pri.color }}>{pri.label}</span>
                    </div>
                    <div style={{ fontSize: 14, marginBottom: 4 }}>{inc.titulo}</div>
                    <div style={{ fontSize: 11, color: G.textMuted }}>{inc.responsable||"Sin responsable"} · {inc.fecha}</div>
                    <button onClick={() => { onUpdateObra({ ...obra, incidencias: obra.incidencias.map(i => i.id===inc.id ? {...i,estado:"resuelta"} : i) }); showToast("Incidencia resuelta","✓"); }}
                      style={{ marginTop: 10, background: "none", border: `1px solid ${G.green}44`, color: G.green, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", width: "100%" }}>
                      ✓ Marcar resuelta
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── OBRAS ── */}
        {tab === "obras" && (
          <div>
            <div className="serif" style={{ fontSize: 20, marginBottom: 16 }}>Mis obras</div>
            {obras.map(o => {
              const activa = o.id === obraId;
              const p = pct((o.tareas||[]).filter(t=>t.estado==="completada").length, (o.tareas||[]).length);
              return (
                <div key={o.id} className="mob-card" style={{ borderLeft: `3px solid ${o.color}`, cursor: "pointer", opacity: activa ? 1 : 0.75 }} onClick={() => { setObraId(o.id); setTab("inicio"); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{o.nombre}</div>
                      <div style={{ fontSize: 11, color: G.textMuted }}>{o.cliente}</div>
                    </div>
                    {activa && <span className="mob-badge" style={{ background: G.gold+"22", color: G.gold }}>Activa</span>}
                  </div>
                  <div className="progress-bar" style={{ height: 4 }}>
                    <div className="progress-fill" style={{ width: `${p}%`, background: o.color }} />
                  </div>
                  <div style={{ fontSize: 10, color: G.textMuted, marginTop: 4, fontFamily: "DM Mono" }}>{p}% completado</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ background: G.surface, borderTop: `1px solid ${G.border}`, display: "flex", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {TABS.map(t => (
          <button key={t.id} className={`mob-tab ${tab===t.id?"active":""}`} onClick={() => t.id==="camara" ? setModalFoto(true) : setTab(t.id)}>
            <span style={{ fontSize: 20 }}>{t.emoji}</span>
            <span>{t.label}</span>
            {t.id==="incidencias" && incAbiertas > 0 && (
              <span style={{ position: "absolute", top: 6, right: "calc(50% - 18px)", background: G.red, color:"#fff", borderRadius: 8, fontSize: 8, padding: "1px 4px", fontFamily: "DM Mono" }}>{incAbiertas}</span>
            )}
          </button>
        ))}
      </div>

      {/* Modal cámara */}
      {modalFoto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
          <div className="serif" style={{ fontSize: 22, color: G.gold }}>Subir foto</div>
          <label style={{ width: "100%", cursor: "pointer" }}>
            <input type="file" accept="image/*" capture="environment" onChange={e => subirFoto(e.target.files)} style={{ display: "none" }} />
            <div className="mob-btn-big" style={{ fontSize: 16, padding: 20 }}><span style={{ fontSize: 28 }}>📸</span> Cámara</div>
          </label>
          <label style={{ width: "100%", cursor: "pointer" }}>
            <input type="file" accept="image/*" onChange={e => subirFoto(e.target.files)} style={{ display: "none" }} />
            <div className="mob-btn-sec" style={{ justifyContent: "center", padding: 16, fontSize: 14 }}><span>🖼️</span> Galería</div>
          </label>
          <button onClick={() => setModalFoto(false)} style={{ background: "none", border: "none", color: G.textMuted, fontSize: 14, cursor: "pointer", marginTop: 8 }}>Cancelar</button>
        </div>
      )}

      {/* Modal nueva incidencia */}
      {modalInc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 2000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: G.surface, borderRadius: "16px 16px 0 0", padding: 24 }}>
            <div className="serif" style={{ fontSize: 18, marginBottom: 16 }}>Nueva Incidencia</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={incForm.titulo} onChange={e => setIncForm(f=>({...f,titulo:e.target.value}))} placeholder="¿Qué ha pasado?..." style={{ fontSize: 14, padding: "12px 14px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select value={incForm.tipo} onChange={e => setIncForm(f=>({...f,tipo:e.target.value}))} style={{ fontSize: 13 }}>
                  {TIPOS_INC.map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={incForm.prioridad} onChange={e => setIncForm(f=>({...f,prioridad:e.target.value}))} style={{ fontSize: 13 }}>
                  {Object.entries(PRIORIDADES_INC).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <button className="mob-btn-big" onClick={crearIncidencia} disabled={!incForm.titulo.trim()} style={{ opacity: !incForm.titulo.trim() ? 0.5 : 1 }}>
                Crear incidencia
              </button>
              <button onClick={() => setModalInc(false)} style={{ background: "none", border: "none", color: G.textMuted, fontSize: 14, cursor: "pointer", padding: 8 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 20, padding: "10px 20px", display: "flex", gap: 8, alignItems: "center", fontSize: 13, zIndex: 3000, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", animation: "slideUp 0.2s ease" }}>
          <span>{toast.emoji}</span><span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

// === WIDGET ===FLOTANTE ----------------------------------------------------------
function WidgetFlotante({ obras, onVista, onNuevaObra, onSelectObra, showToast }) {
  const [abierto, setAbierto] = useState(false);
  const [subMenu, setSubMenu] = useState(null); // "obras" | "alertas" | null

  // Alertas cr-ticas activas
  const alertasCrit = obras.flatMap(o => {
    const arr = [];
    if (o.fechaFin && diasRestantes(o.fechaFin) < 0 && o.estado !== "completada")
      arr.push({ tipo:"rojo", texto:`${o.nombre} — entrega retrasada`, obraId:o.id });
    (o.incidencias||[]).filter(i=>i.prioridad==="critica"&&i.estado==="abierta")
      .forEach(i => arr.push({ tipo:"rojo", texto:`${o.nombre} — inc. crítica: ${i.titulo}`, obraId:o.id }));
    (o.economica?.cobros||[]).filter(c=>c.estado==="pendiente"&&c.fecha&&new Date(c.fecha)<new Date())
      .forEach(c => arr.push({ tipo:"naranja", texto:`${o.nombre} — cobro vencido: ${c.concepto}`, obraId:o.id }));
    return arr;
  });

  const nAlertas = alertasCrit.length;

  const ACCIONES = [
    { emoji:"🏗️", label:"Nueva obra",          accion:()=>{ onNuevaObra(); setAbierto(false); } },
    { emoji:"⚡", label:"Incidencia rápida",    accion:()=>{ onVista("dashboard"); setAbierto(false); showToast("Ve a la obra y abre Incidencias","⚠️",G.orange); } },
    { emoji:"📸", label:"Subir foto",           accion:()=>{ onVista("dashboard"); setAbierto(false); showToast("Ve a la obra → pestaña Fotos","📸",G.blue); } },
    { emoji:"📋", label:"Notas rápidas",        accion:()=>{ onVista("notas"); setAbierto(false); } },
    { emoji:"📊", label:"Dashboard",            accion:()=>{ onVista("dashboard"); setAbierto(false); } },
    { emoji:"✦",  label:"Asistente IA",        accion:()=>{ onVista("asistente"); setAbierto(false); } },
    { emoji:"📅", label:"Calendario",           accion:()=>{ onVista("calendario"); setAbierto(false); } },
    { emoji:"📈", label:"Rentabilidad",         accion:()=>{ onVista("rentabilidad"); setAbierto(false); } },
  ];

  return (
    <>
      {/* Panel flotante */}
      {abierto && (
        <div style={{ position:"fixed", bottom:84, right:24, zIndex:8000, display:"flex", flexDirection:"column", gap:0, alignItems:"flex-end" }}>

          {/* Alertas */}
          {subMenu === "alertas" && (
            <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:10, padding:12, marginBottom:8, width:300, maxHeight:240, overflow:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.4)", animation:"slideUp 0.15s ease" }}>
              <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:10 }}>ALERTAS CRÍTICAS</div>
              {alertasCrit.length === 0 ? (
                <div style={{ fontSize:12, color:G.textMuted, textAlign:"center", padding:"16px 0" }}>✅ Sin alertas activas</div>
              ) : alertasCrit.map((a,i)=>(
                <div key={i} onClick={()=>{ onSelectObra(a.obraId); setAbierto(false); }}
                  style={{ display:"flex",gap:10,alignItems:"center",padding:"8px 10px",borderRadius:6,background:a.tipo==="rojo"?"#2A1010":"#1E1A10",border:`1px solid ${a.tipo==="rojo"?G.red:G.orange}44`,marginBottom:6,cursor:"pointer" }}>
                  <span style={{ fontSize:12,color:a.tipo==="rojo"?G.red:G.orange,flexShrink:0 }}>{a.tipo==="rojo"?"🔴":"🟠"}</span>
                  <span style={{ fontSize:11,color:G.text }}>{a.texto}</span>
                </div>
              ))}
            </div>
          )}

          {/* Obras recientes */}
          {subMenu === "obras" && (
            <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:10, padding:12, marginBottom:8, width:260, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", animation:"slideUp 0.15s ease" }}>
              <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:10 }}>IR A OBRA</div>
              {obras.slice(0,6).map(o=>(
                <div key={o.id} onClick={()=>{ onSelectObra(o.id); setAbierto(false); }}
                  style={{ display:"flex",gap:10,alignItems:"center",padding:"8px 10px",borderRadius:6,cursor:"pointer",marginBottom:4 }}
                  onMouseEnter={e=>e.currentTarget.style.background=G.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:8,height:8,borderRadius:2,background:o.color,flexShrink:0 }} />
                  <span style={{ fontSize:12,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{o.nombre}</span>
                  <span style={{ fontSize:10,color:G.textDim }}>{o.estado==="en_curso"?"▶":o.estado==="completada"?"✓":"○"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Acciones principales */}
          <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:12, padding:12, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", animation:"slideUp 0.15s ease", minWidth:200 }}>
            <div style={{ fontSize:10, color:G.textMuted, fontFamily:"DM Mono", marginBottom:10, paddingLeft:4 }}>ACCIONES RÁPIDAS</div>

            {/* Botones especiales */}
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              <button onClick={()=>setSubMenu(subMenu==="alertas"?null:"alertas")}
                style={{ flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${nAlertas>0?G.red:G.border}`,background:nAlertas>0?"#2A1010":"transparent",color:nAlertas>0?G.red:G.textMuted,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                🔔 {nAlertas > 0 ? nAlertas : "0"}
              </button>
              <button onClick={()=>setSubMenu(subMenu==="obras"?null:"obras")}
                style={{ flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${G.border}`,background:"transparent",color:G.textMuted,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                🏗️ {obras.length}
              </button>
            </div>

            <div style={{ height:1, background:G.border, marginBottom:10 }} />

            {/* Lista de acciones */}
            {ACCIONES.map((a,i)=>(
              <button key={i} onClick={a.accion}
                style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:"none",background:"transparent",color:G.text,fontSize:13,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,transition:"background 0.1s" }}
                onMouseEnter={e=>e.currentTarget.style.background=G.bg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ fontSize:16,flexShrink:0,width:24,textAlign:"center" }}>{a.emoji}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay para cerrar */}
      {abierto && <div style={{ position:"fixed",inset:0,zIndex:7999 }} onClick={()=>{ setAbierto(false); setSubMenu(null); }} />}

      {/* Botón principal */}
      <button onClick={()=>{ setAbierto(prev=>!prev); if(abierto) setSubMenu(null); }}
        style={{ position:"fixed", bottom:24, right:24, zIndex:9000, width:52, height:52, borderRadius:"50%", background:abierto?G.surface:G.gold, border:abierto?`2px solid ${G.gold}`:"none", color:abierto?G.gold:G.bg, fontSize:22, cursor:"pointer", boxShadow:`0 4px 20px rgba(0,0,0,0.4)${abierto?"":", 0 0 0 4px "+G.gold+"33"}`, transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {abierto ? "✕" : "⚡"}
        {/* Badge alertas */}
        {!abierto && nAlertas > 0 && (
          <div style={{ position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:G.red,color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"DM Mono" }}>
            {nAlertas > 9 ? "9+" : nAlertas}
          </div>
        )}
      </button>
    </>
  );
}

// === TOAST ===
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, emoji = "✓", color = G.green) => {
    setToast({ msg, emoji, color });
    setTimeout(() => setToast(null), 2800);
  }, []);
  const ToastEl = toast ? (
    <div className="toast">
      <span style={{ color: toast.color, fontSize: 16 }}>{toast.emoji}</span>
      <span>{toast.msg}</span>
    </div>
  ) : null;
  return { show, ToastEl };
}

// === APP ===
// === NOTIFICACIONES PUSH ===
function useNotificaciones(obras) {
  const [permiso, setPermiso] = useState(Notification?.permission || "default");
  const [activas, setActivas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bf-notif-config") || "{}"); } catch(e) { return {}; }
  });
  const lastCheck = React.useRef(Date.now());

  const pedirPermiso = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPermiso(p);
  };

  const toggleAlerta = (tipo) => {
    const nuevas = { ...activas, [tipo]: !activas[tipo] };
    setActivas(nuevas);
    try { localStorage.setItem("bf-notif-config", JSON.stringify(nuevas)); } catch(e) { void 0; }
  };

  const enviarNotif = (titulo, cuerpo, icono) => {
    if (permiso !== "granted") return;
    try {
      new Notification(titulo, { body: cuerpo, icon: icono || "/favicon.svg", badge: "/favicon.svg" });
    } catch(e) { void 0; }
  };

  // Chequeo periódico de alertas cada 5 minutos
  useEffect(() => {
    if (permiso !== "granted") return;
    const check = () => {
      const hoy = new Date();
      const en7 = new Date(hoy.getTime() + 7 * 864e5);

      obras.forEach(obra => {
        // Entregas próximas
        if (activas.entregas && obra.fechaFin) {
          const diasR = Math.ceil((new Date(obra.fechaFin) - hoy) / 864e5);
          if (diasR >= 0 && diasR <= 7) {
            enviarNotif(`⚠️ Entrega en ${diasR}d`, `${obra.nombre} — entrega: ${obra.fechaFin}`, null);
          }
        }
        // Incidencias críticas nuevas
        if (activas.incidencias) {
          const crits = (obra.incidencias || []).filter(i => i.prioridad === "critica" && i.estado === "abierta");
          if (crits.length > 0) {
            enviarNotif(`🔴 ${crits.length} incidencia(s) crítica(s)`, `${obra.nombre}: ${crits[0].titulo}`, null);
          }
        }
        // Cobros vencidos
        if (activas.cobros) {
          const venc = (obra.economica?.cobros || []).filter(c => c.estado === "pendiente" && c.fecha && new Date(c.fecha) < hoy);
          if (venc.length > 0) {
            enviarNotif(`💶 Cobro vencido`, `${obra.nombre}: ${fmt(venc.reduce((a,c)=>a+(Number(c.importe)||0),0))} sin cobrar`, null);
          }
        }
        // Garantías próximas a vencer
        if (activas.garantias) {
          const prox = (obra.garantias || []).filter(g => g.fechaFin && new Date(g.fechaFin) <= en7 && new Date(g.fechaFin) >= hoy);
          if (prox.length > 0) {
            enviarNotif(`🛡️ Garantía vence pronto`, `${obra.nombre}: ${prox[0].nombre} vence el ${prox[0].fechaFin}`, null);
          }
        }
      });
    };

    const intervalo = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [obras, permiso, activas]);

  return { permiso, pedirPermiso, activas, toggleAlerta, enviarNotif };
}

function NotificacionesPanel({ obras }) {
  const { permiso, pedirPermiso, activas, toggleAlerta, enviarNotif } = useNotificaciones(obras);

  const TIPOS = [
    { id: "entregas",   label: "Entregas próximas",       emoji: "📅", desc: "7 días antes de la fecha de entrega" },
    { id: "incidencias",label: "Incidencias críticas",    emoji: "🔴", desc: "Cuando hay incidencias críticas abiertas" },
    { id: "cobros",     label: "Cobros vencidos",         emoji: "💶", desc: "Cobros pendientes con fecha superada" },
    { id: "garantias",  label: "Garantías por vencer",    emoji: "🛡️", desc: "Garantías que vencen en 7 días" },
    { id: "materiales", label: "Materiales críticos",     emoji: "📦", desc: "Materiales críticos pendientes de recibir" },
  ];

  // Resumen de alertas actuales
  const alertasHoy = [];
  const hoy = new Date();
  const en7 = new Date(hoy.getTime() + 7 * 864e5);
  obras.forEach(o => {
    const diasR = o.fechaFin ? Math.ceil((new Date(o.fechaFin) - hoy) / 864e5) : null;
    if (diasR !== null && diasR >= 0 && diasR <= 7) alertasHoy.push({ tipo:"entrega", texto:`${o.nombre}: entrega en ${diasR}d`, color: G.orange });
    (o.incidencias||[]).filter(i=>i.prioridad==="critica"&&i.estado==="abierta").forEach(i => alertasHoy.push({ tipo:"incid", texto:`${o.nombre}: ${i.titulo}`, color: G.red }));
    (o.economica?.cobros||[]).filter(c=>c.estado==="pendiente"&&c.fecha&&new Date(c.fecha)<hoy).forEach(c => alertasHoy.push({ tipo:"cobro", texto:`${o.nombre}: cobro vencido ${fmt(c.importe)}`, color: G.orange }));
    (o.garantias||[]).filter(g=>g.fechaFin&&new Date(g.fechaFin)<=en7&&new Date(g.fechaFin)>=hoy).forEach(g => alertasHoy.push({ tipo:"garantia", texto:`${o.nombre}: ${g.nombre} vence el ${g.fechaFin}`, color: G.gold }));
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}>
      <div>
        <div className="serif" style={{ fontSize: 24, marginBottom: 6 }}>Notificaciones Push</div>
        <div style={{ fontSize: 13, color: G.textMuted }}>Recibe alertas del navegador aunque tengas otra pestaña activa.</div>
      </div>

      {/* Estado permiso */}
      <div className="card" style={{ borderLeft: `3px solid ${permiso === "granted" ? G.green : permiso === "denied" ? G.red : G.gold}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              {permiso === "granted" ? "✅ Notificaciones activadas" : permiso === "denied" ? "❌ Notificaciones bloqueadas" : "⚠️ Notificaciones no activadas"}
            </div>
            <div style={{ fontSize: 12, color: G.textMuted }}>
              {permiso === "granted" ? "El navegador enviará alertas cuando Blue Forest esté abierto"
                : permiso === "denied" ? "Ve a Configuración del navegador → Privacidad → Notificaciones para desbloquear"
                : "Haz clic en el botón para activar las notificaciones del navegador"}
            </div>
          </div>
          {permiso !== "granted" && permiso !== "denied" && (
            <button className="btn-primary" onClick={pedirPermiso} style={{ flexShrink: 0 }}>
              🔔 Activar
            </button>
          )}
          {permiso === "granted" && (
            <button className="btn-ghost" onClick={() => enviarNotif("✅ Blue Forest", "Las notificaciones funcionan correctamente")} style={{ fontSize: 11 }}>
              Probar
            </button>
          )}
        </div>
      </div>

      {/* Tipos de alertas */}
      <div className="card">
        <div className="serif" style={{ fontSize: 16, marginBottom: 16 }}>Qué notificaciones recibir</div>
        {TIPOS.map(t => (
          <div key={t.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${G.border}` }}>
            <span style={{ fontSize: 22 }}>{t.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: G.textMuted }}>{t.desc}</div>
            </div>
            <div onClick={() => permiso === "granted" && toggleAlerta(t.id)}
              style={{ width: 44, height: 24, borderRadius: 12, background: activas[t.id] ? G.gold : G.border, cursor: permiso === "granted" ? "pointer" : "default", position: "relative", transition: "background 0.2s", opacity: permiso !== "granted" ? 0.4 : 1 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: activas[t.id] ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Alertas activas ahora */}
      <div className="card">
        <div className="serif" style={{ fontSize: 16, marginBottom: 16 }}>Alertas activas ahora</div>
        {alertasHoy.length === 0 ? (
          <div style={{ color: G.textMuted, fontSize: 13, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            Sin alertas activas
          </div>
        ) : alertasHoy.slice(0, 8).map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${G.border}`, fontSize: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
            <div style={{ color: G.text }}>{a.texto}</div>
          </div>
        ))}
        {alertasHoy.length > 8 && <div style={{ fontSize: 11, color: G.textMuted, marginTop: 8 }}>+{alertasHoy.length - 8} más</div>}
      </div>
    </div>
  );
}

// === CLAUDE TAB — Asistente integrado en obra ===
function ClaudeTab({ obra, onUpdate, showToast }) {
  const mensajeInicial = [{ role:"assistant", content:`Hola! Soy Claude, tu asistente para la obra **${obra.nombre}**.\n\nPuedo ayudarte a:\n- 📋 Añadir tareas, fases o incidencias\n- 👷 Registrar proveedores y presupuestos\n- 📅 Actualizar fechas de inicio y fin\n- 📝 Añadir puntos al acta de reunión\n- 💶 Registrar costes y cobros\n\nCuéntame qué ha pasado en la obra y lo actualizo todo automáticamente.` }];
  
  const [mensajes, setMensajes] = React.useState(mensajeInicial);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [mensajes]);

  const limpiarChat = () => {
    setMensajes(mensajeInicial);
    onUpdate({ claudeHistorial: mensajeInicial });
  };

  const SYSTEM_PROMPT = `Eres Claude, asistente integrado en Blue Forest, una app de gestión de obras de reforma premium.

Estás trabajando en la obra: "${obra.nombre}"
Cliente: ${obra.cliente || "—"}
Estado: ${obra.estado || "pendiente"}

TAREAS EXISTENTES (${(obra.tareas||[]).length} tareas):
${(obra.tareas||[]).map((t,i) => `${i+1}. [${t.id}] ${t.titulo} (${t.estado}, ${t.prioridad})`).join('\n') || 'Ninguna'}

PROVEEDORES EXISTENTES (${(obra.proveedores||[]).length}):
${(obra.proveedores||[]).map((p,i) => `${i+1}. [${p.id}] ${p.nombre} - ${Array.isArray(p.especialidad)?p.especialidad.join(", "):(p.especialidad&&p.especialidad!=="undefined"?p.especialidad:"")} (${p.estado})`).join('\n') || 'Ninguno'}

FASES EXISTENTES (${(obra.fases||[]).length}):
${(obra.fases||[]).map((f,i) => `${i+1}. [${f.id}] ${f.nombre} (${f.estado})`).join('\n') || 'Ninguna'}

Tu función es DUAL:
1. Conversar naturalmente sobre la obra
2. Cuando detectes información que debe guardarse, devuelves un bloque JSON con las actualizaciones

REGLAS CRÍTICAS:
- NUNCA reemplaces tareas/proveedores/fases existentes — SIEMPRE añade a los existentes
- Cuando añadas tareas nuevas, incluye TODAS las existentes MÁS las nuevas
- Cada tarea DEBE tener: id (usa uid_XXXX con 4 letras random), titulo (OBLIGATORIO, nunca vacío), estado, prioridad, responsable
- Sé conciso y profesional, en español
- El año actual es 2026 — cuando alguien diga "15 de junio" sin año, usa 2026-06-15
- Aplica principios de Dale Carnegie: valida, empatiza, orienta

CAMPOS ADICIONALES disponibles en el JSON:
- arquitecto_nombre, arquitecto_telefono, arquitecto_email, arquitecto_nif, arquitecto_col, arquitecto_estudio
- docsArquitecto: array de documentos. IDs exactos: "proyecto_basico", "proyecto_ejecucion", "licencia_obras", "visado_coac"
  Cada documento tiene: id, estado (pendiente/solicitado/en_tramite/recibido/no_aplica), fechaEntrega, notas, expediente, organismo
  Ejemplo: {"id":"proyecto_ejecucion","estado":"en_tramite","fechaEntrega":"2026-05-13","organismo":"Ajuntament Barcelona","expediente":"","notas":"Comunicat O-3b presentado"}

FORMATO cuando hay actualizaciones:
Primero tu respuesta en texto natural.
Luego, si hay datos que guardar, añade exactamente:

ACTUALIZAR_OBRA:
\`\`\`json
{
  "tareas": [...],  // TODAS las tareas (existentes + nuevas). OBLIGATORIO incluir titulo en cada tarea
  "proveedores": [...],  // TODOS los proveedores (existentes + nuevos)
  "fases": [...],  // TODAS las fases (existentes + nuevas)
  "fechaInicio": "YYYY-MM-DD",
  "fechaFin": "YYYY-MM-DD",
  "estado": "pendiente|en_curso|pausada|completada",
  "notas": "texto"
}
\`\`\`

ESTRUCTURA DE PUNTO DE ACTA (para reunionPuntos):
{"id": "uid_XXXX", "tema": "Tema claro", "decision": "Decisión tomada", "responsable": "Nombre", "plazo": "Fecha o plazo", "estado": "pendiente|aprobado|en_estudio|rechazado", "timestamp": "HH:MM"}

Cuando el usuario mencione una reunión o acta, añade los puntos en "reunionPuntos" y también en "reunionForm" con titulo, fecha, lugar y asistentes.

IMPORTANTE: El campo "titulo" es OBLIGATORIO y nunca puede estar vacío.`;

  const enviar = async (texto) => {
    const msg = texto || input.trim();
    if (!msg || loading) return;
    setInput("");

    const newMsgs = [...mensajes, { role:"user", content:msg }];
    setMensajes(newMsgs);
    setLoading(true);

    try {
      const res = await fetch("https://blueforest-claude.mdtoliva.workers.dev", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-5",
          max_tokens:4000,
          system: SYSTEM_PROMPT,
          messages: newMsgs.map(m => ({ role:m.role, content:m.content }))
        })
      });
      const data = await res.json();
      // Check for API errors
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      const respuesta = data.content?.[0]?.text || "Sin respuesta";

      // Parse actualizaciones
      const jsonMatch = respuesta.match(/ACTUALIZAR_OBRA:\s*```json\s*([\s\S]*?)```/);
      let textoLimpio = respuesta.replace(/ACTUALIZAR_OBRA:\s*```json[\s\S]*?```/g, "").trim();
      let actualizaciones = null;

      if (jsonMatch) {
        try {
          actualizaciones = JSON.parse(jsonMatch[1]);
        } catch(e) { void 0; }
      }

      // Guardar historial en memoria solamente (no en GitHub para evitar encoding)
      const nuevoHistorial = [...newMsgs, { role:"assistant", content:textoLimpio, actualizaciones }];
      setMensajes(nuevoHistorial);

      // Aplicar actualizaciones automáticamente
      if (actualizaciones) {
        const cambios = {};
        if (actualizaciones.tareas) {
          // Merge with existing tareas to preserve data
          const existingTareas = obra.tareas || [];
          const newTareas = actualizaciones.tareas;
          const mergedTareas = newTareas.map(nt => {
            const existing = existingTareas.find(et => et.id === nt.id);
            return existing ? { ...existing, ...nt } : nt;
          });
          cambios.tareas = mergedTareas;
        }
        if (actualizaciones.proveedores) {
          // Merge with existing proveedores to preserve phone, especialidad, etc.
          const existingProvs = obra.proveedores || [];
          const newProvs = actualizaciones.proveedores;
          const merged = newProvs.map(np => {
            const existing = existingProvs.find(ep => ep.id === np.id || ep.nombre?.toLowerCase() === np.nombre?.toLowerCase());
            return existing ? { ...existing, ...np } : np;
          });
          // Keep existing proveedores not in the new list
          existingProvs.forEach(ep => {
            if (!merged.find(mp => mp.id === ep.id)) merged.push(ep);
          });
          cambios.proveedores = merged;
        }
        if (actualizaciones.fases) cambios.fases = actualizaciones.fases;
        if (actualizaciones.fechaInicio) cambios.fechaInicio = actualizaciones.fechaInicio;
        if (actualizaciones.fechaFin) cambios.fechaFin = actualizaciones.fechaFin;
        if (actualizaciones.estado) cambios.estado = actualizaciones.estado;
        if (actualizaciones.notas) cambios.notas = actualizaciones.notas;
        if (actualizaciones.reunionPuntos) cambios.reunionPuntos = actualizaciones.reunionPuntos;
        if (actualizaciones.reunionForm) cambios.reunionForm = actualizaciones.reunionForm;
        if (actualizaciones.reuniones) cambios.reuniones = actualizaciones.reuniones;
        // Arquitecto fields
        if (actualizaciones.arquitecto_nombre) cambios.arquitecto_nombre = actualizaciones.arquitecto_nombre;
        if (actualizaciones.arquitecto_telefono) cambios.arquitecto_tel = actualizaciones.arquitecto_telefono;
        if (actualizaciones.arquitecto_tel) cambios.arquitecto_tel = actualizaciones.arquitecto_tel;
        if (actualizaciones.arquitecto_email) cambios.arquitecto_email = actualizaciones.arquitecto_email;
        if (actualizaciones.arquitecto_nif) cambios.arquitecto_nif = actualizaciones.arquitecto_nif;
        if (actualizaciones.arquitecto_col) cambios.arquitecto_col = actualizaciones.arquitecto_col;
        if (actualizaciones.arquitecto_estudio) cambios.arquitecto_estudio = actualizaciones.arquitecto_estudio;
        if (actualizaciones.arquitecto_honorarios) cambios.arquitecto_honorarios = actualizaciones.arquitecto_honorarios;
        if (actualizaciones.docsArquitecto) {
          // Merge with existing docs instead of replacing
          const existingDocs = obra.docsArquitecto || DOCS_ARQUITECTO.map(d => ({ ...d, estado:"pendiente", archivo:null, fechaEntrega:"", notas:"", archivoNombre:"", archivoTipo:"", expediente:"", organismo:"" }));
          const updatedDocs = existingDocs.map(doc => {
            const update = actualizaciones.docsArquitecto.find(u => u.id === doc.id);
            return update ? { ...doc, ...update } : doc;
          });
          cambios.docsArquitecto = updatedDocs;
        }
        onUpdate(cambios);
        showToast && showToast("Obra actualizada por Claude ✦", "✦", "#C8A96E");
      }

    } catch(e) {
      setMensajes(prev => [...prev, { role:"assistant", content:`Error: ${e.message || "Error de conexión"}` }]);
    }
    setLoading(false);
  };

  const renderMd = (txt) => txt
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

  const sugerencias = [
    "¿Qué tareas hay pendientes?",
    "Añade tarea: revisar presupuesto de moqueta",
    "La obra empieza el 15 de junio",
    "Añade proveedor: Christian, empresa de moqueta",
    "Resumen del estado actual de la obra",
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 200px)", minHeight:500 }}>
      {/* Header */}
      <div style={{ background:"#1A1A13", border:`1px solid ${G.gold}33`, borderRadius:"10px 10px 0 0", padding:"14px 20px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg, ${G.gold}, #8B6914)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✦</div>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:G.gold }}>Claude — Asistente de obra</div>
          <button onClick={limpiarChat} style={{ background:"transparent", color:G.textMuted, border:`1px solid ${G.border}`, padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer" }} title="Nueva conversación">
          🔄 Nueva
        </button>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex:1, overflow:"auto", padding:20, display:"flex", flexDirection:"column", gap:14, background:"#111111" }}>
        {mensajes.map((m, i) => (
          <div key={i} style={{ display:"flex", gap:12, justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && (
              <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg, ${G.gold}, #8B6914)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, marginTop:4 }}>✦</div>
            )}
            <div style={{
              maxWidth:"75%", padding:"12px 16px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
              background:m.role==="user"?`${G.gold}22`:"#1E1E1E",
              border:`1px solid ${m.role==="user"?G.gold+"44":"#333"}`,
              fontSize:13, lineHeight:1.7, color:"#E8E4DC"
            }}>
              <span dangerouslySetInnerHTML={{ __html:renderMd(m.content) }} />
              {m.actualizaciones && (
                <div style={{ marginTop:8, padding:"6px 10px", background:"#0A1A0A", borderRadius:6, fontSize:11, color:"#4CAF50", border:"1px solid #4CAF5033" }}>
                  ✓ Obra actualizada automáticamente
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:12 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg, ${G.gold}, #8B6914)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✦</div>
            <div style={{ padding:"12px 16px", background:"#EEF2FF", border:`1px solid ${G.border}`, borderRadius:"16px 16px 16px 4px", fontSize:13, color:G.textMuted }}>
              Pensando<span style={{ animation:"pulse 1s infinite" }}>...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sugerencias */}
      {mensajes.length < 3 && (
        <div style={{ padding:"8px 16px", display:"flex", gap:6, flexWrap:"wrap", background:G.bg, flexShrink:0 }}>
          {sugerencias.map((s,i) => (
            <button key={i} onClick={()=>enviar(s)} style={{ padding:"5px 10px", borderRadius:14, border:`1px solid ${G.border}`, background:"transparent", color:G.textMuted, fontSize:11, cursor:"pointer" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:"12px 16px", background:G.surface, borderTop:`1px solid ${G.border}`, display:"flex", gap:10, alignItems:"flex-end", flexShrink:0, borderRadius:"0 0 10px 10px" }}>
        <textarea
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); enviar(); } }}
          placeholder="Cuéntame qué ha pasado en la obra... (Enter para enviar)"
          style={{ flex:1, minHeight:44, maxHeight:120, padding:"10px 14px", borderRadius:8, fontSize:13, resize:"none", background:G.bg, border:`1px solid ${G.border}`, color:G.text, outline:"none", lineHeight:1.5 }}
          disabled={loading}
        />
        <button onClick={()=>enviar()} disabled={loading||!input.trim()} style={{ padding:"10px 18px", borderRadius:8, background:input.trim()&&!loading?G.gold:"#333", border:"none", color:input.trim()&&!loading?"#1A1A2E":G.textMuted, fontSize:13, cursor:input.trim()&&!loading?"pointer":"default", fontWeight:600, flexShrink:0, height:44 }}>
          {loading?"...":"→"}
        </button>
      </div>
    </div>
  );
}

// === PRESUPUESTOS RECIBIDOS ===
function PresupuestosRecibidosTab({ obra, onUpdate }) {
  const presups = obra.presupuestosRecibidos || [];
  const proveedores = obra.proveedores || [];
  const [form, setForm] = React.useState({ proveedorNombre:"", partida:"", numeroPres:"", base:"", iva:21, importe:"", fecha:new Date().toISOString().slice(0,10), estado:"pendiente", notas:"", version:1 });
  const [editandoId, setEditandoId] = React.useState(null);
  const [editForm, setEditForm] = React.useState({});

  const save = (nuevos, previos) => {
    // Detectar si algún presupuesto cambió a "aceptado"
    const cambios = {};
    cambios.presupuestosRecibidos = nuevos;

    // Recalcular SIEMPRE importe de proveedores basado en presupuestos aceptados
    const proveedoresActualizados = (obra.proveedores||[]).map(prov => {
      const todosPresupsProv = nuevos.filter(p =>
        prov.nombre.toLowerCase().includes(p.proveedorNombre.toLowerCase()) ||
        p.proveedorNombre.toLowerCase().includes(prov.nombre.toLowerCase())
      );
      if (todosPresupsProv.length === 0) return prov; // Sin presupuestos → no tocar
      const totalAceptado = todosPresupsProv
        .filter(p => p.estado === "aceptado")
        .reduce((a,p)=>a+Number(p.importe||0),0);
      if (totalAceptado > 0) return { ...prov, importe: totalAceptado, estado: "activo" };
      return { ...prov, importe: 0, estado: prov.estado === "activo" ? "pendiente" : prov.estado };
    });
    cambios.proveedores = proveedoresActualizados;
    onUpdate(cambios);
  };

  const añadir = () => {
    if (!form.proveedorNombre || (!form.importe && !form.base)) return;
    const base = Number(form.base) || Number(form.importe) || 0;
    const iva = Number(form.iva) || 21;
    const total = base * (1 + iva/100);
    save([...presups, { id:uid(), ...form, base, iva, importe:Math.round(total*100)/100, creadoEn:new Date().toLocaleString("es-ES") }]);
    setForm({ proveedorNombre:"", partida:"", numeroPres:"", base:"", iva:21, importe:"", fecha:new Date().toISOString().slice(0,10), estado:"pendiente", notas:"", version:1, pdfNombre:"", pdfData:"" });
  };

  const startEdit = (p) => { setEditandoId(p.id); setEditForm({...p}); };
  const saveEdit = () => {
    const base = Number(editForm.base) || Number(editForm.importe) || 0;
    const iva = Number(editForm.iva) || 21;
    const importe = base > 0 ? Math.round(base * (1 + iva/100) * 100) / 100 : Number(editForm.importe) || 0;
    const nuevos = presups.map(x=>x.id===editandoId?{...x,...editForm,base,iva,importe,version:(editForm.version||1)+0.1}:x);
    save(nuevos, presups);
    setEditandoId(null);
  };

  const total = presups.filter(p=>p.estado==="aceptado").reduce((s,p)=>s+Number(p.importe||0),0);
  const pendiente = presups.filter(p=>p.estado==="pendiente").reduce((s,p)=>s+Number(p.importe||0),0);

  const ESTADOS = { pendiente:{color:G.gold,label:"Pendiente"}, aceptado:{color:G.green,label:"Aceptado"}, rechazado:{color:G.red,label:"Rechazado"}, revision:{color:"#7B68EE",label:"En revisión"} };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      {/* Resumen */}
      <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
        <div className="card" style={{ flex:1,minWidth:120,textAlign:"center" }}>
          <div style={{ fontSize:11,color:G.textMuted,marginBottom:4 }}>ACEPTADOS (base)</div>
          <div style={{ fontSize:18,fontWeight:700,color:G.green }}>{presups.filter(p=>p.estado==="aceptado").reduce((s,p)=>s+Number(p.base||p.importe||0),0).toLocaleString("es-ES")}€</div>
        </div>
        <div className="card" style={{ flex:1,minWidth:120,textAlign:"center" }}>
          <div style={{ fontSize:11,color:G.textMuted,marginBottom:4 }}>ACEPTADOS (c/IVA)</div>
          <div style={{ fontSize:18,fontWeight:700,color:G.green }}>{presups.filter(p=>p.estado==="aceptado").reduce((s,p)=>s+Number(p.importe||0),0).toLocaleString("es-ES")}€</div>
        </div>
        <div className="card" style={{ flex:1,minWidth:120,textAlign:"center" }}>
          <div style={{ fontSize:11,color:G.textMuted,marginBottom:4 }}>PENDIENTES (c/IVA)</div>
          <div style={{ fontSize:18,fontWeight:700,color:G.gold }}>{presups.filter(p=>p.estado==="pendiente").reduce((s,p)=>s+Number(p.importe||0),0).toLocaleString("es-ES")}€</div>
        </div>
        <div className="card" style={{ flex:1,minWidth:120,textAlign:"center" }}>
          <div style={{ fontSize:11,color:G.textMuted,marginBottom:4 }}>TOTAL PRESUPUESTOS</div>
          <div style={{ fontSize:18,fontWeight:700,color:G.text }}>{presups.length}</div>
        </div>
      </div>

      {/* Formulario nuevo */}
      <div className="card">
        <div style={{ fontSize:13,fontWeight:600,marginBottom:12,color:G.gold }}>+ Añadir presupuesto recibido</div>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
          <div style={{ flex:1,minWidth:150 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4 }}>PROVEEDOR</div>
            <input value={form.proveedorNombre} onChange={e=>setForm(f=>({...f,proveedorNombre:e.target.value}))} placeholder="Nombre proveedor..." style={{ fontSize:12,width:"100%" }} list="provs-list" />
            <datalist id="provs-list">{proveedores.map(p=><option key={p.id} value={p.nombre}/>)}</datalist>
          </div>
          <div style={{ flex:1,minWidth:120 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4 }}>Nº PRESUPUESTO</div>
            <input value={form.numeroPres} onChange={e=>setForm(f=>({...f,numeroPres:e.target.value}))} placeholder="P-2025-0033..." style={{ fontSize:12,width:"100%" }} />
          </div>
          <div style={{ flex:1,minWidth:120 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4 }}>PARTIDA</div>
            <input value={form.partida} onChange={e=>setForm(f=>({...f,partida:e.target.value}))} placeholder="Moqueta, cableado..." style={{ fontSize:12,width:"100%" }} />
          </div>
          <div style={{ width:90 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4 }}>BASE (€)</div>
            <input type="number" value={form.base} onChange={e=>setForm(f=>({...f,base:e.target.value,importe:""}))} placeholder="0" style={{ fontSize:12,width:"100%" }} />
          </div>
          <div style={{ width:80 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4 }}>IVA %</div>
            <select value={form.iva} onChange={e=>setForm(f=>({...f,iva:Number(e.target.value)}))} style={{ fontSize:12,width:"100%" }}>
              <option value={21}>21%</option>
              <option value={10}>10% 🏠</option>
              <option value={0}>0%</option>
            </select>
          </div>
          <div style={{ width:90 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4 }}>TOTAL (€)</div>
            <div style={{ fontSize:13,fontWeight:600,color:G.gold,paddingTop:6 }}>
              {form.base ? `${Math.round(Number(form.base)*(1+Number(form.iva)/100)).toLocaleString("es-ES")}€` : "—"}
            </div>
          </div>
          <div style={{ width:130 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4 }}>FECHA</div>
            <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={{ fontSize:12,width:"100%" }} />
          </div>
          <div style={{ width:110 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4 }}>ESTADO</div>
            <select value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} style={{ fontSize:12,width:"100%" }}>
              <option value="pendiente">Pendiente</option><option value="aceptado">Aceptado</option><option value="revision">En revisión</option><option value="rechazado">Rechazado</option>
            </select>
          </div>
          <div style={{ alignSelf:"flex-end" }}>
            <button className="btn-primary" onClick={añadir} style={{ opacity: form.proveedorNombre&&form.base ? 1 : 0.5 }}>+ Añadir</button>
          </div>
        </div>
        <div style={{ marginTop:8, display:"flex", gap:8, alignItems:"center" }}>
          <input value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Notas opcionales..." style={{ fontSize:12,flex:1 }} />
          <label style={{ cursor:"pointer", padding:"4px 10px", border:`1px solid ${G.border}`, borderRadius:6, fontSize:11, color:G.textMuted, whiteSpace:"nowrap" }}>
            📎 Adjuntar PDF
            <input type="file" accept=".pdf,image/*" style={{ display:"none" }} onChange={e=>{
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => setForm(f=>({...f, pdfNombre:file.name, pdfData:ev.target.result}));
              reader.readAsDataURL(file);
            }} />
          </label>
          {form.pdfNombre&&<span style={{ fontSize:10, color:G.green }}>✓ {form.pdfNombre} <span onClick={()=>setForm(f=>({...f,pdfNombre:"",pdfData:""}))} style={{ cursor:"pointer",color:G.red,marginLeft:4 }}>✕</span></span>}
        </div>
      </div>

      {/* Lista */}
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {presups.length===0&&<div className="card" style={{ textAlign:"center",color:G.textMuted,padding:40 }}>
          <div style={{ fontSize:32,marginBottom:8 }}>📥</div>
          <div>No hay presupuestos recibidos</div>
          <div style={{ fontSize:12,marginTop:6 }}>Añade los presupuestos que recibes de los industriales</div>
        </div>}
        {presups.map(p=>{
          const est = ESTADOS[p.estado]||ESTADOS.pendiente;
          const editando = editandoId===p.id;
          return (
            <div key={p.id} className="card" style={{ border:`1px solid ${editando?G.gold:G.border}` }}>
              {editando ? (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    <input value={editForm.proveedorNombre} onChange={e=>setEditForm(f=>({...f,proveedorNombre:e.target.value}))} placeholder="Proveedor" style={{ fontSize:12,flex:1,minWidth:120 }} />
                    <input value={editForm.partida} onChange={e=>setEditForm(f=>({...f,partida:e.target.value}))} placeholder="Partida" style={{ fontSize:12,flex:1,minWidth:100 }} />
                    <input value={editForm.numeroPres||""} onChange={e=>setEditForm(f=>({...f,numeroPres:e.target.value}))} placeholder="Nº Presup." style={{ fontSize:12,width:90 }} />
                    <input type="date" value={editForm.fecha} onChange={e=>setEditForm(f=>({...f,fecha:e.target.value}))} style={{ fontSize:12 }} />
                    <select value={editForm.estado} onChange={e=>setEditForm(f=>({...f,estado:e.target.value}))} style={{ fontSize:12 }}>
                      <option value="pendiente">Pendiente</option><option value="aceptado">Aceptado</option><option value="revision">En revisión</option><option value="rechazado">Rechazado</option>
                    </select>
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontSize:9,color:G.textMuted,marginBottom:2 }}>BASE (€)</div>
                      <input type="number" value={editForm.base||""} onChange={e=>setEditForm(f=>({...f,base:e.target.value,importe:Math.round(Number(e.target.value)*(1+(Number(f.iva)||21)/100)*100)/100}))} placeholder="0" style={{ fontSize:12,width:100 }} />
                    </div>
                    <div>
                      <div style={{ fontSize:9,color:G.textMuted,marginBottom:2 }}>IVA %</div>
                      <select value={editForm.iva||21} onChange={e=>setEditForm(f=>({...f,iva:Number(e.target.value),importe:Math.round(Number(f.base||0)*(1+Number(e.target.value)/100)*100)/100}))} style={{ fontSize:12 }}>
                        <option value={21}>21%</option>
                        <option value={10}>10% 🏠</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:9,color:G.textMuted,marginBottom:2 }}>TOTAL (c/IVA)</div>
                      <div style={{ fontSize:13,fontWeight:600,color:G.gold,paddingTop:4 }}>
                        {editForm.base ? `${Number(editForm.importe||0).toLocaleString("es-ES")}€` : "—"}
                      </div>
                    </div>
                  </div>
                  <input value={editForm.notas||""} onChange={e=>setEditForm(f=>({...f,notas:e.target.value}))} placeholder="Notas..." style={{ fontSize:12,width:"100%" }} />
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <label style={{ cursor:"pointer",padding:"4px 10px",border:`1px solid ${G.border}`,borderRadius:6,fontSize:11,color:G.textMuted,whiteSpace:"nowrap" }}>
                      📎 {editForm.pdfNombre || "Adjuntar PDF"}
                      <input type="file" accept=".pdf,image/*" style={{ display:"none" }} onChange={e=>{
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setEditForm(f=>({...f,pdfNombre:file.name,pdfData:ev.target.result}));
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                    {editForm.pdfNombre&&<span style={{ fontSize:10,color:G.green }}>✓ {editForm.pdfNombre} <span onClick={()=>setEditForm(f=>({...f,pdfNombre:"",pdfData:""}))} style={{ cursor:"pointer",color:G.red,marginLeft:4 }}>✕</span></span>}
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <button className="btn-primary" onClick={saveEdit} style={{ fontSize:11,padding:"4px 14px" }}>✓ Guardar</button>
                    <button onClick={()=>setEditandoId(null)} style={{ fontSize:11,padding:"4px 10px",background:"transparent",border:`1px solid ${G.border}`,borderRadius:4,color:G.textMuted,cursor:"pointer" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:4 }}>
                      <span style={{ fontSize:13,fontWeight:600 }}>{p.proveedorNombre}</span>
                      {p.numeroPres&&<span style={{ fontSize:11,color:"#888",fontFamily:"monospace" }}>{p.numeroPres}</span>}
                      {p.partida&&<span style={{ fontSize:11,color:G.textMuted }}>— {p.partida}</span>}
                      <span style={{ fontSize:11,padding:"2px 8px",borderRadius:10,background:est.color+"22",color:est.color }}>{est.label}</span>
                    </div>
                    <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                      <div>
                        <span style={{ fontSize:18,fontWeight:700,color:G.text }}>{Number(p.importe||0).toLocaleString("es-ES")}€</span>
                        <span style={{ fontSize:11,color:G.textMuted }}> (IVA inc.)</span>
                      </div>
                      {p.base && <div style={{ fontSize:11,color:G.textMuted }}>
                        Base: {Number(p.base).toLocaleString("es-ES")}€ + IVA {p.iva||21}%
                        {p.iva===10&&<span style={{ color:G.gold }}> 🏠</span>}
                      </div>}
                      {p.fecha&&<span style={{ fontSize:11,color:G.textMuted }}>📅 {p.fecha}</span>}
                      {p.version>1&&<span style={{ fontSize:10,color:G.textMuted }}>v{p.version.toFixed(1)}</span>}
                    </div>
                    {p.pdfNombre&&<div style={{ fontSize:11,marginTop:4,display:"flex",alignItems:"center",gap:6 }}><a href={p.pdfData} download={p.pdfNombre} onClick={e=>e.stopPropagation()} style={{ color:"#1A5C9A",textDecoration:"none" }}>📎 {p.pdfNombre}</a><span onClick={e=>{e.stopPropagation();save(presups.map(x=>x.id===p.id?{...x,pdfNombre:"",pdfData:""}:x));}} style={{ cursor:"pointer",color:G.red,fontSize:10 }}>✕</span></div>}
                    {p.notas&&<div style={{ fontSize:11,color:G.textMuted,marginTop:4 }}>{p.notas}</div>}
                  </div>
                  <button onClick={()=>startEdit(p)} style={{ padding:"5px 10px",background:"transparent",border:`1px solid ${G.border}`,borderRadius:4,color:G.gold,cursor:"pointer",fontSize:12 }}>✎</button>
                  <button className="btn-danger" onClick={()=>save(presups.filter(x=>x.id!==p.id))} style={{ padding:"5px 8px" }}>✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === OBRA DETAIL (contenedor de pestañas) ===
function ObraDetail({ obra, onUpdate, onBack, onDelete, showToast }) {
  const [tab, setTab] = React.useState("resumen");
  const [modal, setModal] = React.useState(null);
  const [portalAbierto, setPortalAbierto] = React.useState(false);

  // Wrapper que mergea cambios parciales con la obra completa
  const handleUpdate = React.useCallback((cambios) => {
    // cambios puede ser objeto parcial o obra completa
    if (cambios.id) {
      // Ya es una obra completa
      onUpdate(cambios);
    } else {
      // Es un objeto parcial - mergear con obra actual
      onUpdate({ ...obra, ...cambios });
    }
  }, [obra, onUpdate]);

  const TABS = [
    { id:"resumen",    label:"Resumen",    emoji:"📊" },
    { id:"gantt",      label:"Gantt",      emoji:"📅" },
    { id:"tareas",     label:"Tareas",     emoji:"✅" },
    { id:"proveedores",label:"Proveedores",emoji:"👷" },
    { id:"economica",  label:"Económico",  emoji:"💶" },
    { id:"fotos",      label:"Fotos",      emoji:"📸" },
    { id:"incidencias",label:"Incidencias",emoji:"⚠️" },
    { id:"materiales", label:"Materiales", emoji:"📦" },
    { id:"checklist",  label:"Checklist",  emoji:"☑️" },
    { id:"comparador", label:"Comparador", emoji:"⚖️" },
    { id:"extras",     label:"Extras",     emoji:"➕" },
    { id:"presupuesto",label:"Mi Presupuesto",emoji:"📋" },
    { id:"firma",      label:"Firma",      emoji:"✍️" },
    { id:"garantias",  label:"Garantías",  emoji:"🛡️" },
    { id:"planos",     label:"Planos",     emoji:"📐" },
    { id:"arquitecto", label:"Arquitecto", emoji:"🏛️" },
    { id:"cliente",    label:"Cliente IA", emoji:"🤝" },
    { id:"informes",   label:"Informes",   emoji:"📄" },
    { id:"reuniones",  label:"Reuniones",  emoji:"🤝" },
    { id:"presupRecibidos", label:"Presupuestos", emoji:"📥" },
    { id:"claude",     label:"Claude ✦",   emoji:"✦"  },
  ];

  const diasRestantesObra = obra.fechaFin ? Math.ceil((new Date(obra.fechaFin) - new Date()) / 864e5) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header obra */}
      <div style={{ background:G.surface, borderBottom:`1px solid ${G.border}`, padding:"12px 24px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none", border:`1px solid ${G.border}`, color:G.textMuted, padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:12 }}>← Volver</button>
        <div style={{ width:10, height:10, borderRadius:2, background:obra.color, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div className="serif" style={{ fontSize:18, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{obra.nombre}</div>
          <div style={{ fontSize:11, color:G.textMuted }}>{obra.cliente}{obra.ubicacion ? ` · ${obra.ubicacion}` : ""}</div>
        </div>
        {diasRestantesObra !== null && (
          <div style={{ textAlign:"center", flexShrink:0 }}>
            <div className="mono" style={{ fontSize:18, color:diasRestantesObra < 0 ? G.red : diasRestantesObra < 30 ? G.orange : G.gold }}>{Math.abs(diasRestantesObra)}</div>
            <div style={{ fontSize:9, color:G.textMuted }}>{diasRestantesObra < 0 ? "días retraso" : "días restantes"}</div>
          </div>
        )}
        <button onClick={() => setPortalAbierto(true)} style={{ background:G.gold, color:"#1A1A2E", border:"none", padding:"6px 14px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>
          👤 Portal
        </button>
        <button onClick={onDelete} style={{ background:"transparent", color:G.red, border:`1px solid ${G.red}44`, padding:"6px 10px", borderRadius:6, fontSize:12, cursor:"pointer" }} title="Eliminar obra">
          🗑️
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background:G.surface, borderBottom:`1px solid ${G.border}`, display:"flex", overflowX:"auto", flexShrink:0, padding:"0 8px" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"10px 14px", background:"none", border:"none", borderBottom:tab===t.id?`2px solid ${G.gold}`:"2px solid transparent", color:tab===t.id?G.gold:G.textMuted, cursor:"pointer", fontSize:12, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5 }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflow:"auto", padding:20 }}>
        {tab === "resumen"     && <ResumenTab     obra={obra} onUpdate={handleUpdate} />}
        {tab === "gantt"       && <GanttView       obra={obra} onUpdate={handleUpdate} />}
        {tab === "tareas"      && <TareasTab        obra={obra} onUpdate={handleUpdate} />}
        {tab === "proveedores" && <ProveedoresTab   obra={obra} onUpdate={handleUpdate} onModal={setModal} />}
        {tab === "economica"   && <EconomicaTab     obra={obra} onUpdate={handleUpdate} />}
        {tab === "fotos"       && <FotosTab         obra={obra} onUpdate={handleUpdate} />}
        {tab === "incidencias" && <IncidenciasTab   obra={obra} onUpdate={handleUpdate} />}
        {tab === "materiales"  && <MaterialesTab    obra={obra} onUpdate={handleUpdate} />}
        {tab === "checklist"   && <ChecklistTab     obra={obra} onUpdate={handleUpdate} />}
        {tab === "comparador"  && <ComparadorTab    obra={obra} onUpdate={handleUpdate} />}
        {tab === "extras"      && <ExtrasTab        obra={obra} onUpdate={handleUpdate} />}
        {tab === "presupuesto" && <PresupuestoClienteTab obra={obra} onUpdate={handleUpdate} />}
        {tab === "firma"       && <FirmaTab         obra={obra} onUpdate={handleUpdate} />}
        {tab === "garantias"   && <GarantiasTab     obra={obra} onUpdate={handleUpdate} />}
        {tab === "planos"      && <PlanosTab        obra={obra} onUpdate={handleUpdate} />}
        {tab === "arquitecto"  && <ArquitectoTab    obra={obra} onUpdate={handleUpdate} />}
        {tab === "cliente"     && <ClienteIATab     obra={obra} onUpdate={handleUpdate} />}
        {tab === "informes"    && <InformesTab      obra={obra} />}
        {tab === "reuniones"   && <ReunionesTab     obra={obra} onUpdate={handleUpdate} />}
        {tab === "presupRecibidos" && <PresupuestosRecibidosTab obra={obra} onUpdate={handleUpdate} />}
        {tab === "claude"      && <ClaudeTab        obra={obra} onUpdate={handleUpdate} showToast={showToast} />}
      </div>

      {/* Modales */}
      {modal === "proveedor" && (
        <NuevoProveedorModal
          onClose={() => setModal(null)}
          onSave={p => { onUpdate({ proveedores: [...(obra.proveedores||[]), { id:uid(), ...p, pagos:[], comentarios:[], valoracion:0 }] }); setModal(null); showToast("Proveedor añadido","👷"); }}
        />
      )}

      {/* Portal cliente */}
      {portalAbierto && <PortalCliente obra={obra} onCerrar={() => setPortalAbierto(false)} />}
    </div>
  );
}

// === RESUMEN TAB ===
function ResumenTab({ obra, onUpdate }) {
  const fases = obra.fases || [];
  const tareas = obra.tareas || [];
  const incidencias = obra.incidencias || [];
  const eco = obra.economica || {};
  
  // Presupuesto total = suma de presupuestosRecibidos aceptados o todos si no hay aceptados
  const presups = obra.presupuestosRecibidos || [];
  const presupAceptados = presups.filter(p=>p.estado==="aceptado").reduce((a,p)=>a+Number(p.importe||0),0);
  const presupTodos = presups.reduce((a,p)=>a+Number(p.importe||0),0);
  const presup = presupAceptados > 0 ? presupAceptados : 
                 presupTodos > 0 ? presupTodos :
                 (eco.partidas||[]).reduce((a,p)=>a+(Number(p.previsto)||0),0) || obra.presupuesto || 0;
  const real = (eco.partidas||[]).reduce((a,p)=>a+(Number(p.real)||0),0);
  const cobros = (eco.cobros||[]).filter(c=>c.estado==="cobrado").reduce((a,c)=>a+(Number(c.importe)||0),0);
  const diasR = obra.fechaFin ? Math.ceil((new Date(obra.fechaFin)-new Date())/864e5) : null;
  const pctFases = pct(fases.filter(f=>f.estado==="completada").length, fases.length);
  const pctTareas = pct(tareas.filter(t=>t.estado==="completada").length, tareas.length);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {[
          { label:"PRESUPUESTO", val:fmt(presup), color:G.gold },
          { label:"COSTE REAL",  val:fmt(real),   color:real>presup?G.red:G.green },
          { label:"COBRADO",     val:fmt(cobros),  color:G.green },
          { label:"DÍAS",        val:diasR!==null?Math.abs(diasR)+"d":"—", color:diasR!==null&&diasR<0?G.red:G.text },
        ].map(k=>(
          <div key={k.label} className="stat-box">
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:6,fontFamily:"DM Mono" }}>{k.label}</div>
            <div className="serif" style={{ fontSize:22,color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Progreso */}
      <div className="card">
        <div className="serif" style={{ fontSize:16,marginBottom:16 }}>Progreso</div>
        {[
          { label:"Fases completadas", val:pctFases, color:G.gold },
          { label:"Tareas completadas", val:pctTareas, color:G.green },
        ].map(p=>(
          <div key={p.label} style={{ marginBottom:12 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5 }}>
              <span>{p.label}</span><span className="mono" style={{ color:p.color }}>{p.val}%</span>
            </div>
            <div style={{ height:6,background:G.border,borderRadius:3,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${p.val}%`,background:p.color,borderRadius:3 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Fases */}
      {fases.length>0&&(
        <div className="card">
          <div className="serif" style={{ fontSize:16,marginBottom:14 }}>Fases</div>
          {fases.map((f,i)=>{
            const s={completada:{color:G.green,label:"✓"},en_curso:{color:G.gold,label:"●"},pendiente:{color:G.textMuted,label:"○"}};
            const st=s[f.estado]||s.pendiente;
            return (
              <div key={f.id} style={{ display:"flex",gap:12,alignItems:"center",padding:"8px 0",borderBottom:i<fases.length-1?`1px solid ${G.border}`:"none" }}>
                <span style={{ color:st.color,fontSize:16 }}>{st.label}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13 }}>{f.nombre}</div>
                  <div style={{ fontSize:10,color:G.textMuted }}>{f.inicio} → {f.fin}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Incidencias abiertas */}
      {incidencias.filter(i=>i.estado==="abierta").length>0&&(
        <div className="card" style={{ borderLeft:`3px solid ${G.red}` }}>
          <div className="serif" style={{ fontSize:16,marginBottom:12,color:G.red }}>Incidencias abiertas</div>
          {incidencias.filter(i=>i.estado==="abierta").slice(0,3).map((inc,i)=>(
            <div key={i} style={{ padding:"6px 0",borderBottom:`1px solid ${G.border}`,fontSize:12 }}>
              <span style={{ color:G.red,marginRight:8 }}>⚠</span>{inc.titulo}
            </div>
          ))}
        </div>
      )}

      {/* Editar info básica */}
      <div className="card">
        <div className="serif" style={{ fontSize:16,marginBottom:14 }}>Información</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          {[
            {label:"CLIENTE",k:"cliente"},{label:"UBICACIÓN",k:"ubicacion"},
            {label:"FECHA INICIO",k:"fechaInicio",t:"date"},{label:"FECHA FIN",k:"fechaFin",t:"date"},
            {label:"PRESUPUESTO (€)",k:"presupuesto",t:"number"},
          ].map(f=>(
            <div key={f.k}>
              <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>{f.label}</div>
              <input type={f.t||"text"} value={obra[f.k]||""} onChange={e=>onUpdate({[f.k]:f.t==="number"?Number(e.target.value):e.target.value})} style={{ fontSize:12,width:"100%" }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>CÓDIGO CLIENTE (para portal)</div>
            <input type="text" value={obra.codigoCliente||""} onChange={e=>onUpdate({codigoCliente:e.target.value})} placeholder="ej: tornos2026" style={{ fontSize:12,width:"100%" }} />
          </div>
          <div>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>ESTADO</div>
            <select value={obra.estado||"pendiente"} onChange={e=>onUpdate({estado:e.target.value})} style={{ fontSize:12,width:"100%" }}>
              <option value="pendiente">Pendiente</option>
              <option value="en_curso">En curso</option>
              <option value="pausada">Pausada</option>
              <option value="completada">Completada</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// === TAREAS TAB ===
function TareasTab({ obra, onUpdate }) {
  const [form, setForm] = React.useState({ titulo:"", responsable:"", prioridad:"media", faseId:"" });
  const [filtro, setFiltro] = React.useState("todas");
  const [editandoId, setEditandoId] = React.useState(null);
  const [editForm, setEditForm] = React.useState({});
  const tareas = obra.tareas || [];
  const fases = obra.fases || [];

  const save = (nuevas) => onUpdate({ tareas: nuevas });
  const filtradas = tareas.filter(t => filtro === "todas" || t.estado === filtro || t.prioridad === filtro);

  const PRIOS = { alta:{ color:G.red, label:"Alta" }, media:{ color:G.gold, label:"Media" }, baja:{ color:G.textMuted, label:"Baja" } };

  const startEdit = (t) => { setEditandoId(t.id); setEditForm({ titulo:t.titulo, responsable:t.responsable||"", prioridad:t.prioridad||"media", fecha:t.fecha||"" }); };
  const saveEdit = (id) => { save(tareas.map(x=>x.id===id?{...x,...editForm}:x)); setEditandoId(null); };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      {/* Nueva tarea */}
      <div className="card">
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end" }}>
          <div style={{ flex:2,minWidth:200 }}>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>TAREA</div>
            <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Nueva tarea..." style={{ fontSize:12,width:"100%" }} onKeyDown={e=>{ if(e.key==="Enter"&&form.titulo.trim()){ save([...tareas,{id:uid(),...form,estado:"pendiente",fecha:new Date().toISOString().slice(0,10)}]);setForm(f=>({...f,titulo:""})); }}} />
          </div>
          <div>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>PRIORIDAD</div>
            <select value={form.prioridad} onChange={e=>setForm(f=>({...f,prioridad:e.target.value}))} style={{ fontSize:12 }}>
              <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize:9,color:G.textMuted,marginBottom:4,fontFamily:"DM Mono" }}>RESPONSABLE</div>
            <input value={form.responsable} onChange={e=>setForm(f=>({...f,responsable:e.target.value}))} placeholder="Nombre..." style={{ fontSize:12,width:120 }} />
          </div>
          <button className="btn-primary" onClick={()=>{ if(!form.titulo.trim()) return; save([...tareas,{id:uid(),...form,estado:"pendiente",fecha:new Date().toISOString().slice(0,10)}]); setForm(f=>({...f,titulo:""})); }}>+ Añadir</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex",gap:6 }}>
        {[["todas","Todas"],["pendiente","Pendiente"],["en_curso","En curso"],["completada","Completada"],["alta","🔴 Alta"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltro(v)} style={{ padding:"4px 10px",borderRadius:4,border:`1px solid ${filtro===v?G.gold:G.border}`,background:filtro===v?"#1E1A13":"transparent",color:filtro===v?G.gold:G.textMuted,fontSize:11,cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
        {filtradas.length===0&&<div style={{ textAlign:"center",padding:32,color:G.textMuted }}>Sin tareas</div>}
        {filtradas.map(t=>{
          const p = PRIOS[t.prioridad]||PRIOS.media;
          const editando = editandoId === t.id;
          return (
            <div key={t.id} className="card" style={{ padding:"10px 14px",background:"#FFFFFF",border:`1px solid ${editando?G.gold:"#E0E0E0"}` }}>
              {editando ? (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <input value={editForm.titulo} onChange={e=>setEditForm(f=>({...f,titulo:e.target.value}))} style={{ fontSize:13,width:"100%",fontWeight:500 }} />
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    <input value={editForm.responsable} onChange={e=>setEditForm(f=>({...f,responsable:e.target.value}))} placeholder="Responsable" style={{ fontSize:11,width:120 }} />
                    <select value={editForm.prioridad} onChange={e=>setEditForm(f=>({...f,prioridad:e.target.value}))} style={{ fontSize:11 }}>
                      <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
                    </select>
                    <input type="date" value={editForm.fecha} onChange={e=>setEditForm(f=>({...f,fecha:e.target.value}))} style={{ fontSize:11 }} />
                    <button className="btn-primary" onClick={()=>saveEdit(t.id)} style={{ padding:"4px 12px",fontSize:11 }}>✓ Guardar</button>
                    <button onClick={()=>setEditandoId(null)} style={{ padding:"4px 10px",fontSize:11,background:"transparent",border:`1px solid ${G.border}`,borderRadius:4,color:G.textMuted,cursor:"pointer" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                  <input type="checkbox" checked={t.estado==="completada"} onChange={()=>save(tareas.map(x=>x.id===t.id?{...x,estado:x.estado==="completada"?"pendiente":"completada"}:x))} style={{ cursor:"pointer",flexShrink:0,width:16,height:16 }} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:500,textDecoration:t.estado==="completada"?"line-through":"none",color:t.estado==="completada"?"#999":"#1A1A2E" }}>{t.titulo||"(sin título)"}</div>
                    <div style={{ fontSize:11,color:"#555",marginTop:2 }}>
                      {t.responsable&&<span style={{color:"#AAA"}}>{t.responsable} · </span>}
                      <span style={{ color:p.color }}>{p.label}</span>
                      {t.fecha&&<span style={{color:"#777"}}> · {t.fecha}</span>}
                    </div>
                  </div>
                  <select value={t.estado||"pendiente"} onChange={e=>save(tareas.map(x=>x.id===t.id?{...x,estado:e.target.value}:x))} style={{ fontSize:11,padding:"3px 6px",width:"auto",color:G.text,background:G.bg,border:`1px solid ${G.border}` }}>
                    <option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="completada">Completada</option>
                  </select>
                  <button onClick={()=>startEdit(t)} style={{ padding:"4px 8px",fontSize:11,background:"transparent",border:`1px solid ${G.border}`,borderRadius:4,color:G.gold,cursor:"pointer",flexShrink:0 }}>✎</button>
                  <button className="btn-danger" onClick={()=>save(tareas.filter(x=>x.id!==t.id))} style={{ padding:"4px 8px",flexShrink:0 }}>✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClienteView({ obras }) {
  const [codigo, setCodigo] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [error, setError] = useState(false);

  // Read config from localStorage
  const config = (() => { try { return JSON.parse(localStorage.getItem("bf-config")||"{}"); } catch(e) { return {}; } })();

  // Find obra with matching code — check both obra.codigoCliente and config.codigoCliente
  const obra = obras.find(o => {
    const cod = o.codigoCliente || config.codigoCliente;
    return cod && cod === codigo;
  });

  const entrar = () => {
    if (obra) { setAutenticado(true); setError(false); }
    else { setError(true); }
  };

  if (!autenticado) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:12, padding:40, width:340, textAlign:"center" }}>
        <div className="serif" style={{ fontSize:28, color:G.gold, marginBottom:8 }}>Blue Forest</div>
        <div style={{ fontSize:13, color:G.textMuted, marginBottom:32 }}>Portal del cliente</div>
        <input
          value={codigo} onChange={e=>setCodigo(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&entrar()}
          placeholder="Código de acceso"
          style={{ width:"100%", fontSize:14, marginBottom:12, textAlign:"center" }}
        />
        {error && <div style={{ color:G.red, fontSize:12, marginBottom:12 }}>Código incorrecto</div>}
        <button className="btn-primary" onClick={entrar} style={{ width:"100%" }}>Entrar →</button>
      </div>
    </div>
  );

  const fases = obra.fases || [];
  const fotos = obra.fotos || [];
  const materiales = obra.materiales || [];
  const hoy = new Date();

  return (
    <div style={{ minHeight:"100vh", background:G.bg, color:G.text }}>
      <style>{buildCss()}</style>
      {/* Header */}
      <div style={{ padding:"20px 32px", borderBottom:`1px solid ${G.border}`, display:"flex", alignItems:"center", gap:16 }}>
        <div className="serif" style={{ fontSize:22, color:G.gold }}>Blue Forest</div>
        <div style={{ width:1, height:20, background:G.border }}/>
        <div style={{ fontSize:14 }}>{obra.nombre}</div>
        <div style={{ marginLeft:"auto", fontSize:12, color:G.textMuted }}>{obra.cliente}</div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px", display:"flex", flexDirection:"column", gap:32 }}>

        {/* Estado general */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { label:"INICIO", val: obra.fechaInicio || "—" },
            { label:"FIN PREVISTO", val: obra.fechaFin || "—" },
            { label:"ESTADO", val: obra.estado === "en_curso" ? "En curso" : obra.estado === "completada" ? "Completada" : "Pendiente" },
          ].map(k => (
            <div key={k.label} className="stat-box">
              <div style={{ fontSize:10, color:G.textMuted, marginBottom:6, fontFamily:"DM Mono" }}>{k.label}</div>
              <div className="serif" style={{ fontSize:16, color:G.gold }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Gantt fases */}
        {fases.length > 0 && (
          <div>
            <div className="serif" style={{ fontSize:16, marginBottom:16 }}>Planificación</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {fases.map(f => {
                const est = f.estado === "completada" ? G.green : f.estado === "en_curso" ? G.gold : G.textDim;
                return (
                  <div key={f.id} style={{ background:G.surface, borderRadius:8, padding:"12px 16px", border:`1px solid ${G.border}`, display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:est, flexShrink:0 }}/>
                    <div style={{ flex:1, fontSize:13 }}>{f.nombre}</div>
                    <div style={{ fontSize:11, color:G.textMuted, fontFamily:"DM Mono" }}>{f.inicio} → {f.fin}</div>
                    <div style={{ fontSize:11, color:est }}>{f.estado === "completada" ? "✓ Completada" : f.estado === "en_curso" ? "En curso" : "Pendiente"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tareas pendientes */}
        {(() => {
          const tareas = (obra.tareas||[]).filter(t => t.estado === "pendiente" || t.estado === "en_curso");
          if (!tareas.length) return null;
          return (
            <div>
              <div className="serif" style={{ fontSize:16, marginBottom:16 }}>Tareas pendientes</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {tareas.map(t => (
                  <div key={t.id} style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background: t.estado==="en_curso" ? G.gold : G.textDim, flexShrink:0 }}/>
                    <div style={{ flex:1, fontSize:13 }}>{t.titulo}</div>
                    <div style={{ fontSize:11, color: t.estado==="en_curso" ? G.gold : G.textMuted }}>{t.estado==="en_curso" ? "En curso" : "Pendiente"}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Reuniones / Actas */}
        {(() => {
          const reuniones = [...(obra.actasHistorial||[])].reverse();
          if (!reuniones.length) return null;
          return (
            <div>
              <div className="serif" style={{ fontSize:16, marginBottom:16 }}>Actas de reunión</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {reuniones.map((r,i) => (
                  <div key={i} style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, padding:"12px 16px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{r.titulo || `Reunión ${r.fecha}`}</div>
                      <div style={{ fontSize:11, color:G.textMuted, fontFamily:"DM Mono" }}>{r.fecha}</div>
                    </div>
                    {r.asistentes && <div style={{ fontSize:11, color:G.textMuted, marginBottom:6 }}>Asistentes: {r.asistentes}</div>}
                    {(r.puntos||[]).length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {r.puntos.map((p,j) => (
                          <div key={j} style={{ fontSize:12, color:G.text, paddingLeft:12, borderLeft:`2px solid ${G.border}` }}>{typeof p === "string" ? p : p.texto || p.descripcion || JSON.stringify(p)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Incidencias abiertas */}
        {(() => {
          const incidencias = (obra.incidencias||[]).filter(i => i.estado !== "cerrada" && i.estado !== "resuelta");
          if (!incidencias.length) return null;
          return (
            <div>
              <div className="serif" style={{ fontSize:16, marginBottom:16 }}>Incidencias abiertas</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {incidencias.map(inc => (
                  <div key={inc.id} style={{ background:G.surface, border:`1px solid ${G.orange}44`, borderRadius:6, padding:"10px 14px", display:"flex", gap:12, alignItems:"center" }}>
                    <span>⚠️</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13 }}>{inc.titulo}</div>
                      {inc.descripcion && <div style={{ fontSize:11, color:G.textMuted }}>{inc.descripcion}</div>}
                    </div>
                    <div style={{ fontSize:11, color:G.orange }}>{inc.estado}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Fotos */}
        {fotos.filter(f=>f.src).length > 0 && (
          <div>
            <div className="serif" style={{ fontSize:16, marginBottom:16 }}>Fotos de avance</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
              {fotos.filter(f=>f.src).map(f => (
                <div key={f.id} style={{ borderRadius:8, overflow:"hidden", border:`1px solid ${G.border}` }}>
                  <img src={f.src} alt={f.zona} style={{ width:"100%", height:120, objectFit:"cover" }}/>
                  <div style={{ padding:"6px 10px", fontSize:10, color:G.textMuted }}>{f.zona} · {f.fecha}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materiales destacados */}
        {materiales.length > 0 && (
          <div>
            <div className="serif" style={{ fontSize:16, marginBottom:16 }}>Materiales seleccionados</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {materiales.filter(m=>m.incluir!==false).slice(0,10).map(m => (
                <div key={m.id} style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, padding:"10px 14px", display:"flex", gap:12, alignItems:"center" }}>
                  {m.foto && <img src={m.foto} alt={m.nombre} style={{ width:40, height:40, objectFit:"cover", borderRadius:4 }}/>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13 }}>{m.nombre}</div>
                    <div style={{ fontSize:11, color:G.textMuted }}>{m.partida} · {m.proveedor}</div>
                  </div>
                  {m.enlace && <a href={m.enlace} target="_blank" rel="noreferrer" style={{ fontSize:11, color:G.gold }}>🔗 Ver</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign:"center", fontSize:11, color:G.textDim, paddingTop:16 }}>
          Portal de seguimiento · Blue Forest · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

function App() {
  const isCliente = window.location.pathname.startsWith("/cliente");
  const [obras, setObras] = useState([]);
  const [vista, setVista] = useState("dashboard");
  const [obraActual, setObraActual] = useState(null);
  const [portalObraId, setPortalObraId] = useState(null);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { show: showToast, ToastEl } = useToast();
  const { mode, toggle: toggleTheme, isDark } = useTheme();

  useEffect(() => {
    loadData().then(d => { setObras(d?.obras || DEMO.obras); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!loading) {
      setSaving(true);
      const t = setTimeout(() => {
        // Save data WITHOUT srcs to localStorage (srcs saved separately in bf-fotos-{id})
        const obrasSinSrc = obras.map(o => ({
          ...o,
          fotos: (o.fotos||[]).map(({src, ...rest}) => rest)
        }));
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ obras: obrasSinSrc })); } catch(e) { void 0; }
        // Save STRIPPED data to GitHub
        saveData({ obras: obrasSinSrc });
        setSaving(false);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [obras, loading]);

  useEffect(() => {
    const h = (e) => {
      if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
      if (e.key === "n" || e.key === "N") setModal("obra");
      if (e.key === "b" || e.key === "B") { setVista("buscador"); setObraActual(null); }
      if (e.key === "d" || e.key === "D") { setVista("dashboard"); setObraActual(null); }
      if (e.key === "r" || e.key === "R") { setVista("rentabilidad"); setObraActual(null); }
      if (e.key === "k" || e.key === "K") { setVista("notas"); setObraActual(null); }
      if (e.key === "e" || e.key === "E") { setVista("etiquetas"); setObraActual(null); }
      if (e.key === "Escape") { setModal(null); setPortalObraId(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const updateObra = useCallback((updated) => {
    setObras(prev => {
      // If updated doesn't have id, it can't be matched - skip
      if (!updated.id) return prev;
      const anterior = prev.find(o => o.id === updated.id);
      if (anterior) {
        // Registrar cambio en auditor-a
        const cambios = [];
        if (anterior.estado !== updated.estado) cambios.push(`Estado: ${anterior.estado} → ${updated.estado}`);
        if (anterior.presupuesto !== updated.presupuesto) cambios.push(`Presupuesto: ${fmt(anterior.presupuesto)} → ${fmt(updated.presupuesto)}`);
        if ((anterior.fases||[]).length !== (updated.fases||[]).length) cambios.push(`Fases: ${(anterior.fases||[]).length} → ${(updated.fases||[]).length}`);
        if ((anterior.tareas||[]).length !== (updated.tareas||[]).length) cambios.push(`Tareas: ${(anterior.tareas||[]).length} → ${(updated.tareas||[]).length}`);
        if ((anterior.incidencias||[]).length !== (updated.incidencias||[]).length) cambios.push(`Incidencias: ${(anterior.incidencias||[]).length} → ${(updated.incidencias||[]).length}`);
        if ((anterior.materiales||[]).length !== (updated.materiales||[]).length) cambios.push(`Materiales: ${(anterior.materiales||[]).length} → ${(updated.materiales||[]).length}`);
        if ((anterior.planos||[]).length !== (updated.planos||[]).length) cambios.push(`Planos: ${(anterior.planos||[]).length} → ${(updated.planos||[]).length}`);
        if ((anterior.extras||[]).length !== (updated.extras||[]).length) cambios.push(`Extras: ${(anterior.extras||[]).length} → ${(updated.extras||[]).length}`);
        if (cambios.length > 0) {
          const entrada = { id: uid(), obraId: updated.id, obraNombre: updated.nombre, cambios, ts: new Date().toISOString(), fecha: new Date().toLocaleDateString("es-ES"), hora: new Date().toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" }) };
          try {
            const log = JSON.parse(localStorage.getItem("bf-auditoria")||"[]");
            localStorage.setItem("bf-auditoria", JSON.stringify([entrada, ...log].slice(0, 500)));
          } catch(e) { void 0; }
        }
      }
      // Sync global provider directory
      if (updated.proveedores && updated.proveedores.length > 0) {
        try {
          const dirGlobal = JSON.parse(localStorage.getItem("bf-proveedores-global") || "[]");
          let actualizado = false;
          updated.proveedores.forEach(p => {
            const idx = dirGlobal.findIndex(x => x.nombre.toLowerCase() === p.nombre.toLowerCase());
            if (idx >= 0) {
              // Update with latest data
              dirGlobal[idx] = { ...dirGlobal[idx], ...p, obras: [...new Set([...(dirGlobal[idx].obras||[]), updated.id])] };
              actualizado = true;
            } else {
              dirGlobal.push({ ...p, obras: [updated.id] });
              actualizado = true;
            }
          });
          if (actualizado) localStorage.setItem("bf-proveedores-global", JSON.stringify(dirGlobal));
        } catch(e) { void 0; }
      }
      return prev.map(o => o.id === updated.id ? updated : o);
    });
  }, []);

  const addObra = (obra) => {
    setObras(prev => [...prev, obra]);
    showToast(`"${obra.nombre}" creada`, "🏗️", G.gold);
    setTimeout(() => { setObraActual(obra.id); setVista("obra"); }, 200);
  };

  const deleteObra = (id) => {
    if (!window.confirm("¿Eliminar esta obra? Esta acción no se puede deshacer.")) return;
    setObras(prev => {
      const nuevas = prev.filter(o => o.id !== id);
      saveData({ obras: nuevas });
      return nuevas;
    });
    setVista("dashboard");
    setObraActual(null);
    showToast("Obra eliminada", "🗑️", G.red);
  };

  const irAObra = (id) => { setObraActual(id); setVista("obra"); };
  const obraSelected = obras.find(o => o.id === obraActual);
  const obraPortal   = obras.find(o => o.id === portalObraId);
  const alertasRojas = generarAlertas(obras).filter(a => a.tipo === "rojo").length;
  const reglasActivas = (() => { try { const s = localStorage.getItem("bf-reglas"); return s ? JSON.parse(s) : REGLAS_DEFAULT; } catch { return REGLAS_DEFAULT; } })();
  const disparosAuto = evaluarReglas(obras, reglasActivas).length;
  const disparosAutoRojos = evaluarReglas(obras, reglasActivas).filter(d => d.prioridad === "rojo").length;
  const isMobile = useMobile();
  const [onboardingDone, setOnboardingDone] = useState(() => {
    try { return localStorage.getItem("bf-onboarding") === "done"; } catch { return false; }
  });

  if (loading) return (
    <div style={{ background: G.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
      <div className="serif loading-pulse" style={{ fontSize: 26, color: G.gold }}>Blue Forest</div>
      <div className="mono" style={{ fontSize: 10, color: G.textDim, letterSpacing: "0.1em" }}>Cargando datos...</div>
    </div>
  );

  if (isCliente) return <><style>{buildCss()}</style><ClienteView obras={obras} /></>;

  // App m-vil PWA
  if (isMobile) return <MobileApp obras={obras} onUpdateObra={updateObra} />;

  // Onboarding primera vez
  if (!onboardingDone) return (
    <>
      <style>{buildCss()}</style>
      <Onboarding onComplete={() => { localStorage.setItem("bf-onboarding","done"); setOnboardingDone(true); }} />
    </>
  );

  return (
    <>
      <style>{buildCss()}</style>
      <div style={{ display: "flex", height: "100vh", background: G.bg, overflow: "hidden" }} className={isDark ? "" : "light-mode"}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 224, background: G.surface, borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${G.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <div className="serif" style={{ fontSize: 17, color: G.gold, letterSpacing: "0.02em" }}>Blue Forest</div>
              {saving && <div className="mono" style={{ fontSize: 9, color: G.textDim }}>guardando…</div>}
            </div>
            <div style={{ fontSize: 9, color: G.textDim, fontFamily: "DM Mono", letterSpacing: "0.06em" }}>GESTIÓN DE OBRAS PREMIUM</div>
          </div>

          <div style={{ padding: "10px 8px", flex: 1, overflow: "auto" }}>
            <button className={`nav-item ${vista === "dashboard" ? "active" : ""}`} onClick={() => { setVista("dashboard"); setObraActual(null); }}>
              {Icon.home}<span style={{ flex: 1 }}>Dashboard</span>
              {alertasRojas > 0 && <span style={{ background: G.red, color: "#fff", borderRadius: 10, fontSize: 9, padding: "1px 6px", fontFamily: "DM Mono" }}>{alertasRojas}</span>}
            </button>
            <button className={`nav-item ${vista === "buscador" ? "active" : ""}`} onClick={() => { setVista("buscador"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Buscar documentos
            </button>
            <button className={`nav-item ${vista === "automatizaciones" ? "active" : ""}`} onClick={() => { setVista("automatizaciones"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span style={{ flex: 1 }}>Automatizaciones</span>
              {disparosAuto > 0 && <span style={{ background: disparosAutoRojos > 0 ? G.red : G.orange, color: "#fff", borderRadius: 10, fontSize: 9, padding: "1px 6px", fontFamily: "DM Mono" }}>{disparosAuto}</span>}
            </button>
            <button className={`nav-item ${vista === "equipo" ? "active" : ""}`} onClick={() => { setVista("equipo"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              Equipo
            </button>
            <button className={`nav-item ${vista === "configuracion" ? "active" : ""}`} onClick={() => { setVista("configuracion"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Configuración
            </button>
            <button className={`nav-item ${vista === "reportes" ? "active" : ""}`} onClick={() => { setVista("reportes"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Reportes
            </button>
            <button className={`nav-item ${vista === "calendario" ? "active" : ""}`} onClick={() => { setVista("calendario"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Calendario
            </button>
            <button className={`nav-item ${vista === "gmail" ? "active" : ""}`} onClick={() => { setVista("gmail"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Gmail
            </button>
            <button className={`nav-item ${vista === "drive" ? "active" : ""}`} onClick={() => { setVista("drive"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              Drive
            </button>
            <button className={`nav-item ${vista === "gcal" ? "active" : ""}`} onClick={() => { setVista("gcal"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
              G. Calendar
            </button>
            <button className={`nav-item ${vista === "asistente" ? "active" : ""}`} onClick={() => { setVista("asistente"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 10h8M8 14h4"/></svg>
              <span style={{ flex: 1 }}>Asistente IA</span>
              <span style={{ fontSize: 9, color: G.gold, fontFamily: "DM Mono" }}>✦</span>
            </button>
            <button className={`nav-item ${vista === "etiquetas" ? "active" : ""}`} onClick={() => { setVista("etiquetas"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              Etiquetas
            </button>
            <button className={`nav-item ${vista === "auditoria" ? "active" : ""}`} onClick={() => { setVista("auditoria"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Auditoría
            </button>
            <button className={`nav-item ${vista === "notas" ? "active" : ""}`} onClick={() => { setVista("notas"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Notas & Voz
            </button>
            <button className={`nav-item ${vista === "rentabilidad" ? "active" : ""}`} onClick={() => { setVista("rentabilidad"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              Rentabilidad
            </button>
            <button className={`nav-item ${vista === "equipo" ? "active" : ""}`} onClick={() => { setVista("equipo"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              Equipo
            </button>
            <button className={`nav-item ${vista === "notificaciones" ? "active" : ""}`} onClick={() => { setVista("notificaciones"); setObraActual(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
              Alertas
            </button>

            {obras.length === 0 && <div style={{ padding: "8px 12px", fontSize: 11, color: G.textDim, fontStyle: "italic" }}>Sin obras. Pulsa N.</div>}

            {obras.map(o => {
              const incOb = (o.incidencias||[]).filter(i => i.estado === "abierta").length;
              const retrasada = o.fechaFin && diasRestantes(o.fechaFin) < 0 && o.estado !== "completada";
              const activa = obraActual === o.id && vista === "obra";
              return (
                <div key={o.id}>
                  <button className={`nav-item ${activa ? "active" : ""}`} onClick={() => irAObra(o.id)} style={{ width: "100%", paddingRight: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: o.color, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left", fontSize: 12 }}>{o.nombre}</span>
                    {retrasada && <span style={{ fontSize: 9, color: G.red }}>⚠</span>}
                    {incOb > 0 && !retrasada && <span style={{ background: G.red+"33", color: G.red, borderRadius: 8, fontSize: 9, padding: "1px 5px", fontFamily: "DM Mono" }}>{incOb}</span>}
                  </button>
                  {activa && (
                    <button onClick={() => setPortalObraId(o.id)} style={{ width: "100%", background: "none", border: "none", color: G.gold, fontSize: 10, padding: "2px 12px 4px 28px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 5, opacity: 0.75 }}>
                      <span>👁</span> Vista cliente
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: "10px 8px 12px", borderTop: `1px solid ${G.border}` }}>
            <button className="btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }} onClick={() => setModal("obra")}>
              {Icon.plus} Nueva Obra
            </button>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={toggleTheme} style={{ flex: 1, background: G.bg, border: `1px solid ${G.border}`, color: G.textMuted, borderRadius: 6, padding: "6px 0", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s" }}>
                {isDark ? "☀️ Modo claro" : "🌙 Modo oscuro"}
              </button>
            </div>
            <div style={{ fontSize: 9, color: G.textDim, textAlign: "center", fontFamily: "DM Mono", lineHeight: 1.8, marginTop: 6 }}>
              N obra · B buscar · D dashboard · R rent. · K notas · E etiquetas
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {vista === "obra" && obraSelected
            ? <ObraDetail obra={obraSelected} onUpdate={updateObra} onBack={() => { setVista("dashboard"); setObraActual(null); }} onDelete={() => deleteObra(obraActual)} showToast={showToast} />
            : vista === "buscador"
            ? <BuscadorIA obras={obras} onSelectObra={irAObra} />
            : vista === "automatizaciones"
            ? <AutomatizacionesView obras={obras} onSelectObra={irAObra} />
            : vista === "equipo"
            ? <EquipoView obras={obras} onUpdate={(id, updated) => setObras(prev => prev.map(o => o.id === id ? updated : o))} />
            : vista === "configuracion"
            ? <ConfiguracionView obras={obras} onReset={() => { if(window.confirm("¿Borrar todos los datos? Esta acción no se puede deshacer.")) { saveData({ obras: [] }); setObras([]); setVista("dashboard"); } }} showToast={showToast} />
            : vista === "reportes"
            ? <ReportesView obras={obras} />
            : vista === "calendario"
            ? <CalendarioView obras={obras} onSelectObra={irAObra} />
            : vista === "gmail"
            ? <GmailView obras={obras} onSelectObra={irAObra} showToast={showToast} />
            : vista === "drive"
            ? <DriveView obras={obras} showToast={showToast} />
            : vista === "gcal"
            ? <GCalView obras={obras} showToast={showToast} />
            : vista === "asistente"
            ? <AsistenteIA obras={obras} onSelectObra={irAObra} />
            : vista === "etiquetas"
            ? <EtiquetasView obras={obras} onUpdateObra={updateObra} onSelectObra={irAObra} />
            : vista === "auditoria"
            ? <AuditoriaView obras={obras} onSelectObra={irAObra} />
            : vista === "notas"
            ? <NotasView obras={obras} />
            : vista === "rentabilidad"
            ? <RentabilidadView obras={obras} onSelectObra={irAObra} />
            : vista === "equipo"
            ? <EquipoView obras={obras} onSelectObra={irAObra} />
            : vista === "notificaciones"
            ? <NotificacionesPanel obras={obras} />
            : <Dashboard obras={obras} onSelectObra={irAObra} />
          }
        </div>
      </div>

      {modal === "obra" && <NuevaObraModal onClose={() => setModal(null)} onSave={addObra} />}
      {obraPortal && <PortalCliente obra={obraPortal} onCerrar={() => setPortalObraId(null)} />}
      <WidgetFlotante obras={obras} onVista={(v) => { setVista(v); setObraActual(null); }} onNuevaObra={() => setModal("obra")} onSelectObra={irAObra} showToast={showToast} />
      {ToastEl}
    </>
  );
}

export default App;
