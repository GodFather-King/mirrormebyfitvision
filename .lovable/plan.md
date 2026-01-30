
# Cinematic Login & Sign-Up Experience for MirrorMe

## Overview
Transform the current functional but standard authentication page into an immersive, cinematic onboarding experience that emotionally connects users with MirrorMe's vision. The new design will speak directly to users in a warm, human tone while showcasing the futuristic technology.

## Design Philosophy
- **Cinematic**: Full-screen storytelling with animated transitions
- **Intimate**: Direct, warm messaging that makes users feel seen
- **Futuristic**: Leverage existing holographic effects, glows, and gradients
- **Progressive**: Guide users through the value proposition before showing forms

## Visual Journey Structure

### Step 1: Hero Welcome Screen
A full-bleed opening screen with:
- Animated gradient background with floating particles
- MirrorMe logo with holographic shimmer effect
- Tagline: "Step into the future. Now."
- Company credit: "by FitVision (Pty) Ltd, South Africa"
- Smooth fade-in animation sequence
- Single CTA button: "Begin Your Journey"

### Step 2: Value Proposition Carousel
Three intimate, one-on-one slides explaining what MirrorMe offers:

**Slide 1 - Digital Self**
"Imagine a digital version of you. Created using only your phone. Your proportions. Your shape. Your unique silhouette."

**Slide 2 - Try Before You Buy**
"See how outfits actually look on your body before you buy. Build a wardrobe of what you own and what you love."

**Slide 3 - Connect & Share**
"Share your looks with friends. Get opinions in real time. Shop smarter together."

Each slide features:
- Subtle animated icon/illustration
- Warm, direct copy
- Progress indicators
- Swipe or tap to continue

### Step 3: Benefits Summary
Quick visual summary highlighting:
- "Confidence in every purchase"
- "Smarter buying decisions"
- "Fewer returns, less waste"

### Step 4: Authentication Forms
The actual sign-in/sign-up interface with:
- Closing line: "Welcome to your Mirror. Let's see your future."
- Glassmorphism card design (existing style)
- Smooth tab transition between Sign In and Sign Up
- Form fields with soft glow on focus
- Gradient CTA buttons

## Animation Sequences
1. **Initial Load**: Fade in logo with pulse effect
2. **Transitions**: Smooth crossfade between steps
3. **Text Reveal**: Staggered word-by-word or line-by-line fade-in
4. **Background**: Floating orbs with slow drift animation
5. **Form Focus**: Subtle glow intensification on input focus

## Component Structure
```
src/pages/Auth.tsx (complete rewrite)
├── OnboardingStep (reusable step wrapper)
├── WelcomeHero (Step 1)
├── ValueCarousel (Steps 2-3)
│   ├── CarouselSlide
│   └── ProgressDots
├── BenefitsSummary (Step 4)
└── AuthForms (Step 5 - existing logic preserved)
```

## Technical Approach

### State Management
- `currentStep`: tracks which onboarding step is active (0-4)
- `isTransitioning`: prevents rapid navigation during animations
- Existing auth state preserved from `useAuth` hook

### New CSS Animations (in index.css)
- `@keyframes textReveal`: staggered text appearance
- `@keyframes floatParticle`: ambient floating elements
- `@keyframes slideIn`: step transitions
- Extended delay classes for orchestrated reveals

### Responsive Design
- Mobile-first layout (max-w-md preserved)
- Full viewport height for each step
- Safe area insets for mobile devices
- Touch-friendly navigation

### Accessibility
- Keyboard navigation between steps
- ARIA labels for carousel navigation
- Reduced motion preference support
- Focus management on step changes

## Copy & Messaging

### Welcome Screen
> "Step into the future—now."

### Value Slides (speaking directly to user)
> "Picture this: a digital version of yourself, created with just your phone. Your proportions. Your shape. Your unique silhouette."

> "Try on outfits before you buy. See exactly how they'll look on your body. Build a personal wardrobe of pieces you own—and pieces you love."

> "Share your avatar looks with friends. Get real opinions, in real time. Connect with people who get your style."

### Benefits
> "Shop with confidence. Make smarter decisions. Fewer returns. Less waste."

### Final Invitation
> "Welcome to your Mirror. Let's see your future."

## Files to Modify
1. **src/pages/Auth.tsx** - Complete reimplementation with cinematic flow
2. **src/index.css** - Additional animation keyframes and utility classes

## Technical Details

### Auth.tsx Structure
- Preserve all existing authentication logic (signIn, signUp, validation)
- Wrap with new cinematic onboarding flow
- Use local storage to skip onboarding for returning users (optional enhancement)
- Maintain redirect logic for authenticated users

### New Animation Classes (index.css)
```css
@keyframes textReveal { /* staggered text fade */ }
@keyframes floatUp { /* floating particles */ }
@keyframes scaleIn { /* icon entrance */ }
.animate-text-reveal { /* for headline animations */ }
.animate-float-particle { /* ambient effects */ }
```

### Performance Considerations
- Lazy render steps (only mount current + adjacent steps)
- Use CSS animations over JavaScript where possible
- Preload any images/assets during Step 1
- Respect `prefers-reduced-motion` media query
