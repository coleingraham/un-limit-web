import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  FormControlLabel, Switch,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useInstrumentConfig } from '../hooks/useInstrumentConfig.tsx';

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    config,
    setStringRatio,
    setFundamentalFreq,
    setNumStrings,
    setFreqRangeOctaves,
    setMonoMode,
    addTuningGuide,
    removeTuningGuide,
    resetToDefaults,
  } = useInstrumentConfig();

  const [newGuideNum, setNewGuideNum] = useState('');
  const [newGuideDen, setNewGuideDen] = useState('');

  const handleAddGuide = () => {
    const num = parseInt(newGuideNum);
    const den = parseInt(newGuideDen);
    if (num > 0 && den > 0 && num !== den) {
      addTuningGuide({ ratio: [num, den], label: `${num}:${den}` });
      setNewGuideNum('');
      setNewGuideDen('');
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 500, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Settings</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            label="String Ratio (num)"
            type="number"
            size="small"
            value={config.stringRatio[0]}
            onChange={(e) => setStringRatio([parseInt(e.target.value) || 1, config.stringRatio[1]])}
            sx={{ flex: 1 }}
          />
          <Typography>:</Typography>
          <TextField
            label="String Ratio (den)"
            type="number"
            size="small"
            value={config.stringRatio[1]}
            onChange={(e) => setStringRatio([config.stringRatio[0], parseInt(e.target.value) || 1])}
            sx={{ flex: 1 }}
          />
        </Box>

        <TextField
          label="Fundamental Frequency (Hz)"
          type="number"
          size="small"
          value={config.fundamentalFreq}
          onChange={(e) => setFundamentalFreq(parseFloat(e.target.value) || 55)}
        />

        <TextField
          label="Number of Strings"
          type="number"
          size="small"
          value={config.numStrings}
          onChange={(e) => setNumStrings(Math.max(1, Math.min(8, parseInt(e.target.value) || 4)))}
        />

        <TextField
          label="Frequency Range (octaves)"
          type="number"
          size="small"
          value={config.freqRangeOctaves}
          onChange={(e) => setFreqRangeOctaves(Math.max(1, Math.min(8, parseFloat(e.target.value) || 4)))}
        />

        <FormControlLabel
          control={
            <Switch
              checked={config.monoMode ?? false}
              onChange={(e) => setMonoMode(e.target.checked)}
            />
          }
          label="Mono (one voice per string)"
        />

        <Typography variant="subtitle1" sx={{ mt: 2 }}>Tuning Guides</Typography>

        <List dense>
          {config.tuningGuides.map((guide, i) => (
            <ListItem key={i}>
              <ListItemText primary={guide.label} />
              <ListItemSecondaryAction>
                <IconButton edge="end" size="small" onClick={() => removeTuningGuide(i)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            label="Num"
            type="number"
            size="small"
            value={newGuideNum}
            onChange={(e) => setNewGuideNum(e.target.value)}
            sx={{ width: 80 }}
          />
          <Typography>:</Typography>
          <TextField
            label="Den"
            type="number"
            size="small"
            value={newGuideDen}
            onChange={(e) => setNewGuideDen(e.target.value)}
            sx={{ width: 80 }}
          />
          <Button variant="outlined" size="small" onClick={handleAddGuide}>
            Add
          </Button>
        </Box>

        <Button variant="outlined" color="warning" onClick={resetToDefaults} sx={{ mt: 2 }}>
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
}
