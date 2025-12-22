---
description: Migrate a CodeGroup and its preceding Colab link to a CodeEditor component.
---
INSTRUCTIONS:

This command migrates a specific documentation pattern: a section containing a Google Colab link followed immediately by a `<CodeGroup>`. It converts this into a standardized `CodeEditor` component backed by a real, runnable TypeScript file.

PREREQUISITES:
- Identify the MDX file and the specific section to migrate.
- The section must have a link to `colab.research.google.com` followed by a `<CodeGroup>`.

EXECUTION STEPS:

1. **Analyze the Source Material**:
   - Locate the Colab link and the key code logic within the `<CodeGroup>`.
   - **Crucial**: The migration scope includes the Colab link itself. You are replacing the "Colab Link + CodeGroup" pattern.
   - **Source of Truth**: "Check the example linked in the Colab". The CodeGroup usually contains a snippet, but the Colab might have the full runnable context. Use the Colab content to ensure the new TypeScript implementation is complete and correct.
   - **Action**: Download the Colab notebook to analyze the full code:
     1. Open the Colab URL in a browser
     2. Click **File → Download → Download .ipynb**
     3. Use `view_file` to read the downloaded `.ipynb` file
     4. Extract all Python code from the notebook cells
     5. Understand the full logic before porting to TypeScript
   - If you cannot access or download the notebook, ASK the user.
   - Understand the core concept being demonstrated.
   - Identify necessary dependencies (e.g., `openai`, `chromadb`).

2. **Create the TypeScript Example**:
   - **Target Repo**: The code MUST be migrated to the `typescript-examples` repository.
   - Name the file using snake_case (e.g., `hybrid_search_rrf.ts`).
   - Implement the code following strict `.cursorrules` / `.agent/rules.md`:
     - **File Header**: Must include Costs & Safety, Module reference (link to aitutorial.dev), and Why.
     - **Main Function**: Must be the first function, with JSDoc.
     - **Structure**: Use a `main` function for execution flow and Classes/Functions for logic.
     - **Logging**: Clean `console.log` usage (no leading `\n`).
     - **Top-level await**: End the file with `await main();`.

3. **Manage Dependencies**:
   - Check `typescript-examples/package.json`.
   - Install any missing dependencies if required.

4. **Update the MDX File**:
   - Remove the Colab link and the entire `<CodeGroup>...</CodeGroup>` block.
   - Insert a `<CodeEditor />` component in their place.
   - **Props**:
     - `file`: Relative path in typescript-examples.
     - `lines`: The range of lines to display.
     - `functionName`: The name of the primary class or function.
     - `title`: A descriptive title for the editor.

EXAMPLE:

**Legacy (MDX):**
````markdown
[Run in Colab](https://colab.research.google.com/drive/xyz...)

<CodeGroup>
  ```python
  def foo(): ...
  ```
</CodeGroup>
````

**Migrated (MDX):**
````markdown
<CodeEditor 
  file="src/module2/foo_example.ts" 
  lines="20-40" 
  functionName="Foo"
  title="Foo Implementation"
/>
````
