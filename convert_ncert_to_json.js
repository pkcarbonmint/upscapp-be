#!/usr/bin/env node
/**
 * Script to convert NCERT-Materials.csv to JSON format.
 * Creates a lookup structure with DNA code as key for quick resource access.
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert NCERT-Materials.csv to JSON format.
 * 
 * @param {string} csvFilePath - Path to the input CSV file
 * @param {string} jsonFilePath - Path to the output JSON file
 */
function convertCsvToJson(csvFilePath, jsonFilePath) {
    // Object to store the data with DNA code as key
    const ncertData = {};
    
    try {
        // Read CSV file
        const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
        const lines = csvContent.split('\n');
        
        // Skip the first row (header) and process each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) {
                continue;
            }
            
            // Parse CSV line (simple CSV parsing)
            const row = parseCsvLine(line);
            
            // Skip rows that start with "Book Name" (repeated headers)
            if (row[0] && row[0].trim() === "Book Name") {
                continue;
            }
            
            // Skip if we don't have enough columns
            if (row.length < 3) {
                continue;
            }
            
            // Extract data from row
            const bookName = row[0] ? row[0].trim() : '';
            const chapterName = row[1] ? row[1].trim() : '';
            const dnaCode = row[2] ? row[2].trim() : '';
            
            // Skip if essential data is missing
            if (!bookName || !chapterName || !dnaCode) {
                continue;
            }
            
            // Create entry for this DNA code
            if (!ncertData[dnaCode]) {
                ncertData[dnaCode] = [];
            }
            
            // Add resource information
            const resourceInfo = {
                book_name: bookName,
                chapter_name: chapterName
            };
            
            // Only add if not already present (avoid duplicates)
            const isDuplicate = ncertData[dnaCode].some(existing => 
                existing.book_name === resourceInfo.book_name && 
                existing.chapter_name === resourceInfo.chapter_name
            );
            
            if (!isDuplicate) {
                ncertData[dnaCode].push(resourceInfo);
            }
        }
        
        // Write to JSON file
        fs.writeFileSync(jsonFilePath, JSON.stringify(ncertData, null, 2), 'utf-8');
        
        console.log(`Successfully converted ${csvFilePath} to ${jsonFilePath}`);
        console.log(`Total DNA codes processed: ${Object.keys(ncertData).length}`);
        
        // Print some statistics
        const totalResources = Object.values(ncertData).reduce((sum, resources) => sum + resources.length, 0);
        console.log(`Total resources mapped: ${totalResources}`);
        
        // Show a few examples
        console.log('\nSample entries:');
        const sampleEntries = Object.entries(ncertData).slice(0, 3);
        sampleEntries.forEach(([dnaCode, resources]) => {
            console.log(`  ${dnaCode}: ${resources.length} resource(s)`);
            resources.slice(0, 2).forEach(resource => {
                console.log(`    - ${resource.book_name}: ${resource.chapter_name}`);
            });
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: File ${csvFilePath} not found`);
        } else {
            console.error(`Error processing file: ${error.message}`);
        }
        process.exit(1);
    }
}

/**
 * Simple CSV line parser that handles quoted fields
 * @param {string} line - CSV line to parse
 * @returns {string[]} Array of parsed fields
 */
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

/**
 * Main function to handle command line arguments and execute conversion.
 */
function main() {
    // Default file paths
    let csvFile = '/laex/upscapp-be/study-planner/helios-ts/NCERT-Materials.csv';
    let jsonFile = '/laex/upscapp-be/study-planner/helios-ts/NCERT-Materials.json';
    
    // Allow command line arguments to override default paths
    if (process.argv.length > 2) {
        csvFile = process.argv[2];
    }
    if (process.argv.length > 3) {
        jsonFile = process.argv[3];
    }
    
    // Check if input file exists
    if (!fs.existsSync(csvFile)) {
        console.error(`Error: Input file ${csvFile} does not exist`);
        process.exit(1);
    }
    
    // Convert CSV to JSON
    convertCsvToJson(csvFile, jsonFile);
}

// Run the script if called directly
if (require.main === module) {
    main();
}

module.exports = { convertCsvToJson, parseCsvLine };
