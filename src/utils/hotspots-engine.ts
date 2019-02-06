
import { log } from './logger';
import { Hotspot, Layout, VisualHotspot } from "./hotspot";

enum ChangeTypes {
    Show = 'show',
    Hide = 'hide'
}
export type PlayerSize = { width: number, height: number};
export type VideoSize = { width: number, height: number};
type ChangeData = { time: number, type: ChangeTypes, cuePoint: VisualHotspot}

const reasonableSeekThreshold = 2000;

interface ScaleCalculation {
  width: number,
    height: number,
    left: number,
    top: number,
    scaleToTargetWidth: boolean
}

function scaleVideo(videoWidth: number, videoHeight: number, playerWidth: number, playerHeight: number, fLetterBox: boolean) : ScaleCalculation {

  var result: ScaleCalculation = { width: 0, height: 0, left: 0, top: 0, scaleToTargetWidth: true };

  if ((videoWidth <= 0) || (videoHeight <= 0) || (playerWidth <= 0) || (playerHeight <= 0)) {
    return result;
  }

  // scale to the target width
  var scaleX1 = playerWidth;
  var scaleY1 = (videoHeight * playerWidth) / videoWidth;

  // scale to the target height
  var scaleX2 = (videoWidth * playerHeight) / videoHeight;
  var scaleY2 = playerHeight;

  // now figure out which one we should use
  var fScaleOnWidth = (scaleX2 > playerWidth);
  if (fScaleOnWidth) {
    fScaleOnWidth = fLetterBox;
  }
  else {
    fScaleOnWidth = !fLetterBox;
  }

  if (fScaleOnWidth) {
    result.width = Math.abs(scaleX1);
    result.height = Math.abs(scaleY1);
    result.scaleToTargetWidth = true;
  }
  else {
    result.width = Math.abs(scaleX2);
    result.height = Math.abs(scaleY2);
    result.scaleToTargetWidth = false;
  }
  result.left = Math.abs((playerWidth - result.width) / 2);
  result.top = Math.abs((playerHeight - result.height) / 2);

  return result;
}

export class HotspotsEngine {
    private isFirstTime = true;
    private hotspotsLayoutReady = false;
    private lastHandledTime: number | null = null;
    private lastHandledTimeIndex: number | null = null;
    private nextTimeToHandle: number | null = null;
    private hotspotsChanges: ChangeData[] = [];
    private playerSize: PlayerSize | null = null;
    private videoSize: VideoSize | null = null;
    hotspots: VisualHotspot[];

    constructor(hotspots: Hotspot[]) {
        log('debug', 'ctor', 'executed');
        this.hotspots = hotspots as VisualHotspot[]; // NOTICE: it is the responsability of this engine not to return hotspot without layout
        this.prepareHotspots();
    }

    public updateLayout(playerSize: PlayerSize | null, videoSize: VideoSize | null) {
      this.videoSize = videoSize;
      this.playerSize = playerSize;

      this.recalculateHotspotsLayout();
      return this.lastHandledTimeIndex ? this.createHotspotsSnapshot(this.lastHandledTimeIndex) : [];
    }

    private _calculateLayout(hotspot: Hotspot, scaleCalculation: ScaleCalculation): Layout {
      const { originalLayout } = hotspot;
      return {
        x: scaleCalculation.left + originalLayout.relativeX * scaleCalculation.width,
        y: scaleCalculation.top + originalLayout.relativeY * scaleCalculation.height,
        width: originalLayout.relativeWidth * scaleCalculation.width,
        height: originalLayout.relativeHeight * scaleCalculation.height
      }
    }

    private recalculateHotspotsLayout(): void {
      log('debug', 'recalculateHotspotsLayout', `calculating hotspots layout based on video/player sizes`);

      if (!this.playerSize || !this.videoSize) {
        log('debug', 'recalculateHotspotsLayout', `missing video/player sizes, hide all hotspots`);
        this.hotspotsLayoutReady = false;
        return;
      }

      const { width: playerWidth, height: playerHeight } = this.playerSize;
      const { width: videoWidth, height: videoHeight } = this.videoSize;
      const canCalcaulateLayout = playerWidth && playerHeight && videoWidth && videoHeight;

      if (!canCalcaulateLayout) {
        log('debug', 'recalculateHotspotsLayout', `missing video/player sizes, hide all hotspots`);
        this.hotspotsLayoutReady = false;
        return;
      }

      const scaleCalculation = scaleVideo(videoWidth, videoHeight, playerWidth, playerHeight, true);

      log('debug', 'recalculateHotspotsLayout', `recalculate hotspots layout based on new sizes`, scaleCalculation);

      (this.hotspots || []).forEach(hotspot => {
        hotspot.layout = this._calculateLayout(hotspot, scaleCalculation);
      });

      this.hotspotsLayoutReady = true;

    }

