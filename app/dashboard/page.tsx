"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";

export default function Dashboard() {
  const [reports, setReports] = useState<any[]>([]);

  const { user, isLoaded } = useUser();
useEffect(() => {
  console.log("CLERK USER =", user);
  console.log("CLERK USER ID =", user?.id);
}, [user]);
  useEffect(() => {
    console.log("IS LOADED =", isLoaded);
    console.log("USER =", user);
    console.log("USER ID =", user?.id);
  }, [user, isLoaded]);

useEffect(() => {
    if (isLoaded && user) {
      loadReports();
    }
  }, [isLoaded, user]);

const loadReports = async () => {
  if (!user) return;

  console.log("SEARCH USER =", user.id);

  const { data, error } =
  await supabase
    .from("reports")
    .select(`
id,
created_at,
score,
risk_level,
diagnosis,
is_paid
`)

console.log(data);

  console.log("REPORT DATA =", data);
  console.log("REPORT ERROR =", error);

  setReports(data || []);
};

 
  return (
    <div
  style={{
    padding: 40,
    background: "#050B14",
    minHeight: "100vh",
    color: "#fff",
  }}
>
      <h1
  style={{
    fontSize: 42,
    fontWeight: 800,
    marginBottom: 30,
    color: "#FFFFFF",
  }}
>
  RUNLAB COMMAND CENTER
</h1>
<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 20,
    marginBottom: 40,
  }}
>
  <StatCard
    title="TOTAL REPORTS"
    value={reports.length}
  />

  <StatCard
    title="AVERAGE SCORE"
    value={
      reports.length
        ? Math.round(
            reports.reduce(
              (sum, r) => sum + r.score,
              0
            ) / reports.length
          )
        : 0
    }
  />

  <StatCard
    title="HIGH RISK"
    value={
      reports.filter(
        (r) => r.risk_level === "HIGH"
      ).length
    }
  />

<StatCard
  title="OFFICE CASES"
  value={
    reports.filter(
      (r) =>
        (
          r.report_json?.officeSyndrome?.risk || 0
        ) >= 40
    ).length
  }
/>
</div>   {/* ปิด Grid ตรงนี้ */}
     {reports.map((report) => (
  <div
    key={report.id}
    style={{
      background: "#0B1728",
      border: "1px solid #22304A",
      marginBottom: 16,
      borderRadius: 16,
      padding: 24,
      boxShadow:
        "0 0 20px rgba(0,229,255,0.08)",
    }}
  >
  
<h3
  style={{
    color:"#FFFFFF",
    fontSize:24,
    marginBottom:12,
  }}
>
  {report.diagnosis}
</h3>
<div
  style={{
    marginBottom: 12,
    fontWeight: 700,
    color: report.is_paid
      ? "#22c55e"
      : "#f59e0b",
  }}
>
  {report.is_paid
    ? "🟢 Premium"
    : "🔒 Locked"}
</div>
<div
  style={{
    display: "flex",
    gap: 20,
    marginBottom: 12,
    flexWrap: "wrap",
  }}
>
  <span>
    🎯 Score: {report.score}
  </span>

  <span>
    ⚠️ Risk: {report.risk_level}
  </span>

  <span>
    🧑‍💻 Office: {
      report.report_json?.officeSyndrome?.level ||
      "N/A"
    }
  </span>

  <span>
📈 Office Risk: {
  report.report_json?.officeSyndrome?.risk || 0
}%
</span>

  <span>
    📅{" "}
    {
  new Date(report.created_at)
    .toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
}
  </span>
</div>

       

          <a
            href={`/report/${report.id}`}
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "8px 14px",
             background:
  "linear-gradient(135deg,#00E5FF,#009DFF)",
  boxShadow:
  "0 0 20px rgba(0,229,255,0.25)",
              color: "#000",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            ดูรายงาน
          </a>
        </div>
      ))}
    </div>
  );
}
function StatCard({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div
      style={{
        background: "#07111F",
        padding: 24,
        borderRadius: 16,
        border: "1px solid #1E293B",
      }}
    >
      <div
        style={{
          color: "#94A3B8",
          fontSize: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: "#00E5FF",
          marginTop: 10,
        }}
      >
        {value}
      </div>
    </div>
  );
}