INSTRUCTIONS:

In the MDX, there are several code examples that it will be written in python. ```phyton block. The goal of this command if for a page take all the blocks of code, change them to <CodeGroup> block if it's necesary and taking the phyton example translated it to TypeScript. The command will traslate the page open.

The command convert all .MDX of the project.

MUST PRACTICES:
IT's a MUST that:
- If there a example on Typescript to just ovewrite it.
- I want to first list the pages that it will be updated. 

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

async function main() {
  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: "Hello, how are you?"
  });

  console.log(response.output[0].content[0].text);
}

main().catch(console.error);

// Output:
// I'm doing great, thank you! How can I help you today?
```
</CodeGroup>