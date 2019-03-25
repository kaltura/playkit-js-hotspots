
declare var mw: any;
declare var $: any;
declare var jQuery: any;
declare var __kalturaplayerdata: { [key: string]: any };
declare var KalturaPlayer: any;


declare module '@storybook/react' {
  const content: any;
  export var storiesOf: any;
  export default content;
}

declare module '@playkit-js/playkit-js' {
  export function registerPlugin(name: string, component: any) : void;

  export interface KalturaPlayer {
    core: {
      BasePlugin: {
        player: any,
        eventManager: any
      }
    }
  }
}
