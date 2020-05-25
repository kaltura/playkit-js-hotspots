import { RawFloatingCuepoint, FloatingCuepoint } from "@playkit-js-contrib/ui";
export interface OpenUrl {
    type: "openUrl";
    url: string;
}

export interface OpenUrlInNewTab {
    type: "openUrlInNewTab";
    url: string;
}

export interface JumpToTime {
    type: "jumpToTime";
    jumpToTime: number;
}

type OnClickAction = OpenUrl | OpenUrlInNewTab | JumpToTime;

export type RawLayoutHotspot = RawFloatingCuepoint & {
    onClick?: OnClickAction;
    label?: string;
    styles: { [key: string]: string };
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
