declare var __kalturaplayerdata: { [key: string]: any };
declare var KalturaPlayer: any;

declare module "*.scss" {
    const content: { [className: string]: string };
    export = content;
}

declare module "*.svg" {
    const content: any;
    export default content;
}

declare module "@playkit-js/playkit-js" {
    export function registerPlugin(name: string, component: any): void;

    export interface KalturaPlayer {
        core: {
            BasePlugin: {
                player: any;
                eventManager: any;
            };
        };
    }
}
