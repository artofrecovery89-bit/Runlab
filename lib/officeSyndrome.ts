export function generateOfficeFindings(
  forwardHead: number,
  shoulderTilt: number,
  pelvicTilt: number
) {
  const findings = [];

  if (forwardHead > 50)
    findings.push("Forward Head Posture");

  if (shoulderTilt > 5)
    findings.push("Shoulder Imbalance");

  if (
    forwardHead > 50 &&
    shoulderTilt > 5
  ) {
    findings.push("Upper Cross Syndrome");
  }

  if (
    pelvicTilt > 5
  ) {
    findings.push("Pelvic Asymmetry");
  }

  return findings;
}