import { h, Ref, ComponentChild } from "preact";
import { KalturaClient } from "kaltura-typescript-client";
import {
    ContribConfig,
    OnMediaLoad,
    OnMediaLoadConfig,
    OnMediaUnload,
    OnPluginSetup,
    OnRegisterUI,
    PlayerContribPlugin
} from "@playkit-js-contrib/plugin";
import { OverlayItem, OverlayItemProps, OverlayUIModes, UIManager } from "@playkit-js-contrib/ui";
import Stage, { StageProps } from "./shared/components/Stage";
import {
    CuePointListAction,
    KalturaAnnotation,
    KalturaCuePointFilter,
    KalturaCuePointType
} from "kaltura-typescript-client/api/types";
import { RawHotspotCuepoint } from "./shared/hotspot";
import { convertToHotspots } from "./shared/cuepoints";

const isDev = true; // TODO - should be provided by Omri Katz as part of the cli implementation
const pluginName = `hotspots${isDev ? "-local" : ""}`;

export class HotspotsPlugin extends PlayerContribPlugin
    implements OnMediaUnload, OnRegisterUI, OnMediaLoad, OnPluginSetup {
    static defaultConfig = {};

    private _overlay: OverlayItem<Stage> | null = null;
    private _hotspots: RawHotspotCuepoint[] = [];
    private _kalturaClient = new KalturaClient();

    onPluginSetup(config: ContribConfig): void {
        this._kalturaClient.setOptions({
            clientTag: "playkit-js-hotspots",
            endpointUrl: config.server.serviceUrl
        });

        this._kalturaClient.setDefaultRequestOptions({
            ks: config.server.ks
        });
    }

    onRegisterUI(uiManager: UIManager): void {
        this._overlay = uiManager.overlay.add({
            name: "hotspots",
            mode: OverlayUIModes.FirstPlay,
            renderer: this._renderRoot
        });
    }

    onMediaLoad(config: OnMediaLoadConfig): void {
        this._loadCuePoints(config.entryId);
    }

    onMediaUnload(): void {
        this._overlay = null;
        this._hotspots = [];
    }

    private _loadCuePoints = (entryId: string): void => {
        this._kalturaClient
            .request(
                new CuePointListAction({
                    filter: new KalturaCuePointFilter({
                        entryIdEqual: entryId,
                        cuePointTypeEqual: KalturaCuePointType.annotation,
                        tagsLike: "hotspots"
                    })
                }).setRequestOptions({
                    acceptedTypes: [KalturaAnnotation]
                })
            )
            .then(
                response => {
                    if (!response) {
                        return;
                    }

                    this._hotspots = convertToHotspots(response);
                    if (this._overlay) {
                        // TODO
                        //this._overlay.update();
                    }
                },
                reason => {
                    console.warn("failed to load hotspots", reason);
                }
            );
    };

    private _pauseVideo() {
        this.player.pause();
    }

    private _seekTo(time: number) {
        this.player.currentTime = time;
    }

    private _renderRoot = (overlayUIProps: OverlayItemProps): ComponentChild => {
        const props: StageProps = {
            ...overlayUIProps,
            hotspots: this._hotspots,
            pauseVideo: this._pauseVideo.bind(this),
            seekTo: this._seekTo.bind(this),
            sendAnalytics: this._sendAnalytics.bind(this)
        };

        // NOTE: the key attribute here is
        return <Stage {...props} />;
    };
}

KalturaPlayer.core.registerPlugin(pluginName, HotspotsPlugin);
