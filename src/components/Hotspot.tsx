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

export default class Hotspot extends Component<Props, State> {
	static defaultProps = defaultProps;

	render() {
		const { hotspot } = this.props;
		const { layout, label } = hotspot;

		if (!this.props.visible) { return null; }

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
		};

		return (
			<div style={containerStyles}>
				<div style={buttonStyles}>
          {label}
				</div>
			</div>
		);
	}
}
