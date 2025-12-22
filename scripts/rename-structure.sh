#!/bin/bash
# Script to rename folders and files to URL-friendly names
# This will match the slugs we created

set -e  # Exit on error

echo "🚀 Renaming folders and files to URL-friendly format..."
echo ""

# Navigate to repo root
cd "$(dirname "$0")/.."

# Rename folders first (must be done before files)
echo "📁 Renaming folders..."

# Context Engineering & Prompt Design
if [ -d "Context_Engineering_&_Prompt_Design" ]; then
  mv "Context_Engineering_&_Prompt_Design" "context-engineering-and-prompt-design"
  echo "  ✅ Context_Engineering_&_Prompt_Design → context-engineering-and-prompt-design"
fi

# AI Agents
if [ -d "AI Agents" ]; then
  mv "AI Agents" "ai-agents"
  echo "  ✅ AI Agents → ai-agents"
fi

# Agent Reliability & Optimization
if [ -d "Agent Reliability & Optimization" ]; then
  mv "Agent Reliability & Optimization" "agent-reliability-and-optimization"
  echo "  ✅ Agent Reliability & Optimization → agent-reliability-and-optimization"
fi

# Multi-Agent Systems & Coordination
if [ -d "Multi-Agent Systems & Coordination" ]; then
  mv "Multi-Agent Systems & Coordination" "multi-agent-systems-and-coordination"
  echo "  ✅ Multi-Agent Systems & Coordination → multi-agent-systems-and-coordination"
fi

# RAG (just lowercase)
if [ -d "RAG" ]; then
  mv "RAG" "rag"
  echo "  ✅ RAG → rag"
fi

echo ""
echo "📄 Renaming files in context-engineering-and-prompt-design..."

cd "context-engineering-and-prompt-design"

[ -f "Module Overview.mdx" ] && mv "Module Overview.mdx" "module-overview.mdx"
[ -f "LLM_Foundamentals.mdx" ] && mv "LLM_Foundamentals.mdx" "llm-foundamentals.mdx"
[ -f "Structured_Prompt_Engineering.mdx" ] && mv "Structured_Prompt_Engineering.mdx" "structured-prompt-engineering.mdx"
[ -f "Advanced Techniques.mdx" ] && mv "Advanced Techniques.mdx" "advanced-techniques.mdx"
[ -f "Prompt Optimization & Testing.mdx" ] && mv "Prompt Optimization & Testing.mdx" "prompt-optimization-and-testing.mdx"
[ -f "Model Selection & Cost Optimization.mdx" ] && mv "Model Selection & Cost Optimization.mdx" "model-selection-and-cost-optimization.mdx"
[ -f "Production Considerations.mdx" ] && mv "Production Considerations.mdx" "production-considerations.mdx"
[ -f "Hands-On Exercise.mdx" ] && mv "Hands-On Exercise.mdx" "hands-on-exercise.mdx"
[ -f "Recap & Resources.mdx" ] && mv "Recap & Resources.mdx" "recap-and-resources.mdx"

cd ..

echo "📄 Renaming files in rag..."

cd "rag"

[ -f "Module Overview.mdx" ] && mv "Module Overview.mdx" "module-overview.mdx"
[ -f "RAG Fundamentals.mdx" ] && mv "RAG Fundamentals.mdx" "rag-fundamentals.mdx"
[ -f "Search Strategy Selection.mdx" ] && mv "Search Strategy Selection.mdx" "search-strategy-selection.mdx"
[ -f "Chunking and Metadata Strategies.mdx" ] && mv "Chunking and Metadata Strategies.mdx" "chunking-and-metadata-strategies.mdx"
[ -f "Working with Unstructured Data.mdx" ] && mv "Working with Unstructured Data.mdx" "working-with-unstructured-data.mdx"
[ -f "RAG Evaluation.mdx" ] && mv "RAG Evaluation.mdx" "rag-evaluation.mdx"
[ -f "Reranking in Practice.mdx" ] && mv "Reranking in Practice.mdx" "reranking-in-practice.mdx"
[ -f "Advanced RAG Patterns.mdx" ] && mv "Advanced RAG Patterns.mdx" "advanced-rag-patterns.mdx"
[ -f "Recap & Resources.mdx" ] && mv "Recap & Resources.mdx" "recap-and-resources.mdx"

cd ..

echo "📄 Renaming files in ai-agents..."

cd "ai-agents"

[ -f "Module Overview.mdx" ] && mv "Module Overview.mdx" "module-overview.mdx"
[ -f "Introduction to AI Agents.mdx" ] && mv "Introduction to AI Agents.mdx" "introduction-to-ai-agents.mdx"
[ -f "Tool Design & Implementation.mdx" ] && mv "Tool Design & Implementation.mdx" "tool-design-and-implementation.mdx"
[ -f "Agent Memory.mdx" ] && mv "Agent Memory.mdx" "agent-memory.mdx"
[ -f "Hands-On Exercise.mdx" ] && mv "Hands-On Exercise.mdx" "hands-on-exercise.mdx"
[ -f "Recap & Resources.mdx" ] && mv "Recap & Resources.mdx" "recap-and-resources.mdx"

cd ..

echo "📄 Renaming files in agent-reliability-and-optimization..."

cd "agent-reliability-and-optimization"

[ -f "Module Overview.mdx" ] && mv "Module Overview.mdx" "module-overview.mdx"
[ -f "Business Rules & Guardrails.mdx" ] && mv "Business Rules & Guardrails.mdx" "business-rules-and-guardrails.mdx"
[ -f "Tool Selection & Optimization.mdx" ] && mv "Tool Selection & Optimization.mdx" "tool-selection-and-optimization.mdx"
[ -f "Hands-On Exercise.mdx" ] && mv "Hands-On Exercise.mdx" "hands-on-exercise.mdx"
[ -f "Recap & Resources.mdx" ] && mv "Recap & Resources.mdx" "recap-and-resources.mdx"

cd ..

echo "📄 Renaming files in multi-agent-systems-and-coordination..."

cd "multi-agent-systems-and-coordination"

[ -f "Module Overview.mdx" ] && mv "Module Overview.mdx" "module-overview.mdx"
[ -f "Multi-Agent with Workflow Orchestration.mdx" ] && mv "Multi-Agent with Workflow Orchestration.mdx" "multi-agent-with-workflow-orchestration.mdx"
[ -f "Multi-Agent with Agent Orchestration.mdx" ] && mv "Multi-Agent with Agent Orchestration.mdx" "multi-agent-with-agent-orchestration.mdx"
[ -f "Agent-to-Agent (A2A) Communication Protocols.mdx" ] && mv "Agent-to-Agent (A2A) Communication Protocols.mdx" "agent-to-agent-a2a-communication-protocols.mdx"
[ -f "Hands-On Exercise.mdx" ] && mv "Hands-On Exercise.mdx" "hands-on-exercise.mdx"
[ -f "Recap & Resources.mdx" ] && mv "Recap & Resources.mdx" "recap-and-resources.mdx"

cd ..

echo ""
echo "============================================================"
echo "✅ Complete! All folders and files renamed."
echo "============================================================"
echo ""
echo "Next step: Run the update-docs-json script to update docs.json"
echo "  npx tsx scripts/update-docs-json.ts"
