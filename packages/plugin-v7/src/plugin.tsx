import { h, Ref } from "preact";
import Stage, { PlayerSize, Props as StageProps, VideoSize } from "@plugin/shared/components/Stage";
import { KalturaClient } from "kaltura-typescript-client";
import { CuePointListAction } from "kaltura-typescript-client/api/types/CuePointListAction";
import { KalturaCuePointFilter } from "kaltura-typescript-client/api/types/KalturaCuePointFilter";
import { KalturaCuePointType } from "kaltura-typescript-client/api/types/KalturaCuePointType";
import { RawLayoutHotspot } from "@plugin/shared/hotspot";
import { convertToHotspots } from "@plugin/shared/cuepoints";
import { KalturaAnnotation } from "kaltura-typescript-client/api/types/KalturaAnnotation";
import {
    OverlayUI,
    OverlayUIProps,
    OverlayVisibilities,
    OVPBasePlugin
} from "@playkit-js/playkit-js-ovp-v7";
import Hotspot from "@plugin/shared/components/Hotspot";

export class HotspotsPlugin extends OVPBasePlugin {
    static defaultConfig = {};

    private _overlay: OverlayUI<Stage> | null = null;
    private _hotspots: RawLayoutHotspot[] = [];
    private _kalturaClient = new KalturaClient({
        clientTag: "playkit-js-ovp-plugins",
        endpointUrl: this.getServiceUrl()
    });

    constructor(name: any, player: any, config: any) {
        super(name, player, config);
    }

    setup() {
        // TODO consult about the setTimeout
        setTimeout(() => {
            this._overlay = this.addUI(
                new OverlayUI<Stage>(this, {
                    visibility: OverlayVisibilities.FirstPlay,
                    renderer: this._renderRoot
                })
            );
        });

        this.eventManager.listenOnce(this.player, this.player.Event.MEDIA_LOADED, () => {
            this._loadCuePoints();
        });
    }

    static isValid(player: any) {
        return true;
    }

    destroy() {
        // TODO unlisten to events on destroy
    }

    reset() {
        // TODO cancel load request
    }

    // TODO move to overlayUI
    private _getPlayerSize(): PlayerSize {
        return this.player.dimensions;
    }

    private _loadCuePoints = (): void => {
        this._kalturaClient
            .request(
                new CuePointListAction({
                    filter: new KalturaCuePointFilter({
                        entryIdEqual: this.getEntryId(),
                        cuePointTypeEqual: KalturaCuePointType.annotation,
                        tagsLike: "hotspots"
                    })
                }).setRequestOptions({
                    ks: this.getKS(),
                    partnerId: this.getPartnerId(),
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
                        this._overlay.rebuild();
                    }
                },
                reason => {
                    // TODO decide what to do in case of an error
                }
            );
    };

    // TODO move to overlayUI
    private _getVideoSize(): VideoSize {
        const videoTrack = this.player.getActiveTracks().video;

        if (!videoTrack) {
            return { width: 0, height: 0 };
        }

        return {
            width: videoTrack.width,
            height: videoTrack.height
        };
    }

    private _pauseVideo() {
        this.player.pause();
    }

    private _seekTo(time: number) {
        this.player.currentTime = time;
    }

    private _renderRoot = (setRef: Ref<Stage>, overlayUIProps: OverlayUIProps): any => {
        const props: StageProps = {
            ...overlayUIProps,
            hotspots: this._hotspots,
            getPlayerSize: this._getPlayerSize.bind(this),
            getVideoSize: this._getVideoSize.bind(this),
            pauseVideo: this._pauseVideo.bind(this),
            seekTo: this._seekTo.bind(this),
            sendAnalytics: this._sendAnalytics.bind(this)
        };

        // NOTE: the key attribute here is
        return <Stage {...props} ref={setRef} key={"stage"} />;
    };
}

KalturaPlayer.core.registerPlugin("hotspots", HotspotsPlugin);
