import { useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';

interface RelativeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export default function RelativeSlider({ label, value, min, max, onChange }: RelativeSliderProps) {
  const dragRef = useRef<{ startX: number; startValue: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startValue: value };
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;

    const width = containerRef.current.getBoundingClientRect().width;
    const dx = e.clientX - dragRef.current.startX;
    const range = max - min;
    const delta = (dx / width) * range;
    const newValue = Math.max(min, Math.min(max, dragRef.current.startValue + delta));
    onChange(newValue);
  }, [min, max, onChange]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const fillPercent = ((value - min) / (max - min)) * 100;

  return (
    <Box
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      sx={{
        position: 'relative',
        height: 32,
        bgcolor: 'rgba(255,255,255,0.08)',
        borderRadius: 1,
        overflow: 'hidden',
        cursor: 'ew-resize',
        touchAction: 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${fillPercent}%`,
          bgcolor: 'primary.dark',
          transition: 'none',
        }}
      />
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          top: '50%',
          left: 8,
          transform: 'translateY(-50%)',
          color: 'text.secondary',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
