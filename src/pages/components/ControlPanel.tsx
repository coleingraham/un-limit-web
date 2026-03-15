import { Box } from '@mui/material';
import RelativeSlider from '../../components/RelativeSlider.tsx';
import NavigationBar from './NavigationBar.tsx';

interface ControlPanelProps {
  volume: number;
  timbre: number;
  onVolumeChange: (v: number) => void;
  onTimbreChange: (v: number) => void;
}

export const CONTROL_PANEL_HEIGHT = 80;

export default function ControlPanel({
  volume,
  timbre,
  onVolumeChange,
  onTimbreChange,
}: ControlPanelProps) {
  return (
    <Box
      sx={{
        height: CONTROL_PANEL_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.5,
        px: 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NavigationBar />
        <Box sx={{ flex: 1 }}>
          <RelativeSlider
            label="Volume"
            value={volume}
            min={0}
            max={1}
            onChange={onVolumeChange}
          />
        </Box>
      </Box>
      <Box sx={{ pl: 5 }}>
        <RelativeSlider
          label="Timbre"
          value={timbre}
          min={0}
          max={1}
          onChange={onTimbreChange}
        />
      </Box>
    </Box>
  );
}
