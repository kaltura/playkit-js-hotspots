export interface HotspotData {
	id: string,
	startTime: number,
	endTime?: number,
	label: string,
	layout: { x: number, y: number, width: number, height: number },
	styles: { [key: string] : string}
}
