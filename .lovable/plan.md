# MirrorMe AI Fashion Studio — Premium Brand Upgrade

A new premium feature for brand owners to generate cinematic, South African–inspired AI fashion campaigns from their product photos. Sold as a separate upgrade on top of the standard Digital Store subscription.

## Scope of this build

This plan delivers the full end-to-end experience: locked teaser → upgrade screen → unlocked studio → campaign generation flow → outputs. Payments are NOT activated (per spec) — the upgrade button flips a flag on the brand for now, with infrastructure ready for future monetization.

## 1. Data model (Lovable Cloud)

New columns / tables:

- `brands.ai_studio_enabled boolean default false` — premium flag per brand.
- `brands.ai_studio_credits int default 0` — future-ready credit balance.
- `ai_campaigns` table — one row per generated campaign:
  - `id, brand_id, user_id, name, garment_image_url, model_preset, scene_preset, aesthetic, status (pending|ready|failed), created_at`
- `ai_campaign_images` table — generated outputs:
  - `id, campaign_id, image_url, storage_path, watermarked boolean, created_at`
- Storage bucket `ai-studio` (public) for garment uploads + generated outputs.
- RLS: brand owners can read/write their own brand's campaigns + images. Admins full access.

## 2. Routes & navigation

New routes in `src/App.tsx`:

- `/brand/studio` — entry. Shows locked teaser OR unlocked dashboard depending on `ai_studio_enabled`.
- `/brand/studio/upgrade` — benefits screen with upgrade CTA.
- `/brand/studio/create` — 4-step campaign creation wizard.
- `/brand/studio/campaigns` — previous campaigns gallery.
- `/brand/studio/campaigns/:id` — single campaign detail with downloads/share.

Add "AI Fashion Studio" entry in `BrandDashboard.tsx` sidebar/header, with a lock icon for standard brands and a sparkle badge for premium.

## 3. Locked premium experience (`/brand/studio` for non-premium)

- Cinematic hero with blurred preview cards (AI-generated examples we render with placeholder images first, then optionally pre-generate real ones).
- Lock icon + "Upgrade Required" pill.
- 6 preview cards showing: streetwear in Braamfontein, kasi basketball court, Durban beachfront, Sandton luxury, township fashion street, African sunset.
- Big CTA → `/brand/studio/upgrade`.

## 4. Upgrade screen (`/brand/studio/upgrade`)

- Headline: "Create professional AI fashion campaigns instantly."
- Benefit list (no photographers, no studios, no models, SA-inspired scenes, social-ready, downloadable, etc.).
- Pricing card (placeholder copy — "Launching soon" tag, no real payment).
- "Activate AI Fashion Studio" button → for now flips `ai_studio_enabled=true` on the brand (admin/dev access) and shows a "Joined waitlist / Activated" toast. We keep the visible label honest: "Activate (Beta)".

## 5. Unlocked studio dashboard (`/brand/studio` when enabled)

Tile-based navigation:

- Create Campaign
- Previous Campaigns
- Saved AI Models (preset library)
- Saved Environments (preset library)
- Downloads
- Brand Assets (links to brand logo/cover)
- Credits / Usage (shows balance, "unlimited beta" for now)

## 6. Campaign creation wizard (`/brand/studio/create`)

Four steps with a progress indicator:

1. **Upload Clothing** — drag/drop or pick. Uploads to `ai-studio` bucket. Supports PNG/JPG. Tip about transparent backgrounds.
2. **Choose AI Model** — gender, body type, skin tone, aesthetic (Streetwear / Luxury / Casual / High fashion / Township).
3. **Choose Scene** — categorized SA presets (Urban / Township / Shopping / Nature) as visual cards. Names use "South African–inspired" phrasing (no copyrighted mall/brand names).
4. **Generate** — calls edge function, shows shimmer, then renders 4 variations.

## 7. AI generation (edge function)

New edge function `generate-ai-campaign`:

- Auth: validates JWT, checks brand ownership + `ai_studio_enabled`.
- Builds a prompt from model preset + scene preset + aesthetic.
- Uses Lovable AI Gateway `google/gemini-3-pro-image-preview` (high quality fashion editorial) for image generation with the garment image as input (multimodal edit). Falls back to `google/gemini-2.5-flash-image` (Nano Banana) on rate-limit/cost.
- Generates 4 variations sequentially with slight prompt variation.
- Uploads outputs to `ai-studio` bucket, inserts rows in `ai_campaigns` + `ai_campaign_images`.
- Returns campaign ID + image URLs.
- Handles 429/402 with friendly messages.

## 8. Output features

On campaign detail page:

- Grid of 4 variations.
- Per image: Download, Share to WhatsApp (wa.me link with image URL), Share to Instagram (copy + download — IG has no web share API), Regenerate this variation.
- Subtle "Generated with MirrorMe AI Fashion Studio" watermark applied client-side via canvas before download (reuses `src/lib/watermarkImage.ts` pattern).
- Optional brand-logo watermark toggle.

## 9. Positioning & UI feel

- Dark cinematic theme (matches existing design memory).
- Electric cyan accents + subtle gradient glow on premium-only surfaces.
- Glassmorphism cards, large typography, generous spacing.
- Mobile-first layouts (411px viewport considered).
- No emojis in chrome; sparingly used in marketing copy.

## 10. Files to create / edit

```text
Database migration:
  + brands.ai_studio_enabled, brands.ai_studio_credits
  + public.ai_campaigns
  + public.ai_campaign_images
  + storage bucket "ai-studio" + RLS

Edge function:
  + supabase/functions/generate-ai-campaign/index.ts

Pages:
  + src/pages/studio/AIStudioHome.tsx       (locked OR unlocked)
  + src/pages/studio/AIStudioUpgrade.tsx
  + src/pages/studio/AIStudioCreate.tsx     (4-step wizard)
  + src/pages/studio/AIStudioCampaigns.tsx
  + src/pages/studio/AIStudioCampaignDetail.tsx

Components:
  + src/components/studio/StudioLockedHero.tsx
  + src/components/studio/StudioPreviewGrid.tsx
  + src/components/studio/ModelPresetPicker.tsx
  + src/components/studio/ScenePresetPicker.tsx
  + src/components/studio/GarmentUploader.tsx
  + src/components/studio/CampaignResultsGrid.tsx
  + src/components/studio/StudioNav.tsx
  + src/lib/studioPresets.ts                (model + SA scene preset catalog)

Edits:
  ~ src/App.tsx                              (new routes)
  ~ src/pages/BrandDashboard.tsx             (AI Studio entry tile)
```

## 11. Out of scope (explicit)

- No real payment flow — `ai_studio_enabled` is toggled in-app (gated behind admin in production; for the beta the upgrade CTA flips it for the requesting brand).
- No credit decrementing logic in this pass (column exists, displayed as "Beta — unlimited").
- No Instagram Graph API integration (just download + copy caption helper).
- No long-running job queue — generation is synchronous in the edge function with a 60s timeout per image. If we hit the wall later, we'll move to a queue.

## 12. Risks / notes

- Image gen via `gemini-3-pro-image-preview` is slow + costly per generation. We'll generate sequentially and surface progress per variation. If response time is an issue we'll drop to `gemini-3.1-flash-image-preview` (Nano Banana 2) as the default and keep Pro as a "High quality" toggle.
- Prompts will explicitly forbid copyrighted brand names / mall names and ask for "South African–inspired" backdrops.
- Avatar memory rule (photoreal MetaHuman quality, no stylized) is honored in prompts.
