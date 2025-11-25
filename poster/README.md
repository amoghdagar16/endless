# Endless Moments - Project Poster

Professional academic poster (1920px × 2700px) for the AI Financial Companion (MiniBooks) project.

## 📐 Poster Specifications

- **Dimensions**: 1920px × 2700px (perfect poster ratio)
- **Background**: White (rubric requirement ✅)
- **Layout**: 3-column design (LEFT | MIDDLE | RIGHT)
- **Format**: Web-based, printable, exportable to PDF

## ✅ Included Sections

### Top Section
- ✅ **Team ID Box** - "Team: CSE XXX" (Arial Black 100pt)
- ✅ **Title** - "ENDLESS MOMENTS LLC - AI ACCOUNTING COMPANION APP" (Arial Black 44pt)
- ✅ **Team & Sponsor Info** - All 5 members + Jay Manwani sponsor (Arial 24pt)

### LEFT Column
1. ✅ **Project Overview** - Problem, Solution, Target Users, Key Impact
2. ✅ **Customer Archetypes** - BUSY SAM, FRAN, GARY personas
3. ✅ **Development Progress** - 60% progress bar + Sprint 4 of 10 checklist

### MIDDLE Column
1. ✅ **System Architecture** - IMAGE 2 placeholder (architecture diagram)
2. ✅ **Application Screenshots** - IMAGE 3-5 placeholders (Login, Onboarding, Dashboard)
3. ✅ **Key Features** - 8-item grid with completion status

### RIGHT Column
1. ✅ **Preliminary Results** - 4 metric cards (90%, 92%, <200ms, 80%)
2. ✅ **Technology Stack** - Frontend, Backend, Database, AI/ML, DevOps
3. ✅ **Key Design Decisions** - 4 major architecture choices
4. ✅ **Next Steps & Roadmap** - Sprint 5-6, 7-8, 9-10 plans
5. ✅ **Security & Quality** - 4 security metrics

### Footer
- ✅ **Contact Info** - Email + GitHub link
- ✅ **Video Presentation** - Placeholder for Zoom link

## 🎨 Color Scheme (Exact)

- **Blue** (#4A90E2) - Headers, main sections
- **Cyan** (#50E3C2) - Customer Archetypes
- **Purple** (#9013FE) - Development Progress, Tech Stack
- **Green** (#7ED321) - Results, Success items
- **Orange** (#FF9800) - Architecture, Design Decisions
- **Dark Gray** (#2C3E50) - Body text

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd poster
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open: **http://localhost:3001**

### 3. Build for Production

```bash
npm run build
npm start
```

## 🖼️ Adding Your Screenshots

The poster has **4 image placeholders** for you to replace:

### Where to Find Placeholders in Code

Edit `/app/page.tsx` and look for these sections:

1. **IMAGE 2** - System Architecture (line ~173)
   - Currently shows 🏗️ emoji placeholder
   - Replace with your architecture diagram screenshot

2. **IMAGE 3** - Login Screen (line ~192)
   - Currently shows 🔐 emoji placeholder
   - Replace with your login/authentication screenshot

3. **IMAGE 4** - Onboarding (line ~201)
   - Currently shows 👋 emoji placeholder
   - Replace with your company onboarding screenshot

4. **IMAGE 5** - Dashboard (line ~210)
   - Currently shows 📊 emoji placeholder
   - Replace with your real-time dashboard screenshot

### How to Replace Placeholders

**Option 1: Using `<img>` tag (Recommended)**
```tsx
// Replace the placeholder div with:
<img
  src="/images/architecture.png"
  alt="System Architecture"
  className="w-full h-96 object-cover rounded-xl border-4 border-orange-400"
/>
```

**Option 2: Using Next.js Image component**
```tsx
import Image from 'next/image'

// Then replace placeholder with:
<Image
  src="/images/architecture.png"
  alt="System Architecture"
  width={600}
  height={400}
  className="rounded-xl border-4 border-orange-400"
/>
```

### Image Requirements

- **Format**: PNG or JPG
- **Location**: Put images in `/poster/public/images/` folder
- **Naming**:
  - `architecture.png` - System architecture diagram
  - `login.png` - Login screen
  - `onboarding.png` - Onboarding flow
  - `dashboard.png` - Dashboard view
- **Size**: Recommended ~800-1200px wide for good quality

### Steps to Add Images

1. Create the images folder:
   ```bash
   mkdir -p /poster/public/images
   ```

2. Copy your screenshots to that folder

3. Edit `/app/page.tsx` and replace the placeholder divs with `<img>` tags

4. Rebuild and view:
   ```bash
   npm run dev
   ```

## 📄 Exporting to PDF

### Option 1: Browser Print (Easiest)
1. Open http://localhost:3001
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (Mac)
3. Select "Save as PDF"
4. **Important Settings:**
   - Margins: **None**
   - Background graphics: **Enabled**
   - Scale: **100%**
5. Save as `endless-poster.pdf`

### Option 2: Screenshot Tool
Use a full-page screenshot extension (e.g., GoFullPage for Chrome)
- Ensure 1920×2700px dimensions
- Save as PNG or PDF

### Option 3: Automated Export
```bash
# Install puppeteer
npm install puppeteer

# Run export script
npm run dev  # In one terminal
node export-pdf.js  # In another terminal
```

## 🎯 Customization Guide

### Update Team ID
Line 11: Change `CSE XXX` to your actual team number

### Update Video Link
Line 422: Replace `[Add your Zoom link here after recording]` with actual link

### Modify Content
All content in `/app/page.tsx`:
- Lines 40-76: Project Overview content
- Lines 78-107: Customer Archetypes
- Lines 109-161: Sprint Progress
- Lines 257-289: Preliminary Results metrics
- Lines 292-324: Tech Stack
- Lines 350-381: Future Work roadmap

### Color Tweaks
All colors use inline styles with hex codes:
- Search for `style={{ color: '#4A90E2' }}` to find and modify

## 🛠️ Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Arial Font** - Specified in rubric

## 📝 Project Info Source

Content extracted from:
- `/README.md` - Main project documentation
- `/frontend/README.md` - Frontend details
- User specifications - Exact requirements document

## 📋 Checklist Before Submission

- [ ] Replace "CSE XXX" with actual team number
- [ ] Add all 4 screenshots (architecture + 3 app screens)
- [ ] Update video presentation link
- [ ] Test print preview (Ctrl+P)
- [ ] Verify white background shows in PDF
- [ ] Check all text is readable
- [ ] Confirm 1920×2700px dimensions
- [ ] Spell check all content
- [ ] Verify all colors match specification

## 🎓 Notes

- Poster runs on **port 3001** (different from main app on 3000)
- Fully print-optimized with exact dimensions
- Uses Arial font family throughout
- White background required per rubric
- Can be deployed to Vercel/Netlify for online viewing
- All sections follow exact specification document

---

**Team**: Endless Moments LLC
**Members**: Amogh Dagar, Ashish Kumar, Satya Neriyanuru, Atiman Rohatgi, Dhruv Bhatt
**Sponsor**: Jay Manwani
**Last Updated**: November 2024
