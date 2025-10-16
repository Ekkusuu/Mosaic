# Mosaic Theme System - Quick Guide

## Current Themes
1. **Default** - Dark theme with cool grays and blues
2. **Honeycomb** - Warm golden amber theme inspired by beehives

## How to Add a New Theme

### Step 1: Create Theme CSS File
Create a new file in `/my-app/src/components/` named `ColorTheme[YourThemeName].css`

Example: `ColorThemeOcean.css` for an ocean theme

```css
/* Ocean Theme - Cool blues and aqua tones */
.theme-ocean {
    /* Copy all CSS variables from ColorThemeHoneycomb.css */
    /* Then customize the colors for your theme */
    --color-bg: #e0f2fe; /* light blue background */
    --color-surface: #0369a1; /* ocean blue surface */
    /* ... etc */
}
```

### Step 2: Import Theme in App.tsx
Add the import at the top of `/my-app/src/App.tsx`:

```tsx
import './components/ColorThemeOcean.css';
```

### Step 3: Update ThemeContext.tsx Type
In `/my-app/src/contexts/ThemeContext.tsx`, update the Theme type:

```tsx
type Theme = 'default' | 'honeycomb' | 'ocean'; // Add your theme here
```

### Step 4: Update Theme Class Logic
In ThemeContext.tsx, update the useEffect to handle your new theme:

```tsx
// Remove all theme classes
document.documentElement.classList.remove('theme-default', 'theme-honeycomb', 'theme-ocean');
```

### Step 5: Add Theme Option in Settings
In `/my-app/src/components/SettingsPopup.tsx`, add a new option:

```tsx
<option value="ocean">Ocean (Blue)</option>
```

### Step 6: Update TypeScript Types
Update the onChange handler type in SettingsPopup.tsx:

```tsx
onChange={(e) => setTheme(e.target.value as 'default' | 'honeycomb' | 'ocean')}
```

## Theme Color Variables Reference

### Required Variables (All themes must define these):

#### Base Colors
- `--color-bg` - Main page background
- `--color-surface` - Modals, cards, panels
- `--color-border` - Default borders
- `--color-panel` - Darker panels
- `--color-input-bg` - Input backgrounds
- `--color-input-border` - Input borders
- `--color-input-focus` - Focus states
- `--color-white` - Pure white variant

#### Text Colors
- `--color-text` - Primary text
- `--color-placeholder` - Placeholders
- `--color-muted` - Secondary text
- `--color-muted-2` - Tertiary text

#### Shadows (9 levels)
- `--shadow-sm` through `--shadow-2xl`

#### Overlays (4 levels)
- `--overlay-dark` through `--overlay-dark-4`

#### Gradients & Highlights
- `--gradient-light-start`, `--gradient-light-end`, `--gradient-blue`
- `--inset-light-sm`, `--inset-light-md`, `--inset-light-lg`
- `--color-overlay-line`

#### Status Colors (each with 3 variants: color, bg, border)
- Success, Error, Danger, Info, Warning, Gray

#### Subject Colors (12 subjects)
- Mathematics, Physics, Chemistry, Biology, Computer Science, Economics, Psychology, History, Literature, Engineering, Medicine, Law

#### Gradient Accents
- `--gradient-card-start`, `--gradient-card-mid`, `--gradient-card-end`

#### Hexagon Background
- `--hex-bg-light`, `--hex-bg-dark`

## Tips for Creating Good Themes

1. **Start with a base color** - Pick your main theme color first
2. **Use color theory** - Choose complementary or analogous colors
3. **Test contrast** - Ensure text is readable on backgrounds
4. **Consider accessibility** - Maintain WCAG contrast ratios
5. **Be consistent** - Use variations of your base colors for related elements
6. **Test thoroughly** - Check all components (modals, popups, cards, buttons)

## Color Palette Suggestions

### Forest Theme
- Base: Deep greens (#166534, #15803d)
- Accents: Forest browns and earthy tones
- Surface: Dark moss green

### Sunset Theme
- Base: Oranges and purples (#ea580c, #7c3aed)
- Accents: Pink and coral tones
- Surface: Deep purple-orange gradient

### Midnight Theme
- Base: Deep navy blues (#1e3a8a, #1e40af)
- Accents: Light blue highlights
- Surface: Dark navy

### Cherry Blossom Theme
- Base: Soft pinks (#fce7f3, #ec4899)
- Accents: White and light pink
- Surface: Medium pink
