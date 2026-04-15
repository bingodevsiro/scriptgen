# ScriptGen - AI Script Generator

## Visual Theme & Atmosphere
- Modern, clean, developer-focused dark theme
- Premium feel with subtle gradients and smooth animations
- Minimalist yet feature-rich interface

## Color Palette
- Background: #0D0D0D (near black)
- Surface: #1A1A1A (cards)
- Surface Hover: #222222
- Border: #2A2A2A
- Primary: #10B981 (emerald green) — buttons, highlights
- Primary Hover: #059669
- Text: #FAFAFA
- Text Secondary: #A1A1AA
- Accent: #6366F1 (indigo) — links, badges
- Error: #EF4444
- Warning: #F59E0B

## Typography
- Font: Geist (sans-serif), fallback system-ui
- Headings: 700 weight
- Body: 400 weight
- Code: JetBrains Mono, monospace
- Font sizes: 0.65rem to 1.75rem scale

## Layout
- Max-width: 900px, centered
- Container padding: 24px
- Card-based interface with rounded corners (12-16px)
- Base spacing unit: 8px

## Components

### Header
- Logo with gradient text (primary → accent)
- Subtitle in secondary text
- Control buttons: history, theme toggle
- Icon buttons: 40x40px, rounded 10px

### Categories (Pills)
- Horizontal scrollable list
- Active: filled with primary color
- Hover: subtle background shift
- Spacing: 6px gap

### Main Input Card
- Dark textarea with focus ring in primary color
- Character hint text (Ctrl+Enter)
- Select dropdowns for model selection
- Action buttons: Generate (primary), Clear (secondary)

### Template Buttons
- Quick-access templates per category
- Show/hide toggle ("Show all" / "Show less")
- Hover state: accent border and text

### Output Area
- Header with category badge and action buttons
- Code block with Prism.js syntax highlighting
- Language label and line count in header
- Copy, Download, Markdown export, Favorite, Share buttons

### Action Buttons
- Icon + text format
- Hover: primary color border
- Active states: copied feedback, favorite highlight

### History Panel
- Collapsible panel with sticky header
- Category badge + date per item
- Truncated prompt preview
- Favorites filter, Clear All button

### Toast Notifications
- Fixed position bottom center
- Success: primary border
- Error: red border
- Auto-dismiss after 2.5s

## Animations
- Smooth transitions: 200-300ms ease
- Fade in for output block
- Spinner animation for loading
- Subtle hover effects on all interactive elements

## Features
- 9 programming categories: Python, JavaScript, Bash, Go, Rust, SQL, Docker, Batch, API
- 3 AI models: Llama 3.3 70B, Llama 3.1 70B, Mixtral 8x7B
- Syntax highlighting for all major languages
- Line numbers in code output
- Copy, Download, Export to Markdown/PDF
- Favorites system with localStorage
- History with search and filtering
- Light/Dark theme toggle
- Share via URL (base64 encoded)
- Quick templates per category
- Keyboard shortcut: Ctrl+Enter to generate

## Code Output
- Prism.js syntax highlighting
- Language-specific coloring
- Scrollable with max-height 500px
- Line count display
- Language badge with color coding