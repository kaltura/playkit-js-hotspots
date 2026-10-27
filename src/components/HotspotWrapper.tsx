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
  private wasHotspotFocused: boolean = false;
  private focusTimers: number[] = [];

  componentDidMount() {
    window.addEventListener('keydown', this.handleGlobalKeyDown);
    if (this.props.player) {
      const endedEvent = this.props.player.Event?.ENDED || 'ended';
      this.props.player.addEventListener?.(endedEvent, this.onPlayerEnded);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
    if (this.props.player) {
      const endedEvent = this.props.player.Event?.ENDED || 'ended';
      this.props.player.removeEventListener?.(endedEvent, this.onPlayerEnded);
    }
    this.clearFocusTimers();
  }

  private clearFocusTimers() {
    this.focusTimers.forEach(id => clearTimeout(id));
    this.focusTimers = [];
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
      this.returnFocusToPlayPause();
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
    const targetIndex = this.state.activeIndex >= 0 && this.state.activeIndex < hotspots.length ? this.state.activeIndex : 0;
    this.focusHotspotByIndex(targetIndex);
  };

  private focusHotspotByIndex(index: number) {
    const container = this.containerRef.current;
    if (!container) return;
    const hotspotElements = container.querySelectorAll<HTMLElement>('[data-testid="hotspots_hotspot"]');
    if (hotspotElements && hotspotElements[index]) {
      this.setState({ activeIndex: index }, () => {
        hotspotElements[index].focus();
      });
    }
  }

  private handleContainerFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const hotspotEl = target.closest<HTMLElement>('[data-testid="hotspots_hotspot"]');
    if (hotspotEl && this.containerRef.current) {
      const allHotspots = Array.from(this.containerRef.current.querySelectorAll<HTMLElement>('[data-testid="hotspots_hotspot"]'));
      const index = allHotspots.indexOf(hotspotEl);
      if (index !== -1 && this.props.hotspots && this.props.hotspots[index]) {
        this.lastFocusedHotspotId = this.props.hotspots[index].id;
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
    const playerContainer = this.getPlayerContainer();
    // Only reset wasHotspotFocused if focus intentionally moved to another control inside the player.
    // If related is null or body because the hotspot was removed from DOM, keep wasHotspotFocused = true!
    if (related && container && !container.contains(related) && playerContainer && playerContainer.contains(related)) {
      this.wasHotspotFocused = false;
      this.lastFocusedHotspotId = null;
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
    if (centerBtn && centerBtn.offsetParent !== null) {
      return centerBtn;
    }

    // 2. Control bar play/pause button (standard in Playkit UI)
    const playPauseBtn = playerContainer.querySelector<HTMLElement>(
      '.playkit-control-play-pause button, .playkit-control-play-pause [tabindex="0"]'
    );
    if (playPauseBtn && playPauseBtn.offsetParent !== null) {
      return playPauseBtn;
    }

    // 3. Fallback: First visible button in bottom bar or player container
    const fallback = playerContainer.querySelector<HTMLElement>(
      '.playkit-bottom-bar button, button'
    );
    return fallback && fallback.offsetParent !== null ? fallback : (centerBtn || playPauseBtn || fallback);
  }

  private returnFocusToPlayPause() {
    const attemptFocus = () => {
      const playerContainer = this.getPlayerContainer();
      if (!playerContainer) return false;

      const btn = this.findReplayOrPlayButton(playerContainer);
      if (btn) {
        btn.focus();
        return document.activeElement === btn;
      }
      return false;
    };

    if (!attemptFocus()) {
      const timer1 = window.setTimeout(() => {
        if (!attemptFocus()) {
          const timer2 = window.setTimeout(() => {
            if (!attemptFocus()) {
              const timer3 = window.setTimeout(attemptFocus, 150);
              this.focusTimers.push(timer3);
            }
          }, 70);
          this.focusTimers.push(timer2);
        }
      }, 30);
      this.focusTimers.push(timer1);
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

    // Focus Return on Dismissal/Expiration
    const activeEl = document.activeElement as HTMLElement | null;
    const container = this.containerRef.current;
    const isFocusCurrentlyInHotspots = container && activeEl ? container.contains(activeEl) : false;

    if (this.wasHotspotFocused || isFocusCurrentlyInHotspots) {
      const focusedId = this.lastFocusedHotspotId;
      const isFocusedHotspotGone = focusedId ? !currentMap.has(focusedId) : false;

      if (isFocusedHotspotGone || currentHotspots.length === 0) {
        if (currentHotspots.length > 0) {
          const fallbackIndex = Math.min(this.state.activeIndex, currentHotspots.length - 1);
          this.focusHotspotByIndex(Math.max(0, fallbackIndex));
        } else {
          this.lastFocusedHotspotId = null;
          this.wasHotspotFocused = false;
          this.returnFocusToPlayPause();
        }
      }
    }

    // Ensure activeIndex stays in valid bounds
    if (currentHotspots.length > 0 && this.state.activeIndex >= currentHotspots.length) {
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
      <div ref={this.containerRef} style={hotspotsContainerStyles} data-testid="hotspots_hotspotsContainer" role={hasHotspots ? 'toolbar' : undefined} aria-label={hasHotspots ? this.props.toolbarLabel : undefined} onFocus={this.handleContainerFocusIn} onBlur={this.handleContainerFocusOut}>
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
