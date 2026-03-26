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
- Use markdown code blocks for simple, non-interactive examples

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
