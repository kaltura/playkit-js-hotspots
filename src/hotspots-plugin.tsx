import { h, ComponentChildren } from "preact";
import {
    ContribPluginManager,
    CorePlugin,
    OnMediaLoad,
    OnMediaUnload,
    OnPluginSetup,
    ContribServices,
    ContribPluginData,
    ContribPluginConfigs
} from "@playkit-js-contrib/plugin";
import { getContribLogger } from "@playkit-js-contrib/common";
import {
    FloatingItem,
    FloatingPositions,
    FloatingUIModes,
    FloatingItemProps
} from "@playkit-js-contrib/ui";
import { KalturaClient } from "kaltura-typescript-client";
import { CuePointListAction } from "kaltura-typescript-client/api/types/CuePointListAction";
import { KalturaCuePointFilter } from "kaltura-typescript-client/api/types/KalturaCuePointFilter";
import { KalturaCuePointType } from "kaltura-typescript-client/api/types/KalturaCuePointType";
import { KalturaAnnotation } from "kaltura-typescript-client/api/types/KalturaAnnotation";
import { RawLayoutHotspot } from "./utils/hotspot";
import { convertToHotspots } from "./utils/cuepoints";

import Stage, { Props as StageProps } from "./components/Stage";
import * as classes from "./hotspots-plugin.scss";

const pluginName = `playkit-js-hotspots`;

const logger = getContribLogger({
    class: "PlaykitJsHotspotsPlugin",
    module: "playkit-js-hotspots-plugin"
});

interface PlaykitJsHotspotsPluginConfig {}

export class PlaykitJsHotspotsPlugin implements OnMediaLoad, OnMediaUnload, OnPluginSetup {
    private _hotspots: RawLayoutHotspot[] = [];
    private _kalturaClient = new KalturaClient();

    private _floatingItem: FloatingItem | null = null;

    constructor(
        private _corePlugin: CorePlugin,
        private _contribServices: ContribServices,
        private _configs: ContribPluginConfigs<PlaykitJsHotspotsPluginConfig>,
        private _player: KalturaPlayerTypes.Player
    ) {}

    onMediaLoad(): void {
        logger.trace("Hotspots plugin loaded", {
            method: "onMediaLoad"
        });
        this._addHotspotsContainer();
        this._loadCuePoints();
    }

    onMediaUnload(): void {
        logger.trace("Hotspots plugin unloaded", {
            method: "onMediaUnload"
        });
    }

    onPluginSetup(): void {
        const { playerConfig } = this._configs;

        this._kalturaClient.setOptions({
            clientTag: "playkit-js-hotspots",
            endpointUrl: playerConfig.provider.env.serviceUrl
        });

        this._kalturaClient.setDefaultRequestOptions({
            ks: playerConfig.session.ks
        });
    }

    onPluginDestroy(): void {}

    private _addHotspotsContainer(): void {
        this._floatingItem = this._contribServices.floatingManager.add({
            label: "Hotspots",
            mode: FloatingUIModes.FirstPlay,
            position: FloatingPositions.VideoArea,
            renderContent: this._renderRoot
        });
    }

    private _loadCuePoints = (): void => {
        const { playerConfig } = this._configs;
        this._kalturaClient
            .request(
                new CuePointListAction({
                    filter: new KalturaCuePointFilter({
                        entryIdEqual: playerConfig.sources.id,
                        cuePointTypeEqual: KalturaCuePointType.annotation,
                        tagsLike: "hotspots"
                    })
                }).setRequestOptions({
                    ks: playerConfig.session.ks,
                    partnerId:
                        (playerConfig.session.partnerId &&
                            Number(playerConfig.session.partnerId)) ||
                        undefined,
                    acceptedTypes: [KalturaAnnotation]
                })
            )
            .then(
                response => {
                    if (!response) {
                        return;
                    }
                    this._hotspots = convertToHotspots(response);
                    if (this._hotspots.length) {
                        this._updateHotspotsContainer();
                    }
                },
                reason => {
                    console.warn("failed to load hotspots", reason);
                }
            );
    };

    private _updateHotspotsContainer(): void {
        if (this._floatingItem) {
            this._floatingItem.update();
        }
    }

    private _pauseVideo = (): void => {
        this._player.pause();
    };

    private _seekTo = (time: number): void => {
        this._player.currentTime = time;
    };

    private _renderRoot = (floatingItemProps: FloatingItemProps): ComponentChildren => {
        const props: StageProps = {
            ...floatingItemProps,
            hotspots: this._hotspots,
            pauseVideo: this._pauseVideo,
            seekTo: this._seekTo,
            sendAnalytics: () => {} // TODO: replace by sendAnalytics method 
        };
        return <Stage {...props} key={"stage"} />;
    };
}

ContribPluginManager.registerPlugin(
    pluginName,
    (data: ContribPluginData<PlaykitJsHotspotsPluginConfig>) => {
        return new PlaykitJsHotspotsPlugin(
            data.corePlugin,
            data.contribServices,
            data.configs,
            data.player
        );
    },
    {
        defaultConfig: {}
    }
);
