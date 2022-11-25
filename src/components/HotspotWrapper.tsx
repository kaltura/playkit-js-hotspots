import {h, Component} from 'preact';
import {LayoutHotspot, shallowCompareHotspots} from '../utils/hotspot';
import Hotspot from './Hotspot';
import {AnalyticsEvents} from '../utils/analyticsEvents';

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
}

export default class HotspotWrapper extends Component<Props> {
  shouldComponentUpdate(nextProps: Props) {
    return !shallowCompareHotspots(this.props.hotspots, nextProps.hotspots);
  }

  private renderHotspots = (visualHotspot: LayoutHotspot[]) => {
    if (!visualHotspot) {
      return null;
    }

    const {seekTo, pauseVideo, sendAnalytics} = this.props;
    return visualHotspot.map(hotspotData => (
      <Hotspot pauseVideo={pauseVideo} seekTo={seekTo} key={hotspotData.id} visible={true} hotspot={hotspotData} sendAnalytics={sendAnalytics} />
    ));
  };

  render() {
    const {hotspots} = this.props;
    const hotspotsElements = this.renderHotspots(hotspots);

    return <div style={hotspotsContainerStyles} aria-live="polite">{hotspotsElements}</div>;
  }
}
