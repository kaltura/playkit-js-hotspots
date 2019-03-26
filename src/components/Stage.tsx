import { h, Component } from "preact";
import { RawLayoutHotspot, LayoutHotspot } from "../utils/hotspot";
import Hotspot from './Hotspot';
import { CuepointLayoutEngine, RawLayoutCuepoint } from 'playkit-js-ovp/cuepointLayoutEngine';
import { log } from "playkit-js-ovp/logger";
import { AnalyticsEvents } from "../utils/analyticsEvents";

export type PlayerSize = { width: number, height: number};
export type VideoSize = { width: number, height: number};
export type LoadCallback = (result: { error?: {message: string}, hotspots?: RawLayoutHotspot[]}) => void;

export enum NotifyEventTypes {
	Monitor = 'monitor',
	Seeked = 'seeked'
}

interface SeekedEvent {
  type: NotifyEventTypes.Seeked
}

interface MonitorEvent {
  type: NotifyEventTypes.Monitor
}

type NotifyEvents = SeekedEvent | MonitorEvent;


export interface Props{
	loadCuePoints(callback: LoadCallback): void,
	getCurrentTime() : number,
	getPlayerSize(): PlayerSize,
	getVideoSize(): VideoSize,
  pauseVideo(): void,
  sendAnalytics(event: AnalyticsEvents): void
}

interface State {
	isLoading: boolean,
	playerSize: PlayerSize,
	videoSize: VideoSize,
	visibleHotspots: LayoutHotspot[],
	hasError: boolean,
  showHotspots: boolean
}

const PlayerUpdateEvent = "updatePlayHeadPercent:hotspots";

export default class Stage extends Component<Props, State> {
	engine: CuepointLayoutEngine<RawLayoutCuepoint, LayoutHotspot> | null = null;

	initialState = {
    isLoading: false,
    playerSize: this.props.getPlayerSize(),
		videoSize: this.props.getVideoSize(),
    visibleHotspots: [],
    showHotspots: false,
    hasError: false
	};

	state: State = {
		...this.initialState
	};

  showHotspots = () => {
    this.setState({
      showHotspots: true
    });
  }

  notify = (event: NotifyEvents) => {
		switch (event.type) {
			case NotifyEventTypes.Monitor:
			case NotifyEventTypes.Seeked:
				this.syncVisibleHotspots();
				break;
			default:
				break;
    }
  }

	private _handleCuepoints = (result: { error?: {message: string}, hotspots?: RawLayoutHotspot[]}) => {
		const {hotspots, error} = result;

		if (error || !hotspots) {
      log('error', '_handleCuepoints', 'failed to load cuepoints', { error: error ? error.message : 'missing hotspots array'});
			this.setState({
				isLoading: false,
				hasError: true,
			});
			return;
		}

		this.engine = new CuepointLayoutEngine<RawLayoutCuepoint, LayoutHotspot>(hotspots);
    this.engine.updateLayout(this.state.playerSize, this.state.videoSize);

		this.setState({
			isLoading: false,
			hasError: false,
			visibleHotspots: []
		}, () => {
			this.syncVisibleHotspots();
		});
	}

	componentDidMount() {
		this.reset();
	}

	private syncVisibleHotspots(forceSnapshot = false) {
    const { getCurrentTime } = this.props;

    this.setState((state : State) => {
      if (!this.engine) {
        return {
          visibleHotspots: []
        };
      }

      const hotspotsUpdate = this.engine.updateTime(getCurrentTime(), forceSnapshot);
      if (hotspotsUpdate.snapshot) {
        return {
          visibleHotspots: hotspotsUpdate.snapshot
        }
      }

      if (!hotspotsUpdate.delta) {
        return {
          visibleHotspots: []
        }
      }

      const { show, hide } = hotspotsUpdate.delta;

      if (show.length !== 0 || hide.length !== 0) {
        let visibleHotspots: LayoutHotspot[] = state.visibleHotspots;
        show.forEach(hotspot => {
          const index = visibleHotspots.indexOf(hotspot);
          if (index === -1) {
            visibleHotspots.push(hotspot);
          }
        });

        hide.forEach(hotspot => {
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

		this.setState({
			playerSize: getPlayerSize(),
			videoSize: getVideoSize()
		},() => {
      if (this.engine) {


        this.engine.updateLayout(this.state.playerSize, this.state.videoSize);
        this.syncVisibleHotspots(true);
      }
		});
	}

	private reset = () => {
		this.engine = null;

		this.setState({
			...this.initialState,
		}, () => {
			this.props.loadCuePoints(this._handleCuepoints)
		});
	}

	private renderHotspots = (visualHotspot: LayoutHotspot[]) => {
		if (!visualHotspot) {
			return null;
		}

    const { pauseVideo, sendAnalytics } = this.props;


    return visualHotspot.map(hotspotData => (<Hotspot pauseVideo={pauseVideo} key={hotspotData.id} visible={true} hotspot={hotspotData} sendAnalytics={sendAnalytics}/>
		));
	}

	render() {
		const { visibleHotspots, showHotspots } = this.state;
		const hotspotsElements = showHotspots ? this.renderHotspots(visibleHotspots) : null;

		const style =
			{
				position: 'absolute',
				display: 'block'

			};

	return (
			<div style={style}>
				{ hotspotsElements }
			</div>
		);
	}
}
