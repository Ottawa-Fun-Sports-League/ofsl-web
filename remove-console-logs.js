#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to identify console statements to remove
const removePatterns = [
  // Standard console.log statements
  /^\s*console\.log\s*\(/gm,
  // Debug-style console.log statements
  /^\s*console\.debug\s*\(/gm,
  // Console.log statements that are definitely informational
  /console\.log\s*\(\s*['"`].*initializing|loading|fetching|checking|found|success|completed|signed in|detected|initiated|refreshing|getting|setting|removing|storage|auth event|session|provider|metadata|processing|searching|creating|updating|deleting/i
];

// Patterns to keep (error handling)
const keepPatterns = [
  /console\.error/,
  /console\.warn/,
  // Keep console.log that's part of error handling
  /catch.*\{[\s\S]*?console\.log[\s\S]*?\}/
];

function shouldRemoveLine(line) {
  // Check if we should keep this line
  for (const keepPattern of keepPatterns) {
    if (keepPattern.test(line)) {
      return false;
    }
  }
  
  // Check if we should remove this line
  for (const removePattern of removePatterns) {
    if (removePattern.test(line)) {
      return true;
    }
  }
  
  return false;
}

function processFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return;
  }
  
  // Skip test files
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  const newLines = [];
  let inMultilineConsoleLog = false;
  let multilineDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're starting a console.log statement
    if (shouldRemoveLine(line)) {
      modified = true;
      inMultilineConsoleLog = true;
      multilineDepth = 0;
      
      // Count opening and closing parentheses
      for (const char of line) {
        if (char === '(') multilineDepth++;
        if (char === ')') multilineDepth--;
      }
      
      // If parentheses are balanced, it's a single line console.log
      if (multilineDepth === 0) {
        inMultilineConsoleLog = false;
        continue; // Skip this line
      }
      continue; // Skip the starting line
    }
    
    // If we're in a multiline console.log, check if it ends
    if (inMultilineConsoleLog) {
      for (const char of line) {
        if (char === '(') multilineDepth++;
        if (char === ')') multilineDepth--;
      }
      
      if (multilineDepth === 0) {
        inMultilineConsoleLog = false;
      }
      continue; // Skip lines that are part of console.log
    }
    
    // Keep all other lines
    newLines.push(line);
  }
  
  if (modified) {
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`Cleaned: ${filePath}`);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    // Skip node_modules and other build directories
    if (file === 'node_modules' || file === 'dist' || file === 'build' || file === '.git') {
      continue;
    }
    
    if (stat.isDirectory()) {
      walkDirectory(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

// Start processing from src directory
const srcPath = path.join(__dirname, 'src');
console.log('Removing informational console.log statements from:', srcPath);
walkDirectory(srcPath);
console.log('Done!');