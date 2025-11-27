export default function CodeEmbed({ file, lines, title = 'Code Example' }) {
  // Build the file path with optional line numbers
  // StackBlitz expects: file=src/hello_world.ts:L9-L17 (colon should NOT be encoded)
  let fileParam = encodeURIComponent(file || 'src/hello_world.ts');
  
  if (lines) {
    let lineSuffix = '';
    if (typeof lines === 'string') {
      // Handle string format like "9-17" or "9"
      const lineParts = lines.split('-');
      if (lineParts.length === 2) {
        lineSuffix = `:L${lineParts[0]}-L${lineParts[1]}`;
      } else if (lineParts[0]) {
        lineSuffix = `:L${lineParts[0]}`;
      }
    } else if (lines.start !== undefined) {
      // Handle object format { start: 9, end: 17 }
      if (lines.end !== undefined) {
        lineSuffix = `:L${lines.start}-L${lines.end}`;
      } else {
        lineSuffix = `:L${lines.start}`;
      }
    }
    // Append line numbers without encoding the colon
    fileParam = fileParam + lineSuffix;
  }

  // Build the StackBlitz URL
  const url = `https://stackblitz.com/github/veigap/ai-example-wip?embed=1&file=${fileParam}&view=editor&theme=dark`;

  return (
    <iframe
      src={url}
      style={{ width: "100%", height: "650px", border: "0", borderRadius: "8px", overflow: "hidden" }}
      title={title}
      allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr; clipboard-write">
    </iframe>
  );
}
