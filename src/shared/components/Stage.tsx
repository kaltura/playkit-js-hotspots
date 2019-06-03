import { h, Component } from "preact";
import { RawHotspotCuepoint, HotspotCuepoint } from "../hotspot";
import Hotspot from "./Hotspot";
import { AnalyticsEvents } from "../analyticsEvents";
import { CuepointOverlayEngine, PlayerSize, VideoSize } from "@playkit-js-contrib/ui";

export interface StageProps {
    hotspots: RawHotspotCuepoint[];
    currentTime: number;
    canvas: {
        playerSize: PlayerSize;
        videoSize: VideoSize;
    };
    pauseVideo(): void;
    seekTo(time: number): void;
    sendAnalytics(event: AnalyticsEvents): void;
}

interface State {
    visibleHotspots: HotspotCuepoint[];
}

const PlayerUpdateEvent = "updatePlayHeadPercent:hotspots";

export default class Stage extends Component<StageProps, State> {
    engine: CuepointOverlayEngine<RawHotspotCuepoint, HotspotCuepoint> | null = null;

    initialState = {
        visibleHotspots: []
    };

    state: State = {
        ...this.initialState
    };

    componentDidUpdate(
        previousProps: Readonly<StageProps>,
        previousState: Readonly<State>,
        previousContext: any
    ): void {
        if (previousProps.hotspots !== this.props.hotspots) {
            this._createEngine();
        }

        if (previousProps.currentTime !== this.props.currentTime) {
            this.syncVisibleHotspots();
        }

        if (previousProps.canvas !== this.props.canvas) {
            this.handleResize();
        }
    }

    private _createEngine() {
        const {
            hotspots,
            canvas: { playerSize, videoSize }
        } = this.props;

        if (!hotspots || hotspots.length === 0) {
            this.engine = null;
            return;
        }

        this.engine = new CuepointOverlayEngine<RawHotspotCuepoint, HotspotCuepoint>(hotspots);
        this.engine.updateLayout(playerSize, videoSize);
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
                let visibleHotspots: HotspotCuepoint[] = state.visibleHotspots;
                show.forEach((hotspot: HotspotCuepoint) => {
                    const index = visibleHotspots.indexOf(hotspot);
                    if (index === -1) {
                        visibleHotspots.push(hotspot);
                    }
                });

                hide.forEach((hotspot: HotspotCuepoint) => {
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
        const {
            canvas: { playerSize, videoSize }
        } = this.props;
        if (this.engine) {
            this.engine.updateLayout(playerSize, videoSize);
            this.syncVisibleHotspots(true);
        }
    };

    private reset = () => {
        this.engine = null;

        this.setState({
            ...this.initialState
        });
    };

    private renderHotspots = (visualHotspot: HotspotCuepoint[]) => {
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
