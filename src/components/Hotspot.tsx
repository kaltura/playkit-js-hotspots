import {h, Component} from 'preact';
import {A11yWrapper} from '@playkit-js/common';
import {LayoutHotspot} from '../utils/hotspot';
import {AnalyticsEvents} from '../utils/analyticsEvents';

const defaultContainerStyles = {
  position: 'absolute',
  display: 'table',
  boxSizing: 'border-box'
};

const defaultButtonsStyles = {
  position: 'relative',
  width: '100%',
  height: '100%',
  appearance: 'none',
  border: 'none',
  display: 'table-cell',
  verticalAlign: 'middle',
  textAlign: 'center',
  cursor: 'pointer',
  wordBreak: 'break-all',
  textRendering: 'geometricPrecision',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

type Props = {
  visible: boolean;
  hotspot: LayoutHotspot;
  styles?: {[key: string]: any};
  pauseVideo(): void;
  seekTo(time: number): void;
  sendAnalytics(event: AnalyticsEvents): void;
};

type State = {
  disableClick: boolean;
  isReady: boolean;
};

const defaultProps = {
  styles: {}
};

function prepareUrl(url: string): string {
  if (!url.match(/^https?:\/\//i)) {
    url = 'http://' + url;
  }
  return url;
}

export default class Hotspot extends Component<Props, State> {
  static defaultProps = defaultProps;

  state = {
    disableClick: true,
    isReady: false
  };

  componentDidMount() {
    const {hotspot} = this.props;

    if (!hotspot || !hotspot.onClick) {
      this.setState({
        isReady: true
      });
      return;
    }

    this.setState({
      isReady: true,
      disableClick: !this.isClickable()
    });
  }

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
    const {hotspot} = this.props;
    const {disableClick} = this.state;

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

  getFontSize = (layout: any, hotspot: any, label: string): number => {
    let container = document.createElement('div');
    container.id = 'containerDivTest';
    container.style.top = `${layout.y}px`;
    container.style.height = `${layout.height}px`;
    container.style.width = `${layout.width}px`;
    container.style.position = 'absolute';
    container.style.display = 'table';
    container.style.boxSizing = 'border-box';

    let textEl = document.createElement('div');
    textEl.id = 'textDivTest';
    textEl.style.position = 'absolute';
    textEl.style.top = `${layout.y}px`;
    textEl.style.appearance = 'none';
    textEl.style.border = 'none';
    textEl.style.display = 'table-cell';
    textEl.style.textAlign = 'center';
    textEl.style.cursor = 'pointer';
    textEl.style.wordBreak = 'break-all';
    textEl.style.textRendering = 'geometricPrecision';
    textEl.style.fontSize = `${hotspot.styles['font-size']}px`;
    textEl.style.fontFamily = `${hotspot.styles['font-family']}`;
    textEl.style.color = `${hotspot.styles['color']}`;
    textEl.textContent = label || '';

    document.body.appendChild(container)
    document.body.appendChild(textEl);

    const textWidth = textEl.clientWidth;
    let initialFontSize = parseInt(hotspot.styles['font-size']);
    let fontSizeToUse = initialFontSize;
    const MINIMAL_FONT_SIZE = 10;
    if (textWidth > layout.width) {
      for (let fontSizeToCheck = initialFontSize - 1; fontSizeToCheck >= MINIMAL_FONT_SIZE; fontSizeToCheck--) {
        if (fontSizeToCheck === MINIMAL_FONT_SIZE) {
          // if we reached the minimal font, then use it
          fontSizeToUse = fontSizeToCheck;
          break;
        }
        textEl.style.fontSize = `${fontSizeToCheck}px`;
        const newTextWidth = textEl.clientWidth;
        if (newTextWidth <= layout.width) {
          fontSizeToUse = fontSizeToCheck;
          break;
        }
      }
    }

    document.body.removeChild(textEl);
    document.body.removeChild(container);

    return fontSizeToUse;
  }

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

    const fontSizeToUse = `${this.getFontSize(layout, hotspot, label || '')}px`;

    const buttonStyles = {
      ...defaultButtonsStyles,
      ...hotspot.styles,
      cursor: disableClick ? 'default' : 'pointer',
      maxWidth: `${layout.width}px`,
      fontSize: fontSizeToUse
    };

    return (
      <A11yWrapper onClick={this.handleClick}>
        <div tabIndex={0} aria-label={label} aria-disabled={disableClick} style={containerStyles} data-testid="hotspots_hotspot">
          <div style={buttonStyles}>{label}</div>
        </div>
      </A11yWrapper>
    );
  }
}
