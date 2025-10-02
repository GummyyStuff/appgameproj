# Case Opening Design System

This document outlines the design system for the case opening game components, providing consistent styling, animations, and user experience patterns.

## Overview

The case opening design system consists of:

- **Color System**: Standardized Tarkov-themed color palette
- **Typography System**: Consistent font sizes, weights, and spacing
- **Animation Variants**: Reusable motion design patterns
- **Component Styles**: Pre-built CSS classes for common UI patterns

## Color System

### Primary Colors
```css
--tarkov-primary: #1a1a1a    /* Dark backgrounds */
--tarkov-darker: #0f0f0f    /* Darker backgrounds */
--tarkov-dark: #2d3748      /* Secondary backgrounds */
--tarkov-secondary: #4a5568  /* Cards, borders */
--tarkov-accent: #f6ad55    /* Highlights, buttons, text */
```

### Semantic Colors
- **Success**: Green variants for positive states
- **Danger**: Red variants for errors and warnings
- **Warning**: Yellow/Orange variants for cautions
- **Info**: Blue variants for informational content

### Rarity Colors
- **Common**: Gray (`#9ca3af`)
- **Uncommon**: Green (`#10b981`)
- **Rare**: Blue (`#3b82f6`)
- **Epic**: Purple (`#8b5cf6`)
- **Legendary**: Yellow (`#f59e0b`)

## Typography System

### Font Families
- **Primary**: `'Tarkov', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`

### Text Sizes
- **Display**: Large headings (4.5rem - 1.5rem)
- **Heading**: Section headings (3rem - 1.125rem)
- **Body**: Regular text (1rem - 0.75rem)

### Font Weights
- **Light**: 300
- **Normal**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700
- **Extrabold**: 800

## Animation Variants

### Page Transitions
```typescript
animationVariants.page // Fade in/out with slide
animationVariants.card // Scale and fade for cards
animationVariants.stagger // Staggered children animations
```

### Interactive Elements
```typescript
animationVariants.button // Hover/tap effects
animationVariants.caseCard // Case card interactions
```

### Loading States
```typescript
animationVariants.loading.pulse // Breathing effect
animationVariants.loading.shimmer // Sweep effect
animationVariants.loading.dots // Bouncing dots
animationVariants.loading.spin // Continuous rotation
```

### Results & Feedback
```typescript
animationVariants.result.congratulations // Celebration scaling
animationVariants.result.prize // Prize reveal animation
```

## Component Styles

### Case Cards
```css
.case-card /* Base card styling */
.case-card-affordable /* Interactive cards */
.case-card-disabled /* Disabled cards */

.case-card-image /* Image container */
.case-card-content /* Content area */
.case-card-title /* Title styling */
.case-card-description /* Description text */
```

### Price & Balance
```css
.price-badge /* Price display */
.price-badge-text /* Price text */

.balance-display /* Balance container */
.balance-label /* "Balance:" label */
.balance-amount /* Currency amount */
```

### Status Messages
```css
.status-message /* Base message styling */
.status-insufficient /* Error messages */
.status-ready /* Success messages */

.status-insufficient-title /* Error title */
.status-insufficient-subtitle /* Error subtitle */
.status-ready-title /* Success title */
```

### Rarity Distribution
```css
.rarity-distribution /* Container */
.rarity-distribution-title /* "Drop Rates:" label */
.rarity-grid /* Grid layout */

.rarity-item /* Individual rarity item */
.rarity-item-common /* Common styling */
.rarity-item-uncommon /* Uncommon styling */
.rarity-item-rare /* Rare styling */
.rarity-item-epic /* Epic styling */
.rarity-item-legendary /* Legendary styling */
```

### Results Display
```css
.result-container /* Result container */
.result-title /* "Congratulations!" title */
.result-prize-name /* Item name */
.result-prize-rarity /* Rarity text */
.result-currency /* Currency amount */
```

### Animations & Loading
```css
.animation-container /* Animation wrapper */
.animation-placeholder /* Loading state */
.animation-placeholder-icon /* Loading icon */
.animation-placeholder-text /* Loading text */

.loading-dots /* Dot container */
.loading-dot /* Individual dots */
.loading-shimmer /* Shimmer effect */
```

### Error States
```css
.error-container /* Error wrapper */
.error-title /* Error title */
.error-message /* Error message */
.error-severity-indicator /* Severity badge */

.error-severity-critical /* Critical errors */
.error-severity-high /* High priority */
.error-severity-medium /* Medium priority */
.error-severity-low /* Low priority */

.error-actions /* Action buttons */
.error-button-primary /* Primary action */
.error-button-secondary /* Secondary action */
```

## Usage Guidelines

### Importing Styles
```typescript
import '../../styles/caseOpening.css'
import { animationVariants } from '../../styles/animationVariants'
```

### Applying Animations
```tsx
<motion.div {...animationVariants.card}>
  <div className="case-card case-card-affordable">
    {/* Content */}
  </div>
</motion.div>
```

### Using CSS Classes
```tsx
<div className="result-container">
  <h3 className="result-title">Congratulations!</h3>
  <div className={`result-prize-rarity rarity-${rarity}`}>LEGENDARY</div>
</div>
```

## Responsive Design

The design system includes responsive breakpoints:

- **Mobile**: < 640px
- **Tablet**: 641px - 1024px
- **Desktop**: > 1024px

Components automatically adapt their layout and spacing based on screen size.

## Accessibility

### Color Contrast
All text combinations meet WCAG AA standards for color contrast ratios.

### Focus Management
Interactive elements have proper focus indicators and keyboard navigation support.

### Motion Preferences
Animations respect user motion preferences and can be disabled.

## Maintenance

### Adding New Colors
1. Add to CSS custom properties in `:root`
2. Create utility classes (`.text-{color}`, `.bg-{color}`, `.border-{color}`)
3. Update this documentation

### Adding Animation Variants
1. Add to `animationVariants.ts`
2. Test across different devices and browsers
3. Document usage patterns

### Modifying Component Styles
1. Update CSS classes in `caseOpening.css`
2. Test responsive behavior
3. Update component implementations
4. Update this documentation

## Performance Considerations

### CSS Optimizations
- Use CSS custom properties for theme values
- Minimize selector complexity
- Leverage CSS Grid and Flexbox for layouts

### Animation Performance
- Use `transform` and `opacity` for smooth animations
- Avoid animating layout properties
- Use `will-change` for complex animations

### Bundle Size
- Import only needed styles and variants
- Tree-shake unused CSS classes
- Use CSS-in-JS for dynamic styles when appropriate
