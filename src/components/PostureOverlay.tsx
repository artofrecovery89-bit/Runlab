"use client";

import { useEffect, useRef } from "react";

type Landmark = {
  x: number;
  y: number;
  visibility?: number;
};

const DEBUG = false;

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

    const img = new window.Image();

    img.onload = () => {
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        const parentWidth =
          canvas.parentElement?.clientWidth || 800;

        const scale =
          parentWidth / img.width;

        const drawWidth = parentWidth;
        const drawHeight =
          img.height * scale;

        const dpr =
          window.devicePixelRatio || 1;

        canvas.style.width =
          `${drawWidth}px`;

        canvas.style.height =
          `${drawHeight}px`;

        canvas.width =
          drawWidth * dpr;

        canvas.height =
          drawHeight * dpr;

        ctx.setTransform(
          dpr,
          0,
          0,
          dpr,
          0,
          0
        );

        ctx.clearRect(
          0,
          0,
          drawWidth,
          drawHeight
        );

        // ------------------
        // DRAW IMAGE
        // ------------------

        ctx.drawImage(
          img,
          0,
          0,
          drawWidth,
          drawHeight
        );

        const toX = (x: number) =>
          x * drawWidth;

        const toY = (y: number) =>
          y * drawHeight;

        const drawLine = (
          a?: Landmark,
          b?: Landmark,
          color = "#00E5FF",
          width = 3
        ) => {
          if (!a || !b) return;

          ctx.beginPath();
          ctx.moveTo(
            toX(a.x),
            toY(a.y)
          );

          ctx.lineTo(
            toX(b.x),
            toY(b.y)
          );

          ctx.strokeStyle =
            color;

          ctx.lineWidth =
            width;

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

          ctx.fillStyle =
            color;

          ctx.fill();

          ctx.strokeStyle =
            "#ffffff";

          ctx.lineWidth = 1;

          ctx.stroke();
        };

        const getVisibilityColor = (
          visibility = 1
        ) => {
          if (visibility > 0.8)
            return "#00ff88";

          if (visibility > 0.5)
            return "#ffd600";

          return "#ff3b30";
        };

        // ------------------
        // CONNECTIONS
        // ------------------

        const connections: [
          number,
          number
        ][] = [
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

        connections.forEach(
          ([a, b]) => {
            drawLine(
              landmarks[a],
              landmarks[b]
            );
          }
        );

        // ------------------
        // LANDMARKS
        // ------------------

        landmarks.forEach(
          (point, index) => {
            if (!point) return;

            drawPoint(
              point,
              getVisibilityColor(
                point.visibility ?? 1
              )
            );

            if (DEBUG) {
              ctx.fillStyle =
                "#ffffff";

              ctx.font =
                "12px Arial";

              ctx.fillText(
                `${index}`,
                toX(point.x) + 8,
                toY(point.y) - 8
              );
            }
          }
        );

        // ------------------
        // CENTERS
        // ------------------

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
          return;
        }

       // const shoulderCenter = {
//   x: (leftShoulder.x + rightShoulder.x) / 2,
//   y: (leftShoulder.y + rightShoulder.y) / 2,
// };

// const pelvisCenter = {
//   x: (leftHip.x + rightHip.x) / 2,
//   y: (leftHip.y + rightHip.y) / 2,
// };

        // ------------------
        // TRUNK POLYGON
        // ------------------

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

        ctx.strokeStyle =
          "#00E5FF";

        ctx.lineWidth = 2;

        ctx.stroke();

        // ------------------
        // MIDLINE
        // ------------------
drawPoint(
  shoulderCenter,
  "#ff8800",
  8
);

drawPoint(
  pelvisCenter,
  "#ff0000",
  8
);
       
      });
    };

    img.src = image;
  }, [image, landmarks]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        display: "block",
        borderRadius: 16,
      }}
    />
  );
}