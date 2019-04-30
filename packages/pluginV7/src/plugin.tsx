import { h, Ref } from "preact";
import Stage, {
    LoadCallback,
    PlayerSize,
    Props as StageProps,
    VideoSize
} from "@plugin/shared/components/Stage";
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
    OverlayVisibilities
} from "@playkit-js/playkit-js-ovp/plugin-v7/overlayUI";
import { OVPBasePlugin } from "@playkit-js/playkit-js-ovp/plugin-v7/ovpBasePlugin";

export class HotspotsPlugin extends OVPBasePlugin {
    static defaultConfig = {};

    private _root: any;
    private _kalturaClient = new KalturaClient({
        clientTag: "playkit-js-ovp-plugins",
        endpointUrl: this.getServiceUrl()
    });

    private _renderRoot(setRef: Ref<Stage>, overlayUIProps: OverlayUIProps): any {
        const props: StageProps = {
            ...overlayUIProps,
            loadCuePoints: this._loadCuePoints.bind(this),
            getPlayerSize: this._getPlayerSize.bind(this),
            getVideoSize: this._getVideoSize.bind(this),
            pauseVideo: this._pauseVideo.bind(this),
            seekTo: this._seekTo.bind(this),
            sendAnalytics: this._sendAnalytics.bind(this)
        };

        return <Stage {...props} ref={setRef} />;
    }

    constructor(name: any, player: any, config: any) {
        super(name, player, config);
    }

    setup() {
        this.addUI(
            new OverlayUI<Stage>(this, {
                visibility: OverlayVisibilities.MediaLoaded,
                renderer: this._renderRoot.bind(this)
            })
        );

        this.eventManager.listenOnce(this.player, this.player.Event.FIRST_PLAY, this._showHotspots);

        this.eventManager.listen(this.player, this.player.Event.SEEKED, this._showHotspots);
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

    private _loadCuePoints(callback: LoadCallback) {
        this._kalturaClient
            .request(
                new CuePointListAction({
                    filter: new KalturaCuePointFilter({
                        entryIdEqual: this.player.config.sources.id,
                        cuePointTypeEqual: KalturaCuePointType.annotation,
                        tagsLike: "hotspots"
                    })
                }).setRequestOptions({
                    ks: this.player.config.session.ks,
                    partnerId: this.player.config.session.partnerId,
                    acceptedTypes: [KalturaAnnotation]
                })
            )
            .then(
                response => {
                    if (!response) {
                        return;
                    }

                    const hotspots: RawLayoutHotspot[] = convertToHotspots(response);
                    callback({ hotspots });
                },
                reason => {
                    callback({
                        error: { message: reason.message || "failure" }
                    });
                }
            );
    }

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

    private _showHotspots = () => {
        this._uiManager.root.showHotspots();
    };

    private _seekTo(time: number) {
        this.player.currentTime = time;
    }
}

KalturaPlayer.core.registerPlugin("hotspots", HotspotsPlugin);
