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
const WEBKIT_PLAYS_INLINE_KEY = 'EmbedPlayer.WebKitPlaysInline';

function isIpad(){
  return ( navigator.userAgent.indexOf('iPad') != -1 );
}

function isIphone() {
  return ( navigator.userAgent.indexOf('iPhone') != -1 && ! isIpad() );
}

function shouldEnableIphoneMode(iphoneFullscreenSupport: boolean | undefined) : boolean
{
  const iphoneFullscreenSupportDefined = typeof iphoneFullscreenSupport !== 'undefined';

  if (!isIphone() || (iphoneFullscreenSupportDefined && !iphoneFullscreenSupport)) {
    return false;
  }

  return true;
}

(function setupIphoneEnvironment() {

  try {
    // @ts-ignore
    const playerConfig = window.kalturaIframePackageData.playerConfig;
    const inlineMode = playerConfig.vars[WEBKIT_PLAYS_INLINE_KEY];
    const iphoneFullscreenSupport = playerConfig.plugins.hotspots.iphoneFullscreenSupport;
    const inlineModeDefined = typeof inlineMode !== 'undefined';

    log('debug', 'setupIphoneEnvironment', 'check conditions needed to setup environment', { inlineMode, inlineModeDefined, iphoneFullscreenSupport, isIphone: isIphone()});

    if (inlineModeDefined || !shouldEnableIphoneMode(iphoneFullscreenSupport)) {
      log('log','setupIphoneEnvironment', 'setup iphone environment is aborted by configuration (either iphone not detected, inline flag is already set or explicitly configured not to handle iphone fullscreen by plugin configuration)');
      return;
    }

    log('log','setupIphoneEnvironment', 'setup iphone environment to handle use custom fullscreen handling');
    playerConfig.vars[WEBKIT_PLAYS_INLINE_KEY] = true;
  } catch(e) {
    log('error','setupIphoneEnvironment', `failed to setup iphone environment with error ${e.message}`);
  }
}());

mw.kalturaPluginWrapper(function(){

  mw.PluginManager.add( 'hotspots', mw.KBaseComponent.extend( {

    _root: null,
    _videoSize: null,
    _wasPlayed: false,
    stage: null,
    defaultConfig: {
      parent: 'videoHolder',
      iphoneFullscreenSupport: undefined, //important don't set it explicitly here to either false or true
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
      const { width, height } = this.getPlayer().evaluate("{mediaProxy.entry}");
      log('debug', 'plugin.handleVideoSizeChange', 'use entry size provided by player to calculate actual stage size', {width, height});

      if (!width || !height) {
        this._videoSize = null;
      } else {
        this._videoSize = { width, height };
      }

      this.stage.handleResize();
    },


    setup: function(){

      if (this.enableIphoneFullscreen()) {
        log('log', 'setup', 'iphone detected, prevent native fullscreen and use inline player');
        mw.setConfig('EmbedPlayer.ExternalFullScreenControl', true);
      }

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

    enableIphoneFullscreen: function() {
      const iphoneFullscreenSupport = this.getConfig('iphoneFullscreenSupport');
      return shouldEnableIphoneMode(iphoneFullscreenSupport);
    },

    enterFullscreenInIphone: function() {
      if (!this.enableIphoneFullscreen()) {
        return;
      }

      log('log', 'plugin.addBindings[onToggleFullscreen]', 'handle iphone fullscreen toggle manually');
      const manager = this.getPlayer().layoutBuilder.fullScreenManager;

      if (!manager.inFullScreen) {
        manager.doContextTargetFullscreen();
        manager.inFullScreen = true;
        return;
      }

      manager.restoreContextPlayer();
      manager.inFullScreen = false;
    },

    addBindings: function() {
      var _this = this;

      this.bind('onToggleFullscreen', function() {
        _this.enterFullscreenInIphone();
      });

      this.bind( 'playerReady', function(){
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

      this.bind('firstPlay', function(){

        if (!_this._wasPlayed) {
          _this.stage.showHotspots();
          _this._wasPlayed = true;
        }

        _this.enterFullscreenInIphone();

      });

      this.bind('seeked', function(){

        if (!_this._wasPlayed) {
          _this.stage.showHotspots();
          _this._wasPlayed = true;
        }
      });

      this.bind('onChangeMedia', function() {
        // DEVELOPER NOTICE: this is the destruction place.
        _this._wasPlayed = false;
        _this._videoSize = null;

        // @ts-ignore
        render(h(null), jQuery('[id="hotspotsOverlay"]')[0], _this._root);
        _this._root = null;
        _this.stage = null;

      });

      this.bind('monitorEvent', function(){
        _this.stage.notify({ type: NotifyEventTypes.Monitor });
      });

      this.bind('mediaLoaded', function(){
        _this.handleVideoSizeChange();
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
        this.$el = jQuery( "<div></div>" ).attr( 'id', 'hotspotsOverlay' ).css({ position: 'absolute', height: '100%', width: '100%', top: 0, left: 0});
      }

      return this.$el;
    },

  } ) );
})

