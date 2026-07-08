import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

console.log('Starting Google Apps Script single-file build...');

if (!fs.existsSync(indexPath)) {
  console.error('Error: index.html not found in dist/. Please run build first.');
  process.exit(1);
}

let htmlSource = fs.readFileSync(indexPath, 'utf8');

// Remove modulepreloads
htmlSource = htmlSource.replace(/<link rel="modulepreload"[^>]*>/gi, '');

// Inline CSS
const cssRegex = /<link rel="stylesheet" href="([^"]+\.css)">/gi;
htmlSource = htmlSource.replace(cssRegex, (match, cssFileMatch) => {
  const cssFilePath = path.join(distDir, cssFileMatch);
  if (fs.existsSync(cssFilePath)) {
    const cssContent = fs.readFileSync(cssFilePath, 'utf8');
    console.log(`Inlined CSS: ${cssFileMatch}`);
    return `<style>\n${cssContent}\n</style>`;
  } else {
    console.warn(`Warning: CSS file not found at ${cssFilePath}`);
    return match;
  }
});

// Inline JS scripts - handles both module and nomodule tags
const scriptRegex = /<script [^>]*src="([^"]+\.js)"[^>]*><\/script>/gi;
htmlSource = htmlSource.replace(scriptRegex, (match, jsFileMatch) => {
  const jsFilePath = path.join(distDir, jsFileMatch);
  const isModule = match.includes('type="module"');
  
  if (fs.existsSync(jsFilePath)) {
    let jsContent = fs.readFileSync(jsFilePath, 'utf8');
    
    // Some basic replacements if needed by GAS sandbox
    jsContent = jsContent.replace(/<\/script>/gi, '<\\/script>');
    
    console.log(`Inlined JS: ${jsFileMatch}`);
    return `<script${isModule ? ' type="module"' : ''}>\n${jsContent}\n</script>`;
  } else {
    console.warn(`Warning: JS file not found at ${jsFilePath}`);
    return match;
  }
});

// Write the final payload to index.html (or gas-index.html)
const outputPath = path.join(distDir, 'index.html');
fs.writeFileSync(outputPath, htmlSource);
console.log('Successfully embedded JS and CSS into dist/index.html');
