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
  return (
    <Box
      columns={2}
      m={2}
      p={1}
      border="1px"
      borderColor="gray.20"
      borderRadius={10}
      align="center"
    >
      <SimpleGrid columns={3}>
        <SimpleGrid columns={2}>
          <Box>
            <Stack align="center" direction="column">
              <Text fontSize="sm"> Aggregate </Text>
              <Switch id="aggregate" isDisabled />
            </Stack>
          </Box>

          <Box>
            <Stack align="center" direction="column">
              <Text fontSize="sm"> BC </Text>
              <Switch id="bc" isDisabled />
            </Stack>
          </Box>
        </SimpleGrid>
        <Flex>
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

          <Box>
            <Stack align="center" m={1} direction="column">
              <Text fontSize="sm"> Topk </Text>
              <RadioGroup
                onChange={props.setNTopk}
                value={props.nTopk.toString()}
              >
                <Stack direction="row">
                  <Radio value="5">5</Radio>
                  <Radio value="10">10</Radio>
                </Stack>
              </RadioGroup>
            </Stack>
          </Box>
        </Flex>
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
      id: {
        wavesurfer: 'wavesurfer',
        timeline: 'timeline',
        minimap: 'minimap',
        nsA: 'nsA',
        nsB: 'nsB',
      },
      maxTopk: props.maxTopk,
      nTopk: 5,
      dim: { waveform: 100, minimap: 50, p_ns: 100 },
      data: {},
      topk: null,
      topkP: null,
      topkCurrent: null,
      topkPCurrent: null,
      playing: false,
      zoom: 100,
      n_probs: 0,
    };
    console.log('VAP constructor');
  }

  componentDidMount() {
    console.log('Mount VAP');
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
    const MinimapPlugin = (
      await import('wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js')
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
        /* MinimapPlugin.create({ */
        /*   container: '#' + this.state.id.minimap, */
        /*   height: 50, */
        /*   showRegions: true, */
        /*   cursorWidth: 2, */
        /* }), */
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
          topkCurrent: data.topk[0].slice(0, this.state.nTopk),
          topkPCurrent: data.topk_p[0].slice(0, this.state.nTopk),
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
    this.setState({ n_probs: data.p_ns_a.length });
    var plugins = [
      ArrayPlugin.create({
        name: this.state.id.nsA,
        container: '#' + this.state.id.nsA,
        probs: data.p_ns_a,
        height: this.state.dim.p_ns,
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
        name: this.state.id.nsB,
        container: '#' + this.state.id.nsB,
        probs: data.p_ns_b,
        height: this.state.dim.p_ns,
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
      topkCurrent: this.state.topk[idx].slice(0, this.state.nTopk),
      topkPCurrent: this.state.topkP[idx].slice(0, this.state.nTopk),
    });
  };

  render() {
    return (
      <Box>
        <Box bg="white" m={2} p={1} border="1px" borderRadius={10}>
          <Box
            mb={1}
            border="1px"
            borderColor="black"
            id={this.state.id.minimap}
          />
          <Box border="1px" borderColor="black" id={this.state.id.wavesurfer} />
          <Box border="1px" borderColor="black" mt={1} pt={1} pb={1}>
            <Box
              overflow="hidden"
              h={this.state.dim.p_ns / 2}
              id={this.state.id.nsA}
            />
            <Box
              overflow="hidden"
              transform="scaleY(-1)"
              h={this.state.dim.p_ns / 2}
              id={this.state.id.nsB}
            />
          </Box>
          <div id={this.state.id.timeline} />
        </Box>
        <Controls
          maxTopk={this.state.maxTopk}
          nTopk={this.state.nTopk}
          setNTopk={(e) => {
            console.log('over topk: ' + e);
            this.setState({ nTopk: e });
            this.setCurrentTopK();
          }}
          playing={this.state.playing}
          togglePlay={() => {
            this.setState({ playing: !this.state.playing });
            this.wavesurfer.playPause();
          }}
          goStart={() => {
            this.wavesurfer.seekAndCenter(0);
          }}
          goEnd={() => {
            this.wavesurfer.seekAndCenter(1);
          }}
        />
        <Topk topk={this.state.topkCurrent} topkP={this.state.topkPCurrent} />
      </Box>
    );
  }
}
export default VAP;
