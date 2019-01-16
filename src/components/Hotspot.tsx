import { h, Component } from "preact";
import { HotspotData } from '../utils/hotspot-data';

const defaultContainerStyles = {
	position: 'absolute',
	display: 'table',
	boxSizing: 'border-box',
  outline: 'none'
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
  wordBreak: 'break-all'
};

type Props = {
	visible: boolean;
	hotspot: HotspotData;
	styles?: { [key:string]: any},
  pauseVideo(): void
}

type State =  {

}

const defaultProps = {
  styles: {}

}

function prepareUrl(url: string): string {
  if (!url.match(/^https?:\/\//i)) {
    url = 'http://' + url;
  }
  return url;
}

export default class Hotspot extends Component<Props, State> {
  static defaultProps = defaultProps;

  handleClick = () => {
    const { hotspot } = this.props;

    if (!hotspot.onClick) {
      return;
    }

    switch (hotspot.onClick.type) {
      case 'openUrl': {
        if (!hotspot.onClick.url) {
          return;
        }
        const url = prepareUrl(hotspot.onClick.url);
        window.open(url, '_top');
      }
        break;
      case 'openUrlInNewTab': {
        if (!hotspot.onClick.url) {
          return;
        }

        this.props.pauseVideo();

        const url = prepareUrl(hotspot.onClick.url);
        try {
          window.open(url, '_blank');
        } catch(e) {
          window.open(url, '_top');
        }
      }
        break;
      default:
        break;
    }
  }


  render() {
    const { hotspot } = this.props;
    const { layout, label } = hotspot;

    if (!this.props.visible) {
      return null;
    }

    const containerStyles = {
      ...defaultContainerStyles,
      top: layout.y,
      left: layout.x,
      height: layout.height,
      width: layout.width,
    };

    const buttonStyles = {
      ...defaultButtonsStyles,
      ...hotspot.styles,
	    cursor: hotspot.onClick ? 'pointer' : 'default'
    };

    return (
      <div onClick={this.handleClick} style={containerStyles}>
        <div style={buttonStyles}>
          {label}
        </div>
      </div>
    );
  }
}
