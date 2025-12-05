# Project Rules

1. **No imports in .jsx files within snippets directory**: JSX files in the `snippets/` directory should not contain import statements. All dependencies should be available globally or provided by the environment.

2. **Documenting practical examples**: When documenting practical examples that contrast good and bad approaches, use the following heading hierarchy:
   - Use `### Practical Implication` (h3) as the parent section
   - Use `#### ❌ Antipattern` (h4) for the bad practice example
   - Use `#### ✅ Best Practice` (h4) for the good practice example
   This ensures proper visual hierarchy where the parent section is more prominent than its sub-items.

3. **Code example patterns**: 
   - **Interactive prompt examples**: Use `LLMPlayground` component for interactive examples where users can experiment with prompts and see responses.
   - **Simple code/prompt examples**: Use markdown code blocks (e.g., `python Prompt`) for simple code or prompt examples that don't need interactivity (following the same pattern used in lines 224-235 of `Structured_Prompt_Engineering.mdx`).
   - **Code file examples**: Use `CodeEditor` component for displaying actual code files from the codebase.
