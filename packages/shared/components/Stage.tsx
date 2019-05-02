import { h, Component } from "preact";
import { RawLayoutHotspot, LayoutHotspot } from "../hotspot";
import Hotspot from "./Hotspot";
import { CuepointLayoutEngine, RawLayoutCuepoint } from "@playkit-js/playkit-js-ovp";
import { AnalyticsEvents } from "../analyticsEvents";

export type PlayerSize = { width: number; height: number };
export type VideoSize = { width: number; height: number };

export interface Props {
    hotspots: RawLayoutHotspot[];
    currentTime: number;
    shouldHandleResize: boolean;
    getPlayerSize(): PlayerSize;
    getVideoSize(): VideoSize;
    pauseVideo(): void;
    seekTo(time: number): void;
    sendAnalytics(event: AnalyticsEvents): void;
}

interface State {
    playerSize: PlayerSize;
    videoSize: VideoSize;
    visibleHotspots: LayoutHotspot[];
}

const PlayerUpdateEvent = "updatePlayHeadPercent:hotspots";

export default class Stage extends Component<Props, State> {
    engine: CuepointLayoutEngine<RawLayoutCuepoint, LayoutHotspot> | null = null;

    initialState = {
        playerSize: this.props.getPlayerSize(),
        videoSize: this.props.getVideoSize(),
        visibleHotspots: []
    };

    state: State = {
        ...this.initialState
    };

    componentDidUpdate(
        previousProps: Readonly<Props>,
        previousState: Readonly<State>,
        previousContext: any
    ): void {
        if (previousProps.hotspots !== this.props.hotspots) {
            this._createEngine();
        }

        if (previousProps.currentTime !== this.props.currentTime) {
            this.syncVisibleHotspots();
        }

        if (previousProps.shouldHandleResize !== this.props.shouldHandleResize) {
            this.handleResize();
        }
    }

    private _createEngine() {
        const { hotspots } = this.props;

        if (!hotspots || hotspots.length === 0) {
            this.engine = null;
            return;
        }

        this.engine = new CuepointLayoutEngine<RawLayoutCuepoint, LayoutHotspot>(hotspots);
        this.engine.updateLayout(this.state.playerSize, this.state.videoSize);
    }

    componentDidMount() {
        this.reset();
        this._createEngine();
    }

    private syncVisibleHotspots(forceSnapshot = false) {
        const { currentTime } = this.props;

        this.setState((state: State) => {
            if (!this.engine) {
                return {
                    visibleHotspots: []
                };
            }

            const hotspotsUpdate = this.engine.updateTime(currentTime, forceSnapshot);
            if (hotspotsUpdate.snapshot) {
                return {
                    visibleHotspots: hotspotsUpdate.snapshot
                };
            }

            if (!hotspotsUpdate.delta) {
                return {
                    visibleHotspots: []
                };
            }

            const { show, hide } = hotspotsUpdate.delta;

            if (show.length !== 0 || hide.length !== 0) {
                let visibleHotspots: LayoutHotspot[] = state.visibleHotspots;
                show.forEach((hotspot: LayoutHotspot) => {
                    const index = visibleHotspots.indexOf(hotspot);
                    if (index === -1) {
                        visibleHotspots.push(hotspot);
                    }
                });

                hide.forEach((hotspot: LayoutHotspot) => {
                    const index = visibleHotspots.indexOf(hotspot);
                    if (index !== -1) {
                        visibleHotspots.splice(index, 1);
                    }
                });

                return {
                    visibleHotspots
                };
            }
        });
    }

    handleResize = (): void => {
        const { getPlayerSize, getVideoSize } = this.props;

        this.setState(
            {
                playerSize: getPlayerSize(),
                videoSize: getVideoSize()
            },
            () => {
                if (this.engine) {
                    this.engine.updateLayout(this.state.playerSize, this.state.videoSize);
                    this.syncVisibleHotspots(true);
                }
            }
        );
    };

    private reset = () => {
        this.engine = null;

        this.setState({
            ...this.initialState
        });
    };

    private renderHotspots = (visualHotspot: LayoutHotspot[]) => {
        if (!visualHotspot) {
            return null;
        }

        const { seekTo, pauseVideo, sendAnalytics } = this.props;

        return visualHotspot.map(hotspotData => (
            <Hotspot
                pauseVideo={pauseVideo}
                seekTo={seekTo}
                key={hotspotData.id}
                visible={true}
                hotspot={hotspotData}
                sendAnalytics={sendAnalytics}
            />
        ));
    };

    render() {
        const { visibleHotspots } = this.state;
        const hotspotsElements = this.renderHotspots(visibleHotspots);

        const style = {
            position: "absolute",
            display: "block",
            overflow: "visible",
            top: 0,
            left: 0,
            width: 0,
            height: 0
        };

        return <div style={style}>{hotspotsElements}</div>;
    }
}
