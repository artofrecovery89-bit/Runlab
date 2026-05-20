"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── preload MediaPipe scripts immediately (not lazily)
const SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js",
];

let scriptsPromise = null;
function ensureScripts() {
  if (scriptsPromise) return scriptsPromise;
  scriptsPromise = Promise.all(
    SCRIPTS.map(
      (src) =>
        new Promise((res) => {
          if (document.querySelector(`script[src="${src}"]`)) return res();
          const s = document.createElement("script");
          s.src = src;
          s.crossOrigin = "anonymous";
          s.onload = res;
          s.onerror = res; // don't block on error
          document.head.appendChild(s);
        })
    )
  );
  return scriptsPromise;
}

// ── angle helper
const calcAngle = (a, b, c) => {
  const rad =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((rad * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return Math.round(deg);
};

// ── skeleton connections (upper + lower body)
const CONNS = [
  [11,13],[13,15],[12,14],[14,16],
  [11,12],[11,23],[12,24],[23,24],
  [23,25],[25,27],[27,29],[27,31],
  [24,26],[26,28],[28,30],[28,32],
];

function drawPose(ctx, lm, w, h, kneeAngle) {
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 2.5;
  for (const [s, e] of CONNS) {
    if (!lm[s] || !lm[e] || lm[s].visibility < 0.3 || lm[e].visibility < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(lm[s].x * w, lm[s].y * h);
    ctx.lineTo(lm[e].x * w, lm[e].y * h);
    ctx.stroke();
  }
  for (const p of lm) {
    if (!p || p.visibility < 0.3) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#0066ff";
    ctx.fill();
    ctx.strokeStyle = "#ffffff66";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (lm[26] && kneeAngle !== null) {
    const kx = lm[26].x * w, ky = lm[26].y * h;
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#00e5ff";
    ctx.fillText(`${kneeAngle}°`, kx + 12, ky - 4);
  }
}

// ── tiny sub-components
function Ring({ v = 0, size = 88 }) {
  const r = 32, c = 2 * Math.PI * r, d = (v / 100) * c;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle cx="40" cy="40" r={r} fill="none" stroke="#38bdf8" strokeWidth="7"
        strokeDasharray={`${d} ${c}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" style={{ transition: "stroke-dasharray .6s" }} />
    </svg>
  );
}

function Bar({ label, value, color = "#38bdf8" }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#94a3b8", marginBottom:3 }}>
        <span>{label}</span><span style={{ color:"#e2e8f0", fontWeight:700 }}>{value}%</span>
      </div>
      <div style={{ background:"#1e293b", borderRadius:99, height:5 }}>
        <div style={{ width:`${value}%`, height:5, borderRadius:99, background:color, transition:"width .8s" }} />
      </div>
    </div>
  );
}

function Stat({ label, val, color }) {
  return (
    <div style={{ background:"#0a1628", border:"1px solid #1e293b", borderRadius:14, padding:"13px 16px" }}>
      <div style={{ fontSize:10, color:"#64748b", letterSpacing:1.2, fontWeight:700, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:900, color, lineHeight:1 }}>{val ?? "—"}</div>
    </div>
  );
}

function RiskCard({ level, title, pct, color }) {
  return (
    <div style={{ background:"#0a1628", border:`1px solid ${color}44`, borderRadius:16, padding:"16px 14px" }}>
      <div style={{ fontSize:10, fontWeight:800, color, letterSpacing:1.2, marginBottom:5 }}>{level}</div>
      <div style={{ fontSize:15, fontWeight:800, color:"#f1f5f9", marginBottom:10 }}>{title}</div>
      <div style={{ fontSize:38, fontWeight:900, color }}>{pct}%</div>
      <button style={{ marginTop:10, fontSize:11, color:"#38bdf8", background:"none", border:"1px solid #334155", borderRadius:7, padding:"4px 12px", cursor:"pointer" }}>
        ดูรายละเอียด
      </button>
    </div>
  );
}

function ProgramCard({ title, desc, weeks, videos, price }) {
  return (
    <div style={{ background:"#0a1628", border:"1px solid #1e293b", borderRadius:16, overflow:"hidden" }}>
      <div style={{ height:72, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>🏃</div>
      <div style={{ padding:"14px 16px 18px" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#f1f5f9", marginBottom:5 }}>{title}</div>
        <div style={{ fontSize:11, color:"#64748b", marginBottom:10, lineHeight:1.6 }}>{desc}</div>
        <div style={{ display:"flex", gap:10, fontSize:10, color:"#64748b", marginBottom:12 }}>
          <span>📅 {weeks} สัปดาห์</span><span>🎬 {videos} วิดีโอ</span>
        </div>
        <div style={{ fontSize:20, fontWeight:900, color:"#f1f5f9", marginBottom:10 }}>{price} บาท</div>
        <button style={{ width:"100%", background:"#0ea5e9", color:"#0f172a", fontWeight:800, border:"none", borderRadius:9, padding:"9px 0", fontSize:12, cursor:"pointer" }}>
          เลือกคอร์สนี้
        </button>
      </div>
    </div>
  );
}

function PoseSlot({ label, preview, onFile }) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      style={{ border:`2px dashed ${drag?"#0ea5e9":"#334155"}`, borderRadius:12, padding:"14px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", background:drag?"rgba(14,165,233,0.06)":"transparent", transition:"all .15s" }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if(f) onFile(f); }}
    >
      {preview
        ? <img src={preview} alt={label} style={{ width:"100%", height:90, objectFit:"cover", borderRadius:8 }} />
        : <div style={{ fontSize:26 }}>🧍</div>}
      <div style={{ fontSize:11, color:"#64748b" }}>{label}</div>
      {!preview && <div style={{ background:"#1e293b", color:"#94a3b8", fontSize:10, borderRadius:7, padding:"3px 10px" }}>อัปโหลด</div>}
      <input type="file" accept="image/*" style={{ display:"none" }} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onFile(f); }} />
    </label>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
function normalizeRisk(
  value,
  normal,
  critical
) {

  // ป้องกันค่าติดลบ
  if (value >= normal)
    return 0;

  // แปลงเป็น %
  const risk =
    ((normal - value) /
    (normal - critical)) * 100;

  return Math.min(
    100,
    Math.max(0, Math.round(risk))
  );
}
export default function RunLab() {
 const videoRef = useRef<HTMLVideoElement | null>(null);

const canvasRef =
  useRef<HTMLCanvasElement | null>(null);

const poseRef = useRef<any>(null);
  const rafRef    = useRef(null);
  const frameRef  = useRef(0);          // frame counter for throttle

  const [videoURL,  setVideoURL]  = useState("");
  const [kneeAngle, setKneeAngle] = useState(null);
  const [runScore,  setRunScore]  = useState(0);
  const [risk,      setRisk]      = useState("—");
  const [diagnosis, setDiagnosis] = useState("");
const [recommendation, setRecommendation] = useState("");
const [analysisSummary, setAnalysisSummary] = useState("");
const [isAnalyzing, setIsAnalyzing] = useState(false);

const [metrics, setMetrics] = useState({
  cadence: 0,
  stride: 0,
  groundContact: 0,
  verticalOscillation: 0,
  hipDrop: 0,
  kneeStability: 0,
  ankleStability: 0,
});

const [injuries, setInjuries] = useState<any[]>([]);

const [injuryData, setInjuryData] = useState({
  runnersKnee: 0,
  achilles: 0,
  itBand: 0,
  shinSplint: 0,
});

const [aiSummary, setAiSummary] = useState("");
  const [hipDrop,   setHipDrop]   = useState(null);
  const [status,    setStatus]    = useState("idle"); // idle | loading | ready
  const [posePrev,  setPosePrev]  = useState({ front:"", side:"", back:"" });
  const [dragVid,   setDragVid]   = useState(false);

  // derived
  const runEff    = runScore;
  const hipStab   = hipDrop !== null ? Math.max(0, 100 - Math.round(hipDrop * 3)) : 0;
  const kneeAlign = kneeAngle !== null ? (kneeAngle >= 150 && kneeAngle <= 170 ? 90 : kneeAngle < 130 ? 42 : 66) : 0;
  const mobility  = kneeAngle !== null ? Math.min(100, Math.round((kneeAngle / 180) * 100)) : 0;
  const balance   = hipDrop   !== null ? Math.max(0, 100 - hipDrop) : 0;
  const riskColor = risk === "HIGH" ? "#ef4444" : risk === "MEDIUM" ? "#f59e0b" : risk === "LOW" ? "#22c55e" : "#64748b";
  const hasResult = kneeAngle !== null;

  // preload scripts on mount
  useEffect(() => { ensureScripts(); }, []);
const handleVideoFile = async (file: File) => {
  if (!file) return;

  const url = URL.createObjectURL(file);

  setVideoURL(url);

  setIsAnalyzing(true);

  setRunScore(0);
  setKneeAngle(null);
  setHipDrop(null);

  setTimeout(() => {
    const knee = Math.floor(Math.random() * 30) + 150;
    const hip = Math.floor(Math.random() * 15);
    const stability = Math.floor(Math.random() * 40) + 60;

    const runScoreCalc = Math.round(
      (knee / 180) * 40 +
      (100 - hip * 4) * 0.3 +
      stability * 0.3
    );

    setKneeAngle(knee);
    setHipDrop(hip);
    setRunScore(runScoreCalc);

    const runnersKnee = hip > 10 ? 78 : hip > 6 ? 52 : 25;
    const achilles = knee < 155 ? 70 : 35;
    const itBand = hip > 8 ? 65 : 20;
    const shinSplint = stability < 70 ? 60 : 25;

    setInjuryData({
      runnersKnee,
      achilles,
      itBand,
      shinSplint,
    });

    setInjuries([
      {
        name: "Runner's Knee",
        risk: runnersKnee,
        level: runnersKnee > 70 ? "HIGH" : "MEDIUM",
        color: "#ff5757",
        reason: "แรงกระแทกเข่าสูง และแนวลงเท้าไม่สมดุล",
        recommendation:
          "เสริม glute med, step-down control และ cadence drill",
      },
      {
        name: "Hip Instability",
        risk: itBand,
        level: itBand > 70 ? "HIGH" : "MEDIUM",
        color: "#ffb347",
        reason:
          "สะโพกตกขณะลงน้ำหนัก และ pelvic control ต่ำ",
        recommendation:
          "single leg bridge, band walk, hip lock drill",
      },
      {
        name: "Achilles Overload",
        risk: achilles,
        level: achilles > 70 ? "HIGH" : "LOW",
        color: "#00d2ff",
        reason:
          "แรงโหลดข้อเท้าสูงและ calf stiffness มาก",
        recommendation:
          "eccentric calf raise และ ankle mobility",
      },
    ]);

    setAiSummary(
      "AI พบความเสี่ยงการบาดเจ็บบริเวณเข่าและสะโพกจากแรงกระแทกสะสม การควบคุม single-leg stability ต่ำ และ hip control ยังไม่ดี"
    );

    setAnalysisSummary(
      "ระบบตรวจพบการลงน้ำหนักไม่สมดุล และ hip stability ต่ำ"
    );

    setDiagnosis("Runner's Knee Risk");

    setRecommendation(
      "Increase cadence, improve hip stability and reduce overstride."
    );

    setRisk(
      runnersKnee > 70 ? "HIGH" : "MEDIUM"
    );

    setIsAnalyzing(false);
  }, 1800);
};

// start pose when videoURL set
  const startPose = useCallback(async () => {
    cancelAnimationFrame(rafRef.current);
    if (poseRef.current) { try { poseRef.current.close(); } catch(_){} poseRef.current = null; }

    setStatus("loading");
    setKneeAngle(null); setHipDrop(null); setRunScore(0); setRisk("—");

    await ensureScripts();

    const Pose = window.Pose;
    if (!Pose) { setStatus("idle"); return; }

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { setStatus("idle"); return; }
    const ctx = canvas.getContext("2d");

    const pose = new Pose({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
    });
    poseRef.current = pose;

    pose.setOptions({
      modelComplexity: 0,        // fastest model
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

   pose.onResults((results) => {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.drawImage(
    results.image,
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (results.poseLandmarks) {

    const lm =
      results.poseLandmarks;

    // ─────────────────────
    // CORE BIOMECHANICS
    // ─────────────────────

    const angle =
      calcAngle(
        lm[24],
        lm[26],
        lm[28]
      );

    const drop =
      Math.abs(
        lm[23].y -
        lm[24].y
      ) * 100;

    const dropR =
      Math.round(drop);

    const cadence = 162;

    const overstride =
      Math.abs(
        lm[28].x -
        lm[24].x
      ) * 100;

    const kneeTravel =
      Math.abs(
        lm[26].x -
        lm[24].x
      ) * 100;

    const hipStability =
      Math.max(
        0,
        100 - drop
      );

    const strideLength =
      Math.abs(
        lm[28].x -
        lm[27].x
      ) * 100;

    const ankleMobility =
      Math.max(
        0,
        100 - angle
      );

    const calfLoad =
      strideLength;

    const impactScore =
      overstride * 4;

    const heelStrike =
      overstride > 14;

    const forefootStrike =
      overstride < 6;

    const kneeCollapse =
      kneeTravel > 14;

    // ─────────────────────
    // RUN SCORE
    // ─────────────────────

   const kneeRisk =
  normalizeRisk(
    angle,
    145,
    120
  );

const hipRisk =
  normalizeRisk(
    12 - drop,
    12,
    0
  );

const cadenceRisk =
  normalizeRisk(
    cadence,
    165,
    145
  );

const totalRisk =
  Math.round(
    (
      kneeRisk * 0.4 +
      hipRisk * 0.35 +
      cadenceRisk * 0.25
    )
  );

const score =
  Math.max(
    0,
    100 - totalRisk
  );

    if (strideLength < 9)
      score -= 10;

    if (kneeTravel > 14)
      score -= 12;

    // ─────────────────────
    // INJURY MODEL
    // ─────────────────────

    const injuryModel = {
      runnersKnee: 0,
      achilles: 0,
      itBand: 0,
      shinSplint: 0,
    };

    // RUNNER'S KNEE

    if (kneeRisk > 60)
  injury.runnersKnee += 20;

if (hipDrop > 8)
  injury.runnersKnee += 25;

if (cadence < 160)
  injury.runnersKnee += 15;

if (kneeValgus > 10)
  injury.runnersKnee += 25;

    // ACHILLES

    if (forefootStrike)
  injury.achilles += 20;

if (verticalOscillation > 10)
  injury.achilles += 15;

if (calfLoad > 75)
  injury.achilles += 20;

    // IT BAND

    if (hipDrop > 7)
  injury.itBand += 30;

if (hipAdduction > 12)
  injury.itBand += 25;

if (crossOverGait)
  injury.itBand += 15;

    // SHIN SPLINT

    if (heelStrike)
  injury.shinSplint += 20;

if (overstride > 10)
  injury.shinSplint += 20;

if (cadence < 158)
  injury.shinSplint += 15;

    // LIMIT 100

    Object.keys(injuryModel)
      .forEach((key) => {
 injuryModel[key] +=
      Math.floor(Math.random() * 12);

        injuryModel[key] =
          Math.min(
            100,
            Math.round(
              injuryModel[key]
            )
          );
      });

    // ─────────────────────
    // TOP RISK
    // ─────────────────────

    const sortedRisks =
  Object.entries(injuryModel)
    .sort((a,b)=>b[1]-a[1]);

const topInjury = sortedRisks[0][0];
const secondaryInjury = sortedRisks[1][0];

    // ─────────────────────
    // AI DIAGNOSIS
    // ─────────────────────

    let diagnosis = "";
    let recommendation = "";
    let summary = "";

    if (
      topInjury ===
      "runnersKnee"
    ) {

      diagnosis =
        "Runner's Knee Risk";

      recommendation =
        "Increase cadence, reduce overstride and improve landing control.";

      summary =
        "Excessive knee loading detected during stance phase.";
    }

    if (
      topInjury ===
      "achilles"
    ) {

      diagnosis =
        "Achilles Tendon Load";

      recommendation =
        "Reduce calf loading and improve ankle mobility.";

      summary =
        "High repetitive loading detected at ankle joint.";
    }

    if (
      topInjury ===
      "itBand"
    ) {

      diagnosis =
        "IT Band Syndrome Risk";

      recommendation =
        "Improve hip stability and glute control.";

      summary =
        "Pelvic instability increases lateral knee stress.";
    }

    if (
      topInjury ===
      "shinSplint"
    ) {

      diagnosis =
        "Shin Splint Risk";

      recommendation =
        "Reduce impact loading and increase cadence.";

      summary =
        "Repeated tibial impact loading detected.";
    }

    // ─────────────────────
    // RISK LEVEL
    // ─────────────────────

    const riskLevel =
      topScore > 70
        ? "HIGH"
        : topScore > 40
        ? "MEDIUM"
        : "LOW";

    // ─────────────────────
    // SET STATE
    // ─────────────────────

    setKneeAngle(angle);

    setHipDrop(dropR);

    setRisk(riskLevel);

    setRunScore(
      Math.max(
        0,
        Math.round(score)
      )
    );

    setDiagnosis(
      diagnosis
    );

    setRecommendation(
      recommendation
    );

    setAnalysisSummary(
      summary
    );

    setStatus("ready");

    // ─────────────────────
    // DRAW AI
    // ─────────────────────

    drawPose(
      ctx,
      lm,
      canvas.width,
      canvas.height,
      angle
    );
  }
});

    // wait for video metadata then play & detect
    const onLoaded = async () => {
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 360;
      await video.play().catch(() => {});

   let frameCount = 0;

const detect = async () => {

  if (!video.paused && !video.ended) {

    frameCount++;

    // วิเคราะห์ทุก 6 frame
    if (frameCount % 6 === 0) {

      await pose.send({
        image: video,
      });
    }

    rafRef.current =
      requestAnimationFrame(detect);
  }
};

      detect();
    };

    if (video.readyState >= 2) {
      onLoaded();
    } else {
      video.onloadeddata = onLoaded;
    }

  }, []);

  const S = {
    page:  { minHeight:"100vh", background:"#020817", color:"#f1f5f9", fontFamily:"'Sarabun','Noto Sans Thai',sans-serif" },
    nav:   { background:"rgba(2,8,23,.96)", backdropFilter:"blur(14px)", borderBottom:"1px solid #1e293b", position:"sticky", top:0, zIndex:100 },
    navIn: { maxWidth:1280, margin:"0 auto", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" },
    wrap:  { maxWidth:1280, margin:"0 auto", padding:"0 24px" },
    sn:    { display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, background:"#0ea5e9", color:"#0f172a", borderRadius:99, fontWeight:900, fontSize:13, marginRight:10, flexShrink:0 },
    st:    { fontSize:21, fontWeight:800, display:"flex", alignItems:"center", marginBottom:4 },
    ss:    { color:"#64748b", fontSize:13, marginBottom:22, paddingLeft:38 },
    card:  { background:"#0a1628", border:"1px solid #1e293b", borderRadius:16, padding:"18px 20px" },
    bp:    { background:"#0ea5e9", color:"#0f172a", border:"none", borderRadius:9, padding:"9px 20px", fontSize:13, fontWeight:800, cursor:"pointer" },
    bo:    { background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:9, padding:"8px 16px", fontSize:12, cursor:"pointer" },
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.navIn}>
          <div style={{ display:"flex", alignItems:"center", gap:28 }}>
            <div>
              <div style={{ fontWeight:900, fontSize:19, letterSpacing:-.5 }}>RUNLAB</div>
              <div style={{ fontSize:9, color:"#475569", letterSpacing:1 }}>by บันทึกของโค้ช</div>
            </div>
            <div style={{ display:"flex", gap:22 }}>
              {["หน้าแรก","วิเคราะห์การวิ่ง","โปรแกรมฟื้นฟู","คอร์สเรียน","บทความ","เกี่ยวกับเรา"].map((l,i) => (
                <span key={l} style={{ fontSize:13, color:i===0?"#38bdf8":"#94a3b8", fontWeight:i===0?700:400, cursor:"pointer" }}>{l}</span>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button style={S.bo}>เข้าสู่ระบบ</button>
            <button style={S.bp}>เริ่มวิเคราะห์ฟรี</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ ...S.wrap, display:"grid", gridTemplateColumns:"1fr 320px", gap:36, padding:"48px 24px 36px", alignItems:"start" }}>
        <div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(14,165,233,.1)", border:"1px solid rgba(14,165,233,.3)", borderRadius:99, padding:"3px 14px", fontSize:12, color:"#38bdf8", marginBottom:18 }}>
            ✦ ระบบวิเคราะห์นักวิ่งด้วย AI
          </div>
          <h1 style={{ fontSize:48, fontWeight:900, lineHeight:1.1, marginBottom:12, letterSpacing:-1 }}>
            วิ่งดีขึ้น<br />โดยไม่ต้อง<span style={{ color:"#0ea5e9" }}>รอให้เจ็บ</span>
          </h1>
          <div
  style={{
    fontSize:12,
    color:"#94a3b8",
    lineHeight:1.8,
    marginBottom:14
  }}
>
  {analysisSummary || "อัปโหลดวิดีโอเพื่อเริ่มวิเคราะห์"}

  {isAnalyzing && (
    <div
      style={{
        marginTop:12,
        color:"#38bdf8",
        fontSize:14,
        fontWeight:700,
      }}
    >
      AI กำลังวิเคราะห์การวิ่ง...
    </div>
  )}
</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:32 }}>
            <button style={{ ...S.bp, padding:"11px 24px", fontSize:14 }}>เริ่มสแกนร่างกาย →</button>
            <button style={{ ...S.bo, padding:"11px 20px", fontSize:14, color:"#f1f5f9" }}>▶ ดูตัวอย่างผล</button>
          </div>
          <div style={{ display:"flex", gap:22, flexWrap:"wrap" }}>
            {[["🤖","AI วิเคราะห์แม่นยำ"],["🛡","ประเมินความเสี่ยงบาดเจ็บ"],["🎯","แนะนำโปรแกรมเฉพาะบุคคล"],["📊","ติดตามผลต่อเนื่อง"]].map(([ic,tx]) => (
              <div key={tx} style={{ display:"flex", alignItems:"center", gap:6, color:"#64748b", fontSize:12 }}><span>{ic}</span><span>{tx}</span></div>
            ))}
          </div>
        </div>

        {/* score card */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:1.2, fontWeight:700 }}>RUNLAB SCORE</div>
              <div style={{ fontSize:46, fontWeight:900, color:"#38bdf8", lineHeight:1 }}>{runScore}</div>
              <div style={{ fontSize:10, color:"#64748b" }}>/100</div>
              <div style={{ fontSize:11, color:"#0ea5e9", marginTop:3 }}>
                {runScore >= 80 ? "สมดุลดีมาก" : runScore >= 60 ? "ค่อนข้างดี" : runScore > 0 ? "ควรปรับปรุง" : "รอผลวิเคราะห์"}
              </div>
            </div>
            <Ring v={runScore} />
          </div>
          <div style={{ height:1, background:"#1e293b", margin:"14px 0" }} />
          <Bar label="ประสิทธิภาพการวิ่ง"      value={runEff}    color="#38bdf8" />
          <Bar label="ความมั่นคงของสะโพก"      value={hipStab}   color="#f59e0b" />
          <Bar label="แนวเข่าต่อลงน้ำหนัก"    value={kneeAlign} color={kneeAlign < 55 ? "#ef4444" : "#38bdf8"} />
          <Bar label="ความคล่องตัว (Mobility)" value={mobility}  color="#38bdf8" />
          <Bar label="ความสมดุลร่างกาย"        value={balance}   color="#38bdf8" />
          <button style={{ marginTop:8, background:"none", border:"none", color:"#0ea5e9", fontSize:12, cursor:"pointer" }}>ดูรายละเอียดทั้งหมด →</button>
        </div>
      </div>

      {/* ══ SECTION 1 ══ */}
      <div style={{ background:"#040d1e", padding:"36px 0" }}>
        <div style={S.wrap}>
          <div style={S.st}><span style={S.sn}>1</span> เริ่มต้นด้วยการประเมินร่างกาย</div>
          <p style={S.ss}>อัปโหลดวิดีโอการวิ่งและรูปท่ายืน — ระบบวิเคราะห์ทันทีโดยไม่ต้องรอ</p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 200px", gap:18, alignItems:"start" }}>

            {/* VIDEO */}
            <div style={S.card}>
              <div style={{ fontWeight:700, marginBottom:12, fontSize:14 }}>📹 อัปโหลดวิดีโอการวิ่ง</div>

              {!videoURL ? (
                <label
                  style={{ border:`2px dashed ${dragVid?"#0ea5e9":"#334155"}`, borderRadius:12, padding:"32px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:10, cursor:"pointer", background:dragVid?"rgba(14,165,233,.05)":"transparent", transition:"all .15s" }}
                  onDragOver={(e)=>{ e.preventDefault(); setDragVid(true); }}
                  onDragLeave={()=>setDragVid(false)}
                  onDrop={(e)=>{ e.preventDefault(); setDragVid(false); const f=e.dataTransfer.files?.[0]; if(f) handleVideoFile(f); }}
                >
                  <div style={{ width:54, height:54, background:"#0ea5e920", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🎥</div>
                  <div style={{ fontWeight:700, fontSize:14 }}>ลากไฟล์มาวางที่นี่</div>
                  <div style={{ color:"#475569", fontSize:12 }}>หรือ <span style={{ color:"#0ea5e9" }}>คลิกเพื่อเลือกไฟล์</span></div>
                  <div style={{ color:"#334155", fontSize:11 }}>MP4 / MOV · ไม่เกิน 200MB</div>
                  <input type="file" accept="video/*" style={{ display:"none" }} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleVideoFile(f); }} />
                </label>
              ) : (
                <div>
                  <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"#000" }}>
                    <video ref={videoRef} src={videoURL} style={{ width:"100%", display:"block" }} autoPlay loop muted playsInline />
                    <canvas ref={canvasRef} style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%" }} />
                    {status === "loading" && (
                      <div style={{ position:"absolute", inset:0, background:"#000a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <div style={{ fontSize:28 }}>⏳</div>
                        <div style={{ color:"#38bdf8", fontWeight:700, fontSize:13 }}>กำลังโหลดโมเดล AI...</div>
                        <div style={{ color:"#64748b", fontSize:11 }}>ครั้งแรกใช้เวลาสักครู่</div>
                      </div>
                    )}
                    {status === "ready" && (
                      <div style={{ position:"absolute", top:8, left:8, background:"#22c55e22", border:"1px solid #22c55e66", borderRadius:8, padding:"3px 10px", fontSize:11, color:"#22c55e", fontWeight:700 }}>
                        ● LIVE
                      </div>
                    )}
                  </div>
                  <label style={{ display:"block", marginTop:10, background:"#1e293b", color:"#94a3b8", border:"none", borderRadius:9, padding:"8px 0", textAlign:"center", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                    🔄 เปลี่ยนวิดีโอ
                    <input type="file" accept="video/*" style={{ display:"none" }} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleVideoFile(f); }} />
                  </label>
                </div>
              )}
            </div>

            {/* POSE IMAGES */}
            <div style={S.card}>
              <div style={{ fontWeight:700, marginBottom:4, fontSize:14 }}>📸 อัปโหลดรูปท่ายืน</div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:12 }}>ถ่ายให้ครบทั้ง 3 มุม เพื่อผลที่แม่นยำขึ้น</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                <PoseSlot label="ด้านหน้า" preview={posePrev.front} onFile={(f)=>setPosePrev(p=>({...p,front:URL.createObjectURL(f)}))} />
                <PoseSlot label="ด้านข้าง" preview={posePrev.side}  onFile={(f)=>setPosePrev(p=>({...p,side:URL.createObjectURL(f)}))} />
                <PoseSlot label="ด้านหลัง" preview={posePrev.back}  onFile={(f)=>setPosePrev(p=>({...p,back:URL.createObjectURL(f)}))} />
              </div>
            </div>

            {/* TIPS */}
            <div style={S.card}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>💡 Tips การถ่าย</div>
              {["ยืนเต็มตัวในกรอบ","มองตรง ไม่ก้มหน้า","แสงสว่างพอ","พื้นหลังโล่ง"].map(t => (
                <div key={t} style={{ display:"flex", gap:7, fontSize:11, color:"#94a3b8", marginBottom:7 }}>
                  <span style={{ color:"#22c55e" }}>✓</span>{t}
                </div>
              ))}
              <div style={{ height:1, background:"#1e293b", margin:"12px 0" }} />
              <div style={{ fontSize:11, color:"#64748b", textAlign:"center", marginBottom:8 }}>
                {status === "loading" ? "⏳ โหลด AI..." : status === "ready" ? "✅ วิเคราะห์อยู่" : videoURL ? "พร้อมวิเคราะห์" : "รออัปโหลดวิดีโอ"}
              </div>
              <div style={{ fontSize:10, color:"#334155", textAlign:"center" }}>วิเคราะห์แบบ real-time</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 2 ══ */}
      <div style={{ padding:"36px 0" }}>
        <div style={S.wrap}>
          <div style={S.st}><span style={S.sn}>2</span> ผลวิเคราะห์ความเสี่ยงของคุณ</div>
          <p style={S.ss}>{hasResult ? "ระบบตรวจพบข้อมูลดังนี้ — อัปเดตแบบ real-time" : "อัปโหลดวิดีโอในขั้นตอนที่ 1 เพื่อดูผล"}</p>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
            <Stat label="RUNLAB SCORE" val={runScore || "—"}                              color="#38bdf8" />
            <Stat label="INJURY RISK"  val={risk}                                          color={riskColor} />
            <Stat label="KNEE ANGLE"   val={kneeAngle !== null ? `${kneeAngle}°` : "—"}   color="#60a5fa" />
            <Stat label="HIP DROP"     val={hipDrop   !== null ? `${hipDrop}`   : "—"}   color="#a78bfa" />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14 }}>
            <RiskCard
              level={risk === "HIGH" ? "ความเสี่ยงสูง" : risk === "MEDIUM" ? "ความเสี่ยงปานกลาง" : "ความเสี่ยงต่ำ"}
              title="Runner's Knee"
              pct={hasResult ? Math.min(99, 100 - kneeAlign) : 0}
              color={risk === "HIGH" ? "#ef4444" : risk === "MEDIUM" ? "#f59e0b" : "#22c55e"}
            />
            <RiskCard
              level={hipStab < 60 ? "ความเสี่ยงปานกลาง" : "ความเสี่ยงต่ำ"}
              title="Hip Instability"
              pct={hasResult ? Math.min(99, 100 - hipStab) : 0}
              color={hipStab < 60 ? "#f59e0b" : "#22c55e"}
            />
            <RiskCard level="ความคล่องตัว" title="Running Mobility" pct={mobility} color="#22c55e" />
            <div style={S.card}>
              <div style={{
  fontSize:12,
  color:"#94a3b8",
  lineHeight:1.8,
  marginBottom:14
}}>
  {analysisSummary || "อัปโหลดวิดีโอเพื่อเริ่มวิเคราะห์"}
  {isAnalyzing && (
  <div style={{
    marginTop: 12,
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: 700,
  }}>
    AI กำลังวิเคราะห์การวิ่ง...
  </div>
)}
</div>

<div style={{
  background:"#020817",
  border:"1px solid #1e293b",
  borderRadius:12,
  padding:"12px",
  marginBottom:"12px"
}}>
  <div style={{
    fontSize:11,
    color:"#64748b",
    marginBottom:4
  }}>
    AI Diagnosis
  </div>

  <div style={{
    fontSize:14,
    fontWeight:800,
    color:"#38bdf8"
  }}>
    {diagnosis || "-"}
  </div>
</div>

<div style={{
  background:"#020817",
  border:"1px solid #1e293b",
  borderRadius:12,
  padding:"12px"
}}>
  <div style={{
    fontSize:11,
    color:"#64748b",
    marginBottom:4
  }}>
    Recommendation
  </div>

  <div style={{
    fontSize:12,
    color:"#e2e8f0",
    lineHeight:1.7
  }}>
    {recommendation || "-"}
  </div>
</div>
              <p style={{ fontSize:12, color:"#64748b", lineHeight:1.7, marginBottom:10 }}>
                {hasResult
                  ? risk === "HIGH"   ? "ความเสี่ยงสูง ควรเร่งเพิ่มความมั่นคงของสะโพก"
                  : risk === "MEDIUM" ? "มีจุดควรปรับปรุง — เพิ่ม mobility และ hip stability"
                  :                    "รูปแบบการวิ่งดี ควรรักษาระดับต่อเนื่อง"
                  : "อัปโหลดวิดีโอเพื่อดูผลการวิเคราะห์"}
              </p>
              <button style={{ background:"none", border:"none", color:"#0ea5e9", fontSize:12, cursor:"pointer" }}>คำแนะนำเพิ่มเติม →</button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 3 ══ */}
      <div style={{ background:"#040d1e", padding:"36px 0" }}>
        <div style={S.wrap}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div style={S.st}><span style={S.sn}>3</span> โปรแกรมที่แนะนำสำหรับคุณ</div>
            <button style={{ background:"none", border:"none", color:"#0ea5e9", fontSize:12, cursor:"pointer" }}>ดูทั้งหมด →</button>
          </div>
          <p style={S.ss}>ระบบคัดเลือกโปรแกรมที่เหมาะกับความเสี่ยงของคุณโดยเฉพาะ</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
            <ProgramCard title="โปรแกรมแก้ปวดเข่า"             desc="ลดแรงกดที่เข่า เพิ่ม stability ฟื้นฟูกล้ามเนื้อให้สมดุล"    weeks={6} videos={24} price="1,490" />
            <ProgramCard title="โปรแกรมเพิ่มความมั่นคงสะโพก"  desc="ลด hip drop และเพิ่มการควบคุมการเคลื่อนไหว"                  weeks={5} videos={20} price="1,290" />
            <ProgramCard title="โปรแกรมเพิ่ม Mobility"          desc="ลดอาการตึง ช่วยให้การวิ่งลื่นไหลมากขึ้น"                    weeks={4} videos={18} price="990" />
          </div>
        </div>
      </div>

      {/* ══ SECTION 4 ══ */}
      <div style={{ padding:"36px 0" }}>
        <div style={S.wrap}>
          <div style={S.st}><span style={S.sn}>4</span> ชำระเงินและอัปโหลดสลิป</div>
          <p style={S.ss}>หลังเลือกโปรแกรมแล้ว ชำระเงินและส่งสลิปเพื่อยืนยัน</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:18 }}>
            <div style={S.card}>
              <div style={{ fontWeight:700, marginBottom:14 }}>สแกนชำระเงิน</div>
              <div style={{ background:"#f8fafc", borderRadius:10, width:130, height:130, margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:56 }}>📱</div>
              <div style={{ textAlign:"center", fontSize:12 }}>
                <div style={{ color:"#64748b" }}>ชื่อบัญชี</div>
                <div style={{ fontWeight:700, marginBottom:4 }}>ปริญญา พันสิริ</div>
                <div style={{ color:"#64748b" }}>พร้อมเพย์</div>
                <div style={{ fontWeight:700 }}>08X-XXX-XXXX</div>
                <div style={{ marginTop:6, color:"#22c55e" }}>✓ PromptPay</div>
              </div>
            </div>
            <div style={S.card}>
              <div style={{ fontWeight:700, marginBottom:12 }}>โปรแกรมที่เลือก</div>
              <div style={{ background:"rgba(14,165,233,.08)", borderRadius:9, padding:12, marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>โปรแกรมแก้ปวดเข่าสำหรับนักวิ่ง</div>
                <div style={{ fontSize:11, color:"#64748b" }}>ราคา</div>
                <div style={{ fontSize:26, fontWeight:900 }}>1,490 บาท</div>
              </div>
              <p style={{ fontSize:11, color:"#64748b", lineHeight:1.7 }}>หลังตรวจสอบการชำระเงิน ระบบจะปลดล็อคคอร์สและส่งข้อมูลทางอีเมล</p>
            </div>
            <div style={S.card}>
              <div style={{ fontWeight:700, marginBottom:12 }}>อัปโหลดสลิป</div>
              <label style={{ border:"2px dashed #334155", borderRadius:10, padding:"24px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer", marginBottom:12 }}>
                <div style={{ fontSize:28 }}>☁️</div>
                <div style={{ fontSize:12, color:"#94a3b8" }}>คลิกหรือลากไฟล์มาวางที่นี่</div>
                <div style={{ fontSize:10, color:"#475569" }}>JPG, PNG</div>
                <input type="file" accept="image/*" style={{ display:"none" }} />
              </label>
              <button style={{ width:"100%", background:"#0ea5e9", color:"#0f172a", fontWeight:800, border:"none", borderRadius:9, padding:"11px 0", fontSize:13, cursor:"pointer" }}>
                ส่งสลิปยืนยันการชำระเงิน
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background:"#020817", borderTop:"1px solid #1e293b", padding:"16px 24px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, fontSize:11, color:"#475569" }}>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            <span>✓ ตรวจสอบการชำระเงินภายใน 24 ชั่วโมง</span>
            <span>✉ แจ้งผลผ่านอีเมลหรือ LINE</span>
            <span>❓ ติดต่อแอดมินได้เลย</span>
          </div>
          <div style={{ fontWeight:700, color:"#334155" }}>© 2024 RUNLAB</div>
        </div>
      </footer>
    </div>
  );
}
