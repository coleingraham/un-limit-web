import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { useInstrumentConfig } from '../hooks/useInstrumentConfig.tsx';
import { useAudioEngine } from '../hooks/useAudioEngine.ts';
import { useMultiTouch } from '../hooks/useMultiTouch.ts';
import { useVoiceManager } from '../hooks/useVoiceManager.ts';
import { buildStringConfigs } from '../utils/tuning.ts';
import type { TouchState } from '../utils/types.ts';
import ControlPanel from './components/ControlPanel.tsx';
import PlayingArea from './components/PlayingArea.tsx';

export default function InstrumentPage() {
  const { config } = useInstrumentConfig();
  const engine = useAudioEngine();
  const [volume, setVolume] = useState(0.5);
  const [timbre, setTimbre] = useState(0.5);
  const [, setTouchVersion] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const playingAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      if (playingAreaRef.current) {
        setCanvasHeight(playingAreaRef.current.getBoundingClientRect().height);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const strings = useMemo(
    () => canvasHeight > 0 ? buildStringConfigs(config, canvasHeight) : [],
    [config, canvasHeight],
  );

  const voiceManager = useVoiceManager({
    spawnVoice: engine.spawnVoice,
    setParam: engine.setParam,
    setGate: engine.setGate,
    freeVoice: engine.freeVoice,
    getMasterGain: engine.getMasterGain,
    getMasterTimbre: engine.getMasterTimbre,
  });

  const activeTouchesRef = useRef<Set<number>>(new Set());

  const onTouchStart = useCallback(async (touch: TouchState) => {
    activeTouchesRef.current.add(touch.pointerId);
    await engine.initEngine();
    // If the finger was already lifted while we were initialising, don't
    // start a voice that can never be stopped (the "stuck note" problem).
    if (!activeTouchesRef.current.has(touch.pointerId)) return;
    await voiceManager.onTouchStart(touch);
    setTouchVersion((v) => v + 1);
  }, [engine, voiceManager]);

  const onTouchMove = useCallback((touch: TouchState) => {
    voiceManager.onTouchMove(touch);
    setTouchVersion((v) => v + 1);
  }, [voiceManager]);

  const onTouchEnd = useCallback((pointerId: number) => {
    activeTouchesRef.current.delete(pointerId);
    voiceManager.onTouchEnd(pointerId);
    setTouchVersion((v) => v + 1);
  }, [voiceManager]);

  const multiTouch = useMultiTouch({
    strings,
    rangeOctaves: config.freqRangeOctaves,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  });

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    engine.setMasterGain(v);
  }, [engine]);

  const handleTimbreChange = useCallback((v: number) => {
    setTimbre(v);
    engine.setMasterTimbre(v);
  }, [engine]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ControlPanel
        volume={volume}
        timbre={timbre}
        onVolumeChange={handleVolumeChange}
        onTimbreChange={handleTimbreChange}
      />
      <Box ref={playingAreaRef} sx={{ flex: 1, overflow: 'hidden' }}>
        {strings.length > 0 && (
          <PlayingArea
            strings={strings}
            rangeOctaves={config.freqRangeOctaves}
            tuningGuides={config.tuningGuides}
            stringRatio={config.stringRatio}
            touches={multiTouch.getTouches()}
            onPointerDown={multiTouch.handlePointerDown}
            onPointerMove={multiTouch.handlePointerMove}
            onPointerUp={multiTouch.handlePointerUp}
            onPointerCancel={multiTouch.handlePointerCancel}
          />
        )}
      </Box>
    </Box>
  );
}
