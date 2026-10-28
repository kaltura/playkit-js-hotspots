import {h, Component, createRef} from 'preact';
import {LayoutHotspot, shallowCompareHotspots} from '../utils/hotspot';
import Hotspot from './Hotspot';
import {AnalyticsEvents} from '../utils/analyticsEvents';

const { withPlayer } = KalturaPlayer.ui.components;
const { withText, Text } = KalturaPlayer.ui.preacti18n;
const translates = {
  hotspotRemoved: (
    <Text id="hotspots.hotspot_removed" fields={{ hotspotLabel: '' }}>
      {`{hotspotLabel} hotspot removed`}
    </Text>
  ),
  hotspotAdded: (
    <Text id="hotspots.hotspot_added" fields={{ hotspotLabel: '' }}>
      {`{hotspotLabel} hotspot added`}
    </Text>
  ),
  shortcutHint: (
    <Text id="hotspots.hotspots_shortcut_hint">
      {'Press Shift+Alt+H to jump to hotspots'}
    </Text>
  ),
  toolbarLabel: (
    <Text id="hotspots.hotspots_toolbar_label">
      {'Interactive hotspots'}
    </Text>
  )
};

const hotspotsContainerStyles = {
  position: 'absolute',
  display: 'block',
  overflow: 'visible',
  top: 0,
  left: 0,
  width: 0,
  height: 0
};

export interface Props {
  hotspots: LayoutHotspot[];
  pauseVideo(): void;
  seekTo(time: number): void;
  sendAnalytics(event: AnalyticsEvents): void;
  dispatcher(name: string, payload?: any): void;
  hotspotRemoved?: string;
  hotspotAdded?: string;
  shortcutHint?: string;
  toolbarLabel?: string;
  player?: any;
}

interface State {
  activeIndex: number;
}

@withPlayer
@withText(translates)
export default class HotspotWrapper extends Component<Props, State> {
  state: State = {
    activeIndex: 0
  };

  private liveRegionRef = createRef<HTMLDivElement>();
  private containerRef = createRef<HTMLDivElement>();
  private previousHotspotMap: Map<string, string> = new Map();
  private lastFocusedHotspotId: string | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;
  private wasHotspotFocused: boolean = false;
  private focusTimers: number[] = [];
  private blurCheckTimer: number | null = null;
  private focusRequestOrigin: Element | null = null;

