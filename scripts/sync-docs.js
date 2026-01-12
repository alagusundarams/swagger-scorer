const fs = require('fs');
const path = require('path');

// Configuration
const DOCS_DIR = path.join(__dirname, '../docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'docs-data.js');

// Map of keys to filenames (matches FILE_MAP in index.html)
const FILE_MAP = {
    system_overview: 'system_overview.md',
    architecture_diagrams: 'architecture_diagrams.md',
    database_schema: 'database_schema.md', // Added
    user_flows_and_sequences: 'user_flows_and_sequences.md',
    etl_documentation: 'etl_documentation.md',
    enterprise_access_model: 'enterprise_access_model.md',
    platform_connectivity_matrix: 'platform_connectivity_matrix.md',
    backend_documentation: 'backend_documentation.md',
    frontend_documentation: 'frontend_documentation.md',
    project_epics_and_stories: 'project_epics_and_stories.md',
    decision_log: 'decision_log.md',
    access_requirements: 'access_requirements.md'
};

function escapeContent(content) {
    // Escape backticks and generic template literal patterns
    return content
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/`/g, '\\`')   // Escape backticks
        .replace(/\${/g, '\\${'); // Escape interpolation
}

function generateDataFile() {
    console.log('🔄 Syncing Markdown files to docs-data.js...');

    const docsData = {};
    let missingFiles = 0;

    for (const [key, filename] of Object.entries(FILE_MAP)) {
        const filePath = path.join(DOCS_DIR, filename);

        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                docsData[key] = content;
                console.log(`   ✅ Loaded: ${filename}`);
            } else {
                console.warn(`   ⚠️ Missing: ${filename}`);
                docsData[key] = "# 404 Not Found\nFile not found during sync.";
                missingFiles++;
            }
        } catch (err) {
            console.error(`   ❌ Error reading ${filename}:`, err.message);
            docsData[key] = `# Error\nCould not load file: ${err.message}`;
            missingFiles++;
        }
    }

    const fileContent = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Run 'node scripts/sync-docs.js' to update.
 */
window.EMBEDDED_DOCS = {
${Object.entries(docsData).map(([key, content]) => `    ${key}: \`${escapeContent(content)}\``).join(',\n\n')}
};
`;

    fs.writeFileSync(OUTPUT_FILE, fileContent);
    console.log(`\n🎉 Success! Generated ${OUTPUT_FILE}`);
    console.log(`   Size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

generateDataFile();
