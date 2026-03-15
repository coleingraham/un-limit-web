import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSynthDefStorage } from '../hooks/useSynthDefStorage.ts';
import { useAudioEngine } from '../hooks/useAudioEngine.ts';

export default function SynthDefEditorPage() {
  const navigate = useNavigate();
  const { instrumentSource, masterSource, saveInstrument, saveMaster, resetToDefaults } = useSynthDefStorage();
  const engine = useAudioEngine();

  const handlePreview = useCallback(async () => {
    await engine.initEngine();
    await engine.reloadSynthDefs(instrumentSource, masterSource);

    // Play test pulses: 3 notes at different pitches
    const freqs = [220, 330, 440];
    for (const freq of freqs) {
      const voiceId = await engine.spawnVoice();
      if (voiceId === 0) continue;
      engine.setParam(voiceId, 'freq', freq);
      engine.setParam(voiceId, 'amp', 0.3);
      engine.setParam(voiceId, 'cutoff', freq * 4);
      engine.setGate(voiceId, 1);
      await new Promise((r) => setTimeout(r, 300));
      engine.setGate(voiceId, 0);
      setTimeout(() => engine.freeVoice(voiceId), 500);
      await new Promise((r) => setTimeout(r, 200));
    }
  }, [engine, instrumentSource, masterSource]);

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">SynthDef Editor</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle1">Instrument</Typography>
        <TextField
          multiline
          minRows={6}
          maxRows={12}
          fullWidth
          value={instrumentSource}
          onChange={(e) => saveInstrument(e.target.value)}
          sx={{ fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
        />

        <Typography variant="subtitle1">Master Effect</Typography>
        <TextField
          multiline
          minRows={4}
          maxRows={8}
          fullWidth
          value={masterSource}
          onChange={(e) => saveMaster(e.target.value)}
          sx={{ fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={handlePreview}>
            Preview
          </Button>
          <Button variant="outlined" color="warning" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
