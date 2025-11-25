// PDF Export Script using Puppeteer
// Usage: node export-pdf.js

const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🚀 Starting PDF export...');

  const browser = await puppeteer.launch({
    headless: 'new'
  });

  const page = await browser.newPage();

  // Set viewport to poster dimensions
  await page.setViewport({
    width: 1920,
    height: 2700,
    deviceScaleFactor: 1
  });

  console.log('📄 Loading poster page...');
  await page.goto('http://localhost:3001', {
    waitUntil: 'networkidle0'
  });

  const outputPath = path.join(__dirname, 'endless-poster.pdf');

  console.log('💾 Generating PDF...');
  await page.pdf({
    path: outputPath,
    width: '1920px',
    height: '2700px',
    printBackground: true,
    margin: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  });

  await browser.close();

  console.log('✅ PDF exported successfully!');
  console.log(`📍 Location: ${outputPath}`);
})();
