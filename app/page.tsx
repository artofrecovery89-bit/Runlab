"use client";

interface RunLabReport {
  user: {
    name?: string;
    age?: number;
    gender?: string;
  };

  staticAnalysis: {
    shoulderTilt: number;
    pelvicTilt: number;
    kneeValgus: number;
    footRotation: number;
    forwardHead: number;
  };

  dynamicAnalysis: {
    kneeAngle: number;
    hipDrop: number;
    overstride: number;
    score: number;
  };

  officeSyndrome: {
    risk: number;
    level: string;
  };

  injuryRisk: {
    runnersKnee: number;
    achilles: number;
    itBand: number;
    shinSplints: number;
  };

  clinicalReport: {
 overallScore: number

 movementQuality: string

 primaryRisk: {
   condition: string
   risk: number
 }

 keyFindings: string[]

 rootCauses: string[]

 correctiveExercises: string[]

 runningRecommendations: string[]

 nextAction: string

 coachComment: string
}
}
// import PdfReport from "./components/PdfReport";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";

const SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js",
];

let scriptsPromise: Promise<void[]> | null = null;
function ensureScripts() {
  if (scriptsPromise) return scriptsPromise;
  scriptsPromise = Promise.all(
    SCRIPTS.map(
      (src) =>
        new Promise<void>((res) => {
          if (typeof window !== "undefined" && document.querySelector(`script[src="${src}"]`)) return res();
          const s = document.createElement("script");
          s.src = src;
          s.crossOrigin = "anonymous";
          s.onload = () => res();
          s.onerror = () => res();
          document.head.appendChild(s);
        })
    )
  );
  return scriptsPromise;
}

/// 1. ฟังก์ชันคำนวณมุมมาตรฐาน (ใช้ได้กับทุกท่า)
const calcAngle = (a: any, b: any, c: any) => {
  if (!a || !b || !c) return 0;
  const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((rad * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
};

// 2. ฟังก์ชันวัดมุมคอ (Forward Head)
const calcHeadAngle = (ear: any, shoulder: any) => {
  if (!ear || !shoulder) return 0;
  const rad = Math.atan2(ear.x - shoulder.x, ear.y - shoulder.y);
  return Math.abs((rad * 180) / Math.PI);
};

// 3. ฟังก์ชันประเมินความเสี่ยง (รวมในตัวเดียว)
const getPostureRisk = (headAngle: number) => {
  if (headAngle > 20) return { level: 'High', color: 'red', msg: 'เสี่ยงออฟฟิศซินโดรมระดับสูง' };
  if (headAngle > 10) return { level: 'Medium', color: 'orange', msg: 'ควรปรับท่านั่ง' };
  return { level: 'Low', color: 'green', msg: 'ท่าทางปกติ' };
};
const calculateOfficeRisk = (
  forwardHead: number,
  shoulderTilt: number,
  pelvicTilt: number
) => {
  const headScore =
    forwardHead > 30
      ? 100
      : forwardHead > 20
      ? 75
      : forwardHead > 10
      ? 50
      : 10;

  const shoulderScore =
    shoulderTilt > 10
      ? 100
      : shoulderTilt > 5
      ? 60
      : 20;

  const pelvicScore =
    pelvicTilt > 10
      ? 100
      : pelvicTilt > 5
      ? 60
      : 20;

  const risk = Math.round(
    headScore * 0.5 +
    shoulderScore * 0.3 +
    pelvicScore * 0.2
  );

  const level =
    risk >= 70
      ? "HIGH"
      : risk >= 40
      ? "MEDIUM"
      : "LOW";

  return { risk, level };
};
const POSE_CONNECTIONS = [
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 12], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31],
  [24, 26], [26, 28], [28, 30], [28, 32],
];



