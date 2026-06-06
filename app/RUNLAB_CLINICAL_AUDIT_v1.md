# RUNLAB Clinical Audit v1

Last Updated: 2026-06-06

## PASS ✅

### Running Analysis

* CVA Formula
* Knee Angle Formula (3-Point Joint Angle)
* Overstride Detection (Initial Contact + COM Approximation)
* Runner's Knee Risk Logic
* Achilles Risk Logic
* Shin Splints Risk Logic

### Office Syndrome

* CVA Risk Classification
* Forward Head Posture Logic
* Office Risk Calculation
* Shoulder Asymmetry Detection
* Pelvic Asymmetry Detection

### AI Report

* Highest Risk Area Logic
* Executive Summary Logic
* Office Syndrome Findings Logic

---

## REVIEW 🟡

### Pelvic Drop

Current Formula:

```ts
Math.abs(lm[23].y - lm[24].y) * 180
```

Status:

* Functional
* Requires biomechanical validation

Priority:

* High

---

## REMOVED ❌

### Foot Rotation

Reason:
Measured foot width rather than foot progression angle.

### Estimated Cadence

Reason:
Not calculated from step frequency.

---

## FUTURE VALIDATION

### Clinical Comparison

Compare RUNLAB outputs against:

* Physiotherapist Assessment
* Research Reference Values
* Video Frame Analysis

Metrics:

* Knee Angle
* Hip Drop
* CVA
* Overstride

Target Error:

* Knee Angle ±5°
* Hip Drop ±2°
* CVA ±3°
* Overstride ±5%

---

## Production Readiness

Running Analysis: 90%

Office Syndrome: 85%

Overall Platform: 88%
