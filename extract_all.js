const fs = require('fs');
const AdmZip = require('adm-zip');
const path = require('path');

function extractDocx(filename) {
  try {
    const zip = new AdmZip(filename);
    const entry = zip.getEntry('word/document.xml');
    if (entry) {
      const xml = entry.getData().toString('utf8');
      const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      fs.writeFileSync(filename + '.txt', text);
      console.log('Extracted', filename);
    }
  } catch (e) {
    console.error('Error with ' + filename, e.message);
  }
}

const files = fs.readdirSync('.').filter(f => f.endsWith('.docx'));
files.forEach(extractDocx);

// Try to extract PDFs if pdf-parse is available
try {
  const pdfParse = require('pdf-parse');
  const pdfs = fs.readdirSync('.').filter(f => f.endsWith('.pdf'));
  pdfs.forEach(async (f) => {
    const dataBuffer = fs.readFileSync(f);
    const data = await pdfParse(dataBuffer);
    fs.writeFileSync(f + '.txt', data.text);
    console.log('Extracted', f);
  });
} catch(e) {
  console.log('pdf-parse not available', e.message);
}
