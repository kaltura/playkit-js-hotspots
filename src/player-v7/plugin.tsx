
let kalturaServiceUrl = '';
try {
	kalturaServiceUrl = __kalturaplayerdata.UIConf[Object.keys(__kalturaplayerdata.UIConf)[0]].provider.env.serviceUrl;
}catch (e) {
	// do nothing
}

// TODO expose it as standard UMD module
// @ts-ignore
window.HotspotsPlugin = class HotspotsPlugin extends KalturaPlayer.core.BasePlugin{

	static defaultConfig = {};

	private _serviceUrl = kalturaServiceUrl;

	static isValid(player: any) {
		// TODO consult with Oren how to report error here as this is static function so this.logger is not an option
		return !!kalturaServiceUrl;
	}

	constructor(name: any, player: any, config: any) {
		super(name, player, config);
		this.logger.debug('ctor');
		this._addBindings();
	}

	destroy() {
		// TODO implement
		this.logger.debug('destroy');
	}

	reset() {
		// TODO implement
		debugger;
		this.logger.debug('reset');
	}

	private _addBindings() {
		this.eventManager.listen(this.player, this.player.Event.MEDIA_LOADED, () => {
			this.logger.debug('MEDIA_LOADED');

		});
	}
}
