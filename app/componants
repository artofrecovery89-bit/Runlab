interface StatProps {
  label: string;
  val: string | number | null;
  color?: string;
}

export default function Stat({
  label,
  val,
  color,
}: StatProps) {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #0b1528 0%, #070d19 100%)",
        border: "1px solid #1e293b",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          letterSpacing: 1.2,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color,
          lineHeight: 1,
        }}
      >
        {val ?? "—"}
      </div>
    </div>
  );
}