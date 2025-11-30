import * as React from 'react';

interface StackBlitzProps {
  file: string;
  lines?: string | { start: number; end: number };
  theme?: 'light' | 'dark';
  view?: 'editor' | 'preview';
  title?: string;
  height?: string;
  repo?: string;
}

export default function StackBlitz({
  file,
  lines,
  theme = 'dark',
  view = 'editor',
  title = 'StackBlitz Example',
  height = '650px',
  repo = 'veigap/ai-example-wip',
}: StackBlitzProps) {
  // Build the file path with optional line numbers
  let filePath = file;
  if (lines) {
    if (typeof lines === 'string') {
      // Handle string format like "9-17" or "9"
      const lineParts = lines.split('-');
      if (lineParts.length === 2) {
        filePath = `${file}:L${lineParts[0]}-L${lineParts[1]}`;
      } else {
        filePath = `${file}:L${lines}`;
      }
    } else {
      // Handle object format { start: 9, end: 17 }
      filePath = `${file}:L${lines.start}-L${lines.end}`;
    }
  }

  // Build the StackBlitz URL
  const baseUrl = `https://stackblitz.com/github/${repo}?embed=1`;
  const url = `${baseUrl}&file=${encodeURIComponent(filePath)}&view=${view}&theme=${theme}`;

  return (
    <iframe
      src={url}
      style={{
        width: '100%',
        height: height,
        border: '0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
      title={title}
      allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr; clipboard-write"
    />
  );
}

