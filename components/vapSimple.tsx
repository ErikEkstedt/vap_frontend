import React, { useEffect, useState, useCallback, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { WaveSurferOptions } from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.js';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.js';

import { Box, Button, Flex, Icon, Spacer } from '@chakra-ui/react';
import { FaPause, FaPlay, FaStepBackward, FaStepForward } from 'react-icons/fa';

import colormap from 'colormap';
import Topk from './topk.js';

const COLOR = {
  A: {
    waveColor: '#328DE1',
    futWaveColor: '#3233E1',
    progressColor: '#1C5080',
    vad: '#328DE120'
  },
  B: {
    waveColor: '#FDA230',
    futWaveColor: '#EC6417',
    progressColor: '#99621D',
    vad: '#FFAD3420'
  },
  cursor: 'OrangeRed'
};

type VapData = {
  topk: number[];
  topk_p: number[];
  p_now_a: number[];
  p_now_b: number[];
  p_fut_a: number[];
  p_fut_b: number[];
};

interface VAPProps {
  session: string;
  audioURL: string;
  data?: VapData;
}

// WaveSurfer hook
const useWavesurfer = (containerRef: any, options: WaveSurferOptions) => {
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer>();
  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      ...options,
      container: containerRef.current,
      normalize: true
    });
    setWavesurfer(ws);

    return () => {
      ws.destroy();
    };
  }, [options, containerRef]);

  return wavesurfer;
};

