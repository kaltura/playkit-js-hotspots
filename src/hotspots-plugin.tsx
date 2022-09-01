import {h, ComponentChildren} from 'preact';
import {ContribServices, FloatingItem, FloatingItemProps, FloatingUIModes, FloatingPositions, CuePoint, TimedMetadataEvent} from '@playkit-js/common';
import {RawLayoutHotspot, LayoutHotspot, Canvas, RawFloatingCuepoint, Layout} from './utils/hotspot';
import HotspotWrapper from './components/HotspotWrapper';
import {ScaleCalculation, scaleVideo} from './utils/scale-video';

interface HotspotsPluginConfig {}

export interface HotspotsMetadata {
  cuePointType: string;
  tags?: string;
  text?: string;
  partnerData?: LayoutHotspot & {
    schemaVersion: string;
    layout: {
      relativeHeight: number;
      relativeWidth: number;
      relativeX: number;
      relativeY: number;
      stageHeight: number;
      stageWidth: number;
    };
  };
}

type HotspotCuePoint = CuePoint<HotspotsMetadata>;

export class HotspotsPlugin extends KalturaPlayer.core.BasePlugin {
  static defaultConfig: HotspotsPluginConfig = {};

  private _player: KalturaPlayerTypes.Player;
  private _contribServices: ContribServices;
  private _hotspots: LayoutHotspot[] = [];
  private _floatingItem: FloatingItem | null = null;
  private _canvas: Canvas | null = null;

  constructor(name: string, player: KalturaPlayerTypes.Player, config: HotspotsPluginConfig) {
    super(name, player, config);
    this._player = player;
    this._contribServices = ContribServices.get({kalturaPlayer: this._player});
  }

  static isValid(): boolean {
    return true;
  }

  get cuePointManager() {
    return this._player.getService('kalturaCuepoints') as any;
  }

  loadMedia(): void {
    if (!this.cuePointManager || this._player.isLive()) {
      this.logger.warn("kalturaCuepoints haven't registered or current entry is live");
      return;
    }
    this._addHotspotsContainer();
    this.cuePointManager.registerTypes([this.cuePointManager.CuepointType.HOTSPOT]);
    this.eventManager.listen(this._player, this._player.Event.TIMED_METADATA_CHANGE, this._onTimedMetadataChange);
  }

  private _isHotspotType = (cue: CuePoint<any>): boolean => {
    const {metadata} = cue;
    const {KalturaCuePointType, KalturaCuePointTags} = this.cuePointManager;
    return metadata?.cuePointType === KalturaCuePointType.ANNOTATION && metadata?.tags === KalturaCuePointTags.HOTSPOT;
  };

  private _filterHotspotCues = (cues: CuePoint<any>[]): HotspotCuePoint[] => {
    return cues.filter(this._isHotspotType);
  };

  private _prepareHotspots = (hotspotCues: HotspotCuePoint[]): RawLayoutHotspot[] => {
    const result: RawLayoutHotspot[] = [];

    hotspotCues.forEach(cue => {
      const {partnerData} = cue.metadata;
      if (!partnerData || !partnerData.schemaVersion) {
        return;
      }
      result.push({
        id: cue.id,
        startTime: cue.startTime,
        endTime: cue.endTime,
        label: cue.metadata.text,
        styles: partnerData.styles,
        onClick: partnerData.onClick,
        rawLayout: {
          ...partnerData.layout
        }
      });
    });
    return result;
  };

  private _calculateLayout(cuepoint: RawFloatingCuepoint, scaleCalculation: ScaleCalculation): Layout {
    const {rawLayout} = cuepoint;
    return {
      x: scaleCalculation.left + rawLayout.relativeX * scaleCalculation.width,
      y: scaleCalculation.top + rawLayout.relativeY * scaleCalculation.height,
      width: rawLayout.relativeWidth * scaleCalculation.width,
      height: rawLayout.relativeHeight * scaleCalculation.height
    };
  }

  private _recalculateCuepointLayout = (hotspots: RawLayoutHotspot[] | LayoutHotspot[]): LayoutHotspot[] => {
    this.logger.debug('calculating cuepoint layout based on video/player sizes');

    if (!this._canvas?.playerSize || !this._canvas?.videoSize) {
      this.logger.warn('missing video/player sizes, hide all cuepoint');
      return [];
    }

    const {width: playerWidth, height: playerHeight} = this._canvas.playerSize;
    const {width: videoWidth, height: videoHeight} = this._canvas.videoSize;
    const canCalcaulateLayout = playerWidth && playerHeight && videoWidth && videoHeight;

    if (!canCalcaulateLayout) {
      this.logger.warn('missing video/player sizes, hide all cuepoint');
      return [];
    }

    const scaleCalculation = scaleVideo(videoWidth, videoHeight, playerWidth, playerHeight, true);

    this.logger.debug('recalculate cuepoint layout based on new sizes');
    return hotspots.map(cuepoint => ({
      ...cuepoint,
      layout: this._calculateLayout(cuepoint as any, scaleCalculation)
    }));
  };

  private _onTimedMetadataChange = ({payload}: TimedMetadataEvent) => {
    const hotspotCues = this._filterHotspotCues(payload.cues);
    if (hotspotCues.length) {
      const rawLayoutHotspots = this._prepareHotspots(hotspotCues);
      this._hotspots = this._recalculateCuepointLayout(rawLayoutHotspots);
      this._updateHotspotsContainer();
    }
  };

  private _addHotspotsContainer(): void {
    this._floatingItem = this._contribServices.floatingManager.add({
      label: 'Hotspots',
      mode: FloatingUIModes.FirstPlay,
      position: FloatingPositions.VideoArea,
      renderContent: this._renderRoot
    });
  }

  private _updateHotspotsContainer(): void {
    if (this._floatingItem) {
      this._floatingItem.update();
    }
  }

  private _pauseVideo = (): void => {
    this._player.pause();
  };
  private _seekTo = (time: number): void => {
    this._player.currentTime = time;
  };

  private _checkIfResizeHappened = (newCanvas: Canvas): boolean => {
    if (!this._canvas) {
      this._canvas = newCanvas;
      return true;
    }
    const prevPlayerSize = this._canvas.playerSize;
    const prevVideoSize = this._canvas.videoSize;
    const nextPlayerSize = newCanvas.playerSize;
    const nextVideoSize = newCanvas.videoSize;
    if (
      prevPlayerSize.width !== nextPlayerSize.width ||
      prevPlayerSize.height !== nextPlayerSize.height ||
      prevVideoSize.width !== nextVideoSize.width ||
      prevVideoSize.height !== nextVideoSize.height
    ) {
      this._canvas = newCanvas;
      return true;
    }
    return false;
  };

  private _renderRoot = (floatingItemProps: FloatingItemProps): ComponentChildren => {
    if (this._checkIfResizeHappened(floatingItemProps.canvas)) {
      this._hotspots = this._recalculateCuepointLayout(this._hotspots);
    }
    return (
      // TODO: add 'sendAnalytics' method
      <HotspotWrapper key={'hotspotWrapper'} hotspots={this._hotspots} pauseVideo={this._pauseVideo} seekTo={this._seekTo} sendAnalytics={() => {}} />
    );
  };

  reset(): void {
    this.eventManager.removeAll();
    if (this._floatingItem) {
      this._contribServices.floatingManager.remove(this._floatingItem);
      this._floatingItem = null;
    }
  }

  destroy(): void {}
}
