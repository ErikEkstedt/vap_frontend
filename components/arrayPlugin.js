// Slightly modified MinimapPlugin used to show array of real values
export default class ArrayPlugin {
  /**
   * Minimap plugin definition factory
   *
   * This function must be used to create a plugin definition which can be
   * used by wavesurfer to correctly instantiate the plugin.
   *
   * @param  {MinimapPluginParams} params parameters use to initialise the plugin
   * @return {PluginDefinition} an object representing the plugin
   */
  static create(params) {
    return {
      name: params.name ? params.name : 'minimap',
      deferInit: params && params.deferInit ? params.deferInit : false,
      params: params,
      staticProps: {},
      instance: ArrayPlugin,
    };
  }

  constructor(params, ws) {
    this.params = Object.assign(
      {},
      ws.params,
      {
        showRegions: false,
        regionsPluginName: params.regionsPluginName || 'regions',
        showOverview: false,
        overviewBorderColor: 'green',
        overviewBorderSize: 2,
        autoCenter: true,
        // the container should be different
        container: false,
        height: Math.max(Math.round(ws.params.height / 4), 20),
      },
      params,
      {
        scrollParent: true,
        fillParent: true,
      }
    );
    // if container is a selector, get the element
    if (typeof params.container === 'string') {
      const el = document.querySelector(params.container);
      if (!el) {
        console.warn(
          `Wavesurfer minimap container ${params.container} was not found! The minimap will be automatically appended below the waveform.`
        );
      }
      this.params.container = el;
    }
    // if no container is specified add a new element and insert it
    if (!params.container) {
      this.params.container = ws.util.style(document.createElement('minimap'), {
        display: 'block',
      });
    }
    this.drawer = new ws.Drawer(this.params.container, this.params);
    this.wavesurfer = ws;
    this.util = ws.util;
    this.cleared = false;
    this.renderEvent = 'redraw';
    this.overviewRegion = null;

    this.drawer.createWrapper();
    this.createElements();
    let isInitialised = false;

    // ws ready event listener
    this._onShouldRender = () => {
      // only bind the events in the first run
      if (!isInitialised) {
        this.bindWavesurferEvents();
        this.bindMinimapEvents();
        isInitialised = true;
      }
      // if there is no such element, append it to the container (below
      // the waveform)
      if (!document.body.contains(this.params.container)) {
        ws.container.insertBefore(this.params.container, null);
      }

      this.render();
    };

    this._onAudioprocess = (currentTime) => {
      this.drawer.progress(this.wavesurfer.backend.getPlayedPercents());
    };

    // ws seek event listener
    this._onSeek = () => this.drawer.progress(ws.backend.getPlayedPercents());

    // event listeners for the overview region
    this._onScroll = (e) => {
      if (!this.draggingOverview) {
        const orientedTarget = this.util.withOrientation(
          e.target,
          this.wavesurfer.params.vertical
        );
        this.moveOverviewRegion(orientedTarget.scrollLeft / this.ratio);
      }
    };
    this._onMouseover = (e) => {
      if (this.draggingOverview) {
        this.draggingOverview = false;
      }
    };
    let prevWidth = 0;
    this._onResize = ws.util.debounce(() => {
      if (prevWidth !== this.drawer.wrapper.clientWidth) {
        prevWidth = this.drawer.wrapper.clientWidth;
        this.render();
        this.drawer.progress(this.wavesurfer.backend.getPlayedPercents());
      }
    });
    this._onLoading = (percent) => {
      if (percent >= 100) {
        this.cleared = false;
        return;
      }
      if (this.cleared === true) {
        return;
      }
      const len = this.drawer.getWidth();
      this.drawer.drawPeaks([0], len, 0, len);
      this.cleared = true;
    };
    this._onZoom = (e) => {
      this.render();
    };
    this.wavesurfer.on('zoom', this._onZoom);
  }

