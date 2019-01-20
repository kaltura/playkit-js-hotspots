//let poly = require("preact-cli/lib/lib/webpack/polyfills");
import { h, render } from "preact";
import Stage, { LoadCallback, NotifyEventTypes } from "../components/Stage";
import {HotspotData} from '../utils/hotspot-data';
import { enableLog } from "../utils/logger";


// TODO move to util function
function toObject(jsonAsString: string, defaultValue: { [key: string]: any } = {}): { error?: Error, result?: { [key: string]: any }} {
	if (!jsonAsString) {
		return defaultValue;
	}

	try {
		return {result: JSON.parse(jsonAsString)};
	} catch (e) {
		return {error: e};
	}
}


mw.kalturaPluginWrapper(function(){

	mw.PluginManager.add( 'hotspots', mw.KBaseComponent.extend( {

		_root: null,
    _firstPlayed: false,
		stage: null,
		defaultConfig: {
			parent: 'videoHolder',
			order: 1
		},

		shouldEnableLogs() {
			try
			{
        if ( document.URL.indexOf( 'debugKalturaPlayer' ) !== -1 ) {
         enableLog();
        }
			}catch(e) {
				// do nothing
			}
		},


		setup: function(){
      this.shouldEnableLogs();

			this.addBindings();
		},

		pauseVideo: function() {
      this.getPlayer().sendNotification('doPause');
    },

		getCuePoints: function(){
			return this.cuePoints;
		},

		loadCuePoints: function( callback: LoadCallback ){
			var _this = this;
			// do the api request
			this.getKalturaClient().doRequest({
					'service': 'cuepoint_cuepoint',
					'action': 'list',
					'filter:entryIdEqual': this.getPlayer().kentryid,
					'filter:objectType':'KalturaCuePointFilter',
					'filter:cuePointTypeEqual':	'annotation.Annotation',
					'filter:tagsLike' : 'hotspots'
				},
				function( data: any ){
					// if an error pop out:
					const hasError = !data || data.code;

					if (hasError) {
						callback({ error: {message: data.code || 'failure'}});
					} else {

						const hotspots: HotspotData[] = [];
						(data.objects || []).reduce((acc: HotspotData[], cuePoint: any) => {
							const { result:partnerData, error } = toObject(cuePoint.partnerData);

							if (partnerData) {
								acc.push({
									id: cuePoint.id,
									startTime: cuePoint.startTime,
									endTime: cuePoint.endTime,
									label: cuePoint.text,
									layout: partnerData.layout,
                  styles: partnerData.styles,
									onClick: partnerData.onClick
								});
							} else  if (error) {
								// TODO should handle error
								console.error(`failed to parse hotspot`, error);
							}

							return acc;
						}, hotspots);

						callback({ hotspots })
					}
				}
			);
		},

		getPlayerSize: function() {
			return {
				width: this.getPlayer().getVideoHolder().width(),
				height: this.getPlayer().getVideoHolder().height()
			}
		},

		resizeEngine: function() {
			var _this = this;
			_this.stage.resize(this.getPlayerSize());
		},

		addBindings: function() {
			var _this = this;

			this.bind( 'playerReady', function(){
				const props = {
          getCurrentTime: _this._getCurrentTime.bind(_this),
					loadCuePoints: _this.loadCuePoints.bind(_this),
					initialPlayerSize: _this.getPlayerSize(),
          pauseVideo: _this.pauseVideo.bind(_this)
				}

        _this._root = render(<Stage {...props} ref={(ref) => _this.stage = ref} ></Stage>, jQuery('[id="hotspotsOverlay"]')[0]);
			});

			this.bind('updateLayout', function(){
				_this.resizeEngine();
			});


      this.bind('firstPlay seeked', function(){
        if (!_this._firstPlayed) {
        	_this.stage.showHotspots();
          _this._firstPlayed = true;
        }
      });

			this.bind('onChangeMedia', function() {
				_this._firstPlayed = false;
        // @ts-ignore
        render(h(null), jQuery('[id="hotspotsOverlay"]')[0], _this._root);

      });

      this.bind('monitorEvent', function(){
        _this.stage.notify({ type: NotifyEventTypes.Monitor });
      });

      this.bind('seeked', function(){
            _this.stage.notify({ type: NotifyEventTypes.Seeked });
      });
		},

    _getCurrentTime() {
			return this.getPlayer().currentTime * 1000;
    },

		getComponent: function () {

			if ( ! this.$el) {
				this.$el = jQuery( "<div></div>" ).attr( 'id', 'hotspotsOverlay' ).css({ position: 'absolute', height: '100%', width: '100%'});
			}

			return this.$el;
		},

	} ) );
})
