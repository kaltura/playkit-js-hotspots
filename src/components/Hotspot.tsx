import { h, Component } from "preact";
import { HotspotData } from '../utils/hotspotData';



const WRAPPER_STYLE = {
	position: 'absolute',
	boxSizing: 'border-box',
};

const DEFAULT_STYLE = {
	width: '100%',
	height: '100%',
	boxSizing: 'border-box',

	appearance: 'none',
	border: 'none',
	cursor: 'pointer',
	fontFamily: 'sans-serif',
};

type Props = {
	visible: boolean;
	hotspot: HotspotData;
	stylesheet?: { [key:string]: any}
}

type State =  {

}

const defaultProps = {
	stylesheet: {}

}

export default class Hotspot extends Component<Props, State> {
	static defaultProps = defaultProps;

	render() {
		const { hotspot, stylesheet } = this.props;
		const { layout, label } = hotspot;

		if (!this.props.visible) { return null; }

		const wrapperStyle = {
			...WRAPPER_STYLE,
			top: layout.y,
			left: layout.x,
			height: layout.height,
			width: layout.width
		};

		return (
			<div style={wrapperStyle}>
				<button
					style={DEFAULT_STYLE}
				>
					{label}
				</button>
			</div>
		);
	}
}
