#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const [, , rawTarget] = process.argv;

async function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  try {
    const envContent = await fs.readFile(envPath, "utf8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length) {
        const value = valueParts.join("=").trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, "");
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = cleanValue;
        }
      }
    }
  } catch (error) {
    // .env file doesn't exist or can't be read, that's okay
  }
}

async function main() {
  // Try to use Cursor's API key or Anthropic API key
  await loadEnvFile();
  
  const hasApiKey = process.env.CURSOR_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (hasApiKey) {
    console.log("Using Cursor/Anthropic API for translation...");
  } else {
    console.log("No API key found. Using pattern-based translation (limited quality).");
    console.log("Set CURSOR_API_KEY or ANTHROPIC_API_KEY in .env for better translations.");
  }

  const targets = await resolveTargets(rawTarget);
  if (!targets.length) {
    console.log("No .mdx files found to process.");
    return;
  }

  const filesToProcess = [];
  for (const filePath of targets) {
    let fileContents;
    try {
      fileContents = await fs.readFile(filePath, "utf8");
    } catch (error) {
      console.error(`Failed to read file: ${filePath}`);
      throw error;
    }

    const replacements = findPythonBlocks(fileContents);
    if (replacements.length) {
      filesToProcess.push({
        filePath,
        fileContents,
        replacements,
      });
    }
  }

  if (!filesToProcess.length) {
    console.log("No Python code blocks found in any target files.");
    return;
  }

  console.log("Pages to update:");
  filesToProcess.forEach(({ filePath }) => {
    console.log(`- ${filePath}`);
  });

  let totalBlocks = 0;

  for (const file of filesToProcess) {
    const updatedBlocks = await processFile(file);
    totalBlocks += updatedBlocks;
    // Small delay between files to avoid rate limits
    if (filesToProcess.indexOf(file) < filesToProcess.length - 1) {
      await sleep(1000); // 1 second delay between files
    }
  }

  console.log(
    `Translation complete. Updated ${totalBlocks} block(s) across ${filesToProcess.length} file(s).`
  );
}

async function processFile({ filePath, fileContents, replacements }) {
  for (const block of replacements) {
    const tsCode = await translatePythonToTypeScript(block.pythonCode);
    
    // Update Python fence to use "Python" as language name
    const pythonFence = normalizePythonFence(block.pythonFence);
    
    // Create TypeScript fence with "TypeScript" as language name
    const tsFence = "```ts TypeScript";
    const tsBlock = [
      tsFence,
      tsCode.trim(),
      "```",
    ].join("\n");

    block.newContent = [
      "<CodeGroup>",
      pythonFence,
      "",
      tsBlock,
      "</CodeGroup>",
    ].join("\n");
  }

  let updatedContents = fileContents;
  replacements
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, end, newContent }) => {
      updatedContents =
        updatedContents.slice(0, start) +
        newContent +
        updatedContents.slice(end);
    });

  if (updatedContents !== fileContents) {
    await fs.writeFile(filePath, updatedContents, "utf8");
    console.log(
      `Translated ${replacements.length} block(s) in ${filePath}.`
    );
  } else {
    console.log(`No changes were necessary for ${filePath}.`);
  }

  return replacements.length;
}

async function resolveTargets(targetArg) {
  if (targetArg) {
    const absolutePath = path.isAbsolute(targetArg)
      ? targetArg
      : path.resolve(process.cwd(), targetArg);

    let stats;
    try {
      stats = await fs.stat(absolutePath);
    } catch (error) {
      console.error(`Target path does not exist: ${absolutePath}`);
      throw error;
    }

    if (stats.isDirectory()) {
      return findMdxFiles(absolutePath);
    }

    if (stats.isFile() && absolutePath.toLowerCase().endsWith(".mdx")) {
      return [absolutePath];
    }

    console.error(
      "Target must be a directory or an .mdx file."
    );
    process.exit(1);
  }

  return findMdxFiles(process.cwd());
}

async function findMdxFiles(rootDir) {
  const mdxFiles = [];
  const stack = [rootDir];
  const ignored = new Set(["node_modules", ".git", ".next", ".turbo"]);

  while (stack.length) {
    const currentDir = stack.pop();
    let dirents;
    try {
      dirents = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      console.error(`Failed to read directory: ${currentDir}`);
      throw error;
    }

    for (const dirent of dirents) {
      const resolvedPath = path.join(currentDir, dirent.name);

      if (dirent.isDirectory()) {
        if (ignored.has(dirent.name)) {
          continue;
        }
        stack.push(resolvedPath);
        continue;
      }

      if (
        dirent.isFile() &&
        dirent.name.toLowerCase().endsWith(".mdx")
      ) {
        mdxFiles.push(resolvedPath);
      }
    }
  }

  return mdxFiles;
}