  componentDidMount() {
    window.addEventListener('keydown', this.handleGlobalKeyDown);
    if (this.props.player) {
      const endedEvent = this.props.player.Event?.ENDED || 'ended';
      this.props.player.addEventListener?.(endedEvent, this.onPlayerEnded);
    }
    const container = this.containerRef.current;
    if (container) {
      container.addEventListener('focusin', this.handleContainerFocusIn);
      container.addEventListener('focusout', this.handleContainerFocusOut);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
    if (this.props.player) {
      const endedEvent = this.props.player.Event?.ENDED || 'ended';
      this.props.player.removeEventListener?.(endedEvent, this.onPlayerEnded);
    }
    const container = this.containerRef.current;
    if (container) {
      container.removeEventListener('focusin', this.handleContainerFocusIn);
      container.removeEventListener('focusout', this.handleContainerFocusOut);
    }
    this.clearFocusTimers();
    if (this.blurCheckTimer !== null) {
      clearTimeout(this.blurCheckTimer);
    }
  }

  private clearFocusTimers() {
    this.focusTimers.forEach(id => clearTimeout(id));
    this.focusTimers = [];
  }

  private beginFocusRequest() {
    this.clearFocusTimers();
    this.focusRequestOrigin = document.activeElement;
  }

  // Retries may only run while focus is where the request started, on body (element removed), or inside the hotspots.
  private canContinueFocusRetry(): boolean {
    const active = document.activeElement;
    return (
      !active ||
      active === this.focusRequestOrigin ||
      active === document.body ||
      active === document.documentElement ||
      !!this.containerRef.current?.contains(active)
    );
  }

  private releaseFocusRestoration() {
    this.wasHotspotFocused = false;
    this.lastFocusedHotspotId = null;
    this.previouslyFocusedElement = null;
    this.clearFocusTimers();
  }

  private scheduleFocusTimer(callback: () => void, delay: number) {
    const id = window.setTimeout(() => {
      this.focusTimers = this.focusTimers.filter(t => t !== id);
      callback();
    }, delay);
    this.focusTimers.push(id);
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return (
      this.state.activeIndex !== nextState.activeIndex ||
      this.props.hotspotAdded !== nextProps.hotspotAdded ||
      this.props.hotspotRemoved !== nextProps.hotspotRemoved ||
      this.props.shortcutHint !== nextProps.shortcutHint ||
      this.props.toolbarLabel !== nextProps.toolbarLabel ||
      !shallowCompareHotspots(this.props.hotspots, nextProps.hotspots)
    );
  }

  private onPlayerEnded = () => {
    if (this.wasHotspotFocused) {
      this.wasHotspotFocused = false;
      this.lastFocusedHotspotId = null;
      this.previouslyFocusedElement = null;
      this.returnFocusToPlayPause(true);
    }
  };

  private getPlayerContainer(): HTMLElement | null {
    const targetId = this.props.player?.config?.targetId;
    return targetId ? document.getElementById(targetId) : null;
  }

  private handleGlobalKeyDown = (e: KeyboardEvent) => {
    const isHKey = e.key === 'H' || e.key === 'h' || e.code === 'KeyH';
    if (!e.shiftKey || !e.altKey || !isHKey) {
      return;
    }

    const activeEl = document.activeElement as HTMLElement | null;
    if (!activeEl) {
      return;
    }

    const playerContainer = this.getPlayerContainer();
    if (!playerContainer || !playerContainer.contains(activeEl)) {
      return;
    }

    const isEditable =
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.isContentEditable;

    if (isEditable) {
      return;
    }

    const {hotspots} = this.props;
    if (!hotspots || hotspots.length === 0) {
      return;
    }

    e.preventDefault();

    try {
      this.props.player?.ui?.store?.dispatch?.({type: 'shell/UPDATE_PLAYER_NAV_STATE', nav: true});
      this.props.player?.ui?.store?.dispatch?.({type: 'shell/UPDATE_PLAYER_HOVER_STATE', hover: true});
    } catch (err) {
      // ignore if store is unavailable
    }

    const targetIndex = this.state.activeIndex >= 0 && this.state.activeIndex < hotspots.length ? this.state.activeIndex : 0;
    this.focusHotspotByIndex(targetIndex);
  };

  private focusHotspotByIndex(index: number, retryCount = 0) {
    if (retryCount === 0) {
      this.beginFocusRequest();
    } else if (!this.canContinueFocusRetry()) {
      return;
    }
    const container = this.containerRef.current;
    if (!container) return;
    const targetId = this.props.hotspots?.[index]?.id;
    if (!targetId) return;
    const hotspotEl = Array.from(container.querySelectorAll<HTMLElement>('[data-testid="hotspots_hotspot"]')).find(
      el => el.dataset.hotspotId === targetId
    );
    if (hotspotEl) {
      this.setState({ activeIndex: index }, () => {
        hotspotEl.focus();
      });
    } else if (retryCount < 5) {
      // Hotspot components mount asynchronously before setting isReady: true.
      // Retry in the next frames/tick if the replacement DOM element is not yet rendered.
      this.scheduleFocusTimer(() => this.focusHotspotByIndex(index, retryCount + 1), 30);
    }
  }

  private handleContainerFocusIn = (e: FocusEvent) => {
    const fromEl = e.relatedTarget as HTMLElement | null;
    const container = this.containerRef.current;
    if (fromEl && container && !container.contains(fromEl) && fromEl !== document.body) {
      this.previouslyFocusedElement = fromEl;
    }

    const target = e.target as HTMLElement | null;
    if (!target) return;
    const hotspotEl = target.closest<HTMLElement>('[data-testid="hotspots_hotspot"]');
    if (hotspotEl && this.containerRef.current) {
      const id = hotspotEl.dataset.hotspotId;
      const index = id && this.props.hotspots ? this.props.hotspots.findIndex(h => h.id === id) : -1;
      if (index !== -1) {
        this.lastFocusedHotspotId = id!;
        this.wasHotspotFocused = true;
        if (this.state.activeIndex !== index) {
          this.setState({ activeIndex: index });
        }
      }
    }
  };

  private handleContainerFocusOut = (e: FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    const container = this.containerRef.current;
    // Clear stored focus state if focus intentionally moved to any real element outside the hotspot container.
    // Retain wasHotspotFocused only when related is null or document.body (which happens on DOM removal).
    if (related && related !== document.body && related !== document.documentElement && container && !container.contains(related)) {
      this.releaseFocusRestoration();
    } else if (!related || related === document.body || related === document.documentElement) {
      // A null relatedTarget is also sent when a still-mounted hotspot is blurred by clicking non-focusable content.
      // Defer so DOM removal (element detached) can be told apart from an intentional blur.
      const target = e.target as Node;
      if (this.blurCheckTimer !== null) {
        clearTimeout(this.blurCheckTimer);
      }
      this.blurCheckTimer = window.setTimeout(() => {
        this.blurCheckTimer = null;
        const active = document.activeElement;
        const focusInContainer = !!active && !!this.containerRef.current?.contains(active);
        if (target.isConnected && !focusInContainer) {
          this.releaseFocusRestoration();
        }
      }, 0);
    }
  };

  private handleHotspotKeyDown = (e: KeyboardEvent, index: number) => {
    const {hotspots} = this.props;
    if (!hotspots || hotspots.length === 0) return;

    let nextIndex = index;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % hotspots.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + hotspots.length) % hotspots.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = hotspots.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    e.stopPropagation();
    this.focusHotspotByIndex(nextIndex);
  };

