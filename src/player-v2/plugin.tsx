//let poly = require("preact-cli/lib/lib/webpack/polyfills");
import { h, render } from "preact";
import Stage, { LoadCallback, NotifyEventTypes, Props as StageProps } from "../components/Stage";
import { log, enableLog } from "playkit-js-ovp/logger";
import { RawLayoutHotspot } from "../utils/hotspot";
import { AnalyticsEvents } from "../utils/analyticsEvents";
import { convertToHotspots } from "../utils/cuepoints";

(function (mw, $) {



(function shouldEnableLogs() {
    try {
        if (document.URL.indexOf("debugKalturaPlayer") !== -1) {
            enableLog("hotspots");
        }
    } catch (e) {
        // do nothing
    }
})();

const WEBKIT_PLAYS_INLINE_KEY = "EmbedPlayer.WebKitPlaysInline";

function isIpad() {
    return navigator.userAgent.indexOf("iPad") != -1;
}

function isIphone() {
    return navigator.userAgent.indexOf("iPhone") != -1 && !isIpad();
}

mw.kalturaPluginWrapper(function() {
    mw.PluginManager.add(
        "hotspots",
        mw.KBaseComponent.extend({
            _root: null,
            _videoSize: null,
            _wasPlayed: false,
            stage: null,
            defaultConfig: {
                parent: "videoHolder",
                order: 1
            },

            handleVideoSizeChange: function(e: any) {
                const { width, height } = this.getPlayer().evaluate(
                    "{mediaProxy.entry}"
                );
                log(
                    "debug",
                    "plugin.handleVideoSizeChange",
                    "use entry size provided by player to calculate actual stage size",
                    { width, height }
                );

                if (!width || !height) {
                    this._videoSize = null;
                } else {
                    this._videoSize = { width, height };
                }

                this.stage.handleResize();
            },

            setup: function() {
                if (isIphone()) {
                    log(
                        "log",
                        "setup",
                        "iphone detected, disable plugin"
                    );
                    return;
                }

                this.addBindings();
            },

            pauseVideo: function() {
                this.getPlayer().sendNotification("doPause");
            },

            getCuePoints: function() {
                return this.cuePoints;
            },

            loadCuePoints: function(callback: LoadCallback) {
                var _this = this;
                // do the api request
                this.getKalturaClient().doRequest(
                    {
                        service: "cuepoint_cuepoint",
                        action: "list",
                        "filter:entryIdEqual": this.getPlayer().kentryid,
                        "filter:objectType": "KalturaCuePointFilter",
                        "filter:cuePointTypeEqual": "annotation.Annotation",
                        "filter:tagsLike": "hotspots"
                    },
                    function(data: any) {
                        // if an error pop out:
                        const hasError = !data || data.code;

                        if (hasError) {
                            callback({
                                error: { message: data.code || "failure" }
                            });
                        } else {
                            const hotspots: RawLayoutHotspot[] = convertToHotspots(data);
                            callback({ hotspots });
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
                };
            },

          sendAnalytics: function(event: AnalyticsEvents) {
              try {
                const kanalonyPlugin = this.getPlayer().plugins.kAnalony;
                if (!kanalonyPlugin) {
                  log(
                    "warn",
                    "sendAnalytics",
                    `cannot send analytics event, missing kAnalony plugin`,
                    event
                  );
                  return;
                }
                const { eventNumber, ...rest } = event;

                kanalonyPlugin.sendAnalytics(eventNumber, rest);
              } catch (e) {
                log(
                  "error",
                  "sendAnalytics",
                  `cannot send analytics event with error '${e.message}'`,
                  event
                );
              }
          },

            getVideoSize: function() {
                if (!this._videoSize) {
                    return null;
                }

                return {
                    ...this._videoSize
                };
            },

            addBindings: function() {
                var _this = this;

                this.bind("playerReady", function() {
                    const props: StageProps = {
                        getCurrentTime: _this._getCurrentTime.bind(_this),
                        loadCuePoints: _this.loadCuePoints.bind(_this),
                        getPlayerSize: _this.getPlayerSize.bind(_this),
                        getVideoSize: _this.getVideoSize.bind(_this),
                        pauseVideo: _this.pauseVideo.bind(_this),
                      sendAnalytics: _this.sendAnalytics.bind(_this)
                    };

                    _this._root = render(
                        <Stage {...props} ref={ref => (_this.stage = ref)} />,
                        jQuery('[id="hotspotsOverlay"]')[0]
                    );
                });

                this.bind("updateLayout", function() {
                    _this.stage.handleResize();
                });

                this.bind("firstPlay", function() {
                    if (!_this._wasPlayed) {
                        _this.stage.showHotspots();
                        _this._wasPlayed = true;
                    }

                });

                this.bind("seeked", function() {
                    if (!_this._wasPlayed) {
                        _this.stage.showHotspots();
                        _this._wasPlayed = true;
                    }
                });

                this.bind("onChangeMedia", function() {
                    // DEVELOPER NOTICE: this is the destruction place.
                    _this._wasPlayed = false;
                    _this._videoSize = null;


                    render(
                        // @ts-ignore
                        h(null),
                        jQuery('[id="hotspotsOverlay"]')[0],
                        _this._root
                    );
                    _this._root = null;
                    _this.stage = null;
                });

                this.bind("monitorEvent", function() {
                    _this.stage.notify({ type: NotifyEventTypes.Monitor });
                });

                this.bind("mediaLoaded", function() {
                    _this.handleVideoSizeChange();
                });

                this.bind("seeked", function() {
                    _this.stage.notify({ type: NotifyEventTypes.Seeked });
                });
            },

            _getCurrentTime() {
                return this.getPlayer().currentTime * 1000;
            },

            getComponent: function() {
                if (!this.$el) {
                    this.$el = jQuery("<div></div>")
                        .attr("id", "hotspotsOverlay")
                        .css({
                            position: "absolute",
                            height: "100%",
                            width: "100%",
                            top: 0,
                            left: 0
                        });
                }

                return this.$el;
            }
        })
    );
});
})((window as any).mw, (window as any).jQuery);
