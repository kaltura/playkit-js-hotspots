import {h, Component} from 'preact';
import {A11yWrapper} from '@playkit-js/common';
import {LayoutHotspot} from '../utils/hotspot';
import {AnalyticsEvents} from '../utils/analyticsEvents';
import {HotspotsEvents} from '../events/events';

const defaultContainerStyles = {
  position: 'absolute',
  display: 'table',
  boxSizing: 'border-box'
};

const defaultButtonsStyles = {
  position: 'relative',
  width: '100%',
  height: 'inherit',
  appearance: 'none',
  border: 'none',
  display: 'flex',
  cursor: 'pointer',
  wordBreak: 'break-all',
  textRendering: 'geometricPrecision',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  padding: '3px',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 0,
  lineHeight: 'normal'
};

type Props = {
  visible: boolean;
  hotspot: LayoutHotspot;
  styles?: {[key: string]: any};
  pauseVideo(): void;
  seekTo(time: number): void;
  sendAnalytics(event: AnalyticsEvents): void;
  dispatcher(name: string, payload?: any): void
};

type State = {
  disableClick: boolean;
  isReady: boolean;
};

const defaultProps = {
  styles: {}
};

function prepareUrl(url: string): string {
  if (url.startsWith('mailto:')) {
    return url;
  }
  if (!url.match(/^https?:\/\//i)) {
    url = 'http://' + url;
  }
  return url;
}

const MINIMAL_FONT_SIZE = 10;

export default class Hotspot extends Component<Props, State> {
  static defaultProps = defaultProps;

  hotspotRef: HTMLDivElement | null = null;

  state = {
    disableClick: true,
    isReady: false
  };

  componentDidMount() {
    const {hotspot, dispatcher} = this.props;

    if (!hotspot || !hotspot.onClick) {
      this.setState({ isReady: true }, () => {
        this.setFocus();
      });
      return;
    }

    this.setState(
      { isReady: true, disableClick: !this.isClickable() },
      () => {
        this.setFocus();
      }
    );

    const {id, label} = hotspot;
    dispatcher(HotspotsEvents.HOTSPOT_DISPLAYED, {id, label});
  }

  setFocus = () => {
    if (this.hotspotRef) {
      setTimeout(() => this.hotspotRef?.focus(), 0);
    }
  };

  isClickable = (): boolean => {
    const {
      hotspot: {onClick}
    } = this.props;

    if (!onClick) {
      return false;
    }

    switch (onClick.type) {
      case 'jumpToTime':
        return typeof onClick.jumpToTime !== 'undefined';
      case 'openUrl':
      case 'openUrlInNewTab':
        return !!onClick.url;
      default:
        return false;
    }
  };

  handleClick = () => {
    const {hotspot, dispatcher} = this.props;
    const {disableClick} = this.state;

    const {id, label} = hotspot;
    dispatcher(HotspotsEvents.HOTSPOT_CLICK, {id, label});

    if (!hotspot.onClick || disableClick) {
      return;
    }

    switch (hotspot.onClick.type) {
      case 'jumpToTime':
        if (typeof hotspot.onClick.jumpToTime === 'undefined') {
          return;
        }

        this.props.seekTo(hotspot.onClick.jumpToTime / 1000);
        break;
      case 'openUrl':
        {
          if (!hotspot.onClick.url) {
            return;
          }
          const url = prepareUrl(hotspot.onClick.url);
          window.open(url, '_top');
          this.props.sendAnalytics({
            eventNumber: 47,
            target: url,
            hotspotId: hotspot.id
          });
        }
        break;
      case 'openUrlInNewTab':
        {
          if (!hotspot.onClick.url) {
            return;
          }

          this.props.pauseVideo();

          const url = prepareUrl(hotspot.onClick.url);
          try {
            window.open(url, '_blank');
            this.props.sendAnalytics({
              eventNumber: 47,
              target: url,
              hotspotId: hotspot.id
            });
          } catch (e) {
            // do nothing
          }
        }
        break;
      default:
        break;
    }
  };

  render() {
    const {hotspot} = this.props;
    const {layout, label} = hotspot;
    const {isReady, disableClick} = this.state;

    if (!isReady || !this.props.visible) {
      return null;
    }

    const containerStyles = {
      ...defaultContainerStyles,
      top: layout.y,
      left: layout.x,
      height: layout.height,
      width: layout.width
    };

    const buttonStyles = {
      ...defaultButtonsStyles,
      ...hotspot.styles,
      cursor: disableClick ? 'default' : 'pointer',
      maxWidth: `${layout.width}px`,
      fontSize: `${hotspot.relativeStyle.fontSize}px`,
      borderRadius: `${hotspot.relativeStyle.radiusBorder}px`,
    };

    return (
      <A11yWrapper onClick={this.handleClick} aria-live="polite">
        <div ref={(ref) => (this.hotspotRef = ref)} tabIndex={0} role="button" aria-label={label} aria-disabled={disableClick} style={containerStyles} data-testid="hotspots_hotspot">
          <div style={buttonStyles}>{label}</div>
        </div>
      </A11yWrapper>
    );
  }
}