  private handleHotspotFocus = (id: string, index: number) => {
    this.lastFocusedHotspotId = id;
    this.wasHotspotFocused = true;
    if (this.state.activeIndex !== index) {
      this.setState({ activeIndex: index });
    }
  };

  private findReplayOrPlayButton(playerContainer: HTMLElement): HTMLElement | null {
    // 1. Center play/replay button (shown on start or after video end)
    const centerBtn = playerContainer.querySelector<HTMLElement>(
      '.playkit-pre-playback-play-button button, .playkit-pre-playback-play-button, [data-testid="pre_playback_play_button"]'
    );
    if (centerBtn) {
      return centerBtn;
    }

    // 2. Control bar play/pause button (standard in Playkit UI)
    const playPauseBtn = playerContainer.querySelector<HTMLElement>(
      '.playkit-control-play-pause button, .playkit-control-play-pause [tabindex="0"]'
    );
    if (playPauseBtn) {
      return playPauseBtn;
    }

    // 3. Fallback: First visible button in bottom bar or player container
    const fallback = playerContainer.querySelector<HTMLElement>(
      '.playkit-bottom-bar button, button'
    );
    return fallback;
  }

  private returnFocusToPlayPause(forceReplay = false) {
    this.beginFocusRequest();
    const isPlaybackEnded = forceReplay || !!this.props.player?.ended;
    if (isPlaybackEnded) {
      this.previouslyFocusedElement = null;
    }

    const attemptFocus = () => {
      const playerContainer = this.getPlayerContainer();

      // 1. If playback is NOT ended and we have a previously focused element still attached inside the player, restore focus to it
      if (!isPlaybackEnded && this.previouslyFocusedElement && playerContainer?.contains(this.previouslyFocusedElement)) {
        const prev = this.previouslyFocusedElement;
        this.previouslyFocusedElement = null;
        prev.focus();
        if (document.activeElement === prev) {
          return true;
        }
      }

      // 2. Otherwise find the Replay / Play-Pause button in the player
      if (!playerContainer) return false;

      const btn = this.findReplayOrPlayButton(playerContainer);
      if (btn) {
        // Trigger hover on player so control bar becomes visible if hidden
        try {
          this.props.player?.ui?.store?.dispatch?.({type: 'shell/UPDATE_PLAYER_HOVER_STATE', hover: true});
        } catch (e) {
          // ignore if store is unavailable
        }

        btn.focus();
        return document.activeElement === btn;
      }
      return false;
    };

    if (!attemptFocus()) {
      this.scheduleFocusTimer(() => {
        if (!this.canContinueFocusRetry()) return;
        if (!attemptFocus()) {
          this.scheduleFocusTimer(() => {
            if (!this.canContinueFocusRetry()) return;
            if (!attemptFocus()) {
              this.scheduleFocusTimer(() => {
                if (this.canContinueFocusRetry()) attemptFocus();
              }, 150);
            }
          }, 70);
        }
      }, 30);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const currentHotspots = this.props.hotspots || [];
    const prevHotspots = prevProps.hotspots || [];

    const currentMap = new Map<string, string>(
      currentHotspots
        .filter(h => typeof h.label === 'string')
        .map(h => [h.id, h.label!])
    );
    const currentIds = new Set<string>(currentHotspots.map(h => h.id));

    // Focus Return on Dismissal/Expiration
    const activeEl = document.activeElement as HTMLElement | null;
    const container = this.containerRef.current;
    const isFocusCurrentlyInHotspots = container && activeEl ? container.contains(activeEl) : false;

    if (this.wasHotspotFocused || isFocusCurrentlyInHotspots) {
      const focusedId = this.lastFocusedHotspotId;
      const isFocusedHotspotGone = focusedId ? !currentIds.has(focusedId) : false;

      if (isFocusedHotspotGone || currentHotspots.length === 0) {
        if (currentHotspots.length > 0) {
          const fallbackIndex = Math.min(this.state.activeIndex, currentHotspots.length - 1);
          this.focusHotspotByIndex(Math.max(0, fallbackIndex));
        } else {
          this.lastFocusedHotspotId = null;
          this.wasHotspotFocused = false;
          const player = this.props.player;
          const isPlaybackEnded = !!player?.ended || (typeof player?.duration === 'number' && player?.duration > 0 && player?.currentTime >= player?.duration - 0.5);
          if (isPlaybackEnded) {
            this.previouslyFocusedElement = null;
          }
          this.returnFocusToPlayPause(isPlaybackEnded);
        }
      }
    }

    // Preserve the active hotspot by ID when the collection changes (e.g. earlier cue removed or inserted)
    if (this.lastFocusedHotspotId && currentIds.has(this.lastFocusedHotspotId)) {
      const newIndex = currentHotspots.findIndex(h => h.id === this.lastFocusedHotspotId);
      if (newIndex !== -1 && newIndex !== this.state.activeIndex) {
        this.setState({ activeIndex: newIndex });
      }
    } else if (currentHotspots.length > 0 && this.state.activeIndex >= currentHotspots.length) {
      // Ensure activeIndex stays in valid bounds
      this.setState({ activeIndex: currentHotspots.length - 1 });
    }

    let announced = false;

    // Announce removed hotspots
    this.previousHotspotMap.forEach((label, id) => {
      if (!currentMap.has(id) && !announced) {
        if (this.props.hotspotRemoved) {
          const message = this.props.hotspotRemoved.replace('{hotspotLabel}', label);
          this.announceHotspotChange(message);
        }
        announced = true;
      }
    });

    // Announce added hotspots
    if (!announced) {
      currentMap.forEach((label, id) => {
        if (!this.previousHotspotMap.has(id) && !announced) {
          if (this.props.hotspotAdded) {
            const baseMessage = this.props.hotspotAdded.replace('{hotspotLabel}', label);
            const message = this.props.shortcutHint ? `${baseMessage}. ${this.props.shortcutHint}` : baseMessage;
            this.announceHotspotChange(message);
          }
          announced = true;
        }
      });
    }

    this.previousHotspotMap = currentMap;
  }

  private announceHotspotChange(message: string) {
    const liveRegion = this.liveRegionRef.current;
    if (!liveRegion) return;
    liveRegion.textContent = '';
    //setTimeout ensures the DOM change happens in two separate cycles
    // which solves the issue that the hotspot removal is announced only the first time.
    setTimeout(() => {
      liveRegion.textContent = message;
    });
  }

  private renderHotspots = (visualHotspot: LayoutHotspot[]) => {
    if (!visualHotspot) {
      return null;
    }

    const {seekTo, pauseVideo, sendAnalytics, dispatcher} = this.props;
    const {activeIndex} = this.state;

    return visualHotspot.map((hotspotData, index) => (
      <Hotspot dispatcher={dispatcher} pauseVideo={pauseVideo} seekTo={seekTo} key={hotspotData.id} visible={true} hotspot={hotspotData} sendAnalytics={sendAnalytics} tabIndex={index === activeIndex ? 0 : -1} onKeyDown={(e) => this.handleHotspotKeyDown(e, index)} onFocus={() => this.handleHotspotFocus(hotspotData.id, index)} />
    ));
  };

  render() {
    const {hotspots} = this.props;
    const hotspotsElements = this.renderHotspots(hotspots);
    const targetId = this.props.player?.config?.targetId;
    const liveRegionId = `hotspot-liveRegion-${targetId}`;
    const hasHotspots = hotspots && hotspots.length > 0;

    return (
      <div ref={this.containerRef} style={hotspotsContainerStyles} data-testid="hotspots_hotspotsContainer" role={hasHotspots ? 'toolbar' : undefined} aria-label={hasHotspots ? this.props.toolbarLabel : undefined}>
        {hotspotsElements}
        <div
          ref={this.liveRegionRef}
          id={liveRegionId}
          aria-live="polite"
          role="status"
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden'
          }}
        />
      </div>
    );
  }
}
