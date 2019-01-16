export interface OpenUrl {
	type: 'openUrl',
	url: string
}

export interface OpenUrlInNewTab {
  type: 'openUrlInNewTab',
  url: string
}

type OnClickAction = OpenUrl | OpenUrlInNewTab;

export interface HotspotData {
	id: string,
	startTime: number,
	endTime?: number,
	onClick?: OnClickAction,
	label?: string,
	layout: { x: number, y: number, width: number, height: number },
	styles: { [key: string] : string}
}
