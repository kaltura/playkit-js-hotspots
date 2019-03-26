import { RawLayoutHotspot } from "./hotspot";
import { log } from "playkit-js-ovp/logger";
import { KalturaAnnotation } from "kaltura-typescript-client/api/types/KalturaAnnotation";
import { KalturaCuePointListResponse } from "kaltura-typescript-client/api/types/KalturaCuePointListResponse";

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

export function convertToHotspots(response: KalturaCuePointListResponse):  RawLayoutHotspot[] {

    const result: RawLayoutHotspot[] = [];

  (response.objects || []).forEach((cuepoint) => {
    const annotationCuepoint = cuepoint as KalturaAnnotation;

    const {
      result: partnerData,
      error
    } = toObject(cuepoint.partnerData);

    if (
      !partnerData ||
      !partnerData.schemaVersion
    ) {
      log(
        "warn",
        "loadCuePoints",
        `annotation '${
          cuepoint.id
          }' has no schema version, skip annotation`
      );
      return;
    }

    const rawLayout = {
      ...partnerData.layout
    };

    result.push({
      id: cuepoint.id,
      startTime: cuepoint.startTime,
      endTime: annotationCuepoint.endTime,
      label: annotationCuepoint.text,
      styles: partnerData.styles,
      onClick: partnerData.onClick,
      rawLayout: rawLayout
    });
  });

  return result;
}
