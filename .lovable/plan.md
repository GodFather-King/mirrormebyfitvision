# Welcome Hub & Role-Based Navigation

Redesign post-login flow around two workspaces (Virtual Try-On, Brand Studio) with a scalable Welcome Hub, remembered preference, and workspace-scoped navigation.

## 1. Welcome Hub page (`/welcome`)

New file `src/pages/Welcome.tsx`:
- Full-screen, mobile-first, premium look (glass cards, cyan gradient accents matching current theme).
- Header: "Welcome to MirrorMe" · Sub: "What would you like to do today?"
- Two large cards rendered from a scalable `workspaces` config array (so Tailor/Stylist/Designer can be appended later without layout changes):
  - **Virtual Try-On** → CTA "Start Trying On" → `/` (TryOnStudio)
  - **Brand Studio** → if `isBrandOwner || isAdmin`: CTA "Open Brand Dashboard" → `/brand/dashboard`; else CTA "Become a Brand Partner" → `/brand/apply` (new lightweight page that submits a `brand_applications` row, or reuses existing About/contact — see technical section).
- Checkbox: "Remember my preferred workspace" → stores `mirrorme_workspace` in localStorage.
- Footer link: "You can switch anytime from Settings."

## 2. Workspace context

New file `src/hooks/useWorkspace.tsx`:
- Provides `workspace: 'consumer' | 'brand' | null`, `setWorkspace`, `remember`, `clear`.
- Persists to localStorage key `mirrorme_workspace` when "remember" is checked.
- Wrap `<App>` inside `AuthProvider`.

## 3. Post-login routing

- `Auth.tsx`: after successful sign-in/up, if `localStorage.mirrorme_workspace` set → navigate there; else → `/welcome`.
- Existing `nextPath` (from `?next=`) still wins for deep links.

## 4. Role-based navigation

Update `SidebarMenu.tsx` to render items based on active workspace:
- **Consumer**: Home, Try-On, Wardrobe, Saved Outfits (Wishlist), My Try-Ons (Orders proxy), Profile/Account.
- **Brand**: Brand Dashboard, Products (dashboard tab), Orders (dashboard tab), AI Fashion Studio, Campaigns, Analytics (dashboard), Profile.
- Add **"Switch Workspace"** button (visible whenever workspace is chosen) → returns to `/welcome`.
- Admin still sees Admin Panel regardless.

`BottomNavigation.tsx` similarly reads workspace and swaps its item set.

## 5. Brand application flow (new users)

Minimal, non-disruptive:
- Add `/brand/apply` route → simple form (brand name, contact, website) inserting into an existing table or a new lightweight one. If out of scope for this pass, wire the button to open a mailto/WhatsApp to the FitVision team and mark as TODO for full workflow. Chosen approach: mailto + toast confirmation, since the current `brand_owners` linkage is admin-driven.

## Technical notes

- No schema changes required. Workspace preference is client-side only.
- `useBrandOwner` already exposes `isBrandOwner` and admin fallback — reused for Welcome Hub decision.
- Workspaces defined as an array of `{ id, title, description, icon, accent, cta, resolveTarget }` so future workspaces (Tailor/Stylist/Designer) can be appended by pushing to the array; grid uses `md:grid-cols-2 lg:grid-cols-3` and gracefully handles N cards.
- Preserve existing routes; nothing removed. Sidebar just filters what's shown.
- Keep MirrorMe visual language: dark glass cards, cyan accents, Sparkles/ShoppingBag icons, no stock illustrations.

## Files

Create: `src/pages/Welcome.tsx`, `src/hooks/useWorkspace.tsx`, `src/pages/BrandApply.tsx` (mailto stub).
Edit: `src/App.tsx` (route + provider), `src/pages/Auth.tsx` (redirect logic), `src/components/SidebarMenu.tsx` (workspace-aware items + Switch button), `src/components/BottomNavigation.tsx` (workspace-aware tabs).

Confirm to proceed and I'll implement.
