# AI Tutorial Project

This is the documentation site for [aitutorial.dev](https://aitutorial.dev), built with Mintlify. It contains MDX documentation pages and interactive code snippets.

## Project Structure

- `docs/` — MDX documentation pages, organized by module
- `snippets/` — JSX components (CodeEditor, LLMPlayground) embedded in docs
- `scripts/` — Build and maintenance scripts
- `docs.json` — Navigation structure (canonical ordering for all pages)
- `llms.txt` / `llms-full.txt` — LLM-readable documentation indexes
- `.llms-design-guidelines.md` — Rules for generating llms.txt files

## Code Rules

### Snippets Directory (`snippets/`)

- **No import statements** in `.jsx` files. All dependencies (React hooks, etc.) are provided globally by the Mintlify/MDX environment.
- Components: `CodeEditor.jsx` (StackBlitz embeds), `LLMPlayground.jsx` (interactive LLM playground)

### Documentation (MDX files)

- Follow heading hierarchy: `### Practical Implication` > `#### ❌ Antipattern` > `#### ✅ Best Practice`
- Use `LLMPlayground` for interactive prompt examples
- Use `CodeEditor` for displaying code files from the typescript-examples repo
- Use markdown code blocks only for short pseudocode (< 10 lines). All real examples must use `CodeEditor`
- Use `<Quiz>` + `<QuizQuestion>` at the end of content pages (3 options per question, scenario-based)
- Never use `<CodeGroup>` with Python/TypeScript pairs — all examples are TypeScript via CodeEditor

### Overview page layout (every module must follow this)

Each module's `overview.mdx` must have exactly three sections in this order:

```
## Module Overview
3 short paragraphs using this pattern:
- **You've probably noticed:** [hook — the pain point]
- **Here's why that happens:** [root cause]
- **In this module:** [what they'll learn]

## Learning Objectives
Checklist with ✅ emoji. One line per objective. 5-8 objectives.

## Why This Matters
Bullet list of real-world reasons this module matters.
Include concrete data points, case studies, or cost/accuracy numbers.

## What You'll Build
Bullet list of concrete examples/projects built in this module.
Each item: **Bold name** — short description.
```

### Content page layout

Each content page should follow this structure:
- Frontmatter with `title`, `description`, `sidebarTitle`, `icon: book`, `mode: wide`, `slug`
- Imports: `CodeEditor`, `Quiz`/`QuizQuestion` as needed
- **Frontmatter description** must NOT be a copy of the title. Write a meaningful 1-line summary of what the page actually covers.
- **Page intro** (required): 1-3 line paragraph immediately after imports, before the first `## `. Summarizes what the page covers. No heading — just text. Must NOT repeat the title.
- Content sections with `## ` headings
- `CodeEditor` components for all runnable examples
- `<Quiz>` at the end with 2 scenario-based questions (3 options each)

Example page intro:
```
import { CodeEditor } from '/snippets/CodeEditor.jsx';

LLMs are powerful but they only know what they were trained on. This page covers
the core RAG pattern — retrieve, augment, generate — and how to implement it.

## Why RAG?
```

### Style

- CSS is in `style.css` — all component styles use `code-editor-*` or `llm-*` prefixed class names
- CSS variables for theming are defined in `:root` and `[data-theme='light']` selectors
- Support both dark and light themes via `data-theme` attribute

## Common Tasks

### Convert Python examples to TypeScript (`py-to-ts`)

Find Python code blocks in MDX files and add TypeScript translations alongside them in `<CodeGroup>` blocks.

Rules:
- If a TypeScript example already exists, overwrite it
- List all pages that will be updated before processing
- Keep translations simple — these are documentation snippets, not compilable programs
- Don't add unnecessary imports, wrappers, or async functions unless the Python code has them
- Fix grammar/syntax issues from the Python code in the translation

Example output format:
````jsx
<CodeGroup>
```python Python
response = completion(model="gpt-4o-mini", messages=[...])
print(response)
```
```ts TypeScript
const response = await client.responses.create({ model: "gpt-4o-mini", input: "..." });
console.log(response.output[0].content[0].text);
```
</CodeGroup>
````

### Update CodeEditor line numbers (`update-codeeditor-lines`)

**IMPORTANT:** Whenever code in the typescript-examples repo is changed (added, removed, or moved), the `lines` props on all `<CodeEditor>` components referencing that file MUST be updated. Stale line numbers will display the wrong code to readers.

Update `lines` props in CodeEditor components by finding the actual function line numbers in the source files.

Steps:
1. Find all `<CodeEditor>` components in MDX file(s)
2. Extract `functionName` and `file` props
3. Read the source file at `/Users/pveiga/repos/typescript-examples/{file}`
4. Find the function by name (supports `function`, `async function`, `const ... = () =>`, `export function`)
5. Calculate start/end line numbers (handle nested braces)
6. Update the `lines` prop with `"START-END"` format
7. Report old vs new line numbers

If function not found or file missing, report warning and skip.

### Keep recap pages up to date

When adding, removing, or renaming sections in any module page, check the corresponding `recap-and-resources.mdx` for that module. The recap's "Key Takeaways" section should reflect all topics covered in the module pages. Update it to stay in sync.

## Related Repositories

- **Examples repo**: https://github.com/ai-tutorial/typescript-examples — TypeScript code examples referenced by CodeEditor components
- **Live site**: https://aitutorial.dev
