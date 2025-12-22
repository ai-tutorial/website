#!/usr/bin/env tsx
/**
 * Script to update docs.json navigation paths to match URL-friendly slugs
 * 
 * This script:
 * 1. Reads docs.json
 * 2. For each page path, converts it to the URL-friendly format
 * 3. Updates docs.json with the new paths
 * 
 * Usage: tsx scripts/update-docs-json.ts
 */

import { readFileSync, writeFileSync } from 'fs';
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
    [key: string]: any;
}

/**
 * Convert a file path to a URL-friendly slug
 * Preserves folder structure, only slugifies each part
 * Example: "AI Agents/Module Overview" -> "ai-agents/module-overview"
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
 * Main function
 */
function main() {
    console.log('🚀 Updating docs.json with URL-friendly paths...\n');

    // Read docs.json
    const docsConfigPath = join(ROOT_DIR, 'docs.json');
    const docsConfig: DocsConfig = JSON.parse(readFileSync(docsConfigPath, 'utf-8'));

    let updatedCount = 0;

    // Process each navigation group
    for (const group of docsConfig.navigation.groups) {
        console.log(`📁 Processing group: ${group.group}`);

        const updatedPages: string[] = [];

        for (const page of group.pages) {
            const newPath = pathToSlug(page);

            if (newPath !== page) {
                console.log(`  ✅ ${page} → ${newPath}`);
                updatedCount++;
            } else {
                console.log(`  ✓ ${page} (unchanged)`);
            }

            updatedPages.push(newPath);
        }

        group.pages = updatedPages;
    }

    // Write updated docs.json
    writeFileSync(
        docsConfigPath,
        JSON.stringify(docsConfig, null, 2) + '\n',
        'utf-8'
    );

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Complete! Updated ${updatedCount} paths in docs.json`);
    console.log('='.repeat(60));
}

// Run the script
main();
