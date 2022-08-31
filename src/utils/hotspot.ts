export interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RawFloatingCuepoint {
  id: string;
  startTime: number;
  endTime?: number;
  rawLayout: {
    relativeX: number;
    relativeY: number;
    relativeWidth: number;
    relativeHeight: number;
    stageWidth: number;
    stageHeight: number;
  };
}

export interface FloatingCuepoint extends RawFloatingCuepoint {
  layout: Layout;
}

export interface OpenUrl {
  type: 'openUrl';
  url: string;
}
export interface OpenUrlInNewTab {
  type: 'openUrlInNewTab';
  url: string;
}
export interface JumpToTime {
  type: 'jumpToTime';
  jumpToTime: number;
}
type OnClickAction = OpenUrl | OpenUrlInNewTab | JumpToTime;

export type RawLayoutHotspot = RawFloatingCuepoint & {
  onClick?: OnClickAction;
  label?: string;
  styles: {[key: string]: string};
};

export type LayoutHotspot = RawLayoutHotspot & FloatingCuepoint;

export interface Size {
  width: number;
  height: number;
}

export interface Canvas {
  playerSize: Size;
  videoSize: Size;
}
