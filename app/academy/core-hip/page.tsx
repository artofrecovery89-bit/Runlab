export default function ProKneeCourse() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020817",
        color: "#fff",
        padding: 40,
      }}
    >
      <h1>PRO-KNEE</h1>

      <p>
        โปรแกรมแก้อาการปวดเข่าสำหรับนักวิ่ง
      </p>

      <div
        style={{
          marginTop: 30,
          background: "#0f172a",
          padding: 20,
          borderRadius: 12,
        }}
      >
        <h2>บทที่ 1</h2>

        <iframe
          width="100%"
          height="500"
          src="https://www.youtube.com/embed/VIDEO_ID"
          title="PRO-KNEE"
          allowFullScreen
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <a
          href="/pdfs/pro-knee-workbook.pdf"
          download
          style={{
            color: "#00e5ff",
            fontWeight: 700,
          }}
        >
          📄 ดาวน์โหลด Workbook
        </a>
      </div>
    </div>
  );
}