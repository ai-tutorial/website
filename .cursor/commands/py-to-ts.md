INSTRUCTIONS:

In the MDX files, there are several code examples written in Python (```python blocks). The goal of this command is to:
1. Find all Python code blocks in MDX files
2. Wrap them in CodeGroup blocks if necessary
3. Translate each Python example to TypeScript
4. Add the TypeScript translation alongside the Python code in the CodeGroup

The command processes all .MDX files in the project. 

IMPORTANT - MANUAL EXECUTION ONLY:
This command will ALWAYS be executed manually by the Cursor AI agent. When invoked:
- The AI agent reads this instruction file and processes all Python blocks manually
- Each Python block is translated using Cursor's built-in AI capabilities
- No external scripts, API calls, or API keys are used or required
- The AI agent directly edits the MDX files to add TypeScript translations
- All translation work is done in-place by the AI agent using its built-in translation capabilities 

MUST PRACTICES:
IT's a MUST that:
- If there is an existing TypeScript example, overwrite it.
- List all pages that will be updated before processing.
- These are code snippets for documentation - keep translations simple. Don't try to make them fully compilable or fill language gaps.
- Don't add unnecessary imports, wrappers, or async functions unless the Python code has them.
- If there are grammar/syntax issues in the Python code, fix them in the translation.
- Keep variable assignments, calculations, and simple operations as-is.

EXAMPLE

<CodeGroup>
```python Python 

response = completion(model="gpt-4o-mini", messages=[{"role": "user", "content": "Hello, how are you?"}])
print(response)

# Output:
# {
#   "choices": [
#     {
#       "message": {
#         "content": "I'm doing great, thank you! How can I help you today?"
#       }
#     }
#   ]
# }
```

```ts TypeScript
import OpenAI from "openai";

const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-4o-mini",
  input: "Hello, how are you?"
});

console.log(response.output[0].content[0].text);

// Output:
// I'm doing great, thank you! How can I help you today?
```
</CodeGroup>