    public getSnapshot(time: number) : Hotspot[] {
        const timeIndex = this.findClosestLastIndexByTime(time);
        log('debug', 'getSnapshot', `create snapshot based on time ${time}`, {timeIndex});
        return this.createHotspotsSnapshot(timeIndex);
    }

    public updateTime(currentTime: number, forceSnapshot = false): { snapshot?: Hotspot[], delta?: {show: VisualHotspot[], hide: VisualHotspot[]}} {
        const { isFirstTime, lastHandledTime, nextTimeToHandle } = this;

        if (this.hotspotsChanges.length === 0) {
            if (isFirstTime) {
                log('log', 'updateTime', `hotspots list empty. will always return empty snapshot`);
                this.isFirstTime = false;
            }
            return { snapshot: [] }
        }

        const userSeeked = !isFirstTime && lastHandledTime !== null && nextTimeToHandle !== null && (lastHandledTime > currentTime || (currentTime - nextTimeToHandle) > reasonableSeekThreshold);
        const hasChangesToHandle = isFirstTime || (this.lastHandledTime !== null  && this.lastHandledTime > currentTime) ||  (this.nextTimeToHandle != null && currentTime >= this.nextTimeToHandle);
        const closestChangeIndex = this.findClosestLastIndexByTime(currentTime);
        const closestChangeTime = closestChangeIndex < 0 ? 0 : this.hotspotsChanges[closestChangeIndex].time;

        if (!hasChangesToHandle) {
            // log('log', 'updateTime', `new time is between handled time and next time to handle, assume no delta`);

            if (forceSnapshot) {
                return { snapshot: this.createHotspotsSnapshot(closestChangeIndex)};
            }

            return { delta: this.createEmptyDelta() };
        }

        log('debug', 'updateTime', `has changes to handle. check if need to return snapshot instead of delta based on provided new time`,
            {currentTime, closestChangeIndex, closestChangeTime, lastHandledTime, nextTimeToHandle, isFirstTime });

        if (isFirstTime || forceSnapshot || userSeeked) {
            log('debug', 'updateTime', `some conditions doesn't allow returning delta, return snapshot instead`,
                { isFirstTime, userSeeked, forceSnapshot });

            const snapshot = this.createHotspotsSnapshot(closestChangeIndex);
            this.updateInternals(closestChangeTime, closestChangeIndex);

            return { snapshot };
        }

        const delta = this.createHotspotsDelta(closestChangeIndex);
        this.updateInternals(closestChangeTime, closestChangeIndex);

        return { delta };
    }

    private createHotspotsSnapshot(targetIndex: number) : VisualHotspot[] {
        if (!this.hotspotsLayoutReady || targetIndex < 0 || !this.hotspotsChanges || this.hotspotsChanges.length === 0) {
          log('log', 'createHotspotsSnapshot', `resulted with empty snapshot`,
            {
              targetIndex,
              hotspotsLayoutReady: this.hotspotsLayoutReady,
              hotspotsCount: (this.hotspotsChanges || []).length
            });
          return [];
        }

        const snapshot: VisualHotspot[] = [];

        for (let index = 0; index <= targetIndex; index++) {
            const item = this.hotspotsChanges[index];
            const hotspotIndex = snapshot.indexOf(item.cuePoint);
            if (item.type === ChangeTypes.Show) {
                if (hotspotIndex === -1) {
                    snapshot.push(item.cuePoint);
                }
            } else {
                if (hotspotIndex !== -1) {
                    snapshot.splice(hotspotIndex, 1);
                }
            }
        }

        log('log', 'createHotspotsSnapshot', 'resulted snapshot', { snapshot });
        return snapshot;
    }

