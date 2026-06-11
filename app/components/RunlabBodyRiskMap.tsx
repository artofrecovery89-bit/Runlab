export default function RunlabBodyRiskMap({
  injuryRisks,
}: {
  injuryRisks: any[];
}) {
  return (
    <div
      style={{
        background: "#07111F",
        borderRadius: 24,
        padding: 32,
        marginTop: 30,
      }}
    >
      <h2
        style={{
          color: "#00E5FF",
          marginBottom: 24,
        }}
      >
        RUNLAB BODY RISK MAP
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: 32,
        }}
      >
        {/* Human Body */}
        <div
          style={{
            minHeight: 500,
            borderRadius: 20,
            background: "#04101C",
          }}
        >
          Human Body SVG
        </div>

        {/* Risk Cards */}
        <div>
          {injuryRisks.map((risk, index) => (
            <div
              key={index}
              style={{
                background: "#0B1628",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <h3>{risk.name}</h3>

              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                }}
              >
                {risk.score}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}