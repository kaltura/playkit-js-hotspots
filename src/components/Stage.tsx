import { h, Component } from "preact";
import { RawLayoutHotspot, LayoutHotspot, Size, Canvas } from "../utils/hotspot";
import Hotspot from "./Hotspot";
import { CuepointFloatingEngine, RawFloatingCuepoint } from "@playkit-js-contrib/ui";
import { AnalyticsEvents } from "../utils/analyticsEvents";

export interface Props {
    hotspots: RawLayoutHotspot[];
    currentTime: number;
    pauseVideo(): void;
    seekTo(time: number): void;
    sendAnalytics(event: AnalyticsEvents): void;
    canvas: Canvas;
}

interface State {
    playerSize: Size;
    videoSize: Size;
    visibleHotspots: LayoutHotspot[];
}

export default class Stage extends Component<Props, State> {
    private _engine: CuepointFloatingEngine<RawFloatingCuepoint, LayoutHotspot> | null = null;

    initialState = {
        playerSize: this.props.canvas.playerSize,
        videoSize: this.props.canvas.videoSize,
        visibleHotspots: []
    };

    state: State = {
        ...this.initialState
    };

    componentDidUpdate(previousProps: Readonly<Props>, previousState: Readonly<State>): void {
        if (previousProps.hotspots !== this.props.hotspots) {
            this._createEngine();
        }

        if (previousProps.currentTime !== this.props.currentTime) {
            this._syncVisibleHotspots();
        }

        if (this._checkIfResizeHappened(previousProps.canvas, this.props.canvas)) {
            this.handleResize();
        }
    }

    private _checkIfResizeHappened = (prevCanvas: Canvas, nextCanvas: Canvas): boolean => {
        const prevPlayerSize = prevCanvas.playerSize;
        const prevVideoSize = prevCanvas.videoSize;
        const nextPlayerSize = nextCanvas.playerSize;
        const nextVideoSize = nextCanvas.videoSize;
        if (
            prevPlayerSize.width !== nextPlayerSize.width ||
            prevPlayerSize.height !== nextPlayerSize.height ||
            prevVideoSize.width !== nextVideoSize.width ||
            prevVideoSize.height !== nextVideoSize.height
        ) {
            return true;
        }
        return false;
    };

    private _createEngine = () => {
        const { hotspots } = this.props;
        if (!hotspots || hotspots.length === 0) {
            this._engine = null;
            return;
        }
        this._engine = new CuepointFloatingEngine<RawFloatingCuepoint, LayoutHotspot>(hotspots);
        this._engine.updateLayout(this.state.playerSize, this.state.videoSize);
    };

    componentDidMount() {
        this.reset();
        this._createEngine();
    }

    private _syncVisibleHotspots = (forceSnapshot = false) => {
        const { currentTime } = this.props;

        this.setState((state: State) => {
            if (!this._engine) {
                return {
                    visibleHotspots: []
                };
            }

            const hotspotsUpdate = this._engine.updateTime(currentTime, forceSnapshot);
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
            return state;
        });
    };

    handleResize = (): void => {
        const { canvas } = this.props;

        this.setState(
            {
                playerSize: canvas.playerSize,
                videoSize: canvas.videoSize
            },
            () => {
                if (this._engine) {
                    this._engine.updateLayout(this.state.playerSize, this.state.videoSize);
                    this._syncVisibleHotspots(true);
                }
            }
        );
    };

    private reset = () => {
        this._engine = null;
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
