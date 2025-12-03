import {HotspotsPlugin} from './hotspots-plugin';
import {registerPlugin} from '@playkit-js/kaltura-player-js';

declare var __VERSION__: string;
declare var __NAME__: string;

const VERSION = __VERSION__;
const NAME = __NAME__;

export {HotspotsPlugin as Plugin};
export {VERSION, NAME};
export {HotspotsEvents} from './events/events';

const pluginName: string = 'playkit-js-hotspots';
registerPlugin(pluginName, HotspotsPlugin as any);
