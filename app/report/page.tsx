"use client";

import { useEffect, useState } from "react";

export default function ReportPage() {
const [report, setReport] = useState<any>(null);

useEffect(() => {
const saved = localStorage.getItem("runlab-report");

if (saved) {
  setReport(JSON.parse(saved));
}

}, []);
const downloadReport = async () => {
  const reportElement =
    document.getElementById("report-export");

  if (!reportElement) return;

  const html2canvas =
    (await import("html2canvas")).default;

  const { jsPDF } =
    await import("jspdf");

  const canvas =
    await html2canvas(reportElement, {
      scale: 2,
      backgroundColor: "#050b14",
    });

  const imgData =
    canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

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

  pdf.save("RunLab-Report.pdf");
};
if (!report) {
return (
<div
style={{
minHeight: "100vh",
background: "#050b14",
color: "#fff",
display: "flex",
justifyContent: "center",
alignItems: "center",
fontSize: 24,
}}
>
Loading Report... </div>
);
}

return (
<div
id="report-export"
style={{
minHeight: "100vh",
background: "#050b14",
color: "#fff",
padding: 40,
maxWidth: 1200,
margin: "0 auto",
}}
>
<h1
style={{
fontSize: 72,
fontWeight: 800,
marginBottom: 0,
}}
>
RUNLAB AI </h1>

```
  <p
    style={{
      fontSize: 28,
      color: "#94a3b8",
      marginTop: 10,
    }}
  >
    Clinical Movement Report
  </p>
<button
  onClick={downloadReport}
  style={{
    background:"#00e5ff",
    color:"#000",
    border:"none",
    padding:"12px 20px",
    borderRadius:12,
    fontWeight:700,
    cursor:"pointer",
    marginBottom:20
  }}
>
  Download PDF
</button>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16,
      marginTop: 30,
    }}
  >
    <div
      style={{
        background: "#07111f",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12 }}>
        MOVEMENT SCORE
      </div>

      <div
        style={{
          fontSize: 42,
          fontWeight: 800,
          marginTop: 10,
        }}
      >
        {report.score}
      </div>
    </div>

    <div
      style={{
        background: "#07111f",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12 }}>
        PRIMARY RISK
      </div>

      <div
        style={{
          fontSize: 24,
          color: "#ef4444",
          fontWeight: 700,
          marginTop: 10,
        }}
      >
        {report.primaryRisk?.name}
      </div>
    </div>

    <div
      style={{
        background: "#07111f",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12 }}>
        RISK LEVEL
      </div>

      <div
        style={{
          fontSize: 24,
          color: "#facc15",
          fontWeight: 700,
          marginTop: 10,
        }}
      >
        {report.riskLevel}
      </div>
    </div>

    <div
      style={{
        background: "#07111f",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12 }}>
        CONFIDENCE
      </div>

      <div
        style={{
          fontSize: 24,
          color: "#00e5ff",
          fontWeight: 700,
          marginTop: 10,
        }}
      >
        {report.confidence}%
      </div>
    </div>
  </div>

  <h2 style={{ marginTop: 50, marginBottom: 20 }}>
    🔍 Key Findings
  </h2>

  <div style={{ display: "grid", gap: 16 }}>
    {report.rootCauses?.map((item: string, index: number) => (
      <div
        key={index}
        style={{
          background: "#07111f",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 20,
        }}
      >
        ⚠️ {item}
      </div>
    ))}
  </div>

  <h2 style={{ marginTop: 50, marginBottom: 20 }}>
    🎯 Corrective Exercise
  </h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: 16,
    }}
  >
    {report.exercises?.map(
      (exercise: string, index: number) => (
        <div
          key={index}
          style={{
            background: "#07111f",
            border: "1px solid #1e293b",
            borderRadius: 16,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            {exercise}
          </div>
        </div>
      )
    )}
  </div>

  <h2 style={{ marginTop: 50, marginBottom: 20 }}>
    📅 Running Advice
  </h2>

  <div
    style={{
      background: "#07111f",
      border: "1px solid #1e293b",
      borderRadius: 16,
      padding: 24,
    }}
  >
    {report.advice?.map(
      (item: string, index: number) => (
        <div
          key={index}
          style={{ marginBottom: 12 }}
        >
          ✅ {item}
        </div>
      )
    )}
  </div>

  <h2 style={{ marginTop: 50, marginBottom: 20 }}>
    👨‍⚕️ Recommended Next Step
  </h2>

  <div
    style={{
      background: "#07111f",
      border: "1px solid #1e293b",
      borderRadius: 16,
      padding: 24,
      lineHeight: 1.8,
    }}
  >
    <p>
      ผลวิเคราะห์นี้เป็นการคัดกรองเบื้องต้นด้วย AI
      เพื่อช่วยระบุความเสี่ยงและรูปแบบการเคลื่อนไหวที่อาจเกี่ยวข้องกับการบาดเจ็บ
    </p>

    <div
      style={{
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        background: "#0f172a",
        border: "1px solid #334155",
      }}
    >
      <strong>
        Lab Exercise Rehabilitation Center
      </strong>
      <br />
      Coach Art
      <br />
      Running Injury & Performance Specialist
    </div>
  </div>
</div>

);
}
