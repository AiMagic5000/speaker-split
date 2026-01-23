# Speaker Split - Webflow Landing Page Package

Complete landing page package for Speaker Split with comprehensive SEO/AEO schema markup, all optimized for Webflow's 50,000 character limit per HTML embed.

## Quick Start

### For Webflow Head Code (Page Settings > Custom Code > Head Code)

Add these in order:
1. `section-1-head-meta.html` (~25,000 chars) - Title, meta tags, primary schemas
2. `section-2-faq-schema.html` (~18,000 chars) - Comprehensive FAQ schema (25 questions)

### For Webflow Page Body (HTML Embed blocks)

Add these sections in order using HTML Embed elements:
1. `section-3-hero.html` (~12,000 chars) - Hero section with CTA
2. `section-4-app-embed.html` (~8,000 chars) - Native iframe embed of the app
3. `section-5-features.html` (~16,000 chars) - Features grid
4. `section-6-how-it-works.html` (~12,000 chars) - Step-by-step guide
5. `section-7-use-cases.html` (~12,000 chars) - Use cases + testimonial
6. `section-8-faq-visual.html` (~14,000 chars) - Interactive FAQ accordion
7. `section-9-cta-footer.html` (~8,000 chars) - Final CTA section

## File Summary

| File | Character Count | Purpose |
|------|-----------------|---------|
| section-1-head-meta.html | ~25,000 | Head code with SEO meta tags and primary schemas |
| section-2-faq-schema.html | ~18,000 | Comprehensive FAQ schema (25 Q&As) |
| section-3-hero.html | ~12,000 | Hero section with title, description, CTA |
| section-4-app-embed.html | ~8,000 | Native iframe embed of Speaker Split app |
| section-5-features.html | ~16,000 | 6 feature cards + highlight section |
| section-6-how-it-works.html | ~12,000 | 4-step process visualization |
| section-7-use-cases.html | ~12,000 | 8 use cases + featured testimonial |
| section-8-faq-visual.html | ~14,000 | Interactive FAQ accordion (8 questions) |
| section-9-cta-footer.html | ~8,000 | Final CTA with trust badges and stats |

**All files are under 50,000 characters** - safe for Webflow HTML embeds.

## Schema Markup Included

### Primary Schemas (section-1)
- **SoftwareApplication** - Complete app metadata, features, ratings
- **WebApplication** - Web-specific application schema
- **Organization** - Start My Business Inc. details
- **BreadcrumbList** - Navigation path
- **HowTo** - 7-step guide with tools and supplies
- **Speakable** - Voice assistant optimization
- **ItemList** - Feature list
- **Product** - Product schema with reviews for rich snippets

### FAQ Schema (section-2)
- **FAQPage** - 25 comprehensive Q&A pairs
- **QAPage** - Alternative Q&A format for search engines

## SEO/AEO Meta Tags

The head code includes:
- Primary meta tags (title, description, keywords)
- Open Graph tags for Facebook/LinkedIn
- Twitter Card tags
- AI/LLM optimization tags:
  - `ai-content-declaration`
  - `llm-description`
  - `ai-summary`
  - `ai-keywords`
  - `ai-category`
  - `context-for-llms`
- Preconnect hints for performance
- Canonical URL

## Page Configuration

**Recommended Webflow Settings:**
- **Page Title:** Speaker Split - Free AI Audio Transcription & Speaker Separation Tool | Start My Business
- **Slug:** `/speaker-split`
- **Meta Description:** (Set in section-1, but also add to Webflow settings)
- **OG Image:** Upload `speaker-split-og.png` (1200x630px)

## Color Palette Used

All colors are hardcoded (no CSS variables) per Webflow embed requirements:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Navy | #1E3A5F | Backgrounds, headers |
| Gold | #D4A84B | Accents, CTAs |
| Dark | #0f172a | Deep backgrounds |
| Blue | #3b82f6 | Feature accents |
| Green | #22c55e | Success, checkmarks |
| Purple | #a855f7 | Feature accents |
| Cyan | #06b6d4 | Feature accents |
| White | #ffffff | Text |

## Features

- **100% Responsive** - Works on desktop, tablet, and mobile
- **No External Dependencies** - All styles are embedded
- **Webflow Safe** - All colors hardcoded with `!important` where needed
- **Interactive Elements** - FAQ accordion with JavaScript
- **Performance Optimized** - Lazy loading iframe, preconnect hints
- **Accessibility Ready** - Proper heading hierarchy, ARIA-friendly

## Customization

To customize:
1. Replace `https://speakersplit.startmybusiness.us` with your app URL
2. Update organization details in schemas
3. Replace image URLs with your actual image assets
4. Modify colors by searching and replacing hex values

## Image Assets Needed

Upload these images to Webflow:
- `speaker-split-og.png` (1200x630) - Social sharing image
- `speaker-split-screenshot-1.png` - Upload interface screenshot
- `speaker-split-screenshot-2.png` - Transcript view screenshot
- `speaker-split-screenshot-3.png` - Document generation screenshot

## Testing

After publishing:
1. Test with [Google Rich Results Test](https://search.google.com/test/rich-results)
2. Test with [Schema Markup Validator](https://validator.schema.org/)
3. Test Open Graph with [Facebook Debugger](https://developers.facebook.com/tools/debug/)
4. Test Twitter Card with [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## Support

For issues or questions, contact support@startmybusiness.us
