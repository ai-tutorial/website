# Custom Components

## CodeEmbed Component

A reusable React component for embedding interactive code examples (StackBlitz) in MDX files.

### Usage

```mdx
import CodeEmbed from '/snippets/CodeEmbed';

<CodeEmbed 
  file="src/hello_world.ts" 
  lines="9-17"
  theme="dark"
/>
```

### Props

- `file` (required): The file path in the repository (e.g., "src/hello_world.ts")
- `lines` (optional): Line numbers to highlight. Can be:
  - String format: `"9-17"` or `"9"` for a single line
  - Object format: `{ start: 9, end: 17 }`
- `theme` (optional): `"light"` or `"dark"` (default: `"dark"`)
- `view` (optional): `"editor"` or `"preview"` (default: `"editor"`)
- `title` (optional): Title for the iframe (default: "Code Example")
- `height` (optional): Height of the iframe (default: "650px")
- `repo` (optional): GitHub repository in format "owner/repo" (default: "veigap/ai-example-wip")

### Examples

```mdx
<!-- Basic usage -->
<CodeEmbed file="src/hello_world.ts" />

<!-- With line numbers -->
<CodeEmbed file="src/hello_world.ts" lines="9-17" />

<!-- Single line -->
<CodeEmbed file="src/hello_world.ts" lines="9" />

<!-- Custom theme and height -->
<CodeEmbed 
  file="src/example.ts" 
  theme="light"
  height="800px"
/>
```