const analyzePostureRisk = (landmarks: any) => {
  if (!landmarks) return { level: 'N/A', msg: 'ไม่พบข้อมูล' };
  const headAngle = calcHeadAngle(landmarks[7], landmarks[11]);
  if (headAngle > 20) return { level: 'High', color: 'red', msg: 'เสี่ยงออฟฟิศซินโดรมระดับสูง' };
  if (headAngle > 10) return { level: 'Medium', color: 'orange', msg: 'ควรปรับท่านั่ง' };
  return { level: 'Low', color: 'green', msg: 'ท่าทางปกติ' };
};
// -------------------------
function drawPoseSkeleton(ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number) {
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 3;
  for (const [start, end] of POSE_CONNECTIONS) {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    if (!p1 || !p2 || p1.visibility < 0.5 || p2.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * w, p1.y * h);
    ctx.lineTo(p2.x * w, p2.y * h);
    ctx.stroke();
  }
  for (const pt of landmarks) {
    if (!pt || pt.visibility < 0.5) continue;
    ctx.beginPath();
    ctx.arc(pt.x * w, pt.y * h, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#0066ff";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function Ring({ v = 0, size = 110 }) {
  const r = 40, c = 2 * Math.PI * r, d = (v / 100) * c;
  const highestRisk = Object.entries(injuryRisks).sort(
  (a, b) => b[1] - a[1]
)[0];

const riskNameMap: Record<string, string> = {
  runnersKnee: "Runner's Knee",
  achilles: "Achilles Tendon",
  itBand: "IT Band Syndrome",
  shinSplints: "Shin Splints",
};

const movementQuality =
  stableScore >= 85
    ? "Excellent"
    : stableScore >= 70
    ? "Good"
    : stableScore >= 50
    ? "Moderate"
    : "Poor";

const riskColor =
  stableRiskLevel === "HIGH"
    ? "#ef4444"
    : stableRiskLevel === "MEDIUM"
    ? "#f59e0b"
    : "#10b981";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="url(#cyanGrad)" strokeWidth="8"
        strokeDasharray={`${d} ${c}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray .8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      <defs>
        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#0066ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Bar({ label, value, color = "#00e5ff" }: { label: string; value: number; color?: string }) {
  return (
   <div
  style={{
    background:
      "linear-gradient(145deg,#08101f 0%,#0f172a 100%)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 32,
    padding: 36,
    position: "relative",
    overflow: "hidden",
    boxShadow:
      "0 25px 60px rgba(0,0,0,.35)",
  }}
>
  {/* Glow */}
  <div
    style={{
      position: "absolute",
      top: -120,
      right: -120,
      width: 250,
      height: 250,
      borderRadius: "50%",
      background:
        "radial-gradient(circle,#00e5ff33,transparent)",
      pointerEvents: "none",
    }}
  />

  <div
    style={{
      fontSize: 12,
      letterSpacing: 2,
      fontWeight: 800,
      color: "#64748b",
      marginBottom: 24,
    }}
  >
    AI ASSESSMENT DASHBOARD
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 1,
          color: "#00e5ff",
        }}
      >
        {stableScore}
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#e2e8f0",
          marginTop: 8,
        }}
      >
        {movementQuality} Movement Quality
      </div>
    </div>

    <Ring v={stableScore} size={130} />
  </div>

  <div
    style={{
      display: "inline-flex",
      padding: "8px 14px",
      borderRadius: 999,
      background: `${riskColor}20`,
      color: riskColor,
      fontSize: 12,
      fontWeight: 800,
      marginBottom: 24,
    }}
  >
    {stableRiskLevel} RISK
  </div>

  <div
    style={{
      borderTop: "1px solid #1e293b",
      paddingTop: 20,
      marginTop: 10,
    }}
  >
    <Bar
      label="Pelvic Control"
      value={subMetrics.hip}
      color="#f59e0b"
    />

    <Bar
      label="Knee Alignment"
      value={subMetrics.knee}
      color="#10b981"
    />

    <Bar
      label="Mobility"
      value={subMetrics.mob}
      color="#3b82f6"
    />

    <Bar
      label="Balance"
      value={subMetrics.bal}
      color="#a855f7"
    />
  </div>

  <div
    style={{
      marginTop: 20,
      padding: 18,
      background: "#040914",
      border: "1px solid #1e293b",
      borderRadius: 16,
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#64748b",
        fontWeight: 700,
        marginBottom: 8,
      }}
    >
      HIGHEST INJURY RISK
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {riskNameMap[highestRisk[0]]}
      </div>

      <div
        style={{
          color:
            highestRisk[1] > 70
              ? "#ef4444"
              : highestRisk[1] > 40
              ? "#f59e0b"
              : "#10b981",
          fontWeight: 900,
          fontSize: 24,
        }}
      >
        {highestRisk[1]}%
      </div>
    </div>
  </div>
</div>
  );
}

function RiskCard({ title, pct, desc }: { title: string; pct: number; desc: string }) {
  const level = pct > 70 ? "ความเสี่ยงสูง" : pct > 40 ? "ความเสี่ยงปานกลาง" : "ความเสี่ยงต่ำ";
  const color = pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#10b981";
  const bgGlow = pct > 70 ? "rgba(239,68,68,0.03)" : pct > 40 ? "rgba(245,158,11,0.03)" : "rgba(16,185,129,0.03)";
function OfficeRiskCard({
  risk,
  level,
}: {
  risk: number;
  level: string;
}) {
  const color =
    level === "HIGH"
      ? "#ef4444"
      : level === "MEDIUM"
      ? "#f59e0b"
      : "#10b981";

  return (
    <div
      style={{
        background:
          "linear-gradient(145deg,#08101f,#111c31)",
        borderRadius: 24,
        padding: 24,
        border: `1px solid ${color}30`,
      }}
    >
      <div
        style={{
          color,
          fontSize: 12,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        OFFICE SYNDROME RISK
      </div>

      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color,
        }}
      >
        {risk}%
      </div>

      <div
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {level} RISK
      </div>

      <div
        style={{
          marginTop: 12,
          color: "#94a3b8",
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        ความเสี่ยงต่ออาการคอยื่น
        ไหล่ห่อ และปวดหลังจากการนั่งทำงาน
      </div>
    </div>
  );
}
  return (
    <div style={{ background: "#0b1528", border: `1px solid ${color}26`, borderRadius: 16, padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: `0 4px 20px ${bgGlow}` }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: 1.2, background: `${color}15`, padding: "3px 8px", borderRadius: 6 }}>{level}</span>
          <span style={{ fontSize: 24, fontWeight: 900, color }}>{pct}<span style={{ fontSize: 13, fontWeight: 500 }}>%</span></span>
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{title}</h4>
        <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 12 }}>{desc}</p>
      </div>
      <a href="#recovery-programs" style={{ width: "100%", fontSize: 12, color: "#00e5ff", background: "#112240", border: "1px solid #1e3a8a", borderRadius: 10, padding: "8px 0", cursor: "pointer", fontWeight: 600, textAlign: "center", textDecoration: "none" }}>
        ดูโปรแกรมฟื้นฟู
      </a>
    </div>
  );
}

function Stat({ label, val, color }: { label: string; val: string | number | null; color?: string }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #0b1528 0%, #070d19 100%)", border: "1px solid #1e293b", borderRadius: 16, padding: "16px 20px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
      <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{val ?? "—"}</div>
    </div>
  );
}
interface RunLabReport {
  user: {
    name?: string;
    age?: number;
    gender?: string;
  };

  staticAnalysis: {
    shoulderTilt: number;
    pelvicTilt: number;
    kneeValgus: number;
    footRotation: number;
    forwardHead: number;
  };

  dynamicAnalysis: {
    kneeAngle: number;
    hipDrop: number;
    overstride: number;
    score: number;
  };

  officeSyndrome: {
    risk: number;
    level: string;
  };

  injuryRisk: {
    runnersKnee: number;
    achilles: number;
    itBand: number;
    shinSplints: number;
  };

  summary: {
    score: number;
    riskLevel: string;
    diagnosis: string;
    recommendation: string;
    analysisSummary: string;
  };
}
interface PoseSlotProps {
  label: string;
  preview: string;
  onFile: (f: File) => void;
  onClear: () => void;
}

function PoseSlot({ label, preview, onFile, onClear }: PoseSlotProps) {
  return (
    <div style={{ position: "relative", border: "2px dashed #223554", borderRadius: 16, padding: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#050c1a", height: 160 }}>
      {preview ? (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <img src={preview} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
          <button onClick={(e) => { e.preventDefault(); onClear(); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(239, 68, 68, 0.9)", color: "#fff", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            ✕ เปลี่ยนรูป
          </button>
        </div>
      ) : (
        <label style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 6 }}>
          <div style={{ fontSize: 28 }}>🧍</div>
          <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 11, color: "#475569" }}>คลิกเพื่ออัปโหลด</div>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </label>
      )}
    </div>
  );
}

/* INTERACTIVE ANATOMY COMPONENT (SVG-BASED WITH DYNAMIC PULSE GLOW) */
function InteractiveAnatomy({ risks }: { risks: { runnersKnee: number; achilles: number; itBand: number; shinSplints: number } }) {
  const getJointColor = (pct: number) => {
    if (pct === 0) return "#00e5ff";
    return pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#10b981";
  };

  return (
    <div style={{ background: "#060d1a", border: "1px solid #1e293b", borderRadius: 24, padding: "24px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 520, boxShadow: "inset 0 0 40px rgba(0,229,255,0.02)" }}>
      {/* CSS Animation Keyframes Injector */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulseGlow {
          0% { r: 6; opacity: 0.5; stroke-width: 1; }
          50% { r: 16; opacity: 0.8; stroke-width: 4; }
          100% { r: 26; opacity: 0; stroke-width: 1; }
        }
        .glow-circle { animation: pulseGlow 1.6s infinite ease-out; transform-box: fill-box; transform-origin: center; }
      `}} />

      <div style={{ position: "absolute", top: 20, left: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#00e5ff", letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e5ff", display: "inline-block" }} />
          LIVE BIO-MECHANICAL MODEL
        </div>
        <p style={{ fontSize: 11, color: "#475569", margin: "4px 0 0" }}>แบบจำลองชี้เป้าความเค้นสะสมตามค่าวิเคราะห์ AI</p>
      </div>

      {/* SVG RUNNER SKELETON */}
      <svg width="100%" height="420" viewBox="0 0 240 400" style={{ marginTop: 20 }}>
        <defs>
          <linearGradient id="boneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid Lines */}
        <line x1="20" y1="200" x2="220" y2="200" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />
        <line x1="120" y1="40" x2="120" y2="360" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />

        {/* Human Silhouette Wireframe */}
        <g stroke="#1e293b" strokeWidth="1" fill="none" opacity="0.6">
          <circle cx="120" cy="65" r="18" stroke="#223554" strokeWidth="1.5" />
          <path d="M120,83 L120,160 M100,100 L140,100 M100,100 L90,150 M140,100 L150,145" strokeWidth="1.5" />
        </g>

        {/* MAIN RUNNING BONES */}
        <line x1="120" y1="130" x2="120" y2="170" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
        <line x1="120" y1="170" x2="90" y2="185" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
        <line x1="90" y1="185" x2="80" y2="265" stroke="url(#boneGrad)" strokeWidth="6" strokeLinecap="round" />
        <line x1="80" y1="265" x2="110" y2="340" stroke="url(#boneGrad)" strokeWidth="5" strokeLinecap="round" />
        <line x1="110" y1="340" x2="135" y2="345" stroke="#475569" strokeWidth="4" strokeLinecap="round" />

        {/* Right Leg (Background / Support Leg) */}
        <line x1="120" y1="170" x2="140" y2="190" stroke="#1e293b" strokeWidth="4" />
        <line x1="140" y1="190" x2="155" y2="255" stroke="#1e293b" strokeWidth="4" />
        <line x1="155" y1="255" x2="140" y2="320" stroke="#1e293b" strokeWidth="3" />

        {/* DYNAMIC RISK POINTERS & INTERACTIVE DOTS */}

        {/* 1. IT BAND RISK */}
        <g>
          <circle cx="90" cy="185" r="14" fill="none" stroke={getJointColor(risks.itBand)} className="glow-circle" />
          <circle cx="90" cy="185" r="7" fill={getJointColor(risks.itBand)} stroke="#fff" strokeWidth="1.5" filter="url(#glowEffect)" />
          <path d="M90,185 L35,160 L15,160" stroke="#223554" strokeWidth="1" fill="none" />
          <text x="15" y="152" fill={getJointColor(risks.itBand)} fontSize="11" fontWeight="700">IT BAND (สะโพกเอียง): {risks.itBand}%</text>
        </g>

        {/* 2. RUNNER'S KNEE RISK */}
        <g>
          <circle cx="80" cy="265" r="14" fill="none" stroke={getJointColor(risks.runnersKnee)} className="glow-circle" />
          <circle cx="80" cy="265" r="8" fill={getJointColor(risks.runnersKnee)} stroke="#fff" strokeWidth="2" filter="url(#glowEffect)" />
          <path d="M80,265 L35,265 L15,265" stroke="#223554" strokeWidth="1" fill="none" />
          <text x="15" y="257" fill={getJointColor(risks.runnersKnee)} fontSize="11" fontWeight="700">สะบ้าเข่า (Knee Valgus): {risks.runnersKnee}%</text>
        </g>

        {/* 3. SHIN SPLINTS RISK */}
        <g>
          <circle cx="92" cy="298" r="12" fill="none" stroke={getJointColor(risks.shinSplints)} className="glow-circle" />
          <circle cx="92" cy="298" r="6" fill={getJointColor(risks.shinSplints)} stroke="#fff" strokeWidth="1.5" filter="url(#glowEffect)" />
          <path d="M92,298 L160,298 L180,315" stroke="#223554" strokeWidth="1" fill="none" />
          <text x="155" y="290" fill={getJointColor(risks.shinSplints)} fontSize="11" fontWeight="700" textAnchor="middle">หน้าแข้ง: {risks.shinSplints}%</text>
        </g>

        {/* 4. ACHILLES TENDONITIS RISK */}
        <g>
          <circle cx="110" cy="340" r="14" fill="none" stroke={getJointColor(risks.achilles)} className="glow-circle" />
          <circle cx="110" cy="340" r="7" fill={getJointColor(risks.achilles)} stroke="#fff" strokeWidth="1.5" filter="url(#glowEffect)" />
          <path d="M110,340 L165,340 L190,360" stroke="#223554" strokeWidth="1" fill="none" />
          <text x="180" y="333" fill={getJointColor(risks.achilles)} fontSize="11" fontWeight="700" textAnchor="middle">เอ็นร้อยหวาย: {risks.achilles}%</text>
        </g>
      </svg>

      {/* Color Guide Legends */}
      <div style={{ display: "flex", gap: 16, marginTop: 16, background: "rgba(4,9,20,0.6)", padding: "8px 16px", borderRadius: 10, border: "1px solid #1e293b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#94a3b8" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} /> เสี่ยงต่ำ (&lt;40%)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#94a3b8" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} /> เสี่ยงปานกลาง (40-70%)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#94a3b8" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} /> วิกฤต (&gt;70%)
        </div>
      </div>
    </div>
  );
}

export default function RunLabPremiumSystem() {

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };

  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const poseRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const captureFrame = () => {
  if (!videoRef.current) return;

  const canvas = document.createElement("canvas");

  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  ctx.drawImage(
    videoRef.current,
    0,
    0,
    canvas.width,
    canvas.height
  );
const imageData = canvas.toDataURL("image/png");

console.log("CAPTURED", imageData);

setCapturedImage(imageData);
};
 

  const framesCount = useRef<number>(0);
  const maxLockedKnee = useRef<number>(156);
  const maxLockedDrop = useRef<number>(3);
  const maxLockedOverstride = useRef<number>(8.5);

  const [postureMetrics, setPostureMetrics] = useState({
    shoulderTilt: 0, pelvicTilt: 0, kneeValgus: 0, footRotation: 0, forwardHead: 0,
  });

  const [postureAnalyzed, setPostureAnalyzed] = useState(false);
  const [videoURL, setVideoURL] = useState("");
  const [postureImages, setPostureImages] = useState({ front: "", side: "", back: "" });

  // DEMO INITIAL STATE
  const [officeRisk, setOfficeRisk] = useState(0);
const [officeLevel, setOfficeLevel] = useState("LOW");
  const [stableScore, setStableScore] = useState<number>(0);
  const [stableRiskLevel, setStableRiskLevel] = useState<string>("MEDIUM");
  const [aiReport, setAiReport] = useState({
  executiveSummary: "",
  rootCause: "",
  recommendation: "",
  runningAdvice: "",
});
const [primaryRiskData, setPrimaryRiskData] = useState({
  name: "",
  value: 0,
});
const [confidenceScore, setConfidenceScore] = useState(0);
  const [stableKneeAngle, setStableKneeAngle] = useState<number | null>(164);
  const [stableHipDrop, setStableHipDrop] = useState<number | null>(0);

const [reportData, setReportData] =
  useState<RunLabReport | null>(null);


  const [capturedImage, setCapturedImage] =
  useState<string>("");
  const [injuryRisks, setInjuryRisks] = useState({ runnersKnee: 78, achilles: 24, itBand: 64, shinSplints: 15 });
  const [subMetrics, setSubMetrics] = useState({ eff: 82, hip: 64, knee: 72, mob: 72, bal: 68 });

  const [diagnosis, setDiagnosis] = useState("Runner's Knee (สะบ้าเข่าอักเสบ)");
  const [recommendation, setRecommendation] = useState("เสริมสร้างกล้ามเนื้อหน้าขาด้านใน เลี่ยงการก้าวขาแล้วล็อกเข่าตึง และยืดคลายกล้ามเนื้อข้างขาหลังซ้อม");
  const [analysisSummary, setAnalysisSummary] = useState("ตัวอย่างโมเดลเริ่มต้น: พบมุมองศาเข่าคงค้างขณะรับแรงบิดแคบลงร่วมกับมีสภาวะแกนเชิงกรานเอียง (Pelvic Tilt) ขณะก้าววิ่งน้ำหนักเสริมกระแทก");

  const [slipImage, setSlipImage] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState({
    name: "PRO-KNEE",
    price: 1490,
  });
  const riskColor = stableRiskLevel === "HIGH" ? "#ef4444" : stableRiskLevel === "MEDIUM" ? "#f59e0b" : stableRiskLevel === "LOW" ? "#10b981" : "#475569";

  useEffect(() => {
    ensureScripts();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (poseRef.current) { try { poseRef.current.close(); } catch (_) { } }
    };
  }, []);
const analyzeImage = async (imageSrc: string) => {

  await ensureScripts();

  const Pose = (window as any).Pose;

  return new Promise<any>((resolve) => {

    const img = new window.Image();

    img.src = imageSrc;
 img.onerror = () => {
      console.error("Image load failed");
      resolve(null);
    };
    img.onload = async () => {

      const pose = new Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: any) => {
if (!capturedImage && canvasRef.current) {
  const image =
    canvasRef.current.toDataURL("image/png");

  setCapturedImage(image);
}
  resolve(results.poseLandmarks || null);

});

      await pose.send({ image: img });
    };
  });
};
const processStaticPosture = async () => {

  if (
    !postureImages.front &&
    !postureImages.side &&
    !postureImages.back
  ) {
    alert("กรุณาอัปโหลดรูปท่ายืนเพื่อคำนวณครับ");
    return;
  }

  try {

    let frontLandmarks = null;
    let sideLandmarks = null;
    let backLandmarks = null;

  let shoulderTilt = 0;
let pelvicTilt = 0;
let kneeValgus = 0;
let footRotation = 0;
let forwardHead = 0;

   
    // if (postureImages.front) {
//   frontLandmarks = await analyzeImage(postureImages.front);
// }

// if (postureImages.side) {
//   sideLandmarks = await analyzeImage(postureImages.side);
// }

// if (postureImages.back) {
//   backLandmarks = await analyzeImage(postureImages.back);
// }

    console.log("front image", postureImages.front);
console.log("side image", postureImages.side);
console.log("back image", postureImages.back);
// Shoulder Tilt
if (frontLandmarks) {
  shoulderTilt =
    Math.abs(
      frontLandmarks[11].y -
      frontLandmarks[12].y
    ) * 100;
}

// Pelvic Tilt
if (backLandmarks) {
  pelvicTilt =
    Math.abs(
      backLandmarks[23].y -
      backLandmarks[24].y
    ) * 100;
}

// Forward Head
if (sideLandmarks) {
  forwardHead = calcHeadAngle(
    sideLandmarks[7],
    sideLandmarks[11]
  );
}

// Knee Valgus
if (frontLandmarks) {
  kneeValgus =
    Math.abs(
      calcAngle(
        frontLandmarks[23],
        frontLandmarks[25],
        frontLandmarks[27]
      ) - 180
    ) / 2;
}
// Foot Rotation
if (backLandmarks) {
  footRotation =
    Math.abs(
      backLandmarks[31].x -
      backLandmarks[32].x
    ) * 100;
}
   
setPostureMetrics({
  shoulderTilt,
  pelvicTilt,
  kneeValgus,
  footRotation,
  forwardHead,
});

const officeResult =
  calculateOfficeRisk(
  forwardHead,
  shoulderTilt,
  pelvicTilt
)

setOfficeRisk(
  officeResult.risk
);

setOfficeLevel(
  officeResult.level
);
setPostureAnalyzed(true);

console.log({
  shoulderTilt,
  pelvicTilt,
  kneeValgus,
  footRotation,
  forwardHead,
});// คำนวณค่าต่างๆ ต่อ

  } catch (err) {

    console.error(err);

  }
};


  const startPose = useCallback(async () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (poseRef.current) { try { poseRef.current.close(); } catch (_) { } poseRef.current = null; }

    await ensureScripts();
    const Pose = (window as any).Pose;
    if (!Pose) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pose = new Pose({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
    });
    poseRef.current = pose;

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    pose.onResults((results: any) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        const lm = results.poseLandmarks;
        framesCount.current += 1;

        drawPoseSkeleton(ctx, lm, canvas.width, canvas.height);

        const currentKnee = calcAngle(lm[24], lm[26], lm[28]);
        const currentDropRaw = Math.abs(lm[23].y - lm[24].y) * 180;
        const currentOverstrideRaw = Math.abs(lm[28].x - lm[24].x) * 100;

        if (framesCount.current > 30) {
          if (currentKnee > 120 && currentKnee < maxLockedKnee.current) {
            maxLockedKnee.current = currentKnee;
          }
          if (currentDropRaw < 12 && currentDropRaw > maxLockedDrop.current) {
            maxLockedDrop.current = parseFloat(currentDropRaw.toFixed(1));
          }
          if (currentOverstrideRaw < 25 && currentOverstrideRaw > maxLockedOverstride.current) {
            maxLockedOverstride.current = parseFloat(currentOverstrideRaw.toFixed(1));
          }
        }

        const finalKneeAngle = maxLockedKnee.current;
        const finalPelvicDrop = maxLockedDrop.current;
        const finalOverstride = maxLockedOverstride.current;

        const kneeDiff = 160 - finalKneeAngle;
        const calcKneeRisk = Math.min(95, Math.max(15, (kneeDiff > 0 ? kneeDiff * 2.8 : 15) + (postureMetrics.kneeValgus * 2.2)));
        const calcItbRisk = Math.min(95, Math.max(12, (finalPelvicDrop * 12) + (postureMetrics.pelvicTilt * 2.5)));
        const baseOverstrideRisk = finalOverstride > 10 ? (finalOverstride - 10) * 6 : 5;
        const calcAchillesRisk = Math.min(95, Math.max(10, baseOverstrideRisk + (postureMetrics.footRotation * 2.5)));
        const calcShinRisk = Math.min(95, Math.max(10, (baseOverstrideRisk * 1.2) + (postureMetrics.footRotation * 3.0)));

        const computedRisks = {
          runnersKnee: Math.round(calcKneeRisk),
          achilles: Math.round(calcAchillesRisk),
          itBand: Math.round(calcItbRisk),
          shinSplints: Math.round(calcShinRisk),
        };
        setInjuryRisks(computedRisks);

        const maxRiskValue = Math.max(computedRisks.runnersKnee, computedRisks.achilles, computedRisks.itBand, computedRisks.shinSplints);
        const coreScore = Math.min(98, Math.max(40, 100 - (maxRiskValue * 0.4)));

        setStableScore(Math.round(coreScore));
        setStableKneeAngle(finalKneeAngle);
        setStableHipDrop(Math.round(finalPelvicDrop));

        setSubMetrics({
          eff: Math.round(coreScore),
          hip: Math.round(Math.max(30, 100 - (finalPelvicDrop * 8) - postureMetrics.pelvicTilt)),
          knee: Math.round(Math.max(30, 100 - (kneeDiff * 2) - postureMetrics.kneeValgus)),
          mob: Math.round(Math.min(100, Math.max(45, 100 - (calcAchillesRisk * 0.3)))),
          bal: Math.round(Math.max(40, 100 - (finalPelvicDrop * 5) - postureMetrics.shoulderTilt))
        });
const overallScore = Math.round(
  (
    subMetrics.eff +
    subMetrics.hip +
    subMetrics.knee +
    subMetrics.mob +
    subMetrics.bal
  ) / 5
);

setStableScore(overallScore);
        const sortedRisks = Object.entries(computedRisks).sort((a, b) => b[1] - a[1]);
        const peakInjuryName = sortedRisks[0][0];
        const peakInjuryScore = sortedRisks[0][1];

        let diag = "สรีระการวิ่งปกติ (Low Risk)";
        let rec = "คุณมีสมดุลการก้าววิ่งที่ดีเยี่ยม แนะนำวอร์มอัพและยืดคลายกล้ามเนื้อตามรอบปกติเพื่อรักษาความเสถียร";
        let sum = "ระบบทำการตรวจพิกัดผสมโครงสร้างสำเร็จ ไม่พบแนุมุมองศาข้อต่อใดเกิดความเค้นวิกฤต";

        if (peakInjuryScore > 40) {
          if (peakInjuryName === "runnersKnee") {
            diag = "Runner's Knee (สะบ้าเข่าอักเสบ)";
            rec = "เสริมสร้างกล้ามเนื้อหน้าขาด้านใน เลี่ยงการก้าวขาแล้วล็อกเข่าตึง และยืดคลายกล้ามเนื้อข้างขาหลังซ้อม";
            sum = `พบมุมองศาเข่าคงค้างขณะรับแรงบิดแคบลงร่วมกับมีพื้นฐานแนวเข่าบิดเข้าด้านใน (Knee Valgus: ${postureMetrics.kneeValgus}%) ทำให้กระดูกสะบ้าเสียดสีสูงขึ้น`;
          } else if (peakInjuryName === "achilles") {
            diag = "Achilles Tendonitis (เอ็นร้อยหวายอักเสบ)";
            rec = "เน้นปรับจังหวะเท้าลงพื้นให้กระชับขึ้น เพิ่มความถี่รอบขา เพื่อดึงจุดลงน้ำหนักกลับมาใต้แกนกลางลำตัว";
            sum = `ระยะก้าวเหยียดจุดสัมผัสล้ำหน้าเกินแนวตัว (Overstride) ประกอบกับรูปสรีระด้านหลังมีอาการข้อเท้าบิดล้มเข้าใน`;
          } else if (peakInjuryName === "itBand") {
            diag = "IT Band Syndrome (เจ็บข้างเข่าด้านนอก)";
            rec = "เพิ่มความแข็งแรงของกล้ามเนื้อสะโพกส่วนข้าง ด้วยท่า Clamshell หรือเตะขาออกด้านข้างเพื่อดึงแกนเชิงกรานให้นิ่ง";
            sum = `แกนสะโพกเอียงทรุดตัวขณะก้าวลงน้ำหนัก ผนวกน้ำหนักเสริมแรงจากประวัติแนวกระดูกเชิงกรานเอียง (Pelvic Tilt: ${postureMetrics.pelvicTilt}%)`;
          } else if (peakInjuryName === "shinSplints") {
            diag = "Shin Splints (เจ็บหน้าแข้ง)";
            rec = "ลดการกระแทกส้นเท้าอย่างรุนแรง ฝึกความแข็งแรงของกล้ามเนื้อหน้าแข้ง และปรับจังหวะมาลงกลางเท้า";
            sum = `แนวก้าวยาวสร้างแรงเบรกสะท้อนย้อนกลับเข้าแนวกระดูกหน้าแข้งด้านใน ร่วมกับมีสภาวะแกนอุ้งเท้าบิดเอียงซัพพอร์ตต่ำ`;
          }
        }

        setStableRiskLevel(peakInjuryScore > 70 ? "HIGH" : peakInjuryScore > 40 ? "MEDIUM" : "LOW");
        setDiagnosis(diag);
        setRecommendation(rec);
        setAnalysisSummary(sum);
      }
    });

    const onLoaded = async () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      await video.play().catch(() => { });
      const detect = async () => {
        if (!video.paused && !video.ended) {
          await pose.send({ image: video });
          rafRef.current = requestAnimationFrame(detect);
        }
      };
      detect();
    };

    if (video.readyState >= 2) onLoaded();
    else video.onloadeddata = onLoaded;
  }, [postureMetrics]);

  useEffect(() => { if (videoURL) startPose(); }, [videoURL, startPose]);
  useEffect(() => {

  generateReport();

}, [
  postureMetrics,
  injuryRisks,
  stableScore,
  stableRiskLevel,
  diagnosis,
  recommendation,
  analysisSummary,
  officeRisk,
  officeLevel
]);

  const handleVideoFile = async (file: File) => {
    if (!file) return;
    framesCount.current = 0;
    maxLockedKnee.current = 156;
    maxLockedDrop.current = 2;
    maxLockedOverstride.current = 6;
    setVideoURL(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (poseRef.current) { try { poseRef.current.close(); } catch (_) { } poseRef.current = null; }
    setVideoURL("");
    setStableScore(82);
    setStableKneeAngle(164);
    setStableHipDrop(0);
    setStableRiskLevel("MEDIUM");
    setInjuryRisks({ runnersKnee: 78, achilles: 24, itBand: 64, shinSplints: 15 });
  };
const generateReport = () => {

  const report: RunLabReport = {

    user: {},

    staticAnalysis: {
      shoulderTilt: postureMetrics.shoulderTilt,
      pelvicTilt: postureMetrics.pelvicTilt,
      kneeValgus: postureMetrics.kneeValgus,
      footRotation: postureMetrics.footRotation,
      forwardHead: postureMetrics.forwardHead,
    },

    dynamicAnalysis: {
      kneeAngle: stableKneeAngle || 0,
      hipDrop: stableHipDrop || 0,
      overstride: maxLockedOverstride.current,
      score: stableScore,
    },

    officeSyndrome: {
      risk: officeRisk,
      level: officeLevel,
    },

    injuryRisk: {
      runnersKnee: injuryRisks.runnersKnee,
      achilles: injuryRisks.achilles,
      itBand: injuryRisks.itBand,
      shinSplints: injuryRisks.shinSplints,
    },

    summary: {
      score: stableScore,
      riskLevel: stableRiskLevel,
      diagnosis,
      recommendation,
      analysisSummary,
    },
  };

  setReportData(report);
};

// 👇 วางตรงนี้
const generateAIReport = () => {
  captureFrame();

  const rootCauses: string[] = [];
  const exercises: string[] = [];
  const advice: string[] = [];

  // Root Cause Engine

  if (stableHipDrop !== null && stableHipDrop > 3) {
    rootCauses.push("Hip Stability Deficit");
    exercises.push("Clamshell");
    exercises.push("Monster Walk");
  }

  if (postureMetrics.kneeValgus > 5) {
    rootCauses.push("Dynamic Knee Valgus");
    exercises.push("Step Down");
    exercises.push("Single Leg Squat");
  }

  if (maxLockedOverstride.current > 10) {
    rootCauses.push("Excessive Overstride");
    exercises.push("Cadence Drill");
    exercises.push("A Skip");
  }
const confidence =
  Math.min(
    95,
    60 + rootCauses.length * 10
  );
  if (postureMetrics.footRotation > 5) {
    rootCauses.push("Foot Control Deficit");
    exercises.push("Single Leg Balance");
  }

  // Running Advice

  if (maxLockedOverstride.current > 10) {
    advice.push("เพิ่ม Cadence 5-7%");
  }

  if (stableHipDrop !== null && stableHipDrop > 3) {
    advice.push("พัฒนาความแข็งแรงของสะโพก");
  }

  if (postureMetrics.kneeValgus > 5) {
    advice.push("ฝึกควบคุมแนวเข่าระหว่างลงน้ำหนัก");
  }

  // หา Primary Risk

  const risks = [
    { name: "Runner's Knee", value: injuryRisks.runnersKnee },
    { name: "IT Band Syndrome", value: injuryRisks.itBand },
    { name: "Achilles Tendinopathy", value: injuryRisks.achilles },
    { name: "Shin Splints", value: injuryRisks.shinSplints },
  ];

  const primaryRisk = risks.sort(
    (a, b) => b.value - a.value
  )[0];
setPrimaryRiskData(primaryRisk);
  // Executive Sconst confidence =
  Math.min(
    95,
    60 + rootCauses.length * 10
  );
const finalReport = {
  score: stableScore,
  riskLevel: stableRiskLevel,
  confidence,
  primaryRisk, // ✅ ใช้ตัวนี้
  rootCauses,
  exercises,
  advice,
};

localStorage.setItem(
  "runlab-report",
  JSON.stringify(finalReport)
);
console.log("REPORT SAVED");
console.log(finalReport);
  const executiveSummary = `
จากการวิเคราะห์การเคลื่อนไหว พบว่าคุณมี Movement Score ${stableScore}/100

ความเสี่ยงหลักคือ ${primaryRisk.name}
(${primaryRisk.value}%)

ปัจจัยสำคัญที่ตรวจพบ ได้แก่

${rootCauses.join(", ")}

แนะนำให้ปรับรูปแบบการเคลื่อนไหวและเสริมสร้างความแข็งแรงเฉพาะจุดเพื่อลดความเสี่ยงการบาดเจ็บในอนาคต
`;
setConfidenceScore(confidence);

  setAiReport({
    executiveSummary,
    rootCause: rootCauses.join(" • "),
    recommendation: [...new Set(exercises)].join(" • "),
    runningAdvice: advice.join(" • "),
  });

};


const downloadReport = async () => {
  const html2canvas =
    (await import("html2canvas")).default;

  const { jsPDF } =
    await import("jspdf");
console.log(document.body.innerHTML.includes("report-export"));
  const reportElement =
  document.querySelector(
    "#report-export"
  );
  console.log(reportElement);

  if (!reportElement) {
    alert("Report not found");
    return;
  }

  const canvas =
    await html2canvas(reportElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#050b14",
    });

  const imgData =
    canvas.toDataURL("image/png");

  const pdf = new jsPDF(
    "p",
    "mm",
    "a4"
  );

  const pdfWidth =
    pdf.internal.pageSize.getWidth();

  const pdfHeight =
    (canvas.height * pdfWidth) /
    canvas.width;

  pdf.addImage(
    imgData,
    "PNG",
    0,
    0,
    pdfWidth,
    pdfHeight
  );

  pdf.save(
    `RUNLAB_REPORT_${Date.now()}.pdf`
  );
};

  const S = {
    page: { minHeight: "100vh", background: "#030712", color: "#f8fafc", fontFamily: "'Sarabun', sans-serif" },
    nav: { background: "rgba(3,7,18,0.85)", borderBottom: "1px solid #1e293b", position: "sticky" as const, top: 0, zIndex: 100, backdropFilter: "blur(12px)" },
    navIn: { maxWidth: 1200, margin: "0 auto", padding: "0 20px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" },
wrap: {
  width: "100%",
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0 20px",
},

sn: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
},
    sn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "linear-gradient(135deg, #00e5ff 0%, #0066ff 100%)", color: "#030712", borderRadius: 10, fontWeight: 900, fontSize: 14, marginRight: 12, boxShadow: "0 4px 14px rgba(0,229,255,0.3)" },
    st: {
  fontSize: isMobile ? 16 : 22,
  fontWeight: 800,
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 6,
  color: "#fff",
  flexWrap: "wrap",
  lineHeight: 1.3,
},