  init() {
    if (this.wavesurfer.isReady) {
      this._onShouldRender();
    }
    this.wavesurfer.on(this.renderEvent, this._onShouldRender);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize, true);
    window.removeEventListener('orientationchange', this._onResize, true);
    this.wavesurfer.drawer.wrapper.removeEventListener(
      'mouseover',
      this._onMouseover
    );
    this.wavesurfer.un(this.renderEvent, this._onShouldRender);
    this.wavesurfer.un('seek', this._onSeek);
    this.wavesurfer.un('scroll', this._onScroll);
    this.wavesurfer.un('audioprocess', this._onAudioprocess);
    this.wavesurfer.un('zoom', this._onZoom);
    this.wavesurfer.un('loading', this._onLoading);
    this.drawer.destroy();
    this.overviewRegion = null;
    this.unAll();
  }

  createElements() {
    this.drawer.createElements();
    if (this.params.showOverview) {
      this.overviewRegion = this.util.withOrientation(
        this.drawer.wrapper.appendChild(document.createElement('overview')),
        this.wavesurfer.params.vertical
      );

      this.util.style(this.overviewRegion, {
        top: 0,
        bottom: 0,
        width: '0px',
        display: 'block',
        position: 'absolute',
        cursor: 'move',
        border:
          this.params.overviewBorderSize +
          'px solid ' +
          this.params.overviewBorderColor,
        zIndex: 2,
        opacity: this.params.overviewOpacity,
      });
    }
  }

  bindWavesurferEvents() {
    window.addEventListener('resize', this._onResize, true);
    window.addEventListener('orientationchange', this._onResize, true);
    this.wavesurfer.on('audioprocess', this._onAudioprocess);
    this.wavesurfer.on('seek', this._onSeek);
    this.wavesurfer.on('loading', this._onLoading);
    if (this.params.showOverview) {
      this.wavesurfer.on('scroll', this._onScroll);
      this.wavesurfer.drawer.wrapper.addEventListener(
        'mouseover',
        this._onMouseover
      );
    }
  }

  bindMinimapEvents() {
    const positionMouseDown = {
      clientX: 0,
      clientY: 0,
    };
    let relativePositionX = 0;
    let seek = true;

    // the following event listeners will be destroyed by using
    // this.unAll() and nullifying the DOM node references after
    // removing them
    if (this.params.interact) {
      this.drawer.wrapper.addEventListener('click', (event) => {
        this.fireEvent('click', event, this.drawer.handleEvent(event));
      });

      this.on('click', (event, position) => {
        if (seek) {
          this.drawer.progress(position);
          this.wavesurfer.seekAndCenter(position);
        } else {
          seek = true;
        }
      });
    }

    if (this.params.showOverview) {
      this.overviewRegion.domElement.addEventListener('mousedown', (e) => {
        const event = this.util.withOrientation(
          e,
          this.wavesurfer.params.vertical
        );
        this.draggingOverview = true;
        relativePositionX = event.layerX;
        positionMouseDown.clientX = event.clientX;
        positionMouseDown.clientY = event.clientY;
      });

      this.drawer.wrapper.addEventListener('mousemove', (e) => {
        if (this.draggingOverview) {
          const event = this.util.withOrientation(
            e,
            this.wavesurfer.params.vertical
          );
          this.moveOverviewRegion(
            event.clientX -
            this.drawer.container.getBoundingClientRect().left -
            relativePositionX
          );
        }
      });

      this.drawer.wrapper.addEventListener('mouseup', (e) => {
        const event = this.util.withOrientation(
          e,
          this.wavesurfer.params.vertical
        );
        if (
          positionMouseDown.clientX - event.clientX === 0 &&
          positionMouseDown.clientX - event.clientX === 0
        ) {
          seek = true;
          this.draggingOverview = false;
        } else if (this.draggingOverview) {
          seek = false;
          this.draggingOverview = false;
        }
      });
    }
  }

  getDuration() {
    return this.wavesurfer.getDuration();
  }

  getCurrentTime() {
    return this.wavesurfer.getCurrentTime();
  }

  render() {
    const parentWidth = this.drawer.getWidth();
    let width = Math.round(
      this.getDuration() * this.params.minPxPerSec * this.params.pixelRatio
    );
    let start = Math.round(
      this.getCurrentTime() * this.params.minPxPerSec * this.params.pixelRatio
    );
    let end = Math.max(start + parentWidth, width);

    // Handle 'autoScroll/autoCenter' when data is shorter than window
    if (width < parentWidth) {
      start = 0;
      end = parentWidth;
      width = parentWidth;
    }

    this.drawer.drawPeaks(this.params.probs, width, start, end);
    this.drawer.progress(this.wavesurfer.backend.getPlayedPercents());

    if (this.params.showOverview) {
      //get proportional width of overview region considering the respective
      //width of the drawers
      this.ratio = this.wavesurfer.drawer.width / this.drawer.width;
      this.waveShowedWidth = this.wavesurfer.drawer.width / this.ratio;
      this.waveWidth = this.wavesurfer.drawer.width;
      this.overviewWidth = this.drawer.container.offsetWidth / this.ratio;
      this.overviewPosition = 0;
      this.moveOverviewRegion(
        this.wavesurfer.drawer.wrapper.scrollLeft / this.ratio
      );
      this.util.style(this.overviewRegion, {
        width: this.overviewWidth + 'px',
      });
    }
  }

  moveOverviewRegion(pixels) {
    if (pixels < 0) {
      this.overviewPosition = 0;
    } else if (
      pixels + this.overviewWidth <
      this.drawer.container.offsetWidth
    ) {
      this.overviewPosition = pixels;
    } else {
      this.overviewPosition =
        this.drawer.container.offsetWidth - this.overviewWidth;
    }
    this.util.style(this.overviewRegion, {
      left: this.overviewPosition + 'px',
    });
    if (this.draggingOverview) {
      this.wavesurfer.drawer.wrapper.scrollLeft =
        this.overviewPosition * this.ratio;
    }
  }

  getWidth() {
    return this.drawer.width / this.params.pixelRatio;
  }
}
