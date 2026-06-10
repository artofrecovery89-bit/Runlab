import { useEffect, useRef } from "react";

export default function PostureOverlay({
  image,
  landmarks,
}: {
  image: string;
  landmarks: any[];
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

  ctx.drawImage(img, 0, 0);
ctx.strokeStyle = "#00E5FF";
ctx.fillStyle = "#00E5FF";
ctx.lineWidth = 3;
  // วาดจุด
  landmarks.forEach((p) => {
    ctx.beginPath();
    ctx.arc(
      p.x * img.width,
      p.y * img.height,
      5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  // วาดเส้น
  const drawLine = (a: any, b: any) => {
    if (!a || !b) return;

    ctx.beginPath();

    ctx.moveTo(
      a.x * img.width,
      a.y * img.height
    );

    ctx.lineTo(
      b.x * img.width,
      b.y * img.height
    );

    ctx.stroke();
  };

  // Shoulder Line
  drawLine(
    landmarks[11],
    landmarks[12]
  );

  // Pelvis Line
  drawLine(
    landmarks[23],
    landmarks[24]
  );

  // Hip → Knee
  drawLine(
    landmarks[23],
    landmarks[25]
  );

  drawLine(
    landmarks[24],
    landmarks[26]
  );
}// Knee → Ankle
drawLine(
  landmarks[25],
  landmarks[27]
);

drawLine(
  landmarks[26],
  landmarks[28]
);

// Shoulder → Hip
drawLine(
  landmarks[11],
  landmarks[23]
);

drawLine(
  landmarks[12],
  landmarks[24]
);

// Knee → Ankle
drawLine(
  landmarks[25],
  landmarks[27]
);

drawLine(
  landmarks[26],
  landmarks[28]
);

// Shoulder → Hip
drawLine(
  landmarks[11],
  landmarks[23]
);

drawLine(
  landmarks[12],
  landmarks[24]
);

  // Midline
  const shoulderCenter = {
    x:
      (landmarks[11].x +
        landmarks[12].x) /
      2,

    y:
      (landmarks[11].y +
        landmarks[12].y) /
      2,
      
  };
  if (
  !landmarks[11] ||
  !landmarks[12] ||
  !landmarks[23] ||
  !landmarks[24]
) {
  return;

  const pelvisCenter = {
    x:
      (landmarks[23].x +
        landmarks[24].x) /
      2,

    y:
      (landmarks[23].y +
        landmarks[24].y) /
      2,
  };

  drawLine(
    shoulderCenter,
    pelvisCenter
  );
};

    img.src = image;
  }, [image, landmarks]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        borderRadius: 16,
      }}
    />
  );
}
