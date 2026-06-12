"use client";
import PostureOverlay
from "../../../src/components/PostureOverlay";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import RunLabBodyRiskMap
from "@/components/RunLabBodyRiskMap";


export default function ReportPage() {
  const params = useParams();

  const reportId = params.id as string;

  const [qrImage, setQrImage] =
    useState("");

  const [report, setReport] =
    useState<any>(null);

  const loadReport = async () => {
    const { data, error } =
      await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

    if (error) {
      console.error(error);
      return;
    }

    setReport(data);
  };

  useEffect(() => {
    loadReport();

    const interval = setInterval(() => {
      loadReport();
    }, 5000);

    return () =>
      clearInterval(interval);
  }, [reportId]);

  

  const downloadReport = async () => {
      if (!report?.is_paid) {
    alert("กรุณาปลดล็อกรายงานก่อน");
    return;
  }
    const reportElement =
      document.getElementById("report-export");

    if (!reportElement) return;

    const canvas = await html2canvas(
      reportElement,
      {
        scale: 2,
        useCORS: true,
        backgroundColor: "#050b14",
      }
    );

    const imgData =
      canvas.toDataURL("image/png");

    const pdf = new jsPDF(
      "p",
      "mm",
      "a4"
    );

    const pdfWidth = 210;
    const pageHeight = 297;

    const imgWidth = pdfWidth;

    const imgHeight =
      (canvas.height * imgWidth) /
      canvas.width;

    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(
      imgData,
      "PNG",
      0,
      position,
      imgWidth,
      imgHeight
    );

    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position =
        heightLeft - imgHeight;

      pdf.addPage();

      pdf.addImage(
        imgData,
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= pageHeight;
    }

    pdf.save(
      `RUNLAB_REPORT_${reportId}.pdf`
    );
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
        }}
      >
        Loading Report...
      </div>
    );
  }

const data = report.report_json || {};
console.log("LANDMARKS =", data?.landmarks);
const front = data?.landmarks?.front || [];
console.log(
  "FRONT LANDMARKS",
  front
);

console.log(
  "FRONT LENGTH",
  front.length
);
const left = data?.landmarks?.left || [];
const right = data?.landmarks?.right || [];
const back = data?.landmarks?.back || [];


const risks =
  data.injuryRisks || {};
const office =
  data.officeSyndrome || {};
const findings =
  office.findings || [];

const recommendations =
  office.recommendations || [];
const handlePayment = async () => {
  const res = await fetch(
    "/api/create-payment",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportId: report.id,
      }),
    }
  );

  const data = await res.json();

  console.log(data);

  if (data.qrImage) {
    setQrImage(data.qrImage);
  }
};

   


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

    {!report?.is_paid && (
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #f59e0b",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2>
          🔒 Premium Report
        </h2>

        <p>
          ปลดล็อกรายงานฉบับเต็ม
          พร้อม PDF และคำแนะนำเชิงลึก
        </p>

        <button
  onClick={handlePayment}
  style={{
    background:
      "linear-gradient(135deg,#00E5FF,#009DFF)",
    color: "#000",
    border: "none",
    padding: "12px 24px",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  🔓 ปลดล็อก 500 บาท
</button>
{qrImage && (
  <div style={{ marginTop: 20 }}>
    <h3>สแกนเพื่อชำระเงิน</h3>

    <img
      src={qrImage}
      alt="PromptPay QR"
      style={{
        width: 280,
        borderRadius: 12,
      }}
    />
  </div>
)}
  {report?.is_paid && (
  <div
    style={{
      background: "#052e16",
      border: "1px solid #22c55e",
      color: "#22c55e",
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    }}
  >
    ✅ Payment Successful
  </div>
)}

      </div>
    )}
   <div
   
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
    borderBottom: "1px solid #1e293b",
    paddingBottom: 30,
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 20,
    }}
  >
       <img
  src="/duha-icon.png"
  width={120}
  height={120}
