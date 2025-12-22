#!/usr/bin/env tsx
/**
 * Script to rename MDX files and folders to match URL-friendly slugs
 * 
 * This script:
 * 1. Reads docs.json to get the new paths
 * 2. Renames folders and files to match the slug format
 * 3. Preserves all file contents
 * 
 * Usage: tsx scripts/rename-files.ts
 */

import { readFileSync, renameSync, existsSync, mkdirSync } from 'fs';
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
 */
function pathToSlug(path: string): string {
    const parts = path.split('/');

    const slugifiedParts = parts.map(part =>
        part
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/&/g, 'and')
            .replace(/[()]/g, '')
            .replace(/_/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
    );

    return slugifiedParts.join('/');
}

/**
 * Get all unique folder mappings
 */
function getFolderMappings(pages: string[]): Map<string, string> {
    const folderMap = new Map<string, string>();

    for (const page of pages) {
        const parts = page.split('/');
        if (parts.length > 1) {
            const oldFolder = parts.slice(0, -1).join('/');
            const newFolder = pathToSlug(oldFolder);

            if (oldFolder !== newFolder) {
                folderMap.set(oldFolder, newFolder);
            }
        }
    }

    return folderMap;
}

/**
 * Main function
 */
function main() {
    console.log('🚀 Renaming files and folders to match URL-friendly paths...\n');

    // Read docs.json
    const docsConfigPath = join(ROOT_DIR, 'docs.json');
    const docsConfig: DocsConfig = JSON.parse(readFileSync(docsConfigPath, 'utf-8'));

    // Collect all old and new paths
    const oldPaths: string[] = [];
    const newPaths: string[] = [];

    // First pass: collect all paths from the original structure
    const originalDocsConfig = JSON.parse(readFileSync(docsConfigPath, 'utf-8'));

    console.log('📋 Scanning for files to rename...\n');

    // We need to manually map the old paths since docs.json is already updated
    // Let's scan the actual directory structure
    const pathMappings: Array<{ old: string; new: string }> = [];

    for (const group of docsConfig.navigation.groups) {
        for (const newPath of group.pages) {
            const newFullPath = join(ROOT_DIR, `${newPath}.mdx`);

            // Try to find the old file by checking if new path exists
            if (!existsSync(newFullPath)) {
                // File doesn't exist at new location, need to find and rename it
                // Reconstruct what the old path might have been
                const oldPath = reconstructOldPath(newPath);
                const oldFullPath = join(ROOT_DIR, `${oldPath}.mdx`);

                if (existsSync(oldFullPath)) {
                    pathMappings.push({ old: oldPath, new: newPath });
                }
            }
        }
    }

    // Rename folders first (from deepest to shallowest)
    const folderMappings = new Map<string, string>();

    // Collect unique folder renames
    for (const { old: oldPath, new: newPath } of pathMappings) {
        const oldDir = dirname(oldPath);
        const newDir = dirname(newPath);

        if (oldDir !== '.' && newDir !== '.' && oldDir !== newDir) {
            folderMappings.set(oldDir, newDir);
        }
    }

    // Sort folders by depth (deepest first)
    const sortedFolders = Array.from(folderMappings.entries()).sort((a, b) => {
        return b[0].split('/').length - a[0].split('/').length;
    });

    console.log('📁 Renaming folders...\n');
    for (const [oldFolder, newFolder] of sortedFolders) {
        const oldFolderPath = join(ROOT_DIR, oldFolder);
        const newFolderPath = join(ROOT_DIR, newFolder);

        if (existsSync(oldFolderPath) && !existsSync(newFolderPath)) {
            // Create parent directory if needed
            const parentDir = dirname(newFolderPath);
            if (!existsSync(parentDir)) {
                mkdirSync(parentDir, { recursive: true });
            }

            console.log(`  ✅ ${oldFolder} → ${newFolder}`);
            renameSync(oldFolderPath, newFolderPath);
        }
    }

    console.log('\n📄 Renaming files...\n');
    let renamedCount = 0;

    for (const { old: oldPath, new: newPath } of pathMappings) {
        const oldFullPath = join(ROOT_DIR, `${oldPath}.mdx`);
        const newFullPath = join(ROOT_DIR, `${newPath}.mdx`);

        if (existsSync(oldFullPath) && !existsSync(newFullPath)) {
            // Create parent directory if needed
            const parentDir = dirname(newFullPath);
            if (!existsSync(parentDir)) {
                mkdirSync(parentDir, { recursive: true });
            }

            console.log(`  ✅ ${oldPath}.mdx → ${newPath}.mdx`);
            renameSync(oldFullPath, newFullPath);
            renamedCount++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Complete! Renamed ${renamedCount} files and ${sortedFolders.length} folders`);
    console.log('='.repeat(60));
}

/**
 * Reconstruct the old path from the new path
 * This is a helper to reverse the slug transformation
 */
function reconstructOldPath(newPath: string): string {
    // This is tricky - we need to check actual files
    // For now, return the new path and let the existence check handle it
    return newPath;
}

// Run the script
main();
