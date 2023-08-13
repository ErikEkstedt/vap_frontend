import React, { useEffect, useState, useCallback, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { WaveSurferOptions } from 'wavesurfer.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.js';
// import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import RegionsPlugin from './regionsPlugin';
import ProbsPlugin from './probsPlugin';
import VapProbsPlugin from './vap_probs';
// import Topk from './topk.js';

import { Box, Button, Flex, Icon } from '@chakra-ui/react';
import { FaPause, FaPlay, FaStepBackward, FaStepForward } from 'react-icons/fa';

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
  vad_list: number[][][];
  topk?: number[][];
  topk_p?: number[][];
  p_now?: number[];
};

interface WaveSurferPlayerProps extends WaveSurferOptions {
  vad_list?: number[][][];
  p_now_a?: number[];
  p_now_b?: number[];
  p_future_a?: number[];
  p_future_b?: number[];
}

const COLOR = {
  A: {
    waveColor: '#328DE1',
    progressColor: '#1C5080',
    vad: '#328DE120',
  },
  B: {
    waveColor: '#FDA230',
    progressColor: '#99621D',
    vad: '#FFAD3420',
  },
  cursor: 'OrangeRed',
};

// WaveSurfer hook
const useWavesurfer = (containerRef, options) => {
  const [wavesurfer, setWavesurfer] = useState(null);

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      ...options,
      container: containerRef.current,
    });

    setWavesurfer(ws);

    return () => {
      ws.destroy();
    };
  }, [options, containerRef]);

  return wavesurfer;
};

// Create a React component that will render wavesurfer.
// Props are wavesurfer options.
const WaveSurferPlayer = (props: WaveSurferPlayerProps) => {
  const containerRef = useRef();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const wavesurfer = useWavesurfer(containerRef, props);

  const containerPnowRef = useRef();
  // const wsPnow = useWavesurfer(containerPnowRef, {
  //   height: 100,
  //   peaks: props.p_now_a,
  // });

  const ids = {
    pnA: 'pnow-A',
    pnB: 'pnow-B',
    pfA: 'pfut-A',
    pfB: 'pfut-B',
    vapProbs: 'vap-probs',
  };

  // On play button click
  const onPlayClick = useCallback(() => {
    wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play();
  }, [wavesurfer]);

  const onStartClick = useCallback(() => {
    wavesurfer.seekTo(0);
  }, [wavesurfer]);

  const onEndClick = useCallback(() => {
    wavesurfer.seekTo(1);
  }, [wavesurfer]);

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!wavesurfer) return;
    setCurrentTime(0);
    setIsPlaying(false);

    // SET VAD-LIST REGIONS
    if (props.vad_list) {
      const wsRegions = wavesurfer.registerPlugin(RegionsPlugin.create());
      props.vad_list.map((vads, channel) => {
        const color = channel ? COLOR.B.vad : COLOR.A.vad;
        vads.map(([start, end], idx) => {
          wsRegions.addRegion({
            start: start,
            end: end,
            color: color,
            drag: false,
            resize: false,
            channel: channel,
            id: `ch${channel}_${idx}`,
          });
        });
      });
    }

    // SET VAP-PROBS
    let pp = null;
    if (props.p_now_a && props.p_now_b) {
      // const peaks = [props.p_now_a, props.p_now_b];
      // console.log('peaks: ', props.p_now_a);

      pp = VapProbsPlugin.create({
        container: '#' + ids.vapProbs,
        wavesurfer: wavesurfer,
        probs: props.p_now,
        height: props.height,
        colors: [COLOR.A.waveColor, COLOR.B.waveColor],
      });

      const opt = { barWidth: 500 };
      wavesurfer.registerPlugin(
        ProbsPlugin.create({
          container: '#' + ids.pnA,
          probs: props.p_now_a,
          waveColor: COLOR.A.waveColor,
          progressColor: COLOR.A.progressColor,
          height: props.height,
          ...opt,
        })
      );
      wavesurfer.registerPlugin(
        ProbsPlugin.create({
          container: '#' + ids.pnB,
          probs: props.p_now_b,
          waveColor: COLOR.B.waveColor,
          progressColor: COLOR.B.progressColor,
          height: props.height,
          ...opt,
        })
      );
      wavesurfer.registerPlugin(
        ProbsPlugin.create({
          container: '#' + ids.pfA,
          probs: props.p_future_a,
          waveColor: COLOR.A.waveColor,
          progressColor: COLOR.A.progressColor,
          height: props.height,
          ...opt,
        })
      );
      wavesurfer.registerPlugin(
        ProbsPlugin.create({
          container: '#' + ids.pfB,
          probs: props.p_future_b,
          waveColor: COLOR.B.waveColor,
          progressColor: COLOR.B.progressColor,
          height: props.height,
          ...opt,
        })
      );
    }

    const subscriptions = [
      wavesurfer.on('play', () => setIsPlaying(true)),
      wavesurfer.on('pause', () => setIsPlaying(false)),
      wavesurfer.on('timeupdate', (currentTime) => setCurrentTime(currentTime)),
    ];

    return () => {
      subscriptions.forEach((unsub) => unsub());
      if (pp) {
        pp.destroy();
      }
    };
  }, [wavesurfer]);

  return (
    <Box m="auto">
      <div ref={containerRef} style={{ minHeight: '120px' }} />
      <Box border="1px" borderColor="black" mt={1} pt={1} pb={1}>
        <Box overflow="hidden" h={props.height / 2} id={ids.pnA} />
        <Box
          overflow="hidden"
          transform="scaleY(-1)"
          h={props.height / 2}
          id={ids.pnB}
        />
      </Box>
      <Box id={ids.vapProbs} m="auto" borderColor="white" border="1px" />

      <Box>
        <Button onClick={onStartClick}>
          <Icon as={FaStepBackward} />
        </Button>
        <Button onClick={onPlayClick}>
          {!isPlaying ? <Icon as={FaPlay} /> : <Icon as={FaPause} />}
        </Button>
        <Button onClick={onEndClick}>
          <Icon as={FaStepForward} />
        </Button>
        <p>Seconds played: {currentTime}</p>
      </Box>
    </Box>
  );
};

// Another React component that will render two wavesurfers
const VAP = (props: VAPProps) => {
  console.log(props.data);
  // Render the wavesurfer component
  // and a button to load a different audio file
  return (
    <>
      <WaveSurferPlayer
        height={100}
        url={props.audioURL}
        splitChannels={[
          {
            waveColor: COLOR.A.waveColor,
            progressColor: COLOR.A.progressColor,
          },
          {
            waveColor: COLOR.B.waveColor,
            progressColor: COLOR.B.progressColor,
          },
        ]}
        plugins={[Timeline.create()]}
        vad_list={props.data?.vad_list}
        p_now_a={props.data?.p_now_a}
        p_now_b={props.data?.p_now_b}
        p_now={props.data?.p_now}
      />
    </>
  );
};
export default VAP;
