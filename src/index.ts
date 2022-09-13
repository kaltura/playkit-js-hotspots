import {HotspotsPlugin} from './hotspots-plugin';

declare var __VERSION__: string;
declare var __NAME__: string;

const VERSION = __VERSION__;
const NAME = __NAME__;

export {HotspotsPlugin as Plugin};
export {VERSION, NAME};

const pluginName: string = 'playkit-js-hotspots';
KalturaPlayer.core.registerPlugin(pluginName, HotspotsPlugin);
