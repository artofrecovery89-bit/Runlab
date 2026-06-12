"use client";

import { useEffect, useRef } from "react";

type Landmark = {
  x: number;
  y: number;
  visibility?: number;
};

const DEBUG = true;

export default function PostureOverlay({
  image,
  landmarks,
}: {
  image: string;
  landmarks: Landmark[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image || !landmarks?.length) return;

    const img = new Image();

    img.onload = () => {
      const canvas = canvasRef.current;

      if (!canvas) return;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const toX = (x: number) => x * img.width;
      const toY = (y: number) => y * img.height;

      const drawLine = (
        a?: Landmark,
        b?: Landmark,
        color = "#00E5FF",
        width = 3
      ) => {
        if (!a || !b) return;

        ctx.beginPath();
        ctx.moveTo(toX(a.x), toY(a.y));
        ctx.lineTo(toX(b.x), toY(b.y));
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
      };

      const drawPoint = (
        point: Landmark,
        color: string,
        radius = 5
      ) => {
        ctx.beginPath();
        ctx.arc(
          toX(point.x),
          toY(point.y),
          radius,
          0,
          Math.PI * 2
        );

        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      const getVisibilityColor = (
        visibility = 1
      ) => {
        if (visibility > 0.8) return "#00ff88";
        if (visibility > 0.5) return "#ffd600";
        return "#ff3b30";
      };

      // ======================
      // QUALITY SCORE
      // ======================

      const visibleLandmarks = landmarks.filter(
        (l) => (l?.visibility ?? 1) > 0.5
      ).length;

      const qualityScore = Math.round(
        (visibleLandmarks / landmarks.length) * 100
      );

      // ======================
      // SKELETON CONNECTIONS
      // ======================

      const connections: [number, number][] = [
        [11, 12],

        [11, 13],
        [13, 15],

        [12, 14],
        [14, 16],

        [11, 23],
        [12, 24],

        [23, 24],

        [23, 25],
        [25, 27],

        [24, 26],
        [26, 28],
      ];

      connections.forEach(([a, b]) => {
        drawLine(
          landmarks[a],
          landmarks[b]
        );
      });

      // ======================
      // LANDMARKS
      // ======================

      landmarks.forEach((point, index) => {
        if (!point) return;

        const visibility =
          point.visibility ?? 1;

        drawPoint(
          point,
          getVisibilityColor(visibility)
        );

        if (DEBUG) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "12px Arial";

          ctx.fillText(
            `${index} (${visibility.toFixed(2)})`,
            toX(point.x) + 8,
            toY(point.y) - 8
          );
        }
      });

      // ======================
      // REQUIRED LANDMARKS
      // ======================

      const leftShoulder =
        landmarks[11];

      const rightShoulder =
        landmarks[12];

      const leftHip =
        landmarks[23];

      const rightHip =
        landmarks[24];

      if (
        !leftShoulder ||
        !rightShoulder ||
        !leftHip ||
        !rightHip
      ) {
        console.warn(
          "Missing shoulder or hip landmarks"
        );
        return;
      }

      // ======================
      // CENTERS
      // ======================

      const shoulderCenter: Landmark = {
        x:
          (leftShoulder.x +
            rightShoulder.x) /
          2,
        y:
          (leftShoulder.y +
            rightShoulder.y) /
          2,
      };

      const pelvisCenter: Landmark = {
        x:
          (leftHip.x +
            rightHip.x) /
          2,
        y:
          (leftHip.y +
            rightHip.y) /
          2,
      };

      // ======================
      // TRUNK POLYGON
      // ======================

      ctx.beginPath();

      ctx.moveTo(
        toX(leftShoulder.x),
        toY(leftShoulder.y)
      );

      ctx.lineTo(
        toX(rightShoulder.x),
        toY(rightShoulder.y)
      );

      ctx.lineTo(
        toX(rightHip.x),
        toY(rightHip.y)
      );

      ctx.lineTo(
        toX(leftHip.x),
        toY(leftHip.y)
      );

      ctx.closePath();

      ctx.fillStyle =
        "rgba(0,229,255,0.12)";
      ctx.fill();

      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 2;
      ctx.stroke();

      // ======================
      // MIDLINE
      // ======================

      drawLine(
        shoulderCenter,
        pelvisCenter,
        "#FFB800",
        4
      );

      // ======================
      // CENTER POINTS
      // ======================

     

      // ======================
      // QUALITY PANEL
      // ======================

      ctx.fillStyle =
        "rgba(0,0,0,0.75)";

      ctx.fillRect(
        20,
        20,
        320,
        150
      );

      ctx.fillStyle = "#ffffff";

      ctx.font =
        "bold 20px Arial";

      ctx.fillText(
        "RunLab AI",
        35,
        50
      );

      ctx.font =
        "16px Arial";

      ctx.fillText(
        `Quality Score: ${qualityScore}/100`,
        35,
        85
      );

      ctx.fillText(
        `Visible Points: ${visibleLandmarks}/${landmarks.length}`,
        35,
        110
      );

      const status =
        qualityScore >= 90
          ? "Excellent"
          : qualityScore >= 75
          ? "Good"
          : qualityScore >= 60
          ? "Fair"
          : "Poor";

      ctx.fillText(
        `Status: ${status}`,
        35,
        135
      );
    };

    img.src = image;
  }, [image, landmarks]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        borderRadius: "16px",
      }}
    />
  );
}