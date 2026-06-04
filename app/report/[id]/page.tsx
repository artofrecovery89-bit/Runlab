"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function ReportPage() {
  const params = useParams();

  const reportId = params.id as string;

  const [report, setReport] = useState<any>(null);
  
  useEffect(() => {
  if (!reportId) return;

  loadReport();
}, [reportId]);

  const loadReport = async () => {
    const { data, error } = await supabase
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

  const downloadReport = async () => {
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

  const data =
    report.report_json || {};

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
          fontSize: 56,
          fontWeight: 800,
        }}
      >
        RUNLAB AI
      </h1>

      <p
        style={{
          color: "#94a3b8",
          fontSize: 20,
        }}
      >
        Clinical Movement Report
      </p>

      <button
        onClick={downloadReport}
        style={{
          background: "#00e5ff",
          color: "#000",
          border: "none",
          padding: "12px 20px",
          borderRadius: 12,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 30,
        }}
      >
        Download PDF
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 16,
        }}
      >
        <Card
          title="MOVEMENT SCORE"
          value={report.score}
        />

        <Card
          title="RISK LEVEL"
          value={report.risk_level}
        />

        <Card
          title="DIAGNOSIS"
          value={report.diagnosis}
        />

        <Card
          title="OFFICE RISK"
          value={
            data.officeLevel || "-"
          }
        />
      </div>

      <Section
        title="Executive Summary"
      >
        {data.executiveSummary ||
          "No Data"}
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

      <Section
        title="Office Syndrome"
      >
        Risk : {data.officeRisk}
        <br />
        Level : {data.officeLevel}
      </Section>

      <div
        style={{
          marginTop: 40,
          padding: 24,
          background: "#07111f",
          borderRadius: 16,
          border:
            "1px solid #1e293b",
        }}
      >
        <h3>
          👨‍⚕️ Recommended Next
          Step
        </h3>

        <p>
          ผลวิเคราะห์นี้เป็นการคัดกรองเบื้องต้นด้วย AI
          เพื่อช่วยระบุความเสี่ยงของการบาดเจ็บ
          และความผิดปกติของการเคลื่อนไหว
        </p>

        <p>
          ติดต่อ Coach Art เพื่อรับ
          Running Assessment
          และโปรแกรมฟื้นฟูเฉพาะบุคคล
        </p>
      </div>
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