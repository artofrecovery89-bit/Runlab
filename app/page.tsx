"use client";
import PostureOverlay from "../src/components/PostureOverlay";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";

const SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js",
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
          s.onerror = (e) => {
            console.error("SCRIPT LOAD ERROR", src, e);
          };
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
function calcCVA(
  ear: any,
  shoulder: any
) {
  if (!ear || !shoulder)
    return 50;

  const dx =
    shoulder.x - ear.x;

  const dy =
    shoulder.y - ear.y;

  const angle =
    Math.atan2(
      Math.abs(dy),
      Math.abs(dx)
    ) *
    (180 / Math.PI);

  console.log({
    dx,
    dy,
    angle
  });

  return Number(
    angle.toFixed(1)
  );
}


// 2. ฟังก์ชันวัดมุมคอ (Neck Angle)
const calcHeadAngle = (ear: any, shoulder: any) => {
  if (!ear || !shoulder) return 0;
  const rad = Math.atan2(ear.x - shoulder.x, ear.y - shoulder.y);
  return Math.abs((rad * 180) / Math.PI);
};

// 3. ฟังก์ชันประเมินความเสี่ยง (รวมในตัวเดียว)
const getPostureRisk = (
  cva: number
) => {

  if (cva < 44) {
    return {
      level: "High",
      color: "red",
      msg: "Neck Angle Posture ระดับสูง"
    };
  }

  if (cva < 48) {
    return {
      level: "Medium",
      color: "orange",
      msg: "เริ่มมีภาวะ Neck Angle Posture"
    };
  }

  return {
    level: "Low",
    color: "green",
    msg: "แนวศีรษะอยู่ในเกณฑ์ปกติ"
  };
};
const calculateOfficeRisk = (
  cva: number,
  roundedShoulder: number,
  upperCross: number,
  lowerCross: number,
  shoulderAsymmetry: number,
  pelvicAsymmetry: number
) => {
  const headScore =
    cva < 44 ? 100 :
      cva < 48 ? 70 :
        cva < 52 ? 40 :
          0;

  const roundedScore =
    roundedShoulder > 4 ? 100 :
      roundedShoulder > 2 ? 50 :
        0;

  const upperCrossScore =
    upperCross > 40 ? 100 :
      upperCross > 20 ? 50 :
        0;

  const lowerCrossScore =
    lowerCross > 40 ? 100 :
      lowerCross > 20 ? 50 :
        0;

  const shoulderScore =
    shoulderAsymmetry > 5 ? 100 :
      shoulderAsymmetry > 3 ? 50 :
        0;

  const pelvicScore =
    pelvicAsymmetry > 5 ? 100 :
      pelvicAsymmetry > 3 ? 50 :
        0;

  const risk = Math.round(
    headScore * 0.25 +
    roundedScore * 0.25 +
    upperCrossScore * 0.25 +
    lowerCrossScore * 0.10 +
    shoulderScore * 0.075 +
    pelvicScore * 0.075
  );
  console.log("NEW OFFICE RISK", {
    cva,

    roundedShoulder,
    upperCross,
    lowerCross,

    shoulderAsymmetry,
    pelvicAsymmetry,

    headScore,
    roundedScore,
    upperCrossScore,
    lowerCrossScore,
    shoulderScore,
    pelvicScore,

    risk,
  });
  return {
    risk,
    level:
      risk >= 70
        ? "HIGH"
        : risk >= 40
          ? "MEDIUM"
          : "LOW",
  };
};

const POSE_CONNECTIONS = [
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 12], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31],
  [24, 26], [26, 28], [28, 30], [28, 32],
];


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
  console.log(
    "DRAW POSE SKELETON"
  );
