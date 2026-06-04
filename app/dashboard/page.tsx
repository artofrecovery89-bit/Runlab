"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";

export default function Dashboard() {
  const { user } = useUser();

  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
  if (user) {
    loadReports();
  }
}, [user]);

const loadReports = async () => {
  if (!user) return;

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  console.log(data);
  console.log(error);

  setReports(data || []);
};

  return (
    <div style={{ padding: 40 }}>
      <h1>My Reports</h1>
{reports.length === 0 && (
  <div
    style={{
      padding: 30,
      border: "1px dashed #444",
      borderRadius: 12,
      marginTop: 20,
    }}
  >
    ยังไม่มีรายงานการวิเคราะห์
  </div>
)}
     {reports.map((report) => (
  <div
    key={report.id}
    style={{
      padding: 20,
      border: "1px solid #333",
      marginBottom: 10,
      borderRadius: 12,
    }}
  >
    <h3>{report.diagnosis}</h3>

    <p>Score : {report.score}</p>

    <p>Risk : {report.risk_level}</p>

    <p>
      Date :
      {new Date(
        report.created_at
      ).toLocaleDateString()}
    </p>

    <a
      href={`/report/${report.id}`}
      style={{
        display: "inline-block",
        marginTop: 10,
        padding: "8px 14px",
        background: "#00e5ff",
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