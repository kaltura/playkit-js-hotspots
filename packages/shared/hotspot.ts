import { RawLayoutCuepoint, LayoutCuepoint } from "@playkit-js/playkit-js-ovp/cuepointLayoutEngine";
export interface OpenUrl {
    type: "openUrl";
    url: string;
}

export interface OpenUrlInNewTab {
    type: "openUrlInNewTab";
    url: string;
}

type OnClickAction = OpenUrl | OpenUrlInNewTab;

export type RawLayoutHotspot = RawLayoutCuepoint & {
    onClick?: OnClickAction;
    label?: string;
    styles: { [key: string]: string };
};

export type LayoutHotspot = RawLayoutHotspot & LayoutCuepoint;
