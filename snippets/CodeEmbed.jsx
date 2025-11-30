export const CodeEmbed = ({ file = 'src/hello_world.ts', lines, title = 'Code Example' }) => {
  // Build the file path with optional line numbers
  // StackBlitz expects: file=src/hello_world.ts:L9-L17 (colon should NOT be encoded)
  const fileParam = encodeURIComponent(file || 'src/hello_world.ts');
  
  let lineSuffix = '';
  if (lines) {
    if (typeof lines === 'string' && lines.trim()) {
      // Handle string format like "9-17" or "9"
      const lineParts = lines.split('-');
      if (lineParts.length === 2) {
        lineSuffix = `:L${lineParts[0].trim()}-L${lineParts[1].trim()}`;
      } else if (lineParts[0] && lineParts[0].trim()) {
        lineSuffix = `:L${lineParts[0].trim()}`;
      }
    } else if (lines && typeof lines === 'object' && lines.start !== undefined) {
      // Handle object format { start: 9, end: 17 }
      if (lines.end !== undefined) {
        lineSuffix = `:L${lines.start}-L${lines.end}`;
      } else {
        lineSuffix = `:L${lines.start}`;
      }
    }
  }

  // Build the StackBlitz URL
  // keepalive=1 prevents the iframe from reloading when navigating between pages
  const url = `https://stackblitz.com/github/veigap/ai-example-wip?embed=1&keepalive=1&file=${fileParam}${lineSuffix}&view=editor&theme=dark`;

  return (
    <iframe
      src={url}
      style={{ width: "100%", height: "650px", border: "0", borderRadius: "8px", overflow: "hidden" }}
      title={title || 'Code Example'}
      allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr; clipboard-write"
    />
  );
};
