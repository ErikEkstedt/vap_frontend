// import BasePlugin, {
//   type BasePluginEvents,
// } from 'wavesurfer.js/dist/base-plugin.js';
import WaveSurfer from 'wavesurfer.js/dist/wavesurfer.js';

export type VapProbsPluginOptions = {
  wavesurfer: WaveSurfer;
  height: number;
  container: string | HTMLElement;
  probs: Array<number>;
  colors: string[];
};

class VapProbsPlugin {
  protected options: VapProbsPluginOptions;
  private container: HTMLDivElement | null = null;
  private probs: Array<number>;
  private colors: string[];

  private parent: HTMLElement;
  private wrapper: HTMLDivElement | null = null;
  private scrollContainer: HTMLDivElement | null = null;
  private canvasWrapper: HTMLDivElement | null = null;
  private progressWrapper: HTMLDivElement | null = null;
  private cursor: HTMLDivElement | null = null;

  // private scrollContainer: HTMLElement;
  // private wrapper: HTMLElement | null = null;
  // private canvasWrapper: HTMLElement;
  // private progressWrapper: HTMLElement;
  // private cursor: HTMLElement;

  constructor(options: VapProbsPluginOptions) {
    this.options = options;
    this.parent = this.initParent(options);

    const [div, shadow] = this.initHtml();
    this.parent.appendChild(div);
    this.container = div;
    this.scrollContainer = shadow.querySelector('.scroll');
    this.wrapper = shadow.querySelector('.wrapper');
    this.canvasWrapper = shadow.querySelector('.canvases');
    this.progressWrapper = shadow.querySelector('.progress');
    this.cursor = shadow.querySelector('.cursor');
    this.parent.appendChild(div);
    this.probs = this.options.probs;
    this.colors = this.options.colors;

    this.draw();
  }

  initParent(options) {
    let parent;
    if (typeof options.container === 'string') {
      parent = document.querySelector(options.container);
    } else if (options.container instanceof HTMLElement) {
      parent = options.container;
    }
    if (!parent) {
      throw new Error('Container not found');
    }
    return parent;
  }

  initHtml() {
    const div = document.createElement('div');
    const shadow = div.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
    <style>
      :host {
        user-select: none;
      }
      :host audio {
        display: block;
        width: 100%;
      }
      :host .scroll {
        overflow-x: auto;
        overflow-y: hidden;
        width: 100%;
        position: relative;
        touch-action: none;
      }
      :host .noScrollbar {
        scrollbar-color: transparent;
        scrollbar-width: none;
      }
      :host .noScrollbar::-webkit-scrollbar {
        display: none;
        -webkit-appearance: none;
      }
      :host .wrapper {
        position: relative;
        overflow: visible;
        z-index: 2;
      }
      :host .canvases {
        min-height: 100px;
      }
      :host .canvases > div {
        position: relative;
      }
      :host canvas {
        display: block;
        position: absolute;
        top: 0;
        image-rendering: pixelated;
      }
      :host .progress {
        pointer-events: none;
        position: absolute;
        z-index: 2;
        top: 0;
        left: 0;
        width: 0;
        height: 100%;
        overflow: hidden;
      }
      :host .progress > div {
        position: relative;
      }
      :host .cursor {
        pointer-events: none;
        position: absolute;
        z-index: 5;
        top: 0;
        left: 0;
        height: 100%;
        border-radius: 2px;
      }
    </style>
    <div class="scroll" part="scroll">
      <div class="wrapper">
        <div class="canvases"></div>
        <div class="progress" part="progress"></div>
        <div class="cursor" part="cursor"></div>
      </div>
    </div>
  `;
    return [div, shadow];
  }

  public static create(options: VapProbsPluginOptions) {
    return new VapProbsPlugin(options);
  }

  getDataLength() {
    return this.probs.length;
  }
  getHeight() {
    return this.options.height;
  }

  drawProbs(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const height = canvas.height;
    const nPoints = this.getDataLength();
    const halfHeight = height / 2;
    const barIndexScale = canvas.width / nPoints;
    console.log('height: ', height);
    console.log('nPoints: ', nPoints);
    console.log('halfHeight: ', halfHeight);
    console.log('barIndexScale: ', barIndexScale);
    const barWidth = 1;

    // Create paths for each color
    let pathBlue = new Path2D();
    let pathOrange = new Path2D();

    let yBase: number;
    let barHeight: number;
    let currentPath: Path2D;
    let prevX = 0;
    for (let i = 0; i <= nPoints; i++) {
      const x = Math.round(i * barIndexScale);
      if (x > prevX) {
        const size = Math.round(this.probs[i] * height);

        yBase = halfHeight;
        barHeight = halfHeight - size;
        currentPath = pathOrange;
        if (this.probs[i] >= 0.5) {
          yBase = height - size;
          barHeight = size - halfHeight;
          currentPath = pathBlue;
        }
        // Add rectangle to the appropriate path
        currentPath.rect(prevX * barWidth, yBase, barWidth, barHeight);
        prevX = x;
      }
    }

    // Fill paths after the loop
    ctx.fillStyle = this.colors[0];
    ctx.fill(pathBlue);
    ctx.fillStyle = this.colors[1];
    ctx.fill(pathOrange);
    ctx.closePath();
  }

  draw() {
    const maxWidth = 4000;
    const nPoints = this.getDataLength();

    // renderWaveform
    const canvasContainer = document.createElement('div');
    const height = this.getHeight();

    canvasContainer.style.height = `${height}px`;
    this.canvasWrapper.style.minHeight = `${height}px`;
    this.canvasWrapper.appendChild(canvasContainer);

    // Determine the currently visible part of the waveform
    const { scrollLeft, scrollWidth, clientWidth } = this.scrollContainer;
    const viewportWidth = Math.min(maxWidth, clientWidth);

    // RenderSingleCanvas(channelData, options, width, height, start, end, canvasContainer, progressContainer) {
    const pixelRatio = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    // canvas.width = Math.round((width * (end - start)) / nPoints);
    canvas.width = viewportWidth;
    canvas.height = height * pixelRatio;
    canvasContainer.appendChild(canvas);

    this.drawProbs(canvas);
  }

  destroy() {
    this.container.remove();
  }
}

export default VapProbsPlugin;
