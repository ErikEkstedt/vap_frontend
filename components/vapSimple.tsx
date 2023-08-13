import React, { useEffect, useState, useCallback, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { WaveSurferOptions } from 'wavesurfer.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.js';

import { Box, Button, Flex, Icon } from '@chakra-ui/react';
import { FaPause, FaPlay, FaStepBackward, FaStepForward } from 'react-icons/fa';

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
  const wavesurfer = useWavesurfer(containerRef, props);

  // Wavesurfer PNow
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

  const setTopk = (currentTime: number) => {
    // Update topk
    const ratio = currentTime / duration;
    const idx = Number((ratio * props.data.topk.length).toFixed(0));
    setTopkCurrent(props.data.topk[idx]);
    setTopkPCurrent(props.data.topk_p[idx]);
  };
  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!wavesurfer) return;
    setCurrentTime(0);
    setIsPlaying(false);

    // console.log(props);
    const subscriptions = [
      wavesurfer.on('play', () => setIsPlaying(true)),
      wavesurfer.on('pause', () => setIsPlaying(false)),
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
          ...options
        });
        const wsPb = WaveSurfer.create({
          container: pRefnb.current,
          peaks: props.data.p_now_b,
          waveColor: COLOR.B.waveColor,
          ...options
        });
        const wsPfa = WaveSurfer.create({
          container: pReffa.current,
          peaks: props.data.p_future_a,
          waveColor: COLOR.A.futWaveColor,
          ...options
        });
        const wsPfb = WaveSurfer.create({
          container: pReffb.current,
          peaks: props.data.p_future_b,
          waveColor: COLOR.B.futWaveColor,
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
        setTopk(0);
      })
    ];

    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, [wavesurfer, topkCurrent, topkPCurrent, props]);

  return (
    <Box m="auto">
      <div ref={containerRef} style={{ minHeight: '20px' }} />
      <Box border="1px" borderColor="black">
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
      <Box border="1px" borderColor="black">
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
      <Topk topk={topkCurrent} topkP={topkPCurrent} />
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
        <p>Seconds played: {currentTime}</p>
      </Box>
    </Box>
  );
};

// <VAP session={currentSession} audioURL={urls.audioURL} data={data} />
const VAP = (props: VAPProps) => {
  // Render the wavesurfer component
  // and a button to load a different audio file
  return (
    <>
      <WaveSurferPlayer
        height={80}
        minPxPerSec={50}
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
        plugins={[Timeline.create()]}
        data={props.data ? props.data : {}}
      />
    </>
  );
};
export default VAP;
