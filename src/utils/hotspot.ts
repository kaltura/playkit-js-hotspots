export interface OpenUrl {
	type: 'openUrl',
	url: string
}

export interface OpenUrlInNewTab {
  type: 'openUrlInNewTab',
  url: string
}


type OnClickAction = OpenUrl | OpenUrlInNewTab;

export interface Layout {
  x: number, y: number, width: number, height: number
}

export interface Hotspot {
	id: string,
	startTime: number,
	endTime?: number,
	onClick?: OnClickAction,
	label?: string,
	rawLayout: { relativeX: number, relativeY: number, relativeWidth: number, relativeHeight: number, stageWidth: number, stageHeight: number }
	styles: { [key: string] : string}
}

export interface VisualHotspot extends Hotspot {
  layout: Layout
}