ss: {
  color: "#64748b",
  fontSize: 14,
  marginBottom: 24,
  paddingLeft: 44,
},
    card: { background: "#091120", border: "1px solid #1e293b", borderRadius: 24, padding: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" },
    bp: { background: "linear-gradient(135deg, #00e5ff 0%, #0066ff 100%)", color: "#030712", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 15px rgba(0,229,255,0.25)" },
   courseGrid: {
  display: "grid",
  gridTemplateColumns:
  "repeat(auto-fit,minmax(340px,1fr))",
  gap: 24,
  marginTop: 24,
},
    courseCard: { background: "#091120", border: "1px solid #1e293b", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" },
    priceTag: { fontSize: 20, fontWeight: 900, color: "#00e5ff" },
    payGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 14 }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#030712", color: "#f8fafc", fontFamily: "'Sarabun', sans-serif" }}>
  
  <div style={{ display: "flex",
flexWrap: "wrap",
justifyContent: "space-between",
gap: 10,}}>
    <a
      href="/academy"
      style={{
        color: "#00e5ff",
        textDecoration: "none",
        fontWeight: 700,
      }}
    >
      My Courses
    </a>

    <a href="/academy">Academy</a>

<button style={S.bp}>
  Login
</button>

      </div>


      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* HEADER NAVIGATION */}
      <nav style={S.nav}>
        <div style={S.navIn}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 12px #00e5ff" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
  <div
    style={{
      fontWeight: 900,
      fontSize: 22,
      color: "#fff",
      letterSpacing: 0.5,
    }}
  >
    RUNLAB
  </div>

  <div
    style={{
      fontSize: 10,
      color: "#64748b",
      letterSpacing: 1.5,
      fontWeight: 700,
      marginTop: -2,
    }}
  >
    BY DUHA TECHNOLOGY
  </div>
</div>
</div>
          <div style={{ display: "flex", gap: 28, fontSize: 14, fontWeight: 600, color: "#64748b" }}>
            <span style={{ color: "#00e5ff", cursor: "pointer" }}>หน้าแรก</span>
      
            <div

  style={{
    display: "flex",
    alignItems: "center",
    gap: 14,
  }}
>
 <a
  href="/academy"
  style={{
    color: "#00e5ff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 14,
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(0,229,255,0.08)",
    border: "1px solid rgba(0,229,255,0.2)",
    transition: "all .2s ease",
  }}
>
  📚 Academy
</a>


  <button
    style={{
      background: "#00e5ff",
      color: "#001018",
      border: "none",
      borderRadius: 999,
      padding: "8px 18px",
      fontWeight: 800,
      cursor: "pointer",
      boxShadow: "0 0 20px rgba(0,229,255,.3)",
    }}
  >
    Login
  </button>

</div> {/* ปิด div display:flex gap14 */}

</div> {/* ปิด div nav menu */}

</div> {/* ปิด S.navIn */}

</nav>

      {/* HERO SECTION */}
  <div style={{
  display: "grid",
  gridTemplateColumns: isMobile
  ? "1fr"
  : "1fr 450px",
  gap: "60px",
  alignItems: "center",
  padding: "40px",
  backgroundColor: "#050a14",
  color: "#fff",
  fontFamily: "sans-serif",
  maxWidth: "1200px",
  margin: "0 auto"
}}>
  
  {/* ส่วนเนื้อหาซ้าย */}
  <div>
    <div style={{ display: "inline-block", padding: "8px 16px", borderRadius: "20px", border: "1px solid #00e5ff", color: "#00e5ff", marginBottom: "20px", fontSize: "14px" }}>
      ✦ AI Body Balance & Injury Prevention
    </div>
    <h1 style={{ fontSize: "40px", marginBottom: "20px" }}>วิเคราะห์ท่าวิ่งด้วย AI แม่นยำสูง</h1>
    <p style={{ color: "#94a3b8", lineHeight: "1.6", marginBottom: "30px" }}>
      ถอดรหัสโครงสร้างร่างกายจากรูปถ่ายและวิดีโอตอนวิ่งจริง ระบบจะช่วยล็อกจุดที่มีปัญหาร่วมกับการคำนวณของ AI เพื่อชี้เป้าความเสี่ยงการบาดเจ็บล่วงหน้า พร้อมแนะนำโปรแกรมฟื้นฟูกล้ามเนื้อที่ตรงจุดสำหรับคุณโดยเฉพาะ
    </p>

    <div style={{ display: "flex", gap: "15px", marginBottom: "40px" }}>
      <button style={{ background: "#00e5ff", color: "#000", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>เริ่มวิเคราะห์เลย</button>
      <button style={{ background: "transparent", color: "#fff", border: "1px solid #334155", padding: "12px 24px", borderRadius: "8px", cursor: "pointer" }}>ดูตัวอย่างรายงาน</button>
    </div>

    <div style={{ display: "flex", gap: "40px" }}>
      <div><div style={{ fontSize: "24px", fontWeight: "bold", color: "#00e5ff" }}>AI</div><div style={{ fontSize: "12px", color: "#64748b" }}>วิเคราะห์อัตโนมัติ</div></div>
      <div><div style={{ fontSize: "24px", fontWeight: "bold", color: "#00e5ff" }}>4</div><div style={{ fontSize: "12px", color: "#64748b" }}>กลุ่มความเสี่ยง</div></div>
      <div><div style={{ fontSize: "24px", fontWeight: "bold", color: "#00e5ff" }}>24/7</div><div style={{ fontSize: "12px", color: "#64748b" }}>พร้อมใช้งาน</div></div>
    </div>
  </div>

  {/* ส่วนการ์ดรายงาน (ขวา) */}
  <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: "30px", borderRadius: "20px", border: "1px solid #334155", backdropFilter: "blur(10px)" }}>
    <h3 style={{ textAlign: "center", marginBottom: "20px" }}>RUNLAB REPORT SCORE</h3>
    <div style={{ textAlign: "center", fontSize: "64px", fontWeight: "bold", color: "#00e5ff", marginBottom: "20px" }}>{stableScore}</div>
    
    {[
      { label: "ประสิทธิภาพการจัดระเบียบท่าทางรวม", val: `${stableScore}%` },
      { label: "ความมั่นคงของเชิงกรานและสะโพก", val: "64%" },
      { label: "แนวแกนเข่ารับแรงกระแทก", val: "72%" },
      { label: "ความยืดหยุ่นข้อต่อยางล่าง", val: "72%" },
      { label: "ดัชนีความสมดุลซ้าย-ขวา", val: "68%" }
    ].map((item, index) => (
      <div key={index} style={{ marginBottom: "15px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "5px" }}>
          <span>{item.label}</span>
          <span>{item.val}</span>
        </div>
        <div style={{ height: "6px", background: "#334155", borderRadius: "3px" }}>
          <div style={{ width: item.val, height: "100%", background: "#00e5ff", borderRadius: "3px" }}></div>
        </div>
      </div>
    ))}
  </div>
</div>

      {/* STEP 1: STATIC POSTURE */}
      <div style={{ background: "#050b14", padding: "50px 0", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
        <div style={S.wrap}>
          <div style={S.st}><span style={S.sn}>1</span> ตรวจสอบสรีระท่ายืนนิ่ง (Static Posture Calibration)</div>
          <p style={S.ss}>อัปโหลดรูปถ่ายสรีระหลักเพื่อวิเคราะห์ฐานแนวกระดูกและคำนวณค่าน้ำหนักเสริมตัวคูณรายงาน</p>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20, marginBottom: 20 }}>
            <div
            
  style={{
    ...S.wrap,
    display: "grid",
    gridTemplateColumns: isMobile
  ? "1fr"
  : "1fr 400px",
    gap: 50,
    alignItems: "center",
    padding: "70px 20px",
  }}
></div>
            <div style={{ ...S.card, gridColumn: "span 3", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, background: "#070f1e" }}>
              <PoseSlot label="รูปด้านหน้า (Front Profile)" preview={postureImages.front} onFile={(f) => setPostureImages(p => ({ ...p, front: URL.createObjectURL(f) }))} onClear={() => setPostureImages(p => ({ ...p, front: "" }))} />
              <PoseSlot label="รูปด้านข้าง (Side Profile)" preview={postureImages.side} onFile={(f) => setPostureImages(p => ({ ...p, side: URL.createObjectURL(f) }))} onClear={() => setPostureImages(p => ({ ...p, side: "" }))} />
              <PoseSlot label="รูปด้านหลัง (Back Profile)" preview={postureImages.back} onFile={(f) => setPostureImages(p => ({ ...p, back: URL.createObjectURL(f) }))} onClear={() => setPostureImages(p => ({ ...p, back: "" }))} />
            </div>
            <div style={{ ...S.card, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14, textAlign: "center", background: "#070f1e" }}>
              <div style={{ fontSize: 12, color: postureAnalyzed ? "#10b981" : "#e2e8f0", fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: postureAnalyzed ? "rgba(16,185,129,0.1)" : "rgba(226,232,240,0.05)" }}>
                {postureAnalyzed ? "✓ วิเคราะห์สรีระเสร็จสิ้น" : "⚠️ รอประมวลผลรูปภาพ"}
              </div>
              <button onClick={processStaticPosture} style={{ ...S.bp, width: "100%", background: "#10b981", color: "#fff", boxShadow: "0 4px 14px rgba(16,185,129,0.2)" }}>
                ประมวลผลจุดตรึงสรีระ
              </button>
          {postureAnalyzed && (
  <div
    style={{
      marginTop: 20,
      background: "#091120",
      border: "1px solid #1e293b",
      borderRadius: 20,
      padding: 20,
    }}
  >
    <h3 style={{ color: "#fff", marginBottom: 10 }}>
      ความเสี่ยง Office Syndrome
    </h3>

    <div
      style={{
        fontSize: 42,
        fontWeight: 800,
        color: "#00e5ff",
      }}
    >
      {officeRisk}%
    </div>

    <div
      style={{
        marginTop: 10,
        color:
          officeLevel === "HIGH"
            ? "#ef4444"
            : officeLevel === "MEDIUM"
            ? "#f59e0b"
            : "#10b981",
      }}
    >
      ระดับความเสี่ยง : {officeLevel}
    </div>
  </div>
)}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: DYNAMIC VIDEO */}
      <div style={{ padding: "50px 0" }}>
        <div style={S.wrap}>
          <div style={S.st}><span style={S.sn}>2</span> ตรวจสอบมุมการเคลื่อนไหว (Dynamic Gait Analysis)</div>
          <p style={S.ss}>ระบบอัจฉริยะจะทำการจับพิกัดองศาเรียลไทม์ และล็อคเฉพาะค่าวิกฤตสูงสุดเพื่อใช้ทำรายงานสรุปผล</p>

          <div style={{ ...S.card, background: "#050c1a" }}>
            {!videoURL ? (
              <label style={{ border: "2px dashed #223554", borderRadius: 20, padding: "64px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer", background: "#040914" }}>
                <div style={{ fontSize: 42 }}>📹</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#00e5ff" }}>เลือกไฟล์วิดีโอวิเคราะห์การวิ่ง</div>
                <div style={{ fontSize: 12, color: "#475569" }}>ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเปิดหน้าต่างเลือกไฟล์ (.MP4, .MOV)</div>
                <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); }} />
              </label>
            ) : (
              <div>
                <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", maxWidth: 680, margin: "0 auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)" }}>
                  <video ref={videoRef} src={videoURL} style={{ width: "100%", display: "none" }} autoPlay loop muted playsInline />
                  <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "auto" }} />
                </div>
                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <button onClick={clearVideo} style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    🔄 ยกเลิกและเปลี่ยนไฟล์วิดีโอใหม่
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STEP 3: CLINICAL REPORT (WITH NEW INTERACTIVE ANATOMY) */}
      <div style={{ background: "#050b14", padding: "50px 0", borderTop: "1px solid #1e293b" }}>
        <div style={S.wrap}>
          <div style={S.st}><span style={S.sn}>3</span> รายงานผลวิเคราะห์ความเสี่ยงการบาดเจ็บของคุณ</div>
          <button
  onClick={generateAIReport}
  style={{
    background:"#00e5ff",
    color:"#000",
    border:"none",
    padding:"12px 20px",
    borderRadius:12,
    fontWeight:700,
    cursor:"pointer",
    marginTop:20,
    marginBottom:20
  }}
