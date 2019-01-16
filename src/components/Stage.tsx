import { h, Component } from "preact";
import { HotspotData } from '../utils/hotspot-data';
import Hotspot from './Hotspot';
import { calculateOverlayTransform } from '../utils/sizeUtils';
import { HotspotsEngine } from "../utils/hotspots-engine";

export type PlayerSize = { width: number, height: number};
export type LoadCallback = (result: { error?: {message: string}, hotspots?: HotspotData[]}) => void;

export enum NotifyEventTypes {
	ChangeMedia = 'changeMedia',
	Monitor = 'monitor',
	Seeked = 'seeked'
}

interface ChangeMediaEvent {
	type: NotifyEventTypes.ChangeMedia
}


interface SeekedEvent {
  type: NotifyEventTypes.Seeked
}

interface MonitorEvent {
  type: NotifyEventTypes.Monitor
}

type NotifyEvents = ChangeMediaEvent | SeekedEvent | MonitorEvent;


interface Props{
	initialPlayerSize: PlayerSize,
	loadCuePoints(callback: LoadCallback): void,
	getCurrentTime() : number
}

interface State {
	isLoading: boolean,
	playerSize: PlayerSize,
	visibleHotspots: HotspotData[],
	hasError: boolean
}

const PlayerUpdateEvent = "updatePlayHeadPercent:hotspots";

export default class Stage extends Component<Props, State> {
	engine: HotspotsEngine | null = null;

	state: State = {
		isLoading: false,
		playerSize: this.props.initialPlayerSize,
		visibleHotspots: [],
		hasError: false
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

	private _handleCuepoints = (result: { error?: {message: string}, hotspots?: any[]}) => {
		const {hotspots, error} = result;

		if (error || !hotspots) {
			this.setState({
				isLoading: false,
				hasError: true,
			});
			return;
		}

		this.engine = new HotspotsEngine(hotspots);

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

	componentWillUnmount() {
	}

	private syncVisibleHotspots() {
    const { getCurrentTime } = this.props;

    this.setState((state : State) => {
      if (!this.engine) {
        return {
          visibleHotspots: []
        };
      }

      const hotspotsUpdate = this.engine.updateTime(getCurrentTime());

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
        let visibleHotspots: HotspotData[] = state.visibleHotspots;
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

	resize = (size: PlayerSize): void => {
		this.setState({
			playerSize: size
		})
	}

	reset = () => {
		this.engine = null;

		this.setState({
			isLoading: true,
			visibleHotspots: []
		}, () => {
			this.props.loadCuePoints(this._handleCuepoints)
		});
	}

	private renderHotspots = (hotspotsData: HotspotData[]) => {
		if (!hotspotsData) {
			return null;
		}

		return hotspotsData.map(hotspotData => (<Hotspot key={hotspotData.id} visible={true} hotspot={hotspotData}/>
		));
	}

	render() {
		const { isLoading, visibleHotspots, hasError, playerSize } = this.state;
		const hotspotsElements = this.renderHotspots(visibleHotspots);

		const transform = calculateOverlayTransform(
			playerSize,
			{ width: 500, height: 245 }, // this.props.videoSize,
			{ width: 720, height: 405 },// this.props.stageSize,
		);

		const style =
			{
				position: 'absolute',
				transformOrigin: 'top left',
				transform
			};

	return (
			<div style={style}>
				{ hasError && <div>ERROR</div>}
				{ isLoading && <div>Loading</div>}
				{ visibleHotspots && <div>got {visibleHotspots.length} hotspots</div>}
				{ hotspotsElements }
			</div>
		);
	}
}
