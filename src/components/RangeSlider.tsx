import type { CSSProperties } from 'react';

interface RangeSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled?: boolean;
  formatValue?: (val: number) => string;
  onChange: (value: number) => void;
}

export function RangeSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  disabled = false,
  formatValue,
  onChange,
}: RangeSliderProps) {
  const display = formatValue ? formatValue(value) : String(value);
  const valueText = `${display} ${unit}`.trim();

  const sliderStyle = {
    '--control-value': value,
    '--attr-min': min,
    '--attr-max': max,
  } as CSSProperties;

  return (
    <div className="slider-field">
      <div className="slider-header">
        <label htmlFor={id} className="slider-label">
          {label}
        </label>
        <span className="slider-value mono-num">{valueText}</span>
      </div>
      <input
        id={id}
        type="range"
        className="rf-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        style={sliderStyle}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
