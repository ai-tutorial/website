---
description: Migrate legacy code blocks or notebook references to CodeEditor components backed by a real TypeScript file.
---
INSTRUCTIONS:

This command migrates "legacy" documentation examples (inline CodeGroups, Python snippets, notebook links) into the standardized `CodeEditor` component format, backed by a real, runnable TypeScript file in the `typescript-examples` repository.

PREREQUISITES:
- Identify the MDX file and the specific section/code block to migrate.
- Identify the target module (e.g., `src/module2`) in `typescript-examples` where the code should live.

EXECUTION STEPS:

1. **Analyze the Source Material**:
   - Read the legacy code (Python/TS) or notebook content.
   - Understand the core concept being demonstrated.
   - Identify necessary dependencies (e.g., `openai`, `chromadb`).

2. **Create the TypeScript Example**:
   - Create a new file in the appropriate `src/moduleX` directory of `typescript-examples`.
   - Name the file using snake_case (e.g., `basic_rag.ts`).
   - Implement the code following strict `.cursorrules` / `.agent/rules.md`:
     - **File Header**: Must include Costs & Safety, Module reference (link to aitutorial.dev), and Why.
     - **Main Function**: Must be the first function, with JSDoc.
     - **Structure**: Use a `main` function for execution flow and Classes/Functions for logic.
     - **Logging**: Clean `console.log` usage (no leading `\n`).
     - **Top-level await**: End the file with `await main();`.

3. **Manage Dependencies**:
   - Check `typescript-examples/package.json`.
   - Install any missing dependencies (e.g., `npm install chromadb`) if required.

4. **Update the MDX File**:
   - Locate the legacy content in the MDX file.
   - Replace the `<CodeGroup>...</CodeGroup>` block (and optional notebook links if replaced) with a `<CodeEditor />` component.
   - **Props**:
     - `file`: Relative path in typescript-examples (e.g., `src/module2/basic_rag.ts`).
     - `lines`: The range of lines to display (usually focusing on the core Class or Function, e.g., `"53-108"`).
     - `functionName`: The name of the primary class or function.
     - `title`: A descriptive title for the editor.

5. **Verify**:
   - Ensure the new TypeScript file runs correctly if possible.
   - Ensure the `CodeEditor` props point to the correct file and lines.

EXAMPLE:

**Legacy (MDX):**
````
## Example
<CodeGroup>
  ```python
  def foo(): ...
  ```
</CodeGroup>
````

**Migrated (MDX):**
````
## Example
<CodeEditor 
  file="src/module2/foo_example.ts" 
  lines="20-40" 
  functionName="Foo"
  title="Foo Implementation"
/>
````