function findPythonBlocks(fileContents) {
  const pythonFenceRegex = /```python([^\n]*)\n([\s\S]*?)```/g;
  const replacements = [];
  let match;

  while ((match = pythonFenceRegex.exec(fileContents)) !== null) {
    const pythonBlockStart = match.index;
    const pythonBlockEnd = pythonBlockStart + match[0].length;

    const enclosingGroup = findEnclosingCodeGroup(
      fileContents,
      pythonBlockStart,
      pythonBlockEnd
    );

    const replacementStart =
      enclosingGroup?.start ?? pythonBlockStart;
    const replacementEnd = enclosingGroup
      ? enclosingGroup.end
      : pythonBlockEnd;

    if (
      replacements.some(
        ({ start, end }) =>
          (replacementStart >= start && replacementStart < end) ||
          (replacementEnd > start && replacementEnd <= end)
      )
    ) {
      continue;
    }

    replacements.push({
      start: replacementStart,
      end: replacementEnd,
      pythonFence: match[0].trim(),
      pythonMeta: match[1]?.trim() ?? "",
      pythonCode: match[2].trim(),
    });
  }

  return replacements;
}

function findEnclosingCodeGroup(content, blockStart, blockEnd) {
  const openTag = "<CodeGroup>";
  const closeTag = "</CodeGroup>";

  const lastOpen = content.lastIndexOf(openTag, blockStart);
  const lastClose = content.lastIndexOf(closeTag, blockStart);

  if (lastOpen === -1 || lastOpen < lastClose) {
    return null;
  }

  const closingIndex = content.indexOf(closeTag, blockEnd);
  if (closingIndex === -1) {
    return null;
  }

  return {
    start: lastOpen,
    end: closingIndex + closeTag.length,
  };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translatePythonToTypeScript(pythonCode) {
  // Use Cursor's AI through Anthropic API (which Cursor uses)
  // Check for CURSOR_API_KEY or ANTHROPIC_API_KEY
  const apiKey = process.env.CURSOR_API_KEY || process.env.ANTHROPIC_API_KEY;
  const apiUrl = process.env.CURSOR_API_URL || "https://api.anthropic.com/v1/messages";
  
  if (apiKey) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: "Translate the provided Python code into idiomatic TypeScript using the OpenAI Node SDK (responses API). Respond with TypeScript code only, no explanations or markdown code fences.",
          messages: [
            {
              role: "user",
              content: `Translate this Python code to TypeScript:\n\n${pythonCode}`,
            },
          ],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.content?.[0]?.text;
        if (content) {
          return stripCodeFences(content);
        }
      }
    } catch (error) {
      console.log(`API translation failed: ${error.message}, using pattern-based fallback...`);
    }
  }

  // Fallback: Pattern-based translation
  return await simplePythonToTS(pythonCode);
}

async function simplePythonToTS(pythonCode) {
  // Basic pattern-based translation as fallback
  let tsCode = pythonCode;
  
  // Skip translation for comment-only blocks
  if (pythonCode.trim().startsWith('#') && !pythonCode.includes('=') && !pythonCode.includes('def') && !pythonCode.includes('import')) {
    // Just convert comment syntax
    tsCode = pythonCode.replace(/^#/gm, '//');
    return tsCode;
  }
  
  // Common Python to TypeScript patterns
  tsCode = tsCode.replace(/from openai import/g, 'import OpenAI from "openai";\nconst openai = new OpenAI();');
  tsCode = tsCode.replace(/^import openai$/gm, 'import OpenAI from "openai";\nconst openai = new OpenAI();');
  tsCode = tsCode.replace(/openai\.chat\.completions\.create/g, 'await openai.chat.completions.create');
  tsCode = tsCode.replace(/print\(/g, 'console.log(');
  tsCode = tsCode.replace(/def (\w+)/g, 'async function $1');
  
  // Convert Python comments to JS comments
  tsCode = tsCode.replace(/^(\s*)#/gm, '$1//');
  
  // Wrap in async function if it looks like executable code
  if ((tsCode.includes('=') || tsCode.includes('await') || tsCode.includes('console')) && 
      !tsCode.includes('async function') && !tsCode.includes('export') && !tsCode.includes('class')) {
    const lines = tsCode.split('\n');
    const indented = lines.map(line => '  ' + line).join('\n');
    tsCode = `import OpenAI from "openai";\n\nconst client = new OpenAI();\n\nasync function main() {\n${indented}\n}\n\nmain().catch(console.error);`;
  }
  
  return tsCode;
}

function stripCodeFences(text) {
  const fenceRegex = /^```[a-zA-Z0-9]*\n([\s\S]*?)```$/;
  const match = text.trim().match(fenceRegex);
  if (match) {
    return match[1];
  }
  return text.trim();
}

function normalizePythonFence(pythonFence) {
  // Replace the Python fence meta to use "Python" as language name
  // Example: ```python hello_world.py -> ```python Python
  // Example: ```python -> ```python Python
  return pythonFence.replace(/```python\s*[^\n]*/, "```python Python");
}

function buildTsMeta(pythonMeta) {
  if (!pythonMeta) return "";
  return pythonMeta.replace(/\.py(\b|$)/, ".ts");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

