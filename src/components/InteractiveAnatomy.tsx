function InteractiveAnatomy({
  risks,
  frontImage,
  frontLandmarks,
}: {
  risks: {
    runnersKnee: number;
    achilles: number;
    itBand: number;
    shinSplints: number;
  };
  frontImage?: string;
  frontLandmarks?: any[];
}) {