const WaveSurferPlayer = (props: any) => {
  // Wavesurfer AUDIO
  const containerRef = useRef();
  const specRef = useRef();
  const wavesurfer = useWavesurfer(containerRef, props);

  // VAP probs
  const pRefna = useRef();
  const pRefnb = useRef();
  const pReffa = useRef();
  const pReffb = useRef();
  const [pna, setPna] = useState(null);
  const [pnb, setPnb] = useState(null);
  const [pfa, setPfa] = useState(null);
  const [pfb, setPfb] = useState(null);

  // TopK
  const [topkCurrent, setTopkCurrent] = useState(null);
  const [topkPCurrent, setTopkPCurrent] = useState(null);

  // Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Using useCallback to avoid creating new functions on every render
  // Only create the functions once in the wavesurfer hook
  // On play button click
  const onPlayClick = useCallback(() => {
    if (!wavesurfer) return;
    wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play();
  }, [wavesurfer]);

  const onStartClick = useCallback(() => {
    if (!wavesurfer) return;
    wavesurfer.seekTo(0);
  }, [wavesurfer]);

  const onEndClick = useCallback(() => {
    if (!wavesurfer) return;
    wavesurfer.seekTo(1);
  }, [wavesurfer]);

  // const setTopk = (currentTime: number) => {
  const setTopk = useCallback(
    (currentTime: number) => {
      // Update topk
      if (currentTime === 0) {
        setTopkCurrent(props.data.topk[0]);
        setTopkPCurrent(props.data.topk_p[0]);
      } else {
        const ratio = currentTime / duration;
        const idx = Number((ratio * props.data.topk.length).toFixed(0));
        setTopkCurrent(props.data.topk[idx]);
        setTopkPCurrent(props.data.topk_p[idx]);
      }
    },
    [props.data.topk, props.data.topk_p, duration]
  );

  // Set handle play/pause
  useEffect(() => {
    if (!wavesurfer) return;
    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    wavesurfer.on('play', handlePlay);
    wavesurfer.on('pause', handlePause);
    return () => {
      wavesurfer.un('play', handlePlay);
      wavesurfer.un('pause', handlePause);
    };
  }, [wavesurfer]);

  // handle seeking and audioprocess events here
  useEffect(() => {
    if (!wavesurfer) return;
    const subscriptions = [
      wavesurfer.on('seeking', (currentTime: number) => {
        setTopk(currentTime);
      }),
      wavesurfer.on('audioprocess', (currentTime: number) => {
        setCurrentTime(currentTime);
        if (duration <= 0) {
          return;
        }
        setTopk(currentTime);
      }),
      wavesurfer.on('decode', () => {
        const audioData = wavesurfer.getDecodedData();
        const media = wavesurfer.getMediaElement();
        setDuration(wavesurfer.getDuration());
        setTopk(0);
        if (!audioData) {
          return;
        }
        const options = {
          media: media,
          height: props.height,
          fillParent: true,
          duration: audioData.duration,
          minPxPerSec: props.minPxPerSec,
          normalize: false
        };
        const wsPa = WaveSurfer.create({
          container: pRefna.current,
          peaks: props.data.p_now_a,
          waveColor: COLOR.A.waveColor,
          progressColor: COLOR.A.progressColor,
          ...options
        });
        const wsPb = WaveSurfer.create({
          container: pRefnb.current,
          peaks: props.data.p_now_b,
          waveColor: COLOR.B.waveColor,
          progressColor: COLOR.B.progressColor,
          ...options
        });
        const wsPfa = WaveSurfer.create({
          container: pReffa.current,
          peaks: props.data.p_future_a,
          waveColor: COLOR.A.futWaveColor,
          progressColor: COLOR.A.progressColor,
          ...options
        });
        const wsPfb = WaveSurfer.create({
          container: pReffb.current,
          peaks: props.data.p_future_b,
          waveColor: COLOR.B.futWaveColor,
          progressColor: COLOR.B.progressColor,
          ...options
        });
        setPna(wsPa);
        setPnb(wsPb);
        setPfa(wsPfa);
        setPfb(wsPfb);
        wavesurfer.on('destroy', () => {
          wsPa.destroy();
          wsPb.destroy();
          wsPfa.destroy();
          wsPfb.destroy();
        });
      })
    ];

    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, [wavesurfer, topkCurrent, topkPCurrent]);

  useEffect(() => {
    if (!wavesurfer) return;

    // TIMELINE
    wavesurfer.registerPlugin(
      TimelinePlugin.create({
        height: 40,
        timeInterval: 0.2,
        primaryLabelInterval: 1,
        style: {
          fontSize: '20px',
          color: '#000000'
        }
      })
    );

    // SPECTROGRAM
    const cmOptions = {
      colormap: 'magma', // pick a builtin colormap or add your own
      nshades: 256, // how many divisions
      format: 'float' // "hex" or "rgb" or "rgbaString"
    };
    wavesurfer.registerPlugin(
      Spectrogram.create({
        colorMap: colormap(cmOptions),
        labels: true,
        height: 60,
        frequencyMax: 4000,
        frequencyMin: 60,
        fftSamples: 256,
        splitChannels: true
      })
    );
  }, [wavesurfer]);

  return (
    <Box m="auto">
      <div ref={specRef} />
      <div
        ref={containerRef}
        style={{ minHeight: '20px', background: 'white' }}
      />
      <Box border="1px" marginTop={2} borderColor="black" background="white">
        <div
          ref={pRefna}
          style={{
            minHeight: '20px',
            overflow: 'hidden',
            height: props.height / 2
          }}
        />
        <div
          ref={pRefnb}
          style={{
            minHeight: '20px',
            overflow: 'hidden',
            transform: 'scaleY(-1)',
            height: props.height / 2
          }}
        />
      </Box>
      <Box border="1px" borderColor="black" background="white">
        <div
          ref={pReffa}
          style={{
            minHeight: '20px',
            overflow: 'hidden',
            height: props.height / 2
          }}
        />
        <div
          ref={pReffb}
          style={{
            minHeight: '20px',
            overflow: 'hidden',
            transform: 'scaleY(-1)',
            height: props.height / 2
          }}
        />
      </Box>
      <Flex>
        <Box>
          <Button onClick={onStartClick}>
            <Icon as={FaStepBackward} />
          </Button>{' '}
          <Button onClick={onPlayClick}>
            {isPlaying ? <Icon as={FaPause} /> : <Icon as={FaPlay} />}
          </Button>{' '}
          <Button onClick={onEndClick}>
            <Icon as={FaStepForward} />
          </Button>
          <p>Seconds played: {currentTime.toFixed(2)}</p>
        </Box>
        <Spacer />
        <Topk topk={topkCurrent} topkP={topkPCurrent} />
      </Flex>
    </Box>
  );
};

// <VAP session={currentSession} audioURL={urls.audioURL} data={data} />
const VAP = (props: VAPProps) => {
  // Render the wavesurfer component
  // and a button to load a different audio file
  return (
    <Box m={2}>
      <WaveSurferPlayer
        height={60}
        minPxPerSec={150}
        hideScrollbar={true}
        url={props.audioURL}
        splitChannels={[
          {
            waveColor: COLOR.A.waveColor,
            progressColor: COLOR.A.progressColor
          },
          {
            waveColor: COLOR.B.waveColor,
            progressColor: COLOR.B.progressColor
          }
        ]}
        // plugins={[Timeline.create()]}
        data={props.data ? props.data : {}}
      />
    </Box>
  );
};
export default VAP;
