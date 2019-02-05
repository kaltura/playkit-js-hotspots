/* @flow */

export type Size = {
  width: number,
  height: number,
};


/**
 * Calculates the scaling factor required for the container to completely contain an object.
 * @param {Size} container The size of the container
 * @param {Size} object The size of the object
 * @returns {number} The calculated object scaling factor
 */
export function contain(container: Size, object: Size): number {
  return Math.min(
    container.width / object.width,
    container.height / object.height,
  );
}

/**
 * Calculates the scaling factor required for the container to be completely covered by the object.
 * @param {Size} container The size of the container
 * @param {Size} object The size of the object
 * @returns {number} The calculated scaling factor
 */
export function cover(container: Size, object: Size): number {
  return Math.max(
    container.width / object.width,
    container.height / object.height,
  );
}

/**
 * Calculates a CSS3 transform which will correctly size and position the overlay over the video.
 *
 * Note: It is assumed that the video will be sized to fit within the player and then centered.
 * Note: The transform origin is assumed to be `top left`.
 *
 * @param {Size} playerSize The size of the player in the DOM
 * @param {Size} videoSize The native size of the video being played
 * @param {Size} stageSize The native size for the projects stage
 * @returns {string} The calculated CSS3 transform (e.g. `translate(0px, 0px) scale(1)`)
 */
export function calculateOverlayTransform(
  playerSize: Size,
  videoSize: Size,
  stageSize: Size,
): string {
  const scale = contain(playerSize, videoSize) * cover(videoSize, stageSize);
  const xOffset = (playerSize.width - (stageSize.width * scale)) / 2;
  const yOffset = (playerSize.height - (stageSize.height * scale)) / 2;

  return `translate(${xOffset.toFixed(1)}px, ${yOffset.toFixed(1)}px) scale(${scale.toFixed(4)})`;
}

// TODO check if this file is needed
