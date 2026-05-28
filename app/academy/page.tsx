export default function AcademyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020817",
        color: "white",
        padding: "40px",
      }}
    >
      <h1 style={{ fontSize: 40 }}>
        RUNLAB Academy
      </h1>

      <p>
        เลือกคอร์สที่ต้องการเรียน
      </p>

      <div style={{ marginTop: 30 }}>

        <a href="/academy/pro-knee">
          🦵 PRO-KNEE
        </a>

        <br />
        <br />

        <a href="/academy/core-hip">
          🏃 CORE-HIP
        </a>

        <br />
        <br />

        <a href="/academy/run-mobility">
          🔥 RUN-MOBILITY
        </a>

      </div>
    </div>
  );
}