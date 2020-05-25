import { RawLayoutHotspot } from "./hotspot";

function toObject(
    jsonAsString: string,
    defaultValue: { [key: string]: any } = {}
): { error?: Error; result?: { [key: string]: any } } {
    if (!jsonAsString) {
        return defaultValue;
    }

    try {
        return { result: JSON.parse(jsonAsString) };
    } catch (e) {
        return { error: e };
    }
}

export function convertToHotspots(response: any): RawLayoutHotspot[] {
    const result: RawLayoutHotspot[] = [];

    (response.objects || []).forEach((cuepoint: any) => {
        const { result: partnerData, error } = toObject(cuepoint.partnerData);

        if (!partnerData || !partnerData.schemaVersion) {
            return;
        }

        const rawLayout = {
            ...partnerData.layout
        };

        result.push({
            id: cuepoint.id,
            startTime: cuepoint.startTime,
            endTime: cuepoint.endTime,
            label: cuepoint.text,
            styles: partnerData.styles,
            onClick: partnerData.onClick,
            rawLayout: rawLayout
        });
    });

    return result;
}
