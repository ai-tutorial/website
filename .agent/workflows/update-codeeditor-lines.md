---
description: Updates CodeEditor lines in MDX files by finding function line numbers in source typescript files.
---
INSTRUCTIONS:

This command updates CodeEditor components in MDX files by automatically finding function line numbers based on the functionName parameter.

HOW IT WORKS:
1. Takes an MDX file path as input (or processes all MDX files if no path specified)
2. Finds all CodeEditor components in the file(s)
3. For each CodeEditor component:
   - Extracts the `functionName` prop (required)
   - Extracts the `file` prop to determine the source file path
   - Reads the actual source file from the typescript-examples repository
   - Searches for the function by name in the source file
   - Calculates the start and end line numbers of the function
   - Updates the `lines` prop in the CodeEditor component with the correct line numbers

IMPORTANT - MANUAL EXECUTION ONLY:
This command will ALWAYS be executed manually by the AI agent. When invoked:
- The AI agent reads this instruction file and processes CodeEditor components manually
- Function detection is done using pattern matching and code analysis
- The AI agent directly edits the MDX files to update line numbers
- All updates are done in-place by the AI agent

FUNCTION DETECTION RULES:
- Searches for function declarations: `function functionName(...)` or `async function functionName(...)`
- Searches for arrow functions assigned to variables: `const functionName = (...) => {`
- Searches for exported functions: `export function functionName(...)` or `export async function functionName(...)`
- The function name must match exactly (case-sensitive)
- Finds the opening brace `{` as the start line
- Finds the matching closing brace `}` as the end line
- Handles nested braces correctly

FILE PATH RESOLUTION:
- The `file` prop in CodeEditor (e.g., `src/module1/structure_prompt.ts`) is relative to the typescript-examples repository root
- The actual file path will be: `/Users/pveiga/repos/typescript-examples/{file}`
- If the file doesn't exist, the command should report an error and skip that CodeEditor

OUTPUT FORMAT:
- Updates the `lines` prop to use the format: `lines="START-END"` (e.g., `lines="115-141"`)
- Preserves all other props and formatting
- Maintains proper indentation and spacing

MUST PRACTICES:
- Always verify the function exists in the source file before updating
- If multiple functions with the same name exist, use the first match (or the one that makes most sense in context)
- If the function is not found, report a warning but don't break the file
- Preserve all other CodeEditor props (title, repo, height, etc.)
- List all CodeEditor components that will be updated before processing
- Show the old and new line numbers for each update

EXAMPLE:

Before:
```jsx
<CodeEditor 
  file="src/module1/structure_prompt.ts" 
  lines="115-141"
  functionName="useStructuredOutputs"
  title="Structured Prompt Engineering - JSON Schemas"
/>
```

After (if useStructuredOutputs function is at lines 115-142):
```jsx
<CodeEditor 
  file="src/module1/structure_prompt.ts" 
  lines="115-142"
  functionName="useStructuredOutputs"
  title="Structured Prompt Engineering - JSON Schemas"
/>
```

EXECUTION STEPS:
1. Read the specified MDX file(s)
2. Find all CodeEditor components using regex or parsing
3. For each CodeEditor:
   a. Extract functionName and file props
   b. Construct the full file path: /Users/pveiga/repos/typescript-examples/{file}
   c. Read the source file
   d. Search for the function by name
   e. Calculate start and end line numbers
   f. Update the lines prop in the MDX file
4. Report all changes made

ERROR HANDLING:
- If functionName is missing: Skip that CodeEditor and report warning
- If file doesn't exist: Skip that CodeEditor and report error
- If function not found: Skip that CodeEditor and report warning
- If lines prop format is invalid: Still update it with new format