/>

    <div>
      <h1
        style={{
          fontSize: 40,
          fontWeight: 900,
          margin: 0,
          color: "#fff",
        }}
      >
        RUNLAB AI
      </h1>

      <p
        style={{
          color: "#00E5FF",
          fontSize: 14,
          letterSpacing: 2,
          marginTop: 8,
          fontWeight: 700,
        }}
      >
        POWERED BY DUHA TECHNOLOGIES
      </p>

      <p
        style={{
          color: "#94A3B8",
          marginTop: 10,
          fontSize: 16,
        }}
      >
        Clinical Running Assessment Report
      </p>
    </div>
  </div>

  <div
    style={{
      textAlign: "right",
      color: "#CBD5E1",
      fontSize: 14,
      lineHeight: 1.8,
    }}
  >
    <div>
      <strong>Report ID</strong>
      <br />
      {report.id}
    </div>

    <div style={{ marginTop: 10 }}>
      <strong>Date</strong>
      <br />
      {new Date(report.created_at).toLocaleDateString()}
    </div>

    <div style={{ marginTop: 10 }}>
      <strong>Examiner</strong>
      <br />
      Coach Art
    </div>
  </div>
</div>

{report?.is_paid && (
  
  <button
    onClick={downloadReport}
  >
    Download PDF
  </button>
)}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 16,
        }}
      >
        <ScoreCard
  title="MOVEMENT SCORE"
  value={report.score}
  color="#00e5ff"
/>

<ScoreCard
  title="RISK LEVEL"
  value={report.risk_level}
  color="#ef4444"
/>

<ScoreCard
  title="OFFICE RISK"
  value={`${office.risk || 0}%`}
  color="#facc15"
/>

<ScoreCard
  title="DIAGNOSIS"
  value={report.diagnosis}
/>
      </div>
<div
  style={{
    marginTop: 30,
    background: "#07111f",
    padding: 30,
    borderRadius: 20,
    border: "1px solid #1e293b",
  }}
>
  <h2>Injury Risk Assessment</h2>

  <RiskBar
  label="Runner's Knee"
  value={risks.runnersKnee || 0}
/>

<RiskBar
  label="IT Band Syndrome"
  value={risks.itBand || 0}
/>

<RiskBar
  label="Achilles Tendon"
  value={risks.achilles || 0}
/>

<RiskBar
  label="Shin Splints"
  value={risks.shinSplints || 0}
/>
</div>

{data?.assessmentImages && (
  <div
    style={{
      marginTop: 30,
    }}
  >
    <h2
      style={{
        color: "#fff",
        marginBottom: 20,
      }}
    >
      Static Posture Assessment
    </h2>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 20,
        alignItems: "start",
      }}
    >
      <div>
        <h4>Front View</h4>

        <PostureOverlay
          image={data.assessmentImages?.front}
          landmarks={front}
        />
      </div>

      <div>
        <h4>Left View</h4>

        <PostureOverlay
          image={data.assessmentImages?.left}
          landmarks={left}
        />
      </div>

      <div>
        <h4>Right View</h4>

        <PostureOverlay
          image={data.assessmentImages?.right}
          landmarks={right}
        />
      </div>

      <div>
        <h4>Back View</h4>

        <PostureOverlay
          image={data.assessmentImages?.back}
          landmarks={back}
        />
      </div>
    </div>
  </div>
)}
{report?.is_paid && (
  <>
      <Section title="Executive Summary">
  <div
    style={{
      whiteSpace: "pre-line",
      lineHeight: 1.8,
      fontSize: 16,
    }}
  >
    {data.executiveSummary || "No Data"}
  </div>
</Section>

      <Section title="Root Cause">
        {data.rootCause ||
          "No Data"}
      </Section>

      <Section title="Recommendation">
        {data.recommendation ||
          "No Data"}
      </Section>

      <Section title="Running Advice">
        {data.runningAdvice ||
          "No Data"}
      </Section>

      <Section
        title="Analysis Summary"
      >
        {data.analysisSummary ||
          "No Data"}
      </Section>

   <Section title="Office Syndrome Analysis">

  <div>
    <strong>Risk Score:</strong>{" "}
    {data.officeRisk || 0}%
  </div>

  <div>
    <strong>Level:</strong>{" "}
    {data.officeLevel || "LOW"}
  </div>

  <div style={{ marginTop: 10 }}>
    วิเคราะห์จาก

    <ul>
      <li>Forward Head Posture</li>
      <li>Shoulder Tilt</li>
      <li>Pelvic Tilt</li>
    </ul>
  </div>

  {/* Findings */}
  <div style={{ marginTop: 20 }}>
    <h3>Findings</h3>

    {(data.officeSyndrome?.findings || []).map(
      (item: string) => (
        <div
          key={item}
          style={{
            marginTop: 8,
            color: "#ef4444",
          }}
        >
          🔴 {item}
        </div>
      )
    )}
  </div>


  {/* Recommendations */}
  <div style={{ marginTop: 20 }}>
    <h3>Recommendations</h3>

    {(data.officeSyndrome?.recommendations || []).map(
      (item: string) => (
        <div
          key={item}
          style={{
            marginTop: 8,
            color: "#10b981",
          }}
        >
          ✅ {item}
        </div>
      )
    )}
  </div>

</Section>
<Section title="Running Analysis">
  <div style={{ lineHeight: 2 }}>
    <div>
      Knee Flexion :
      {data.kneeAngle
        ? `${Number(data.kneeAngle).toFixed(1)}°`
        : "-"}
    </div>




    <div>
      Overstride :
      {data.overstride
        ? `${data.overstride}`
        : "-"}
    </div>

    <div>
      Cadence :
      {data.cadence
        ? `${data.cadence}`
        : "-"}
    </div>
  </div>
</Section>
  </>
)}

     <div
  style={{
    marginTop: 40,
    padding: 24,
    background: "#07111f",
    borderRadius: 16,
    border: "1px solid #1e293b",
  }}
