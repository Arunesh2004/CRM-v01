const fs = require('fs');
const AdmZip = require('adm-zip');

function extractText(filename) {
  try {
    const zip = new AdmZip(filename);
    const entry = zip.getEntry('word/document.xml');
    if (entry) {
      const xml = entry.getData().toString('utf8');
      const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log('=== ' + filename + ' ===\n');
      console.log(text.substring(0, 4000) + '\n\n');
    }
  } catch (e) {
    console.error('Error with ' + filename, e.message);
  }
}

const files = [
  'Achieve this first, Rest later.docx',
  'Goal.docx',
  'Updates From fresh roadmap till now and Future Plan.docx',
  'Recent updates 01 - Date _ 15th September 2026.docx',
  'Recent Updated - 02 Date _ 16th September 2026.docx',
  'Project and Progress details till 12th september 2026.docx',
  'fresh Roadmap.docx',
  'Testing Conditions.docx'
];

files.forEach(extractText);
