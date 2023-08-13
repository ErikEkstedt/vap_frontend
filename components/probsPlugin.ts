/**
 * Minimap is a tiny copy of the main waveform serving as a navigation tool.
 * Probs is a tiny copy of the main waveform serving as a navigation tool.
 */
import BasePlugin, {
  type BasePluginEvents,
} from 'wavesurfer.js/dist/base-plugin.js';
import WaveSurfer, {
  type WaveSurferOptions,
} from 'wavesurfer.js/dist/wavesurfer.js';

export type ProbsPluginOptions = {
  overlayColor?: string;
  insertPosition?: InsertPosition;
  probs: Array<number[]>;
} & WaveSurferOptions;

const defaultOptions = {
  height: 50,
  overlayColor: 'rgba(100, 100, 100, 0.1)',
  insertPosition: 'afterend',
};

export type ProbsPluginEvents = BasePluginEvents & {
  ready: [];
  interaction: [];
};

class ProbsPlugin extends BasePlugin<ProbsPluginEvents, ProbsPluginOptions> {
  protected options: ProbsPluginOptions & typeof defaultOptions;
  private ProbsWrapper: HTMLElement;
  private miniWavesurfer: WaveSurfer | null = null;
  private overlay: HTMLElement;
  private container: HTMLElement | null = null;
  private probs: Array<number[]>;

  constructor(options: ProbsPluginOptions) {
    super(options);
    this.options = Object.assign({}, defaultOptions, options);
    this.ProbsWrapper = this.initProbsWrapper();
    this.overlay = this.initOverlay();
    this.probs = this.options.probs;
  }

  public static create(options: ProbsPluginOptions) {
    return new ProbsPlugin(options);
  }

  /** Called by wavesurfer, don't call manually */
  onInit() {
    if (!this.wavesurfer) {
      throw Error('WaveSurfer is not initialized');
    }

    if (this.options.container) {
      if (typeof this.options.container === 'string') {
        this.container = document.querySelector(
          this.options.container
        ) as HTMLElement;
      } else if (this.options.container instanceof HTMLElement) {
        this.container = this.options.container;
      }
      this.container?.appendChild(this.ProbsWrapper);
    } else {
      this.container = this.wavesurfer.getWrapper().parentElement;
      this.container?.insertAdjacentElement(
        this.options.insertPosition,
        this.ProbsWrapper
      );
    }

    this.initWaveSurferEvents();
  }

  private initProbsWrapper(): HTMLElement {
    const div = document.createElement('div');
    div.style.position = 'relative';
    div.setAttribute('part', 'Probs');
    return div;
  }

  private initOverlay(): HTMLElement {
    const div = document.createElement('div');
    div.setAttribute(
      'style',
      'position: absolute; z-index: 2; left: 0; top: 0; bottom: 0; transition: left 100ms ease-out; pointer-events: none;'
    );
    div.style.backgroundColor = this.options.overlayColor;
    this.ProbsWrapper.appendChild(div);
    return div;
  }

  private initProbs() {
    if (this.miniWavesurfer) {
      this.miniWavesurfer.destroy();
      this.miniWavesurfer = null;
    }

    if (!this.wavesurfer) return;

    const data = this.wavesurfer.getDecodedData();
    const media = this.wavesurfer.getMediaElement();
    if (!data || !media) return;

    this.miniWavesurfer = WaveSurfer.create({
      waveColor: this.options.waveColor,
      progressColor: this.options.progressColor,
      container: this.ProbsWrapper,
      minPxPerSec: 1,
      fillParent: true,
      media,
      peaks: this.probs,
      duration: data.duration,
    });

    this.subscriptions.push(
      this.miniWavesurfer.on('ready', () => {
        this.emit('ready');
      }),

      this.miniWavesurfer.on('interaction', () => {
        this.emit('interaction');
      })
    );
  }

  private getOverlayWidth(): number {
    const waveformWidth = this.wavesurfer?.getWrapper().clientWidth || 1;
    return Math.round((this.ProbsWrapper.clientWidth / waveformWidth) * 100);
  }

  private onRedraw() {
    const overlayWidth = this.getOverlayWidth();
    this.overlay.style.width = `${overlayWidth}%`;
  }

  private onScroll(startTime: number) {
    if (!this.wavesurfer) return;
    const duration = this.wavesurfer.getDuration();
    this.overlay.style.left = `${(startTime / duration) * 100}%`;
  }

  private initWaveSurferEvents() {
    if (!this.wavesurfer) return;

    this.subscriptions.push(
      this.wavesurfer.on('decode', () => {
        this.initProbs();
      }),

      this.wavesurfer.on('scroll', (startTime: number) => {
        this.onScroll(startTime);
      }),

      this.wavesurfer.on('redraw', () => {
        this.onRedraw();
      })
    );
  }

  /** Unmount */
  public destroy() {
    this.miniWavesurfer?.destroy();
    this.ProbsWrapper.remove();
    super.destroy();
  }
}

export default ProbsPlugin;
