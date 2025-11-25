# Endless Moments - Project Poster

Professional academic poster for the AI Financial Companion (MiniBooks) project.

## Poster Specifications

- **Dimensions**: 1920px × 2700px (perfect poster ratio)
- **Background**: White (rubric requirement ✅)
- **Format**: Web-based, printable, exportable to PDF

## Included Sections

✅ **Title with Team ID** - Project name and team identifier
✅ **Team Members** - All 5 members with roles
✅ **Sponsor Info** - Endless Moments LLC
✅ **ASU Logo** - Arizona State University branding
✅ **Project Overview** - Problem, Solution, Target Users
✅ **Customer Archetypes** - 3 personas with descriptions
✅ **EPICs/Backlog** - 60% completion with progress indicators
✅ **Design & Architecture** - 3-tier system diagram
✅ **Preliminary Results** - 4 key metrics with test data
✅ **Future Work** - 3 sprint phases roadmap
✅ **Video Link** - Demo video placeholder in footer

## Quick Start

### 1. Install Dependencies

```bash
cd poster
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The poster will be available at: **http://localhost:3001**

### 3. Build for Production

```bash
npm run build
npm start
```

## Exporting to PDF

### Option 1: Browser Print
1. Open http://localhost:3001
2. Right-click → Print (or Ctrl/Cmd + P)
3. Select "Save as PDF"
4. Set margins to "None"
5. Enable "Background graphics"
6. Save

### Option 2: Screenshot Tool
Use a browser extension or tool to capture the full page at 1920×2700px

### Option 3: Headless Chrome (Automated)
```bash
# Install puppeteer
npm install puppeteer

# Create export script
node export-pdf.js
```

## Customization

Edit `/app/page.tsx` to modify:
- Team member names and roles
- Project details and metrics
- Color schemes (Tailwind classes)
- Section content

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling and layout

## Project Information Source

All content is extracted from:
- `/README.md` - Main project documentation
- `/frontend/README.md` - Frontend documentation

## Notes

- Poster runs on port 3001 (different from main app on 3000)
- Fully responsive and print-optimized
- No external dependencies for viewing
- Can be deployed to Vercel/Netlify for online viewing

---

**Created by**: Endless Moments Team
**Last Updated**: November 2024
