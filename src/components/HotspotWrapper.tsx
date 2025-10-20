import {h, Component, createRef} from 'preact';
import {LayoutHotspot, shallowCompareHotspots} from '../utils/hotspot';
import Hotspot from './Hotspot';
import {AnalyticsEvents} from '../utils/analyticsEvents';

const { withPlayer } = KalturaPlayer.ui.components;
const { withText, Text } = KalturaPlayer.ui.preacti18n;
const translates = {
  hotspotRemoved: (
    <Text id="hotspots.hotspot_removed" fields={{ hotspotLabel: '' }}>
      {`{hotspotLabel} hotspot removed`}
    </Text>
  )
};

const hotspotsContainerStyles = {
  position: 'absolute',
  display: 'block',
  overflow: 'visible',
  top: 0,
  left: 0,
  width: 0,
  height: 0
};

export interface Props {
  hotspots: LayoutHotspot[];
  pauseVideo(): void;
  seekTo(time: number): void;
  sendAnalytics(event: AnalyticsEvents): void;
  dispatcher(name: string, payload?: any): void;
  hotspotRemoved?: string;
  player?: any;
}

@withPlayer
@withText(translates)
export default class HotspotWrapper extends Component<Props> {

  private liveRegionRef = createRef<HTMLDivElement>();
  private previousHotspotMap: Map<string, string> = new Map();

  shouldComponentUpdate(nextProps: Props) {
    return !shallowCompareHotspots(this.props.hotspots, nextProps.hotspots);
  }
  componentDidUpdate() {
    const currentMap = new Map<string, string>(
      this.props.hotspots
        .filter(h => typeof h.label === 'string')
        .map(h => [h.id, h.label!])
    );

    let announced = false;
    this.previousHotspotMap.forEach((label, id) => {
      if (!currentMap.has(id) && !announced) {
        if (this.props.hotspotRemoved) {
          const message = this.props.hotspotRemoved.replace('{hotspotLabel}', label);
          this.announceHotspotChange(message);
        }
        announced = true;
      }
    });

    this.previousHotspotMap = currentMap;
  }

  private announceHotspotChange(message: string) {
    const liveRegion = this.liveRegionRef.current;
    if (!liveRegion) return;
    liveRegion.textContent = '';
    liveRegion.textContent = message;
  }

  private renderHotspots = (visualHotspot: LayoutHotspot[]) => {
    if (!visualHotspot) {
      return null;
    }

    const {seekTo, pauseVideo, sendAnalytics, dispatcher} = this.props;
    return visualHotspot.map(hotspotData => (
      <Hotspot dispatcher={dispatcher} pauseVideo={pauseVideo} seekTo={seekTo} key={hotspotData.id} visible={true} hotspot={hotspotData} sendAnalytics={sendAnalytics} />
    ));
  };

  render() {
    const {hotspots} = this.props;
    const hotspotsElements = this.renderHotspots(hotspots);
    const targetId = this.props.player?.config?.targetId;
    const liveRegionId = `hotspot-liveRegion-${targetId}`;

    return (
      <div style={hotspotsContainerStyles} data-testid="hotspots_hotspotsContainer">
        {hotspotsElements}
        <div
          ref={this.liveRegionRef}
          id={liveRegionId}
          aria-live="polite"
          role="status"
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden'
          }}
        />
      </div>
    );
  }
}
