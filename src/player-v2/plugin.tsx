//let poly = require("preact-cli/lib/lib/webpack/polyfills");
import { h, render } from "preact";
import Stage, { LoadCallback, NotifyEventTypes } from "../components/Stage";
import { log, enableLog } from "../utils/logger";
import { Hotspot } from "../utils/hotspot";

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
		_videoSize: null,
    _wasPlayed: false,
		stage: null,
		defaultConfig: {
			parent: 'videoHolder',
			order: 1
		},

		shouldEnableLogs() {
			try
			{
        if ( document.URL.indexOf( 'debugKalturaPlayer' ) !== -1 ) {
         enableLog('hotspots');
        }
			}catch(e) {
				// do nothing
			}
		},

		handleVideoSizeChange:  function(e: any) {
			const width = e.target.videoWidth;
			const height = e.target.videoHeight;

			if (!width || !height) {
				this._videoSize = null;
			} else {
        this._videoSize = { width: e.target.videoWidth, height: e.target.videoHeight };
			}

      this.stage.handleResize();
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
				function( data: any ) {
          // if an error pop out:
          const hasError = !data || data.code;

          if (hasError) {
            callback({ error: { message: data.code || 'failure' } });
          } else {

            const hotspots: Hotspot[] = [];
            (data.objects || []).reduce((acc: Hotspot[], cuePoint: any) => {
              const { result: partnerData, error } = toObject(cuePoint.partnerData);
              if (!partnerData || !partnerData.schemaVersion) {
              	log('warn', 'loadCuePoints', `annotation '${cuePoint.partnerData.id}' has no schema version, skip annotation`);
                return acc;
              }

              const rawLayout = {
	              ...partnerData.layout
              };

              acc.push({
                id: cuePoint.id,
                startTime: cuePoint.startTime,
                endTime: cuePoint.endTime,
                label: cuePoint.text,
                styles: partnerData.styles,
                onClick: partnerData.onClick,
                rawLayout: rawLayout
              });

              return acc;
            }, hotspots);

            callback({ hotspots })
          }
        }
			);
		},

		getPlayerSize: function() {
			const videoHolder = this.getPlayer().getVideoHolder();
			if (!videoHolder) {
				return null;
			}

			const width = videoHolder.width();
			const height = videoHolder.height();

			return {
				width,
				height
			}
		},

		getVideoSize: function() {

			if (!this._videoSize) {
				return null
			};

			return {
				...this._videoSize
			}
		},

		addBindings: function() {
			var _this = this;

			this.bind( 'playerReady', function(){

        try {
          const videoElement = _this.getPlayer().getVideoHolder().find('video')[0];
          jQuery(videoElement).on("loadeddata", _this.handleVideoSizeChange.bind(_this));

        } catch (e) {
          log('error', 'plugin.setup', 'failed to register to video element loaded metadata', { error: e.message});
        }

        const props = {
          getCurrentTime: _this._getCurrentTime.bind(_this),
					loadCuePoints: _this.loadCuePoints.bind(_this),
					getPlayerSize: _this.getPlayerSize.bind(_this),
					getVideoSize: _this.getVideoSize.bind(_this),
          pauseVideo: _this.pauseVideo.bind(_this)
				}

        _this._root = render(<Stage {...props} ref={(ref) => _this.stage = ref} ></Stage>, jQuery('[id="hotspotsOverlay"]')[0]);
			});

			this.bind('updateLayout', function(){
        _this.stage.handleResize();
			});


      this.bind('firstPlay seeked', function(){
        if (!_this._wasPlayed) {
        	_this.stage.showHotspots();
          _this._wasPlayed = true;
        }
      });

			this.bind('onChangeMedia', function() {
				// DEVELOPER NOTICE: this is the destruction place.
        _this._wasPlayed = false;
        _this._videoSize = null;

        try {
          const videoElement = _this.getPlayer().getVideoHolder().find('video')[0];
          jQuery(videoElement).off( "loadeddata");
        }catch (e) {
          // nothing to do about it :/
        }

        // @ts-ignore
        render(h(null), jQuery('[id="hotspotsOverlay"]')[0], _this._root);
        _this._root = null;
        _this.stage = null;

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