>
  สร้างรายงาน AI
</button>
{aiReport.executiveSummary && (


<div
  style={{
    marginTop:20,
    padding:24,
    background:"#08101f",
    borderRadius:20,
    border:"1px solid #1e293b"
  }}
>

<h2>RUNLAB RUNNING BIOMECHANICS REPORT</h2>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 16,
    marginTop: 20,
    marginBottom: 24,
    padding: 16,
    border: "1px solid #1e293b",
    borderRadius: 12,
    background: "#07111f"
  }}
>
  <div>
    <div style={{ color: "#64748b", fontSize: 12 }}>
      Assessment Date
    </div>
    <div>{new Date().toLocaleDateString("th-TH")}</div>
  </div>

  <div>
    <div style={{ color: "#64748b", fontSize: 12 }}>
      Movement Score
    </div>
    <div>{stableScore}/100</div>
  </div>

  <div>
    <div style={{ color: "#64748b", fontSize: 12 }}>
      Risk Level
    </div>
    <div>{stableRiskLevel}</div>
  </div>

  <div>
    <div style={{ color: "#64748b", fontSize: 12 }}>
      Confidence
    </div>
    <div>{confidenceScore}%</div>
  </div>
</div>
<h3>Executive Summary</h3>
<div
  style={{
    background:"#07111f",
    border:"1px solid #1e293b",
    borderRadius:16,
    padding:20,
    marginTop:20
  }}
