import { h, render } from "preact";
import Stage, { Props as StageProps } from "@plugin/shared/components/Stage";
import { log, enableLogIfNeeded } from "@playkit-js/playkit-js-ovp";
import { AnalyticsEvents } from "@plugin/shared/analyticsEvents";
import { convertToHotspots } from "@plugin/shared/cuepoints";

(function(mw, $) {
    enableLogIfNeeded("hotspots");

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
                _hotspots: [],
                _root: null,
                _videoSize: null,
                _wasPlayed: false,
                stage: null,
                defaultConfig: {
                    parent: "videoHolder",
                    order: 1
                },

                handleVideoSizeChange: function(e: any) {
                    const { width, height } = this.getPlayer().evaluate("{mediaProxy.entry}");
                    log(
                        "debug",
                        "plugin::handleVideoSizeChange",
                        "use entry size provided by player to calculate actual stage size",
                        { width, height }
                    );

                    if (!width || !height) {
                        this._videoSize = null;
                    } else {
                        this._videoSize = { width, height };
                    }

                    this.renderRoot(true);
                },

                setup: function() {
                    if (isIphone()) {
                        log("log", "plugin::setup", "iphone detected, disable plugin");
                        return;
                    }

                    this.addBindings();
                },

                pauseVideo: function() {
                    this.getPlayer().sendNotification("doPause");
                },

                seekTo: function(time: number) {
                    this.getPlayer().seek(time);
                },

                getCuePoints: function() {
                    return this.cuePoints;
                },

                loadCuePoints: function() {
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
                        (data: any) => {
                            // if an error pop out:
                            const hasError = !data || data.code;

                            if (hasError) {
                                console.warn(
                                    `failed to load hotspots with code '${data.code || "failure"}'`
                                );
                                return;
                            }

                            this._hotspots = convertToHotspots(data);
                            this.renderRoot(false);
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
                                "plugin::sendAnalytics",
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
                            "plugin::sendAnalytics",
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

                _onRootResized: function() {
                    this.renderRoot(false);
                },

                renderRoot: function(shouldHandleResize: boolean) {
                    const props: StageProps = {
                        hotspots: this._hotspots,
                        currentTime: this._getCurrentTime(),
                        shouldHandleResize,
                        onResize: this._onRootResized.bind(this),
                        getPlayerSize: this.getPlayerSize.bind(this),
                        getVideoSize: this.getVideoSize.bind(this),
                        pauseVideo: this.pauseVideo.bind(this),
                        seekTo: this.seekTo.bind(this),
                        sendAnalytics: this.sendAnalytics.bind(this)
                    };

                    const parentElement = this.getComponent()[0];

                    if (!this._root) {
                        log("debug", "plugin::renderStage", "create root component", {
                            parentElement,
                            root: this._root
                        });
                    }

                    this._root = render(
                        <Stage {...props} ref={(ref: any) => (this.stage = ref)} />,
                        parentElement,
                        this._root
                    );
                },

                addBindings: function() {
                    this.bind("updateLayout", () => {
                        log("debug", "plugin::bind(updateLayout)", "invoked");
                        this.renderRoot(true);
                    });

                    this.bind("firstPlay", () => {
                        log("debug", "plugin::bind(firstPlay)", "invoked");

                        if (!this._wasPlayed) {
                            this.renderRoot(false);
                            this._wasPlayed = true;
                        }
                    });

                    this.bind("seeked", () => {
                        log("debug", "plugin::bind(seeked)", "invoked");

                        if (!this._wasPlayed) {
                            this.renderRoot(false);
                            this._wasPlayed = true;
                        }
                    });

                    this.bind("onChangeMedia", () => {
                        log("debug", "plugin::bind(onChangeMedia)", "invoked");

                        // DEVELOPER NOTICE: this is the destruction place.
                        this._wasPlayed = false;
                        this._videoSize = null;
                        this._hotspots = [];

                        const parentElement = jQuery('[id="hotspotsOverlay"]')[0];

                        render(
                            // @ts-ignore
                            h(null),
                            parentElement,
                            this._root
                        );

                        this._root = null;
                        this.stage = null;
                    });

                    this.bind("monitorEvent", () => {
                        this.renderRoot(false);
                    });

                    this.bind("mediaLoaded", () => {
                        this.loadCuePoints();
                        this.handleVideoSizeChange();
                    });

                    this.bind("seeked", () => {
                        this.renderRoot(false);
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
                                height: "0",
                                width: "0",
                                top: 0,
                                left: 0,
                                overflow: "visible",
                                zIndex: 2
                            });
                    }

                    return this.$el;
                }
            })
        );
    });
})((window as any).mw, (window as any).jQuery);
