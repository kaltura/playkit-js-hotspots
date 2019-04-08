import { h, render } from "preact";
import Stage, {
    LoadCallback,
    NotifyEventTypes,
    PlayerSize,
    Props as StageProps,
    VideoSize
} from "@plugin/shared/components/Stage";
import { AnalyticsEvents } from "@plugin/shared/analyticsEvents";
import { PlayerCompat } from "@playkit-js/playkit-js-ovp/playerCompat";
import { KalturaClient } from "kaltura-typescript-client";
import { CuePointListAction } from "kaltura-typescript-client/api/types/CuePointListAction";
import { KalturaCuePointFilter } from "kaltura-typescript-client/api/types/KalturaCuePointFilter";
import { KalturaCuePointType } from "kaltura-typescript-client/api/types/KalturaCuePointType";
import { RawLayoutHotspot } from "@plugin/shared/hotspot";
import { convertToHotspots } from "@plugin/shared/cuepoints";
import { KalturaAnnotation } from "kaltura-typescript-client/api/types/KalturaAnnotation";
import { UIManager } from "@playkit-js/playkit-js-ovp/pluginV7/uiManager";

export class HotspotsPlugin extends KalturaPlayer.core.BasePlugin {
    static defaultConfig = {};

    private playerCompat = new PlayerCompat(this.player);
    private _root: any;
    private _uiManager: UIManager;
    private _kalturaClient: KalturaClient;

    static isValid(player: any) {
        return true;
    }

    constructor(name: any, player: any, config: any) {
        super(name, player, config);
        this._addBindings();

        this._uiManager = new UIManager(this, 'hotspots', this._renderRoot);

        this._kalturaClient = new KalturaClient({
            clientTag: "playkit-js-ovp-plugins",
            endpointUrl: this.player.config.provider.env.serviceUrl
        });
    }

    destroy() {
        // TODO unlisten to events on destroy
    }

    reset() {
        // TODO cancel load request

        if (!this._root) {
            return;
        }

        render(
            // @ts-ignore
            h(null),
            this._rootParent,
            this._root
        );

        this._root = null;
    }

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

    private _getCurrentTime(): number {
        return this.player.currentTime * 1000;
    }

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

    private _sendAnalytics(event: AnalyticsEvents) {
        // TBD
        throw new Error("tbd");
    }

    private _showHotspots() {
        this._uiManager.root.showHotspots();
    }

    private _renderRoot = (): any => {
        const props: StageProps = {
            getCurrentTime: this._getCurrentTime.bind(this),
            loadCuePoints: this._loadCuePoints.bind(this),
            getPlayerSize: this._getPlayerSize.bind(this),
            getVideoSize: this._getVideoSize.bind(this),
            pauseVideo: this._pauseVideo.bind(this),
            sendAnalytics: this._sendAnalytics.bind(this)
        };

        return <Stage {...props} />;
    };

    private _addBindings() {
        this.eventManager.listenOnce(
            this.player,
            this.player.Event.FIRST_PLAY,
            this._showHotspots.bind(this)
        );
        this.eventManager.listen(
            this.player,
            this.player.Event.SEEKED,
            this._showHotspots.bind(this)
        );
        this.eventManager.listen(this.player, this.player.Event.TIME_UPDATE, () => {
            this._uiManager.root.notify({ type: NotifyEventTypes.TimeUpdated });
        });
        this.eventManager.listen(this.player, this.player.Event.Core.RESIZE, () => {
            this._uiManager.root.handleResize();
        });
    }
}

KalturaPlayer.core.registerPlugin("hotspots", HotspotsPlugin);