>
  <div
    style={{
      fontSize:12,
      color:"#64748b",
      fontWeight:700
    }}
  >
    PRIMARY RISK
  </div>

  <div
    style={{
      fontSize:24,
      fontWeight:800,
      color:"#ef4444",
      marginTop:8
    }}
  >
    {primaryRiskData.name}
  </div>

  <div
    style={{
      color:"#94a3b8",
      marginTop:8
    }}
  >
    {primaryRiskData.value}
  </div>
</div>
<p>{aiReport.executiveSummary}</p>
<h3>Key Findings</h3>

<ul
  style={{
    color:"#cbd5e1",
    lineHeight:2,
    paddingLeft:20
  }}
>
  <li>Knee Angle : {stableKneeAngle}°</li>
  <li>Hip Drop : {stableHipDrop}°</li>
  <li>Knee Valgus : {postureMetrics.kneeValgus}°</li>
  <li>Pelvic Tilt : {postureMetrics.pelvicTilt}°</li>
  <li>Overstride : {maxLockedOverstride.current}%</li>
</ul>
<h3>จุดที่ควรปรับปรุง</h3>

<div
  style={{
    display:"grid",
    gap:12,
    marginTop:12
  }}
>
  {aiReport.rootCause
    .split(" • ")
    .map((cause,index)=>(
      <div
        key={index}
        style={{
          background:"#07111f",
          border:"1px solid #1e293b",
          borderRadius:16,
          padding:16
        }}
      >
        <div
          style={{
            color:"#ef4444",
            fontWeight:700
          }}
        >
          ⚠️ Finding {index + 1}
        </div>

        <div
          style={{
            marginTop:8,
            color:"#cbd5e1"
          }}
        >
          {cause}
        </div>
      </div>
    ))}
