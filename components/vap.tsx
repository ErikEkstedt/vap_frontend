import React, { useEffect, useState, useCallback } from 'react';
import { Box, Button, Icon } from '@chakra-ui/react';
import { FaPause, FaPlay, FaStepBackward, FaStepForward } from 'react-icons/fa';

import { RegionsPlugin } from 'regionsPlugin';

interface VAPProps {
  session: string;
  audioURL: string;
  data?: VapData;
}

type VapData = {
  p_future_a: number[];
  p_future_b: number[];
  p_now_a: number[];
  p_now_b: number[];
  topk?: number[][];
  topk_p?: number[][];
};

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
  cursor: 'OrangeRed',
};

const PlayControls = ({ isPlaying, goStart, togglePlay, goEnd }) => {
  return (
    <Box m="auto">
      <Button onClick={goStart}>
        <Icon as={FaStepBackward} />
      </Button>
      <Button onClick={togglePlay}>
        {!isPlaying ? <Icon as={FaPlay} /> : <Icon as={FaPause} />}
      </Button>
      <Button onClick={goEnd}>
        <Icon as={FaStepForward} />
      </Button>
    </Box>
  );
};

function VAP(props: VAPProps) {
  const [audioURL, setAudioURL] = useState(props.audioURL);
  const [data, setData] = useState<VapData>(props.data);

  const [id, setId] = useState({
    wavesurfer: `wavesurfer-${props.session}`,
    timeline: `timeline-${props.session}`,
  });
  const [wavesurfer, setWavesurfer] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const initWavesurfer = useCallback(async () => {
    const WaveSurfer = (await import('wavesurfer.js')).default;
    const RegionPlugin = (
      await import('wavesurfer.js/dist/plugin/wavesurfer.regions.min.js')
    ).default;
    const TimelinePlugin = (
      await import('wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js')
    ).default;

    if (!wavesurfer || audioURL !== props.audioURL) {
      setAudioURL(props.audioURL);
      if (wavesurfer) {
        wavesurfer.destroy();
        console.log('Destroyed wavesurfer instance');
      }
      console.log('Creating wavesurfer instance');

      // VAD
      let region = [];
      data.vad_list.map((vads, channel) => {
        const color = channel ? colors.vad.a : colors.vad.b;
        vads.map(([start, end], idx) => {
          // wavesurferInstance.addRegion({
          region.push({
            start: start,
            end: end,
            color: color,
            drag: false,
            resize: false,
            channelIdx: channel,
            id: `ch${channel}_${idx}`,
          });
        });
      });

      const options = {
        container: '#' + id.wavesurfer,
        autoCenter: true,
        cursorColor: 'OrangeRed',
        barWidth: 2,
        barRadius: 2,
        responsive: true,
        height: 100,
        normalize: true,
        hideScrollbar: true,
        splitChannels: true,
        plugins: [
          RegionPlugin.create(),
          TimelinePlugin.create({ container: '#' + id.timeline }),
        ],
        splitChannelsOptions: {
          channelColors: {
            0: { progressColor: colors.prog.ts_a, waveColor: colors.wave.ts_a },
            1: { progressColor: colors.prog.ts_b, waveColor: colors.wave.ts_b },
          },
        },
      };
      const wavesurferInstance = WaveSurfer.create(options);
      wavesurferInstance.load(props.audioURL);

      setWavesurfer(wavesurferInstance);
    }
  }, [wavesurfer, id.wavesurfer, id.timeline, props.audioURL]);

  useEffect(() => {
    initWavesurfer();
    return () => {
      if (wavesurfer) {
        wavesurfer.destroy();
        console.log('wavesurfer.destroy()');
      }
    };
  }, [initWavesurfer]);

  return (
    <Box>
      <Box bg="white" m={2} p={1} border="1px" borderRadius={10}>
        <div id={id.timeline} />
        <Box border="1px" borderColor="black" id={id.wavesurfer} />
      </Box>

      <PlayControls
        isPlaying={isPlaying}
        togglePlay={() => {
          setIsPlaying(!isPlaying);
          wavesurfer.playPause();
        }}
        goStart={() => {
          wavesurfer.seekAndCenter(0);
        }}
        goEnd={() => {
          wavesurfer.seekAndCenter(1);
        }}
      />
    </Box>
  );
}

export default VAP;
