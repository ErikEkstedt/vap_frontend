import React from 'react';
import { Box, Button, Flex, Icon } from '@chakra-ui/react';
import { FaPlay, FaPause, FaStepForward, FaStepBackward } from 'react-icons/fa';
import {
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';

import { SimpleGrid } from '@chakra-ui/react';
import { Switch } from '@chakra-ui/react';
import { Radio, RadioGroup, Stack } from '@chakra-ui/react';

import ArrayPlugin from './arrayPlugin.js';
import Topk from './topk.js';

/*

* Why is next so slow to serve data?

API response for /api/output?filename=session_1_baseline exceeds 4MB. API Routes are meant to respond quickly. https://nextjs.org/docs/messages/api-routes-response-size-limit
API response for /api/audio?filename=session_1_baseline exceeds 4MB. API Routes are meant to respond quickly. https://nextjs.org/docs/messages/api-routes-response-size-limit


*/
// Colors
const colors = {
  wave: {
    ts_a: '#226CEB',
    ts_b: '#EFB82A',
    bc_a: '#6AED15',
    bc_b: '#147409',
  },
  vad: {
    a: '#FFAD3420',
    b: '#2563FF20',
  },
  prog: {
    ts_a: 'darkblue',
    ts_b: '#C27709',
    bc_a: '#459C0D',
    bc_b: '#0C4A05',
  },
};

const formWaveSurferOptions = (props) => ({
  container: props.ref,
  autoCenter: true,
  waveColor: '#eee',
  progressColor: '#0178FF',
  cursorColor: 'OrangeRed',
  barWidth: 2,
  barRadius: 2,
  responsive: true,
  height: props.height,
  normalize: true,
  hideScrollbar: true,
  splitChannels: true,
  splitChannelsOptions: {
    channelColors: {
      0: { progressColor: colors.prog.ts_a, waveColor: colors.wave.ts_a },
      1: { progressColor: colors.prog.ts_b, waveColor: colors.wave.ts_b },
    },
  },
});

const Controls = (props) => {
  // Switches
  // props.
  // props.togglePlay
  // props.goEnd
  //
  // PlayBtns
  // props.goStart
  // props.togglePlay
  // props.goEnd

  let switches = (
    // Radio-buttons to change what prediction data is shown in
    // the visualization.
    <SimpleGrid columns={2} border="1px" borderColor="white">
      <Stack align="center" m={1} direction="column">
        <Text fontSize="sm"> P-now </Text>
        <Switch
          onChange={() => {
            props.setShowPNow();
          }}
          defaultChecked
          id="p_now"
        />
      </Stack>
      <Stack align="center" m={1} direction="column">
        <Text fontSize="sm"> P-future </Text>
        <Switch
          onChange={() => {
            props.setShowPFuture();
          }}
          defaultChecked
          id="p_future"
        />

        <Text fontSize="sm"> BC </Text>
        <Switch
          onChange={() => {
            props.setShowBC();
          }}
          value={props.showBC}
          id="bc"
        />
      </Stack>
    </SimpleGrid>
  );

  let topK = (
    <SimpleGrid columns={2} border="1px" borderColor="white">
      <Stack align="center" m={1} direction="column">
        <RadioGroup onChange={props.setNTopk} value={props.nTopk.toString()}>
          <Stack>
            <Text fontSize="m"> Topk </Text>
            <Radio value="0">Hide</Radio>
            <Radio value="5">5</Radio>
            <Radio value="10">10</Radio>
          </Stack>
        </RadioGroup>
      </Stack>
    </SimpleGrid>
  );

  let playBtns = (
    <Flex border="1px" borderColor="white">
      <Box m="auto">
        <Button onClick={props.goStart}>
          <Icon as={FaStepBackward} />
        </Button>
        <Button onClick={props.togglePlay}>
          {!props.playing ? <Icon as={FaPlay} /> : <Icon as={FaPause} />}
        </Button>
        <Button onClick={props.goEnd}>
          <Icon as={FaStepForward} />
        </Button>
      </Box>
    </Flex>
  );

  return (
    <Box
      m={2}
      p={1}
      border="1px"
      borderColor="gray.20"
      borderRadius={10}
      align="center"
    >
      <SimpleGrid columns={3}>
        {switches}
        {playBtns}
        {topK}
        <Box />
      </SimpleGrid>
    </Box>
  );
};

class VAP extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      audioURL: props.audioURL,
      dataURL: props.dataURL,
      filename: props.filename,
      wavesurfer: null,
      controls: {
        playing: false,
        maxTopk: props.maxTopk,
        nTopk: 0,
        showPNow: true,
        showPFuture: true,
        showTopk: false,
      },
      id: {
        wavesurfer: 'wavesurfer',
        timeline: 'timeline',
        pnA: 'pnA',
        pnB: 'pnB',
        pfA: 'pfA',
        pfB: 'pfB',
      },
      dim: { waveform: 100, p: 100 },
      data: {},
      topk: null,
      topkP: null,
      topkCurrent: null,
      topkPCurrent: null,
      zoom: 120,
      n_probs: 0,
    };
    console.log('VAP constructor');
  }

  componentDidMount() {
    /* console.log('Mount VAP'); */
    this.initWavesurfer();
    this.initData();
  }

  componentWillUnmount() {
    console.log('UnMount VAP');
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    }
  }

  async initWavesurfer() {
    const WaveSurfer = (await import('wavesurfer.js')).default;
    const RegionPlugin = (
      await import('wavesurfer.js/dist/plugin/wavesurfer.regions.min.js')
    ).default;
    const TimelinePlugin = (
      await import('wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js')
    ).default;

    if (!this.wavesurfer) {
      console.log('ID: ' + this.state.id.wavesurfer);
      let options = formWaveSurferOptions({
        ref: '#' + this.state.id.wavesurfer,
        height: this.state.dim.waveform,
      });
      options.plugins = [
        RegionPlugin.create(),
        TimelinePlugin.create({ container: '#' + this.state.id.timeline }),
      ];
      this.wavesurfer = WaveSurfer.create(options);
      this.wavesurfer.load(this.state.audioURL);
      this.wavesurfer.zoom(this.state.zoom);
      this.wavesurfer.on('seek', this.setCurrentTopK);
      this.wavesurfer.on('audioprocess', this._onAudioprocess);
    }
  }

  async initData() {
    await fetch(this.state.dataURL)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) => {
        this.setState({
          topk: data.topk,
          topkP: data.topk_p,
          topkCurrent: data.topk[0].slice(0, this.state.controls.nTopk),
          topkPCurrent: data.topk_p[0].slice(0, this.state.controls.nTopk),
        });
        this.initVad(data.vad_list);
        this.initNextSpeakerProbs(data);
      });
  }

  async initVad(vad_list) {
    vad_list.map((vads, channel) => {
      const color = channel ? colors.vad.a : colors.vad.b;
      vads.map(([start, end], idx) => {
        this.wavesurfer.addRegion({
          start: start,
          end: end,
          color: color,
          drag: false,
          resize: false,
          channelIdx: channel,
          id: `${channel}_${idx}`,
        });
      });
    });
  }

  async initNextSpeakerProbs(data) {
    this.setState({ n_probs: data.p_now_a.length });
    var plugins = [
      // P-now
      ArrayPlugin.create({
        name: this.state.id.pnA,
        container: '#' + this.state.id.pnA,
        probs: data.p_now_a,
        height: this.state.dim.p,
        barWidth: false,
        splitChannels: false,
        splitChannelsOptions: {
          channelColors: {
            0: {
              progressColor: colors.prog.ts_a,
              waveColor: colors.wave.ts_a,
            },
          },
        },
      }),
      ArrayPlugin.create({
        name: this.state.id.pnB,
        container: '#' + this.state.id.pnB,
        probs: data.p_now_b,
        height: this.state.dim.p,
        barWidth: false,
        splitChannels: false,
        splitChannelsOptions: {
          channelColors: {
            0: {
              progressColor: colors.prog.ts_b,
              waveColor: colors.wave.ts_b,
            },
          },
        },
      }),
      ArrayPlugin.create({
        name: this.state.id.pfA,
        container: '#' + this.state.id.pfA,
        probs: data.p_future_a,
        height: this.state.dim.p,
        barWidth: false,
        splitChannels: false,
        splitChannelsOptions: {
          channelColors: {
            0: {
              progressColor: colors.prog.ts_a,
              waveColor: colors.wave.ts_a,
            },
          },
        },
      }),
      ArrayPlugin.create({
        name: this.state.id.pfB,
        container: '#' + this.state.id.pfB,
        probs: data.p_future_b,
        height: this.state.dim.p,
        barWidth: false,
        splitChannels: false,
        splitChannelsOptions: {
          channelColors: {
            0: {
              progressColor: colors.prog.ts_b,
              waveColor: colors.wave.ts_b,
            },
          },
        },
      }),
    ];
    this.wavesurfer.registerPlugins(plugins);
  }

  _onAudioprocess = () => {
    this.setCurrentTopK();
  };

  setCurrentTopK = () => {
    const r = this.wavesurfer.backend.getPlayedPercents();
    let idx = (r * this.state.topk.length).toFixed(0);
    this.setState({
      topkCurrent: this.state.topk[idx].slice(0, this.state.controls.nTopk),
      topkPCurrent: this.state.topkP[idx].slice(0, this.state.controls.nTopk),
    });
  };

  render() {
    let pNow = null;
    if (this.state.controls.showPNow) {
      if (this.state.pNow === undefined) {
        pNow = (
          <Box border="1px" borderColor="black" mt={1} pt={1} pb={1}>
            <Box
              overflow="hidden"
              h={this.state.dim.p / 2}
              id={this.state.id.pnA}
            />
            <Box
              overflow="hidden"
              transform="scaleY(-1)"
              h={this.state.dim.p / 2}
              id={this.state.id.pnB}
            />
          </Box>
        );
        this.setState({
          pNow: pNow,
        });
      } else {
        pNow = this.state.pNow;
      }
    }

    let pFuture = null;
    if (this.state.controls.showPFuture) {
      if (this.state.pFuture === undefined) {
        pFuture = (
          <Box border="1px" borderColor="black" mt={1} pt={1} pb={1}>
            <Box
              overflow="hidden"
              h={this.state.dim.p / 2}
              id={this.state.id.pfA}
            />
            <Box
              overflow="hidden"
              transform="scaleY(-1)"
              h={this.state.dim.p / 2}
              id={this.state.id.pfB}
            />
          </Box>
        );
        this.setState({
          pFuture: pFuture,
        });
      } else {
        pFuture = this.state.pFuture;
      }
    }

    let topK = null;
    if (this.state.controls.showTopk) {
      topK = (
        <Topk topk={this.state.topkCurrent} topkP={this.state.topkPCurrent} />
      );
    }

    return (
      <Box>
        <Box bg="white" m={2} p={1} border="1px" borderRadius={10}>
          <div id={this.state.id.timeline} />
          <Box border="1px" borderColor="black" id={this.state.id.wavesurfer} />
          {pNow}
          {pFuture}
        </Box>

        <Controls
          setShowPNow={() => {
            this.setState({
              controls: {
                ...this.state.controls,
                showPNow: !this.state.controls.showPNow,
              },
            });
          }}
          setShowPFuture={() => {
            this.setState({
              controls: {
                ...this.state.controls,
                showPFuture: !this.state.controls.showPFuture,
              },
            });
          }}
          setShowBC={() => {
            alert('Toggle backchannel (BC) not yet implemented');
            this.setState({
              controls: {
                ...this.state.controls,
                showBC: !this.state.controls.showBC,
              },
            });
          }}
          // topK
          maxTopk={this.state.controls.maxTopk}
          nTopk={this.state.controls.nTopk}
          setNTopk={(e) => {
            let showTopk = false;
            if (e > 0) {
              showTopk = true;
            }
            this.setState({
              controls: {
                ...this.state.controls,
                nTopk: e,
                showTopk: showTopk,
              },
            });
            this.setCurrentTopK();
          }}
          // playBTNs
          playing={this.state.controls.playing}
          togglePlay={() => {
            this.setState({
              controls: {
                ...this.state.controls,
                playing: !this.state.controls.playing,
              },
            });
            this.wavesurfer.playPause();
          }}
          goStart={() => {
            this.wavesurfer.seekAndCenter(0);
          }}
          goEnd={() => {
            this.wavesurfer.seekAndCenter(1);
          }}
        />
        {topK}
      </Box>
    );
  }
}
export default VAP;