</div>

<h3>Corrective Exercise</h3>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 16,
    marginTop: 16
  }}
>
  {aiReport.recommendation
    .split(" • ")
    .map((exercise, index) => (
      <div
        key={index}
        style={{
          background: "#07111f",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 20
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "#64748b",
            fontWeight: 700
          }}
        >
          EXERCISE
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 18,
            fontWeight: 800,
            color: "#00e5ff"
          }}
        >
          {exercise}
        </div>
      </div>
    ))}
</div>
<h3>Running Advice</h3>
<h3>Recovery Timeline</h3>

<div
  style={{
    background:"#07111f",
    border:"1px solid #1e293b",
    borderRadius:16,
    padding:20,
    marginTop:12
  }}
>
  <div>Week 1-2 : ลดปริมาณการวิ่ง 20%</div>
  <div style={{marginTop:10}}>
    Week 3-4 : เริ่ม Strength Training
  </div>
  <div style={{marginTop:10}}>
    Week 5-6 : Return To Running Progression
  </div>
</div>
<div
  style={{
    background: "#07111f",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 20,
    marginTop: 12
  }}
>
  {aiReport.runningAdvice
    .split(" • ")
    .map((tip, index) => (
      <div
        key={index}
        style={{
          marginBottom: 10,
          color: "#cbd5e1"
        }}
      >
        ✅ {tip}
      </div>
    ))}
