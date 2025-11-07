# Punjab Handicrafts Marketplace - Design Guidelines

## Design Approach

**Reference-Based with Cultural Authenticity**: Drawing inspiration from Etsy's artisan marketplace aesthetics and Shopify's vendor-friendly interfaces, enhanced with traditional Pakistani craft motifs and patterns. The design celebrates Punjab's rich heritage while maintaining modern e-commerce functionality.

## Core Design Principles

1. **Cultural Celebration**: Incorporate subtle geometric patterns inspired by traditional crafts (Phulkari embroidery motifs, block print borders) as decorative elements
2. **Authenticity First**: Showcase craftsmanship through high-quality product imagery with generous whitespace
3. **Trust & Transparency**: Clear GI branding badges, vendor profiles, and district tags build credibility
4. **Accessible Commerce**: Simple, intuitive interfaces for artisans with varying digital literacy

## Typography

**Font Families**:
- Primary: Inter or Poppins (clean, multilingual support for Urdu/English)
- Headings: 600-700 weight
- Body: 400-500 weight
- Accents: 500 weight for CTAs and labels

**Hierarchy**:
- Hero Headlines: 3xl-5xl (48-64px)
- Section Titles: 2xl-3xl (36-48px)
- Product Titles: lg-xl (18-24px)
- Body Text: base (16px)
- Captions/Meta: sm (14px)

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16, 24 (p-4, m-8, gap-6, etc.)

**Grid System**:
- Product Cards: grid-cols-1 md:grid-cols-3 lg:grid-cols-4
- Featured Districts: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Vendor Dashboard: Two-column layout (sidebar + main content)
- Admin Panel: Three-column layout (nav, content, quick stats)

**Container Widths**:
- Full layouts: max-w-7xl
- Content sections: max-w-6xl
- Forms: max-w-2xl
- Product details: max-w-4xl

## Component Library

### Navigation
- **Main Header**: Sticky navigation with logo, district dropdown, GI brand filter, search bar, cart icon, user menu
- **Breadcrumbs**: District > GI Brand > Category > Product
- **Vendor Dashboard Sidebar**: Collapsible menu with icons for Products, Orders, Analytics, Messages, Settings

### Product Components
- **Product Cards**: Image (4:3 ratio), title, district badge, GI tag, price, vendor name, hover reveal (quick view)
- **District Badges**: Rounded pills with subtle borders, district name + icon
- **GI Brand Tags**: Distinctive styling (border-l-4 accent) to highlight authenticity

### Forms & Inputs
- **Input Fields**: Rounded borders (rounded-lg), focus states with ring, helper text below
- **File Upload**: Drag-drop zone with preview thumbnails for multiple images
- **Dropdowns**: Custom styled selects for district/GI selection with searchable options
- **Variant Builder**: Dynamic add/remove rows for product variants (size, color)

### Data Display
- **Order Cards**: Timeline view showing status progression (Ordered → Processing → Shipped → Delivered)
- **Analytics Charts**: Simple bar/line charts using Chart.js with clear labels
- **Inventory Tables**: Sortable columns, stock level indicators (green/yellow/red dots)

### Shopping Experience
- **Cart Drawer**: Slide-in panel from right, product thumbnails, quantity controls, subtotal
- **Checkout Steps**: Multi-step progress indicator, payment method cards (JazzCash, Easypaisa, COD, Card)
- **Product Gallery**: Main image with thumbnail strip below, zoom on click

### Vendor Portal
- **Store Header**: Cover image area, store logo overlay, stats bar (rating, products, sales)
- **Product Management**: List view with inline edit, bulk actions, status toggles
- **Order Dashboard**: Kanban-style columns for different order statuses

### Admin Panel
- **Moderation Queue**: Card layout with approve/reject actions, product preview
- **User Management**: Table with role badges, actions dropdown, search/filter
- **Analytics Overview**: 4-column stat cards (total sales, active vendors, orders, revenue)

### Messaging
- **Inbox**: Two-panel layout (conversation list + message thread)
- **Message Cards**: Sender avatar, timestamp, message preview, unread indicator

## Images

**Hero Section**: Full-width banner (h-96 lg:h-[32rem]) showcasing Punjab handicrafts collage - artisans at work, finished products, traditional tools. Overlaid with blurred-background button for "Explore GI Crafts" centered or bottom-aligned.

**District Landing Pages**: Each district gets a hero image representing its signature craft (e.g., Multan blue pottery workshop, Bahawalpur Ralli quilts, Lahore jewelry making).

**Product Images**: 4:3 or square ratio, white/neutral backgrounds preferred for consistency, minimum 800x800px, support for 5-8 images per product.

**Vendor Profile**: Optional cover photo (16:9) with circular logo overlay, imagery should represent their craft specialty.

**About/Story Pages**: Documentary-style images of artisans, craft processes, cultural heritage sites.

## Special Considerations

**Bilingual Support**: Design accommodates Urdu RTL text alongside English LTR, flexible text containers.

**Cultural Patterns**: Use traditional motifs sparingly as:
- Section dividers (thin decorative borders)
- Background watermarks (very low opacity)
- Badge/tag embellishments
- Never overwhelming the product imagery

**Mobile-First Vendor Tools**: Large touch targets (min 44px), simplified forms with progressive disclosure, single-column layouts on mobile.

**Trust Indicators**: 
- Verified vendor badges
- GI authenticity certificates (modal on click)
- Secure payment badges in footer
- Customer review stars

**Accessibility**: WCAG AA compliance, sufficient contrast ratios, keyboard navigation, screen reader friendly labels, focus indicators on all interactive elements.

This design system balances traditional craftsmanship celebration with modern e-commerce efficiency, creating an authentic marketplace experience for Punjab's artisan community.