    private createHotspotsDelta(targetIndex: number): { show: VisualHotspot[], hide: VisualHotspot[]} {
        if (!this.hotspotsLayoutReady || !this.hotspotsChanges || this.hotspotsChanges.length === 0) {
          log('log', 'createHotspotsDelta', `resulted with empty delta`,
            {
              hotspotsLayoutReady: this.hotspotsLayoutReady,
              hotspotsCount: (this.hotspotsChanges || []).length
            });
            return this.createEmptyDelta();
        }

      const { lastHandledTimeIndex } = this;

      if (lastHandledTimeIndex === null) {
          log('log', 'createHotspotsDelta', `invalid internal state. resulted with empty delta`);
          return this.createEmptyDelta();
        }

        const newHotspots: VisualHotspot[] = [];
        const removedHotspots: VisualHotspot[] = [];

        log('log', 'createHotspotsDelta', `find hotspots that were added or removed`);
        for (let index = lastHandledTimeIndex+1; index <= targetIndex; index++) {
            const item = this.hotspotsChanges[index];
            const hotspotIndex = newHotspots.indexOf(item.cuePoint);
            if (item.type === ChangeTypes.Show) {
                if (hotspotIndex === -1) {
                    newHotspots.push(item.cuePoint);
                }
            } else {
                if (hotspotIndex !== -1) {
                    log('log', 'createHotspotsDelta', `hotspot was marked with type ${item.type} at ${item.time}. remove from new hotspots list as it wasn't visible yet`,
                        { hotspot: item.cuePoint });
                    newHotspots.splice(hotspotIndex, 1);
                } else if (removedHotspots.indexOf(item.cuePoint) === -1) {
                    log('log', 'createHotspotsDelta', `hotspot was marked with type ${item.type} at ${item.time}. add to removed hotspots list`,
                        { hotspot: item.cuePoint });
                    removedHotspots.push(item.cuePoint);
                }
            }
        }

        log('log', 'createHotspotsDelta', 'resulted delta', { newHotspots, removedHotspots });
        return { show: newHotspots, hide: removedHotspots};
    }

    private updateInternals(time: number, timeIndex: number) {
        const {hotspotsChanges} = this;

        if (!hotspotsChanges || hotspotsChanges.length === 0) {
            return;
        }

        const isIndexOfLastChange = timeIndex >= hotspotsChanges.length - 1;
        const isIndexBeforeTheFirstChange = timeIndex === null;
        this.lastHandledTime = time;
        this.lastHandledTimeIndex = timeIndex;
        this.nextTimeToHandle = isIndexBeforeTheFirstChange ? hotspotsChanges[0].time :
            isIndexOfLastChange ? hotspotsChanges[hotspotsChanges.length - 1].time :
                hotspotsChanges[timeIndex + 1].time;
        this.isFirstTime = false;
        log('debug', 'updateInternals', `update inner state with new time and index`,
            {
                lastHandledTime: this.lastHandledTime,
                lastHandledTimeIndex: this.lastHandledTimeIndex,
                nextTimeToHandle: this.nextTimeToHandle
            });
    }

    private createEmptyDelta(): {show: VisualHotspot[], hide: VisualHotspot[]} {
        return {show: [], hide: []};
    }

    private binarySearch(items: ChangeData[], value: number): number | null {

        if (!items || items.length === 0) {
            // empty array, no index to return
            return null;
        }

        if (value < items[0].time) {
            // value less then the first item. return -1
            return -1;
        }
        if (value > items[items.length - 1].time) {
            // value bigger then the last item, return last item index
            return items.length - 1;
        }

        let lo = 0;
        let hi = items.length - 1;

        while (lo <= hi) {
            let mid = Math.floor((hi + lo + 1) / 2);

            if (value < items[mid].time) {
                hi = mid - 1;
            } else if (value > items[mid].time) {
                lo = mid + 1;
            } else {
                return mid;
            }
        }

        return Math.min(lo, hi); // return the lowest index which represent the last visual item
    }

    private findClosestLastIndexByTime(time: number): number {
        const changes = this.hotspotsChanges;
        let closestIndex = this.binarySearch(changes, time);

        if (closestIndex === null) {
            return -1;
        }

        const changesLength = changes.length;
        while (closestIndex < changesLength-1 && changes[closestIndex+1].time === time)
        {
            closestIndex++;
        }

        return closestIndex;
    }

    private prepareHotspots() {
        (this.hotspots || []).forEach(hotspot => {

          if (hotspot.startTime !== null && typeof hotspot.startTime !== 'undefined' && hotspot.startTime >= 0) {
            this.hotspotsChanges.push(
              {
                time: hotspot.startTime,
                type: ChangeTypes.Show,
                cuePoint: hotspot as VisualHotspot // NOTICE: it is the responsability of this engine not to return hotspot without layout
              }
            )
          }

          if (hotspot.endTime !== null && typeof hotspot.endTime !== 'undefined' && hotspot.endTime >= 0) {
            this.hotspotsChanges.push(
                    {
                        time: hotspot.endTime,
                        type: ChangeTypes.Hide,
                        cuePoint: hotspot as VisualHotspot // NOTICE: it is the responsability of this engine not to return hotspot without layout
                    }
                )
            }
        });

        this.hotspotsChanges.sort((a,b) => {
            return a.time < b.time ? -1 : a.time === b.time ? 0 : 1
        });

        log('debug', 'prepareHotspots', `tracking ${this.hotspotsChanges.length} changes`, this.hotspotsChanges);
    }


}