</div>

</div>

)}
<button
  onClick={() => {
  window.location.href = "/report";
}}
  style={{
    background:"#22c55e",
    color:"#fff",
    border:"none",
    padding:"12px 20px",
    borderRadius:12,
    fontWeight:700,
    cursor:"pointer"
  }}
>
   📄 Open Report
</button>
          <p style={S.ss}>ตัวเลขคำนวณแบบแม่นยำร่วมกับแผนผังชีวกลศาสตร์เพื่อชี้เป้าความเสี่ยงการเกิดโรคเรื้อรัง</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 26 }}>
            <Stat label="RUNNING SCORE" val={stableScore || "—"} color="#00e5ff" />
            <Stat label="RISK STATUS" val={stableRiskLevel} color={riskColor} />
            <Stat label="MAX KNEE EXTENSION" val={stableKneeAngle !== null ? `${stableKneeAngle}°` : "—"} color="#3b82f6" />
            <Stat label="MAX DYNAMIC HIP DROP" val={stableHipDrop !== null ? `${stableHipDrop}°` : "—"} color="#a78bfa" />
          </div>

          {/* TWO-COLUMN LAYOUT: SKELETON MODEL VS RISK CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 30, alignItems: "stretch" }}>
            {/* Interactive Anatomy Component */}
            <InteractiveAnatomy risks={injuryRisks} />

            {/* Risk Breakdown Stack */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <RiskCard title="Runner's Knee (สะบ้าอักเสบ)" pct={injuryRisks.runnersKnee} desc="ประเมินผิวข้อสะบ้าจากมุมเหยียดเข่า ร่วมกับภาวะเข่าบิดล้มเข้าด้านใน" />
              <RiskCard title="Achilles Tendonitis (เอ็นร้อยหวาย)" pct={injuryRisks.achilles} desc="คำนวณแรงเค้นสะสมจากระยะก้าวยาวเกินจุดศูนย์ถ่วงลำตัว (Overstride)" />
              <RiskCard title="IT Band Syndrome (เจ็บข้างเข่า)" pct={injuryRisks.itBand} desc="วัดมุมบิดเค้นเนื้อเยื่อข้างขาจากการทรุดตัวของกระดูกเชิงกรานและสะโพก" />
              <RiskCard title="Shin Splints (เจ็บหน้าแข้ง)" pct={injuryRisks.shinSplints} desc="ประเมินแรงกระแทกแนวกระดูกหน้าแข้งจากการลงส้นเท้าล้ำแนวสะโพกเกินเกณฑ์" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            <div style={{ ...S.card, background: "#08101f" }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#00e5ff", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><span>🤖</span> สรุปภาพรวมและข้อเสนอแนะเชิงชีวกลศาสตร์ (AI Overview)</div>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, margin: 0 }}>
                {analysisSummary || "ระบบกำลังประมวลผลโครงสร้างเพื่อสรุปพฤติกรรมแรงกดและแนวองศากระดูกของคุณ"}
              </p>
            </div>
            <div style={{ ...S.card, background: "#08101f" }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#f59e0b", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><span>🎯</span> แนวทางและโปรแกรมแก้ไข: {diagnosis || "รอข้อมูล"}</div>
              <div style={{ background: "#040914", border: "1px solid #1e293b", borderRadius: 14, padding: "16px", fontSize: 13, color: "#e2e8f0", lineHeight: 1.7 }}>
                {recommendation || "แนวทางฝึกความแข็งแรงกล้ามเนื้อและปรับฟอร์มการวิ่งที่ถูกต้องเพื่อลดการบาดเจ็บ"}
              </div>
            </div>
          </div>
        </div>
      </div>
{reportData && (

<div
  style={{
    background:"#08101f",
    border:"1px solid #1e293b",
    borderRadius:24,
    padding:30,
    marginTop:30
  }}
>

<h2
style={{
color:"#00e5ff",
marginBottom:20
}}
>
RUNLAB AI REPORT
</h2>

<div
style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
gap:20
}}
>

<Stat
label="RUNLAB SCORE"
val={reportData.summary.score}
color="#00e5ff"
/>

<Stat
label="RISK LEVEL"
val={reportData.summary.riskLevel}
color="#f59e0b"
/>

<Stat
label="OFFICE RISK"
val={`${reportData.officeSyndrome.risk}%`}
color="#ef4444"
/>

<Stat
label="KNEE ANGLE"
val={`${reportData.dynamicAnalysis.kneeAngle}°`}
color="#3b82f6"
/>

</div>

</div>

)}
      {/* STEP 4: RECOVERY PROGRAMS */}
     <div id="recovery-programs" style={{ padding: "50px 0" }}>
  <div style={S.wrap}>
    <div style={S.st}>
      <span style={S.sn}>4</span>
      โปรแกรมออกกำลังกายฟื้นฟูจำเพาะบุคคลที่แนะนำสำหรับคุณ
    </div>

    <p style={S.ss}>
      คอร์สฟื้นฟูสมดุลความแข็งแรงกล้ามเนื้อ
      ออกแบบมาเพื่อแก้ปวดและป้องกันจุดเสี่ยงเจ็บของคุณโดยเฉพาะ
    </p>
 <div style={S.courseGrid}>

  <div
    style={{
      ...S.courseCard,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background:
        "linear-gradient(180deg,#07101f 0%,#0d1727 100%)",
      border: "1px solid #1e293b",
    }}
  >
  
  <div style={{ padding: 20 }}>
   
    <img
  src="/courses/knee.jpg"
  alt="Knee Recovery"
  style={{
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 14,
  }}
/>

    <h3
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#fff",
        marginBottom: 8,
      }}
    >
      PRO-KNEE: โปรแกรมแก้ปวดเข่าสะบ้า
    </h3>

    <p
      style={{
        fontSize: 12,
        color: "#64748b",
        lineHeight: 1.6,
        margin: 0,
        minHeight: 70,
      }}
    >
      ลดแรงกดเค้นที่ผิวข้อสะบ้าเข่า
      เสริมความแข็งแรงกล้ามเนื้อรอบหน้าขา
      เพื่อความมั่นคงในการลงน้ำหนัก
    </p>

    <div
      style={{
        display: "flex",
        gap: 12,
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 14,
        background: "#040914",
        padding: "6px 12px",
        borderRadius: 8,
        width: "fit-content",
      }}
    >
      <span>⏱️ 6 สัปดาห์</span>
      <span>📹 24 วิดีโอ</span>
    </div>
  </div>

  <div
    style={{
      background: "#0d1727",
      padding: "16px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: "1px solid #1e293b",
    }}
  >
    
    <div style={S.priceTag}>
      1,490{" "}
      <span
        style={{
          fontSize: 12,
          color: "#64748b",
          fontWeight: 400,
        }}
      >
        THB
      </span>
    </div>

    <button
      onClick={() =>
        setSelectedCourse({
          name: "PRO-KNEE",
          price: 1490,
        })
      }
      style={{
        ...S.bp,
        padding: "8px 16px",
        fontSize: 12,
      }}
    >
      เลือกคอร์สนี้
    </button>
  </div>

  </div>


            <div style={S.courseCard}>
              <div style={{ padding: 20 }}>
                <img
  src="/courses/hip.jpg"
  alt="Hip Stability"
  style={{
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 14,
  }}
