---
description: Convert a <CodeGroup> block into Clean Pseudocode (inspired by TypeScript)
---

INSTRUCTIONS:

This workflow transforms a `<CodeGroup>` block (often containing Python or other languages) into a single, clean **TypeScript-inspired Pseudocode** block.

PREREQUISITES:
- Locate the `<CodeGroup>` in the MDX file.
- Understand the core logic it demonstrates.

EXECUTION STEPS:

1. **Analyze the CodeGroup**:
   - Read the existing code snippets within the `<CodeGroup>`.
   - Identify the main algorithmic steps and logic.

2. **Generate Pseudocode**:
   - **Syntax**: Use TypeScript-inspired syntax (types, arrows, proper indentation).
   - **Style**:
     - Focus on **clarity** and **readability**.
     - Remove boilerplate, imports, and error handling unless critical to understanding.
     - Use descriptive variable names.
     - Abstract complex implementations into high-level function calls (e.g., `await retrieveDocuments()` instead of 20 lines of HTTP code).
   - **Format**:
     - Use ` ```ts Pseudocode ` block for syntax highlighting.
     - This creates a labeled block that indicates the content is conceptual.

3. **Update the MDX**:
   - **Remove**: The entire `<CodeGroup>...</CodeGroup>` block.
   - **Insert**: The new pseudocode block.

EXAMPLE:

**Legacy (MDX):**
````markdown
<CodeGroup>
  ```python
  def process_data(data):
      if not data: return None
      results = []
      for item in data:
          results.append(expensive_op(item))
      return results
  ```
</CodeGroup>
````

**Migrated (MDX):**
````markdown
```ts Pseudocode
function processData(items: Item[]): Result[] {
  if (isEmpty(items)) return null;

  const results = [];
  
  for (const item of items) {
    // High-level abstraction of logic
    const result = await performExpensiveOperation(item);
    results.push(result);
  }

  return results;
}
```
````