function Ring({ v = 0, size = 110 }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const d = (v / 100) * c;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#1e293b"
        strokeWidth="8"
      />

      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="url(#cyanGrad)"
        strokeWidth="8"
        strokeDasharray={`${d} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{
          transition:
            "stroke-dasharray .8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      <defs>
        <linearGradient
          id="cyanGrad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
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
function RiskCard({
  title,
  pct,
  desc,
}: {
  title: string;
  pct: number;
  desc: string;
}) {
  const level =
    pct > 70
      ? "ความเสี่ยงสูง"
      : pct > 40
        ? "ความเสี่ยงปานกลาง"
        : "ความเสี่ยงต่ำ";

  const color =
    pct > 70
      ? "#ef4444"
      : pct > 40
        ? "#f59e0b"
        : "#10b981";

  return (
    <div
      style={{
        background: "#091120",
        border: `1px solid ${color}40`,
        borderRadius: 20,
        padding: 20,
      }}
    >
      <div style={{ color, fontSize: 12, fontWeight: 800 }}>
        {title}
      </div>

      <div
        style={{
          fontSize: 42,
          fontWeight: 900,
          color,
          marginTop: 8,
        }}
      >
        {pct}%
      </div>

      <div
        style={{
          color: "#fff",
          fontWeight: 700,
          marginTop: 4,
        }}
      >
        {level}
      </div>

      <p
        style={{
          color: "#94a3b8",
          fontSize: 12,
          lineHeight: 1.6,
          marginTop: 10,
        }}
      >
        {desc}
      </p>
    </div>
  );
}
function OfficeRiskCard({
  risk,
  level,
}: {
  risk: number;
  level: string;
}) {
  const riskColor =
    level === "HIGH"
      ? "#ef4444"
      : level === "MEDIUM"
        ? "#f59e0b"
        : "#10b981";

  return (
    <div
      style={{
        background: "linear-gradient(145deg,#08101f,#111c31)",
        borderRadius: 24,
        padding: 24,
        border: `1px solid ${riskColor}30`,
      }}
    >
      <div
        style={{
          color: riskColor,
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        OFFICE SYNDROME RISK
      </div>

      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: riskColor,
        }}
      >
        {risk}%
      </div>

      <div
        style={{
          color: "#fff",
          fontWeight: 700,
        }}
      >
        {level}
      </div>
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
    shoulderAsymmetry: number;
    pelvicAsymmetry: number;
    kneeValgus: number;
    footWidth: number;
    neckAngle: number;
  };

  dynamicAnalysis: {
    kneeAngle: number;
    hipDrop: number;
    overstride: number;
    score: number;
  };
  injuryRisk: {
    runnersKnee: number;
    achilles: number;
    itBand: number;
    shinSplints: number;
  };
  officeSyndrome: {
    risk: number;
    level: "LOW" | "MEDIUM" | "HIGH";

    neckAngle: number;
    roundedShoulder: number;
    upperCross: number;
    lowerCross: number;
    shoulderAsymmetry: number;
    pelvicAsymmetry: number;
    findings: string[];
    recommendations: string[];
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

function InteractiveAnatomy({
  risks,
  frontImage,
  frontLandmarks,
}: {
  risks: {
    runnersKnee: number;
    achilles: number;
    itBand: number;
    shinSplints: number;
  };
  frontImage?: string;
  frontLandmarks?: any[];
}) {
  const getRiskColor = (value: number) => {
    if (value >= 70) return "#ef4444";
    if (value >= 40) return "#f59e0b";
    return "#10b981";
  };

  const primaryRisk = Math.max(
    risks.runnersKnee,
    risks.itBand,
    risks.achilles,
    risks.shinSplints
  );

  return (
    <div
      style={{
        background: "#07111f",
        border: "1px solid #1e293b",
        borderRadius: 24,
        padding: 30,
        marginTop: 30,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse {
              0% {
                transform: scale(1);
                opacity: .9;
              }
              70% {
                transform: scale(2.2);
                opacity: 0;
              }
              100% {
                transform: scale(2.2);
                opacity: 0;
              }
            }

            .risk-pulse {
              position:absolute;
              border-radius:50%;
              animation:pulse 1.8s infinite;
            }
          `,
        }}
      />

      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            color: "#00e5ff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          AI BODY RISK MAP
        </div>

        <h2
          style={{
            color: "#fff",
            marginTop: 8,
            marginBottom: 6,
          }}
        >
          วิเคราะห์ความเสี่ยงเฉพาะร่างกายของคุณ
        </h2>

        <div
          style={{
            color: "#94a3b8",
          }}
        >
          ประเมินจาก Biomechanics และ AI Movement Analysis
        </div>
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        {/* LEFT IMAGE */}
        <div
          style={{
            position: "relative",
            background: "#020617",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
         {frontImage &&
frontLandmarks?.length ? (
  <PostureOverlay
    image={frontImage}
    landmarks={frontLandmarks}
  />
) : (
  <div
    style={{
      height: 550,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#64748b",
    }}
  >
    No Front Image
  </div>
)}
          

          {/* RUNNER'S KNEE */}
          <div
            style={{
              position: "absolute",
              left: "48%",
              top: "72%",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 20px rgba(239,68,68,.9)",
            }}
          >
            <div
              className="risk-pulse"
              style={{
                inset: 0,
                border: "2px solid #ef4444",
              }}
            />
          </div>

          {/* IT BAND */}
          <div
            style={{
              position: "absolute",
              left: "48%",
              top: "52%",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#f59e0b",
              boxShadow: "0 0 15px rgba(245,158,11,.8)",
            }}
          >
            <div
              className="risk-pulse"
              style={{
                inset: 0,
                border: "2px solid #f59e0b",
              }}
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* PRIMARY RISK */}
          <div
            style={{
              background: "#2b0f13",
              border: "1px solid #ef4444",
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                color: "#ef4444",
                lineHeight: 1,
              }}
            >
              {primaryRisk}%
            </div>

            <div
              style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              Runner's Knee
            </div>

            <div
              style={{
                color: "#fca5a5",
                marginTop: 8,
              }}
            >
              ความเสี่ยงสูง
            </div>
          </div>

          {/* CONFIDENCE */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div style={{ color: "#94a3b8" }}>
              Confidence
            </div>

            <div
              style={{
                fontSize: 32,
                color: "#00e5ff",
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              89%
            </div>
          </div>

          {/* BREAKDOWN */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div
              style={{
                color: "#fff",
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Injury Breakdown
            </div>

            {[
              {
                label: "Runner's Knee",
                value: risks.runnersKnee,
              },
              {
                label: "IT Band Syndrome",
                value: risks.itBand,
              },
              {
                label: "Achilles Tendon",
                value: risks.achilles,
              },
              {
                label: "Shin Splints",
                value: risks.shinSplints,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{ marginBottom: 14 }}
              >
                <div
                  style={{
                    color: "#fff",
                    marginBottom: 6,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>

                <div
                  style={{
                    height: 8,
                    background: "#1e293b",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${item.value}%`,
                      height: "100%",
                      background: getRiskColor(item.value),
                    }}
                  />
                </div>
              </div>
            ))}

            {/* LEGEND */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <Legend
                color="#10b981"
                label="เสี่ยงต่ำ (<40%)"
              />
              <Legend
                color="#f59e0b"
                label="เสี่ยงปานกลาง (40-70%)"
              />
              <Legend
                color="#ef4444"
                label="วิกฤต (>70%)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10,
        color: "#94a3b8",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
        }}
      />
      {label}
    </div>
  );
}

export default function RunLabPremiumSystem() {

  const [isMobile, setIsMobile] = useState(false);
  const { user, isLoaded } = useUser();


  console.log("LOADED =", isLoaded);
  console.log("USER =", user);
  useEffect(() => {
    console.log("USER =", user);

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
  const maxLockedKnee =
    useRef<number>(0);
  const maxLockedDrop = useRef<number>(3);
  const maxLockedOverstride = useRef<number>(8.5);

  const contactOverstride = useRef<number>(0);
  const lastAnkleY = useRef<number | null>(null);
  const contactDetected = useRef(false);
  const [postureMetrics, setPostureMetrics] = useState({
    shoulderAsymmetry: 0,
    pelvicAsymmetry: 0,
    kneeValgus: 0,
    footWidth: 0,

    neckAngle: 0,
    forwardHeadScore: 0,

    roundedShoulder: 0,
    upperCross: 0,
    lowerCross: 0,
  });
  const [poseLandmarks, setPoseLandmarks] =
    useState({
      front: [],
      left: [],
      right: [],
      back: [],
    });
  const [postureAnalyzed, setPostureAnalyzed] = useState(false);
  const [videoURL, setVideoURL] = useState("");
  const [postureImages, setPostureImages] =
    useState({
      front: "",
      left: "",
      right: "",
      back: "",
    });
  useEffect(() => {
    console.log(
      "POSTURE IMAGES",
      postureImages
    );
  }, [postureImages]);
  // DEMO INITIAL STATE
  const [officeRisk, setOfficeRisk] = useState(0);
  const [officeLevel, setOfficeLevel] = useState<
    "LOW" | "MEDIUM" | "HIGH"
  >("LOW");
  const [stableScore, setStableScore] = useState<number>(89);
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
    console.log("Pose Exists", !!Pose);

    if (!Pose) {
      console.error("Pose not loaded");
      return null;
    }
    return new Promise<any>((resolve) => {

      const img = new window.Image();

      img.crossOrigin = "anonymous";

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
          console.log(
            "POSE RESULTS",
            results
          );

          console.log(
            "POSE LANDMARKS",
            results.poseLandmarks
          );

          resolve({
            landmarks:
              results.poseLandmarks || [],
          });

        });

        try {
          await pose.send({ image: img });
        } catch (e) {
          console.error("POSE ERROR", e);
          resolve(null);
        }
      };
    });
  };
  const processStaticPosture = async () => {
    let frontLandmarks = [];
    let leftLandmarks = [];
    let rightLandmarks = [];
    let backLandmarks = [];

    let shoulderAsymmetry = 0;
    let pelvicAsymmetry = 0;
    let kneeValgus = 0;
    let footWidth = 0;

    let cva = 50;
    let forwardHeadScore = 0;
    let roundedShoulder = 0;
    let upperCross = 0;
    let lowerCross = 0;
    let officeResult = {
      risk: 0,
      level: "LOW",
    };
    if (
      !postureImages.front ||
      !postureImages.left ||
      !postureImages.right ||
      !postureImages.back
    ) {
      alert("กรุณาอัปโหลดรูปทั้ง 4 ด้าน");
      return;
    }

    try {




      const frontData =
        await analyzeImage(postureImages.front)

      const leftData =
        await analyzeImage(postureImages.left)

      const rightData =
        await analyzeImage(postureImages.right)

      const backData =
        await analyzeImage(postureImages.back)

      console.log("FRONT", frontData);
      console.log("LEFT", leftData);
      console.log("RIGHT", rightData);
      console.log("BACK", backData);

      frontLandmarks =
        frontData?.landmarks || [];

      leftLandmarks =
        leftData?.landmarks || [];

      rightLandmarks =
        rightData?.landmarks || [];

      backLandmarks =
        backData?.landmarks || [];


      setPoseLandmarks({
        front: frontLandmarks,
        left: leftLandmarks,
        right: rightLandmarks,
        back: backLandmarks,
      });
      console.log(
        "Back Count",
        backLandmarks?.length
      );

      console.log(
        "Left Count",
        leftLandmarks?.length
      );

      console.log(
        "Right Count",
        rightLandmarks?.length
      );
      console.log("frontLandmarks =", frontLandmarks);
      console.log("length =", frontLandmarks?.length);
      console.log("11 =", frontLandmarks?.[11]);
      console.log("12 =", frontLandmarks?.[12]);


      // Shoulder Asymmetry

      let frontShoulder = 0;

      if (
        frontLandmarks &&
        frontLandmarks.length > 12 &&
        frontLandmarks[11] &&
        frontLandmarks[12]
      ) {
        frontShoulder =
          Math.abs(
            frontLandmarks[11].y -
            frontLandmarks[12].y
          ) * 100;
      } else {
        console.log(
          "Front landmarks missing",
          frontLandmarks
        );
      }
      let backShoulder = 0;

      if (
        backLandmarks &&
        backLandmarks.length > 12 &&
        backLandmarks[11] &&
        backLandmarks[12]
      ) {
        backShoulder =
          Math.abs(
            backLandmarks[11].y -
            backLandmarks[12].y
          ) * 100;
      }

      shoulderAsymmetry =
        (frontShoulder + backShoulder) / 2;

      // Pelvic Asymmetry
      if (
        backLandmarks &&
        backLandmarks.length > 24 &&
        backLandmarks[23] &&
        backLandmarks[24]
      ) {
        pelvicAsymmetry =
          Math.abs(
            backLandmarks[23].y -
            backLandmarks[24].y
          ) * 100;
      }

      // CVA
      const sideLandmarks =
        leftLandmarks &&
          rightLandmarks
          ? (
            leftLandmarks[7]?.visibility >
            rightLandmarks[7]?.visibility
          )
            ? leftLandmarks
            : rightLandmarks
          : leftLandmarks || rightLandmarks;
      if (
        sideLandmarks &&
        sideLandmarks.length > 12 &&
        sideLandmarks[7] &&
        sideLandmarks[8] &&
        sideLandmarks[11] &&
        sideLandmarks[12]
      ) {

        const ear =
          sideLandmarks[7].visibility >
            sideLandmarks[8].visibility
            ? sideLandmarks[7]
            : sideLandmarks[8];


        const shoulder =
          sideLandmarks[11].visibility >
            sideLandmarks[12].visibility
            ? sideLandmarks[11]
            : sideLandmarks[12];

        cva = calcCVA(
          ear,
          shoulder
        );
        roundedShoulder =
          Math.abs(
            shoulder.x - ear.x
          ) * 100;

      }

      forwardHeadScore =
        cva >= 50
          ? 0
          : Math.min(
            100,
            Math.round(
              (50 - cva) * 5
            )
          );


      // Knee Valgus
      if (
        frontLandmarks &&
        frontLandmarks.length > 27 &&
        frontLandmarks[23] &&
        frontLandmarks[25] &&
        frontLandmarks[27]
      ) {
        kneeValgus =
          Math.abs(
            calcAngle(
              frontLandmarks[23],
              frontLandmarks[25],
              frontLandmarks[27]
            ) - 180
          ) / 2;
      }
      // Foot Width
      if (
        backLandmarks &&
        backLandmarks.length > 32 &&
        backLandmarks[31] &&
        backLandmarks[32]
      ) {
        footWidth =
          Math.abs(
            backLandmarks[31].x -
            backLandmarks[32].x
          ) * 100;
      }

      const roundedShoulderRisk =
        roundedShoulder > 12
          ? 100
          : roundedShoulder > 5
            ? 60
            : roundedShoulder > 2
              ? 30
              : 0;

      upperCross = Math.round(
        forwardHeadScore * 0.6 +
        roundedShoulderRisk * 0.4
      );

      lowerCross = Math.round(
        (pelvicAsymmetry * 10) * 0.5 +
        (stableHipDrop || 0) * 0.5
      );

      setPostureMetrics({
        shoulderAsymmetry,
        pelvicAsymmetry,
        kneeValgus,
        footWidth,

        neckAngle: cva,
        forwardHeadScore,

        roundedShoulder,
        upperCross,
        lowerCross,
      });
      officeResult =
        calculateOfficeRisk(
          cva,
          roundedShoulder,
          upperCross,
          lowerCross,
          shoulderAsymmetry,
          pelvicAsymmetry
        );

      setOfficeRisk(
        officeResult.risk
      );

      setOfficeLevel(
        officeResult.level
      );
      setPostureAnalyzed(true);


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

        const ankleY = lm[28].y;
        if (lastAnkleY.current !== null) {

          const descending =
            ankleY > lastAnkleY.current;

          const nearGround =
            ankleY > 0.85;

          if (
            descending &&
            nearGround &&
            !contactDetected.current
          ) {

            const comX =
              (
                lm[11].x +
                lm[12].x +
                lm[23].x +
                lm[24].x
              ) / 4;

            contactOverstride.current =
              Math.abs(
                lm[28].x - comX
              ) * 100;


            contactDetected.current = true;
          }

          if (ankleY < 0.75) {
            contactDetected.current = false;
          }
        }

        lastAnkleY.current = ankleY;




        const finalKneeAngle = maxLockedKnee.current;
        const finalPelvicDrop = maxLockedDrop.current;
        const finalOverstride = contactOverstride.current;

        const kneeDiff = 160 - finalKneeAngle;
        const calcKneeRisk = Math.min(95, Math.max(15, (kneeDiff > 0 ? kneeDiff * 2.8 : 15) + (postureMetrics.kneeValgus * 2.2)));
        const calcItbRisk = Math.min(95, Math.max(12, (finalPelvicDrop * 8) + (postureMetrics.pelvicAsymmetry * 2.5)));
        const baseOverstrideRisk = finalOverstride > 10 ? (finalOverstride - 10) * 6 : 5;
        const calcAchillesRisk =
          Math.min(
            95,
            Math.max(
              10,
              baseOverstrideRisk
            )
          );
        const calcShinRisk =
          Math.min(
            95,
            Math.max(
              10,
              baseOverstrideRisk * 1.2
            )
          );

        const computedRisks = {
          runnersKnee: Math.round(calcKneeRisk),
          achilles: Math.round(calcAchillesRisk),
          itBand: Math.round(calcItbRisk),
          shinSplints: Math.round(calcShinRisk),
        };
        const maxRiskValue = Math.max(
          computedRisks.runnersKnee,
          computedRisks.achilles,
          computedRisks.itBand,
          computedRisks.shinSplints
        );

        const coreScore = Math.min(
          98,
          Math.max(40, 100 - (maxRiskValue * 0.4))
        );

        if (framesCount.current % 15 === 0) {

          setInjuryRisks(computedRisks);

          setStableScore(
            Math.round(coreScore)
          );

          setStableKneeAngle(
            finalKneeAngle
          );

          setStableHipDrop(
            Math.round(finalPelvicDrop)
          );

        }
        const newSubMetrics = {
          eff: Math.round(coreScore),
          hip: Math.round(Math.max(30, 100 - (finalPelvicDrop * 8) - postureMetrics.pelvicAsymmetry)),
          knee: Math.round(Math.max(30, 100 - (kneeDiff * 2) - postureMetrics.kneeValgus)),
          mob: Math.round(Math.min(100, Math.max(45, 100 - (calcAchillesRisk * 0.3)))),
          bal: Math.round(Math.max(40, 100 - (finalPelvicDrop * 5) - postureMetrics.shoulderAsymmetry))
        };

        const overallScore = Math.round(
          (
            newSubMetrics.eff +
            newSubMetrics.hip +
            newSubMetrics.knee +
            newSubMetrics.mob +
            newSubMetrics.bal
          ) / 5
        );

        if (framesCount.current % 15 === 0) {

          setInjuryRisks(computedRisks);

          setStableScore(overallScore);

          setStableKneeAngle(finalKneeAngle);

          setStableHipDrop(
            Math.round(finalPelvicDrop)
          );

          setSubMetrics(newSubMetrics);

        }


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
            sum = `แกนสะโพกเอียงทรุดตัวขณะก้าวลงน้ำหนัก ผนวกน้ำหนักเสริมแรงจากประวัติแนวกระดูกเชิงกรานเอียง (Pelvic Asymmetry: ${postureMetrics.pelvicAsymmetry}%)`;
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
  }, []);

  useEffect(() => { if (videoURL) startPose(); }, [videoURL, startPose]);
  useEffect(() => {

    generateReport();

  }, [
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
        shoulderAsymmetry: postureMetrics.shoulderAsymmetry,
        pelvicAsymmetry: postureMetrics.pelvicAsymmetry,
        kneeValgus: postureMetrics.kneeValgus,
        footWidth: postureMetrics.footWidth,
        neckAngle: postureMetrics.neckAngle,
      },

      dynamicAnalysis: {
        kneeAngle: stableKneeAngle || 0,
        hipDrop: stableHipDrop || 0,
        overstrideEstimate: contactOverstride.current,
        score: stableScore,
      },



      injuryRisk: {
        runnersKnee: injuryRisks.runnersKnee,
        achilles: injuryRisks.achilles,
        itBand: injuryRisks.itBand,
        shinSplints: injuryRisks.shinSplints,
      },
      officeSyndrome: {
        risk: officeRisk,
        level: officeLevel,

        neckAngle: postureMetrics.neckAngle || 0,

        forwardHeadScore:
          postureMetrics.forwardHeadScore || 0,

        roundedShoulder:
          postureMetrics.roundedShoulder || 0,

        upperCross:
          postureMetrics.upperCross || 0,

        lowerCross:
          postureMetrics.lowerCross || 0,

        shoulderAsymmetry:
          postureMetrics.shoulderAsymmetry || 0,

        pelvicAsymmetry:
          postureMetrics.pelvicAsymmetry || 0,

        findings: [],

        recommendations: [],
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
  const generateAIReport = async () => {
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
    const confidence = Math.min(
      95,
      60 + rootCauses.length * 10
    );
    if (postureMetrics.footWidth > 5) {
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

    const finalReport = {
      score: stableScore,
      riskLevel: stableRiskLevel,
      confidence,
      primaryRisk, // ✅ ใช้ตัวนี้
      rootCauses,
      exercises,
      advice,
    };


    console.log("REPORT SAVED");
    console.log(finalReport);
    const executiveSummary = `
Movement Score : ${stableScore}/100

ความเสี่ยงหลัก :
${primaryRisk.name} (${primaryRisk.value}%)

ปัจจัยสำคัญที่ตรวจพบ :
• ${rootCauses.join("\n• ")}

คำแนะนำเบื้องต้น :
• ${[...new Set(exercises)].join("\n• ")}

สรุป :
แนะนำให้ปรับรูปแบบการเคลื่อนไหวและเสริมสร้างความแข็งแรงเฉพาะจุดเพื่อลดความเสี่ยงการบาดเจ็บในอนาคต
`;

    setConfidenceScore(confidence);

    setAiReport({
      executiveSummary,
      rootCause: rootCauses.join(" • "),
      recommendation: [...new Set(exercises)].join(" • "),
      runningAdvice: advice.join(" • "),
    });
    const analysisSummary = `
Movement Score ${stableScore}/100

Primary Risk: ${primaryRisk.name}

Office Syndrome Risk: ${officeLevel}

Hip Drop: ${stableHipDrop}

Knee Valgus: ${postureMetrics.kneeValgus}

Neck Angle (CVA): ${Math.round(
      postureMetrics.neckAngle || 0
    )}°
`;

    console.log("VALUES", {
      neckAngle: postureMetrics.neckAngle,
      forwardHeadScore:
        postureMetrics.forwardHeadScore,
      roundedShoulder:
        postureMetrics.roundedShoulder,
      upperCross:
        postureMetrics.upperCross,
    });

    console.log("POSTURE METRICS", postureMetrics);
    console.log(
      "POSTURE IMAGES",
      postureImages
    );
    console.log("POSE LANDMARKS", poseLandmarks);
    console.log("POSE LANDMARKS STATE", poseLandmarks);
    const reportData = {
      executiveSummary,
      injuryRisks,
      analysisSummary,

      assessmentImages: {
        front: postureImages.front,
        left: postureImages.left,
        right: postureImages.right,
        back: postureImages.back,
      },
      landmarks: {
        front: poseLandmarks.front,
        left: poseLandmarks.left,
        right: poseLandmarks.right,
        back: poseLandmarks.back,
      },

      rootCause: rootCauses,
      recommendation: [...new Set(exercises)],
      runningAdvice: advice,

      officeRisk,
      officeLevel,

      officeSyndrome: {
        risk: officeRisk,
        level: officeLevel,

        neckAngle: postureMetrics.neckAngle || 0,

        forwardHeadScore:
          postureMetrics.forwardHeadScore || 0,

        roundedShoulder:
          postureMetrics.roundedShoulder || 0,

        upperCross:
          postureMetrics.upperCross || 0,

        lowerCross:
          postureMetrics.lowerCross || 0,

        shoulderAsymmetry:
          postureMetrics.shoulderAsymmetry || 0,

        pelvicAsymmetry:
          postureMetrics.pelvicAsymmetry || 0,

        findings: [
          (postureMetrics.forwardHeadScore || 0) > 20
            ? "Forward Head Posture"
            : null,

          (postureMetrics.roundedShoulder || 0) > 2
            ? "Rounded Shoulder"
            : null,

          (postureMetrics.upperCross || 0) > 20
            ? "Upper Cross Syndrome"
            : null,

          (postureMetrics.lowerCross || 0) > 20
            ? "Lower Cross Syndrome"
            : null,

          (postureMetrics.shoulderAsymmetry || 0) > 5
            ? "Shoulder Imbalance"
            : null,

          (postureMetrics.pelvicAsymmetry || 0) > 5
            ? "Pelvic Asymmetry"
            : null,
        ].filter(Boolean),

        recommendations: [
          (postureMetrics.forwardHeadScore || 0) > 20
            ? "Chin Tuck 3 เซ็ต x 15 ครั้ง"
            : null,

          (postureMetrics.forwardHeadScore || 0) > 20
            ? "Wall Angel 3 เซ็ต x 10 ครั้ง"
            : null,

          (postureMetrics.roundedShoulder || 0) > 2
            ? "Doorway Stretch 3 เซ็ต x 30 วินาที"
            : null,

          (postureMetrics.roundedShoulder || 0) > 2
            ? "Band Pull Apart 3 เซ็ต x 15 ครั้ง"
            : null,

          (postureMetrics.upperCross || 0) > 20
            ? "Deep Neck Flexor Training"
            : null,

          (postureMetrics.lowerCross || 0) > 20
            ? "Hip Flexor Stretch"
            : null,
        ].filter(Boolean),
      },

      movementScore: stableScore,

      diagnosis,
      riskLevel: stableRiskLevel,

      kneeAngle: stableKneeAngle,
      hipDrop: stableHipDrop,
      overstrideEstimate: contactOverstride.current,

      cadence: "Not Available",

      kneeValgus: postureMetrics.kneeValgus,
      pelvicAsymmetry: postureMetrics.pelvicAsymmetry,
      neckAngle: postureMetrics.neckAngle,
      shoulderAsymmetry: postureMetrics.shoulderAsymmetry,
      footWidth: postureMetrics.footWidth,

      createdAt: new Date().toISOString(),
    };
    console.log("REPORT DATA", reportData);
    console.log(
      "SAVE REPORT",
      reportData.assessmentImages
    );
    console.log(
      "FULL REPORT DATA",
      reportData
    );
    console.log("STEP A");

    setReportData(reportData);

    console.log("SAVE START");

    const { data, error } =
      await supabase
        .from("reports")
        .insert({
          user_id: user?.id,
          score: stableScore,
          risk_level: stableRiskLevel,
          diagnosis,
          report_json: reportData,
          is_paid: false,
        })
        .select();

    console.log("INSERT DATA =", data);
    console.log("INSERT ERROR =", error);

    if (error) {
      alert(error.message);
    }

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
    navBtn: {
      color: "#00E5FF",
      textDecoration: "none",
      fontWeight: 700,
      fontSize: 14,
      padding: "10px 16px",
      borderRadius: 999,
      background: "rgba(0,229,255,0.08)",
      border: "1px solid rgba(0,229,255,0.15)",
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

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 10,
      }}>



        <div>Clerk Test</div>
      </div>


      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <nav style={S.nav}>
        <div
          style={{
            ...S.navIn,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >

          {/* LEFT */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <img
              src="/duha-icon.png"
              width="60"
            />

            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#fff",
                }}
              >
                RUNLAB AI
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: "#00E5FF",
                  letterSpacing: 2,
                  fontWeight: 700,
                }}
              >
                POWERED BY DUHA
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            <a href="/dashboard" style={S.navBtn}>
              📊 Dashboard
            </a>
          </div>

          {/* RIGHT */}
          <div>
            {!user ? (
              <SignInButton mode="modal">
                <button style={S.bp}>
                  Login
                </button>
              </SignInButton>
            ) : (
              <UserButton />
            )}
          </div>

        </div>
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
            <button
              onClick={() =>
                document
                  .getElementById("upload-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                background: "#00e5ff",
                color: "#000",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              เริ่มวิเคราะห์เลย
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("report-export")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid #334155",
                padding: "12px 24px",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              ดูตัวอย่างรายงาน
            </button>
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
      <div
        style={{
          ...S.card,
          gridColumn: "span 3",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          background: "#070f1e",
        }}
      >
        <PoseSlot
          label="รูปด้านหน้า (Front)"
          preview={postureImages.front}
          onFile={async (f) => {

            const fileName =
              `front-${Date.now()}.jpg`;

            const { data, error } =
              await supabase.storage
                .from("posture-images")
                .upload(fileName, f);

            if (error) {
              console.error(error);
              return;
            }

            const {
              data: { publicUrl }
            } = supabase.storage
              .from("posture-images")
              .getPublicUrl(data.path);

            console.log(publicUrl);

            setPostureImages((p) => ({
              ...p,
              front: publicUrl,
            }));
          }}
        />


        <PoseSlot
          label="รูปด้านซ้าย (Left)"
          preview={postureImages.left}
          onFile={async (f) => {

            const fileName =
              `front-${Date.now()}.jpg`;

            const { data, error } =
              await supabase.storage
                .from("posture-images")
                .upload(fileName, f);

            if (error) {
              console.error(error);
              return;
            }

            const { data: publicUrl } =
              supabase.storage
                .from("posture-images")
                .getPublicUrl(data.path);

            setPostureImages((p) => ({
              ...p,
              left: publicUrl.publicUrl,
            }));
          }}
        />


        <PoseSlot
          label="รูปด้านขวา (Right)"
          preview={postureImages.right}
          onFile={async (f) => {

            const fileName =
              `front-${Date.now()}.jpg`;

            const { data, error } =
              await supabase.storage
                .from("posture-images")
                .upload(fileName, f);

            if (error) {
              console.error(error);
              return;
            }

            const { data: publicUrl } =
              supabase.storage
                .from("posture-images")
                .getPublicUrl(data.path);

            setPostureImages((p) => ({
              ...p,
              right: publicUrl.publicUrl,
            }));
          }}
        />


        <PoseSlot
          label="รูปด้านหลัง (Back)"
          preview={postureImages.back}
          onFile={async (f) => {

            const fileName =
              `front-${Date.now()}.jpg`;

            const { data, error } =
              await supabase.storage
                .from("posture-images")
                .upload(fileName, f);

            if (error) {
              console.error(error);
              return;
            }

            const { data: publicUrl } =
              supabase.storage
                .from("posture-images")
                .getPublicUrl(data.path);


            setPostureImages((p) => ({
              ...p,
              back: publicUrl.publicUrl,
            }));
          }}
        />

      </div>

      <div
        style={{
          ...S.card,
          marginTop: 20,
          textAlign: "center",
          background: "#070f1e",
        }}
      >
        <button
          onClick={processStaticPosture}
          style={{
            ...S.bp,
            width: "100%",
            background: "#10b981",
            color: "#fff",
          }}
        >
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
            <h3
              style={{
                color: "#fff",
                marginBottom: 10,
              }}
            >
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
      <div
        style={{
          background: "#050b14",
          padding: "50px 0",
          borderTop: "1px solid #1e293b",
        }}
      >
        <div style={S.wrap}>

          <div style={S.st}>
            <span style={S.sn}>3</span>
            รายงานผลวิเคราะห์ความเสี่ยงการบาดเจ็บของคุณ
          </div>

          <button
            onClick={generateAIReport}
            style={{
              background: "#00e5ff",
              color: "#000",
              border: "none",
              padding: "12px 20px",
              borderRadius: 12,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 20,
              marginBottom: 20
            }}
          >
            สร้างรายงาน AI
          </button>

          {aiReport.executiveSummary && (
            <div
              style={{
                marginTop: 20,
                padding: 24,
                background: "#08101f",
                borderRadius: 20,
                border: "1px solid #1e293b"
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
                  background: "#07111f",
                  border: "1px solid #1e293b",
                  borderRadius: 16,
                  padding: 20,
                  marginTop: 20
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 700
                  }}
                >
                  PRIMARY RISK
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#ef4444",
                    marginTop: 8
                  }}
                >
                  {primaryRiskData.name}
                </div>

                <div
                  style={{
                    color: "#94a3b8",
                    marginTop: 8
                  }}
                >
                  {primaryRiskData.value}
                </div>
              </div>
              <p>{aiReport.executiveSummary}</p>
              <h3>Key Findings</h3>

              <ul
                style={{
                  color: "#cbd5e1",
                  lineHeight: 2,
                  paddingLeft: 20
                }}
              >
                <li>Knee Angle : {stableKneeAngle}°</li>
                <li>Hip Drop : {stableHipDrop}°</li>
                <li>Knee Valgus : {postureMetrics.kneeValgus}°</li>
                <li>Pelvic Asymmetry : {postureMetrics.pelvicAsymmetry}°</li>
                <li>Overstride : {maxLockedOverstride.current}%</li>
              </ul>
              <h3>จุดที่ควรปรับปรุง</h3>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 12
                }}
              >
                {aiReport.rootCause
                  .split(" • ")
                  .map((cause, index) => (
                    <div
                      key={index}
                      style={{
                        background: "#07111f",
                        border: "1px solid #1e293b",
                        borderRadius: 16,
                        padding: 16
                      }}
                    >
                      <div
                        style={{
                          color: "#ef4444",
                          fontWeight: 700
                        }}
                      >
                        ⚠️ Finding {index + 1}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#cbd5e1"
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
                  background: "#07111f",
                  border: "1px solid #1e293b",
                  borderRadius: 16,
                  padding: 20,
                  marginTop: 12
                }}
              >
                <div>Week 1-2 : ลดปริมาณการวิ่ง 20%</div>
                <div style={{ marginTop: 10 }}>
                  Week 3-4 : เริ่ม Strength Training
                </div>
                <div style={{ marginTop: 10 }}>
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
              window.location.href = "/dashboard";
            }}
            style={{
              background: "#22c55e",
              color: "#fff",
              border: "none",
              padding: "12px 20px",
              borderRadius: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            📄 Open Report
          </button>
          <p style={S.ss}>ตัวเลขคำนวณแบบแม่นยำร่วมกับแผนผังชีวกลศาสตร์เพื่อชี้เป้าความเสี่ยงการเกิดโรคเรื้อรัง</p>
        </div> {/* ปิด S.wrap */}
      </div>   {/* ปิด STEP 3 */}


      {/* STEP 4 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 26 }}>
        <Stat label="RUNNING SCORE" val={stableScore || "—"} color="#00e5ff" />
        <Stat label="RISK STATUS" val={stableRiskLevel} color={riskColor} />
        <Stat label="Peak Knee Angle" val={stableKneeAngle !== null ? `${stableKneeAngle}°` : "—"} color="#3b82f6" />
        <Stat label="MAX DYNAMIC HIP DROP" val={stableHipDrop !== null ? `${stableHipDrop}°` : "—"} color="#a78bfa" />
      </div>

{/* TWO-COLUMN LAYOUT: SKELETON MODEL VS RISK CARDS */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 30,
    alignItems: "stretch",
  }}
>
  {/* LEFT */}
  <div
    style={{
      height: "100%",
      minHeight: 720,
    }}
  >
<InteractiveAnatomy
  risks={injuryRisks}
  frontImage={postureImages?.front}
  frontLandmarks={poseLandmarks?.front}
/>
);
  </div>

  {/* RIGHT */}
  <div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        minHeight: 720,
      }}
    >
      <RiskCard
        title="Runner's Knee (สะบ้าอักเสบ)"
        pct={injuryRisks.runnersKnee}
        desc="ประเมินผิวข้อสะบ้าจากมุมเหยียดเข่า ร่วมกับภาวะเข่าบิดล้มเข้าด้านใน"
      />

      <RiskCard
        title="Achilles Tendonitis (เอ็นร้อยหวาย)"
        pct={injuryRisks.achilles}
        desc="คำนวณแรงเค้นสะสมจากระยะก้าวยาวเกินจุดศูนย์ถ่วงลำตัว (Overstride)"
      />

      <RiskCard
        title="IT Band Syndrome (เจ็บข้างเข่า)"
        pct={injuryRisks.itBand}
        desc="วัดมุมบิดเค้นเนื้อเยื่อข้างขาจากการทรุดตัวของกระดูกเชิงกรานและสะโพก"
      />

      <RiskCard
        title="Shin Splints (เจ็บหน้าแข้ง)"
        pct={injuryRisks.shinSplints}
        desc="ประเมินแรงกระแทกแนวกระดูกหน้าแข้งจากการลงส้นเท้าล้ำแนวสะโพกเกินเกณฑ์"
      />
    </div>
  </div>
</div>
        {/* OFFICE SYNDROME SECTION */}

        <div
          style={{
            marginTop: 24,
            background: "#091120",
            borderRadius: 24,
            padding: 24,
            border: "1px solid #1e293b",
          }}
        >
          <h3
            style={{
              color: "#fff",
              fontSize: 20,
              marginBottom: 16,
            }}
          >
            OFFICE SYNDROME ANALYSIS
          </h3>

          {reportData?.officeSyndrome && (
            <>

              <OfficeRiskCard
                risk={reportData.officeSyndrome.risk}
                level={reportData.officeSyndrome.level}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                  gap: 16,
                  marginTop: 20,
                }}

              >

                <Stat
                  label="CRANIOVERTEBRAL ANGLE (CVA)"
                  val={`${Math.round(reportData.officeSyndrome.neckAngle)}°`}
                  color="#ef4444"
                />
                <Stat
                  label="ROUNDED SHOULDER"
                  val={`${Math.round(
                    reportData.officeSyndrome.roundedShoulder || 0
                  )}`}
                  color="#8b5cf6"
                />

                <Stat
                  label="UPPER CROSS"
                  val={`${Math.round(
                    reportData.officeSyndrome.upperCross || 0
                  )}%`}
                  color="#ec4899"
                />

                <Stat
                  label="LOWER CROSS"
                  val={`${Math.round(
                    reportData.officeSyndrome.lowerCross || 0
                  )}%`}
                  color="#14b8a6"
                />
                <Stat
                  label="FORWARD HEAD SCORE"
                  val={`${Math.round(
                    reportData.officeSyndrome.forwardHeadScore
                  )}%`}
                  color="#ef4444"
                />
                <Stat
                  label="SHOULDER ASYMMETRY"
                  val={`${Math.round(reportData.officeSyndrome.shoulderAsymmetry)}%`}
                  color="#f59e0b"
                />

                <Stat
                  label="PELVIC ASYMMETRY"
                  val={`${Math.round(reportData.officeSyndrome.pelvicAsymmetry)}%`}
                  color="#3b82f6"
                />
              </div>

              <div
                style={{
                  marginTop: 20,
                  background: "#07101f",
                  borderRadius: 20,
                  padding: 20,
                  border: "1px solid #1e293b",
                }}
              >
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  RECOMMENDED CORRECTIVE EXERCISES
                </div>

                {(reportData?.officeSyndrome?.recommendations?.length || 0) > 0 ? (
                  reportData.officeSyndrome.recommendations.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        color: "#00e5ff",
                        marginBottom: 8,
                        fontWeight: 600,
                      }}
                    >
                      ✓ {item}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 14,
                    }}
                  >
                    ไม่พบความผิดปกติที่ต้องแก้ไขเพิ่มเติม
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ ...S.card, background: "#08101f" }}>
          <div
            style={{
              fontWeight: 700,
              marginBottom: 12,
              color: "#00e5ff",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🤖</span>
            สรุปภาพรวมและข้อเสนอแนะเชิงชีวกลศาสตร์ (AI Overview)
          </div>

          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {analysisSummary || "ระบบกำลังประมวลผลโครงสร้างเพื่อสรุปพฤติกรรมแรงกดและแนวองศากระดูกของคุณ"}
          </p>
        </div>
        <div style={{ ...S.card, background: "#08101f" }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: "#f59e0b", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><span>🎯</span> แนวทางและโปรแกรมแก้ไข: {diagnosis || "รอข้อมูล"}</div>
          <div style={{ background: "#040914", border: "1px solid #1e293b", borderRadius: 14, padding: "16px", fontSize: 13, color: "#e2e8f0", lineHeight: 1.7 }}>
            {recommendation || "แนวทางฝึกความแข็งแรงกล้ามเนื้อและปรับฟอร์มการวิ่งที่ถูกต้องเพื่อลดการบาดเจ็บ"}
          </div>
        </div>

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
                    PRO-KNEE: โปรแกรมแก้ปวดเข่าในนักวิ่ง
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
                    3,000{" "}
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
                        price: 3000,
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
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Run Coaching </h3>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>วางแผนเวทเทรนนิ่ง และโปรแกรมวิ่ง ให้จบแบบไม่เจ็บ</p>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94a3b8", marginTop: 14, background: "#040914", padding: "6px 12px", borderRadius: 8, width: "fit-content" }}>
                    <span>⏱️ 4 สัปดาห์</span><span>📹 20 วิดีโอ</span>
                  </div>
                </div>
                <div style={{ background: "#0d1727", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1e293b" }}>
                  <div style={S.priceTag}>1,990 <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>THB</span></div>
                  <button
                    onClick={() =>
                      setSelectedCourse({
                        name: "RUN-COACHING",
                        price: 1990,
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
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Consulting: คุยและวางโปรแกรม กับโค้ช</h3>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>คุยเพื่อแก้ปัญหา และวางแผนการฝึกซ้อมกับโค้ชอาร์ท </p>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94a3b8", marginTop: 14, background: "#040914", padding: "6px 12px", borderRadius: 8, width: "fit-content" }}>
                    <span>⏱️ 1 ชั่วโมง</span>
                  </div>
                </div>
                <div style={{ background: "#0d1727", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1e293b" }}>
                  <div style={S.priceTag}>2000 <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>THB</span></div>
                  <button
                    onClick={() =>
                      setSelectedCourse({
                        name: "RUN-MOBILITY",
                        price: 2000,
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
                </div> {/* PRICE SECTION */}

              </div> {/* RUN-MOBILITY CARD */}

            </div> {/* courseGrid */}

          </div> {/* S.wrap */}

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
                  034-295-4553
                </div>
              </div>

              {/* ORDER SUMMARY */}
              <div
                style={{
                  ...S.card,
                  background: "#070f1e",
                  display: "flex",
                  flexDirection: "column",
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
                  สรุปรายการคอร์สที่เลือก
                </div>
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


                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 24,
                    borderTop: "1px solid #1e293b",
                  }}
                >
                  <div>
                    ติดต่อเรา LINE Official
                  </div>

                  <div
                    style={{
                      color: "#06C755",
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    @runlab.official
                  </div>

                </div>
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


              </div> {/* SLIP UPLOAD */}

            </div> {/* PAYMENT GRID */}

          </div> {/* STEP 5 WRAP */}

        </div> {/* STEP 5 */}
        {/* FOOTER & COPYRIGHT SECTION */}
        <footer style={{ background: "#020613", borderTop: "1px solid #1e293b", padding: "40px 0 30px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#fff", letterSpacing: 0.5 }}>
                RUNLAB <span style={{ fontSize: 12, color: "#00e5ff", fontWeight: 600 }}>BY นายปริญญา ปานศิริ</span>
              </div>
              <p style={{ fontSize: 12, color: "#475569", margin: 0, textAlign: "center" }}>
                ระบบวิเคราะห์สรีระและฟอร์มการวิ่งเพื่อการป้องกันอาการบาดเจ็บอย่างตรงจุด
              </p>
            </div>
            <div style={{ width: "100%", maxWidth: 300, height: 1, background: "linear-gradient(to right, transparent, #1e293b, transparent)" }} />
            <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 1.6 }}>
              © {new Date().getFullYear()} <strong>Runlab by นายปริญญา ปานศิริ</strong>. All Rights Reserved.
            </div>
          </div>
        </footer>
      </div>
      );
}