/>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>CORE-HIP: เพิ่มความมั่นคงของสะโพก</h3>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>แก้สภาวะสะโพกทรุดขณะวิ่ง เพิ่มการควบคุมแกนเชิงกรานและจัดระเบียบท่าทางช่วงล่าง</p>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94a3b8", marginTop: 14, background: "#040914", padding: "6px 12px", borderRadius: 8, width: "fit-content" }}>
                  <span>⏱️ 8 สัปดาห์</span><span>📹 20 วิดีโอ</span>
                </div>
              </div>
              <div style={{ background: "#0d1727", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1e293b" }}>
                <div style={S.priceTag}>1,290 <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>THB</span></div>
                <button
                  onClick={() =>
                    setSelectedCourse({
                      name: "CORE-HIP",
                      price: 1290,
                    })
                  }
                  style={{
                    ...S.bp,
                    padding: "8px 16px",
                    fontSize: 12,
                  }}
                >
                  เลือกคอร์สนี้
                </button>
              </div>
            </div>

            <div style={S.courseCard}>
              <div style={{ padding: 20 }}>
                <img
  src="/courses/mobility.jpg"
  alt="Mobility Training"
  style={{
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 14,
  }}
/>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>RUN-MOBILITY: เพิ่มมุมเคลื่อนไหวข้อต่อ</h3>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>เพิ่มความยืดหยุ่นให้ข้อเท้าและข้อสะโพก ช่วยลดการดึงรั้งและทำให้ก้าววิ่งไหลลื่นขึ้น</p>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94a3b8", marginTop: 14, background: "#040914", padding: "6px 12px", borderRadius: 8, width: "fit-content" }}>
                  <span>⏱️ 4 สัปดาห์</span><span>📹 18 วิดีโอ</span>
                </div>
              </div>
              <div style={{ background: "#0d1727", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1e293b" }}>
                <div style={S.priceTag}>990 <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>THB</span></div>
                <button
  onClick={() =>
    setSelectedCourse({
      name: "RUN-MOBILITY",
      price: 990,
    })
  }
  style={{
    ...S.bp,
    padding: "8px 16px",
    fontSize: 12,
  }}
>
  เลือกคอร์สนี้
</button>
</div> {/* RUN-MOBILITY */}

</div> {/* courseGrid */}

</div> {/* wrap */}

</div> {/* recovery-programs */}


        {/* STEP 5: PAYMENT GATEWAY */}
        <div
          style={{
            background: "#050b14",
            padding: "50px 0",
            borderTop: "1px solid #1e293b",
          }}
        >
          <div style={S.wrap}>

            <div style={S.st}>
              <span style={S.sn}>5</span>
              ชำระเงินและอัปโหลดสลิปเพื่อเปิดใช้งานระบบ
            </div>

            <p style={S.ss}>
              สแกนโอนเงินผ่าน QR Code ด้านล่างเพื่อยืนยันเปิดสิทธิ์เข้าใช้โปรแกรมฟื้นฟูโดยอัตโนมัติ
            </p>

    <div
  style={{
    display: "grid",
   gridTemplateColumns: isMobile
  ? "1fr"
  : "1fr 1fr 1fr",
    gap: 20,
    marginTop: 24,
    alignItems: "stretch",
  }}
>

              {/* QR CARD */}
              <div
                style={{
                  ...S.card,
                  background: "#070f1e",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  PROMPTPAY OFFICIAL QR
                </div>

                <div
                  style={{
                    width: 150,
                    height: 150,
                    background: "#fff",
                    borderRadius: 12,
                    padding: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    src="/promptpay-qr.png"
                    alt="PromptPay QR Code"
                    width={130}
                    height={130}
                    style={{ objectFit: "contain" }}
                    priority
                  />
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    marginTop: 14,
                  }}
                >
                  ชื่อบัญชี: ปริญญา ปานศิริ
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#00e5ff",
                    marginTop: 4,
                  }}
                >
                  08X-XXX-XXXX
                </div>
              </div>

              {/* ORDER SUMMARY */}
              <div
                style={{
                  ...S.card,
                  background: "#070f1e",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  >
                    สรุปรายการคอร์สที่เลือก
                  </div>

                 <div>
  <h4
    style={{
      fontSize: 14,
      fontWeight: 700,
      color: "#fff",
      margin: 0,
    }}
  >
    {selectedCourse.name}
  </h4>

  
                        <div
                          style={{
                          fontSize: 18,
                          fontWeight: 900,
                          color: "#00e5ff",
                          marginTop: 6,
                        }}
                      >
                        {selectedCourse.price} THB
                      </div>
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    lineHeight: 1.6,
                    margin: "14px 0 0",
                  }}
                >
                  * หลังตรวจสอบยอดชำระเงินเรียบร้อยแล้ว ระบบอัตโนมัติจะทำการปลดล็อกคอร์สและส่งข้อมูลเข้าสู่อีเมลของคุณทันที
                </p>
              </div>

              {/* SLIP UPLOAD */}
              <div
                style={{
                  ...S.card,
                  background: "#070f1e",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  อัปโหลดสลิปการโอนเงิน (Upload Slip)
                </div>

                <div
                  style={{
                    position: "relative",
                    border: "2px dashed #223554",
                    borderRadius: 16,
                    padding: "20px 12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#040914",
                    height: 140,
                  }}
                >
                  {slipImage ? (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                      }}
                    >
                      <img
                        src={slipImage}
                        alt="Slip"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          borderRadius: 8,
                        }}
                      />

                      <button
                        onClick={() => setSlipImage("")}
                        style={{
                          position: "absolute",
                          top: -4,
                          right: -4,
                          background: "rgba(239,68,68,0.9)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: 9,
                          cursor: "pointer",
                        }}
                      >
                        ลบรูป
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        gap: 6,
                      }}
                    >
                      <div style={{ fontSize: 26 }}>🧾</div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#e2e8f0",
                        }}
                      >
                        คลิกเพื่อเลือกไฟล์สลิป
                      </div>

                      <div
                        style={{
                          fontSize: 10,
                          color: "#475569",
                        }}
                      >
                        รองรับไฟล์ JPG, PNG
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setSlipImage(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (slipImage) {
                      alert("ระบบได้รับไฟล์สลิปแล้ว กำลังส่งตรวจความถูกต้องอัตโนมัติครับบอส");
                    } else {
                      alert("กรุณาแนบภาพสลิปเงินโอนก่อนครับบอส");
                    }
                  }}
                  style={{
                    ...S.bp,
                    width: "100%",
                    marginTop: 14,
                  }}
                >
                  ส่งสลิปเพื่อยืนยันการชำระเงิน
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* FOOTER & COPYRIGHT SECTION */}
        <footer style={{ background: "#020613", borderTop: "1px solid #1e293b", padding: "40px 0 30px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#fff", letterSpacing: 0.5 }}>
                RUNLAB <span style={{ fontSize: 12, color: "#00e5ff", fontWeight: 600 }}>BY บันทึกของโค้ช</span>
              </div>
              <p style={{ fontSize: 12, color: "#475569", margin: 0, textAlign: "center" }}>
                ระบบวิเคราะห์สรีระและฟอร์มการวิ่งเพื่อการป้องกันอาการบาดเจ็บอย่างตรงจุด
              </p>
            </div>
            <div style={{ width: "100%", maxWidth: 300, height: 1, background: "linear-gradient(to right, transparent, #1e293b, transparent)" }} />
            <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 1.6 }}>
              © {new Date().getFullYear()} <strong>Runlab by บันทึกของโค้ช</strong>. All Rights Reserved.
            </div>
          </div>
        </footer>

      </div>
      );
}