>
  <PersonalizedPrograms report={report} />
</div>

<footer
  style={{
    marginTop: 80,
    paddingTop: 30,
    borderTop: "1px solid #1e293b",
    color: "#64748b",
    textAlign: "center",
  }}
>
  <h3
    style={{
      color: "#fff",
    }}
  >
    Lab Exercise Rehabilitation Center
  </h3>

  <p>
    Running Injury &
    Performance Specialist
  </p>

  <p>
    Coach Art
  </p>

  <p>
    © RUNLAB AI 2026
  </p>
</footer>
    </div>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div
      style={{
        background: "#07111f",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 30,
        background: "#07111f",
        borderRadius: 16,
        padding: 24,
        border:
          "1px solid #1e293b",
      }}
    >
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
function ScoreCard({
  title,
  value,
  color = "#fff",
}: {
  title: string;
  value: any;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#07111f",
        borderRadius: 20,
        padding: 24,
        border: "1px solid #1e293b",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 32,
          fontWeight: 800,
          color,
        }}
      >
        {value}
      </div>
      
    </div>
  );
}
function RiskBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const color =
    value > 70
      ? "#EF4444"
      : value > 40
      ? "#F59E0B"
      : "#22C55E";

  return (
    <div
      style={{
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>

      <div
        style={{
          height: 12,
          background: "#1E293B",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}
function PersonalizedPrograms({
  report,
}: {
  report: any;
}) {
  return (
    <>
      <div
        style={{
          marginTop: 30,
          background: "#07111f",
          borderRadius: 16,
          padding: 24,
          border: "1px solid #1e293b",
        }}
      >
        <h2>โปรแกรมฟื้นฟูเฉพาะบุคคล</h2>

        <div style={{ marginTop: 20 }}>
          PRO-KNEE
        </div>
      </div>

      <div
        style={{
          marginTop: 30,
          padding: 30,
          background: "#07111f",
          borderRadius: 20,
          border: "1px solid #1e293b",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#00E5FF",
            marginBottom: 15,
          }}
        >
          🎯 ปรึกษาโค้ชเพื่อวางแผนฟื้นฟูเฉพาะคุณ
        </h2>

        <p
          style={{
            color: "#CBD5E1",
            lineHeight: 1.8,
            maxWidth: 700,
            margin: "0 auto",
          }}
        >
          ผลวิเคราะห์นี้เป็นการประเมินเบื้องต้นด้วย AI
          หากต้องการทราบสาเหตุเชิงลึก แนวทางแก้ไข
          และโปรแกรมฟื้นฟูที่เหมาะกับร่างกายของคุณ
          สามารถพูดคุยกับ Coach Art ได้โดยตรง
        </p>

        <a
          href="https://lin.ee/N8dFVCF"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "14px 28px",
            background:
              "linear-gradient(135deg,#00E5FF,#009DFF)",
            color: "#000",
            fontWeight: 700,
            borderRadius: 12,
            textDecoration: "none",
            fontSize: 18,
          }}
        >
          💬 แอด LINE เพื่อปรึกษาโค้ช
        </a>
      </div>
    </>
  );
}