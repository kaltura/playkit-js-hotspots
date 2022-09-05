export interface ScaleCalculation {
  width: number;
  height: number;
  left: number;
  top: number;
  scaleToTargetWidth: boolean;
}

export function scaleVideo(
  videoWidth: number,
  videoHeight: number,
  playerWidth: number,
  playerHeight: number,
  fLetterBox: boolean
): ScaleCalculation {
  const result: ScaleCalculation = {
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    scaleToTargetWidth: true
  };

  if (videoWidth <= 0 || videoHeight <= 0 || playerWidth <= 0 || playerHeight <= 0) {
    return result;
  }

  // scale to the target width
  const scaleX1 = playerWidth;
  const scaleY1 = (videoHeight * playerWidth) / videoWidth;

  // scale to the target height
  const scaleX2 = (videoWidth * playerHeight) / videoHeight;
  const scaleY2 = playerHeight;

  // now figure out which one we should use
  let fScaleOnWidth = scaleX2 > playerWidth;
  if (fScaleOnWidth) {
    fScaleOnWidth = fLetterBox;
  } else {
    fScaleOnWidth = !fLetterBox;
  }

  if (fScaleOnWidth) {
    result.width = Math.abs(scaleX1);
    result.height = Math.abs(scaleY1);
    result.scaleToTargetWidth = true;
  } else {
    result.width = Math.abs(scaleX2);
    result.height = Math.abs(scaleY2);
    result.scaleToTargetWidth = false;
  }
  result.left = Math.abs((playerWidth - result.width) / 2);
  result.top = Math.abs((playerHeight - result.height) / 2);

  return result;
}
