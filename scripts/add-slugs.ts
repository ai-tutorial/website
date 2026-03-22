#!/usr/bin/env tsx
/**
 * Script to add URL-friendly slugs to MDX file frontmatter
 * 
 * This script:
 * 1. Reads docs.json to get all navigation paths
 * 2. For each MDX file, generates a URL-friendly slug from the file path
 * 3. Adds the slug to the frontmatter if not already present
 * 
 * Usage: tsx scripts/add-slugs.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

interface DocsConfig {
    navigation: {
        groups: Array<{
            group: string;
            pages: string[];
        }>;
    };
}

/**
 * Convert a file path to a URL-friendly slug
 * Preserves folder structure, only slugifies the filename
 * Example: "AI Agents/Module Overview" -> "ai-agents/module-overview"
 * Example: "RAG/RAG Evaluation" -> "rag/rag-evaluation"
 */
function pathToSlug(path: string): string {
    const parts = path.split('/');

    const slugifiedParts = parts.map(part =>
        part
            .toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with hyphens
            .replace(/&/g, 'and')            // Replace & with 'and'
            .replace(/[()]/g, '')            // Remove parentheses
            .replace(/_/g, '-')              // Replace underscores with hyphens
            .replace(/-+/g, '-')             // Replace multiple hyphens with single
            .replace(/^-|-$/g, '')           // Remove leading/trailing hyphens
    );

    return slugifiedParts.join('/');
}

/**
 * Extract frontmatter from MDX content
 */
function extractFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { frontmatter: {}, body: content };
    }

    const frontmatterText = match[1];
    const body = match[2];

    const frontmatter: Record<string, any> = {};
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
        }

        frontmatter[key] = value;
    }

    return { frontmatter, body };
}

/**
 * Serialize frontmatter back to YAML format
 */
function serializeFrontmatter(frontmatter: Record<string, any>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(frontmatter)) {
        // Quote values that contain special characters
        const needsQuotes = typeof value === 'string' &&
            (value.includes(':') || value.includes('&') || value.includes('#'));
        const serializedValue = needsQuotes ? `"${value}"` : value;
        lines.push(`${key}: ${serializedValue}`);
    }

    return lines.join('\n');
}

/**
 * Add or update slug in an MDX file
 */
function addSlugToFile(filePath: string, slug: string): boolean {
    const fullPath = join(ROOT_DIR, `${filePath}.mdx`);

    if (!existsSync(fullPath)) {
        console.warn(`⚠️  File not found: ${fullPath}`);
        return false;
    }

    const content = readFileSync(fullPath, 'utf-8');
    const { frontmatter, body } = extractFrontmatter(content);

    // Check if slug needs updating
    if (frontmatter.slug === slug) {
        console.log(`✓ Slug up to date: ${filePath} -> ${slug}`);
        return false;
    }

    // Add or update slug
    const oldSlug = frontmatter.slug;
    frontmatter.slug = slug;

    // Reconstruct file
    const newContent = `---\n${serializeFrontmatter(frontmatter)}\n---\n${body}`;

    writeFileSync(fullPath, newContent, 'utf-8');

    if (oldSlug) {
        console.log(`✅ Updated slug: ${filePath}\n   From: ${oldSlug}\n   To:   ${slug}`);
    } else {
        console.log(`✅ Added slug: ${filePath} -> ${slug}`);
    }

    return true;
}

/**
 * Main function
 */
function main() {
    console.log('🚀 Adding URL-friendly slugs to MDX files...\n');

    // Read docs.json
    const docsConfigPath = join(ROOT_DIR, 'docs.json');
    const docsConfig: DocsConfig = JSON.parse(readFileSync(docsConfigPath, 'utf-8'));

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each navigation group
    for (const group of docsConfig.navigation.groups) {
        console.log(`\n📁 Processing group: ${group.group}`);

        for (const page of group.pages) {
            const slug = pathToSlug(page);
            const wasUpdated = addSlugToFile(page, slug);

            if (wasUpdated) {
                updatedCount++;
            } else {
                skippedCount++;
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Complete! Updated ${updatedCount} files, skipped ${skippedCount} files.`);
    console.log('='.repeat(60));
}

// Run the script
main();
