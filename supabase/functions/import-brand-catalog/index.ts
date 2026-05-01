// Import a list of products from an external brand website using Lovable AI.
// Two modes:
//   - mode: 'preview' -> fetches the URL, asks Gemini to extract products, returns array (no DB write)
//   - mode: 'commit'  -> inserts the provided products into brand_items for the given brand
//
// Requires: caller must be authenticated AND admin (checked via user_roles).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];

interface ExtractedProduct {
  name: string;
  image_url: string;
  product_url: string;
  price: number | null;
  currency: string | null;
  category: string;
}

const absolutize = (maybeUrl: string, base: string): string => {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
};

const cleanHtmlForLLM = (html: string): string => {
  // Strip scripts/styles/comments/SVG to keep tokens down
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ');
};

// Split cleaned HTML into chunks the LLM can handle. Tries to break on tag
// boundaries near </div> / </li> / </article> so product cards don't split.
const chunkHtml = (html: string, chunkSize = 140_000): string[] => {
  if (html.length <= chunkSize) return [html];
  const chunks: string[] = [];
  let i = 0;
  while (i < html.length) {
    let end = Math.min(i + chunkSize, html.length);
    if (end < html.length) {
      const slice = html.slice(i, end);
      const cut = Math.max(
        slice.lastIndexOf('</article>'),
        slice.lastIndexOf('</li>'),
        slice.lastIndexOf('</div>'),
      );
      if (cut > chunkSize * 0.5) end = i + cut + 6;
    }
    chunks.push(html.slice(i, end));
    i = end;
  }
  return chunks;
};

async function callLovableAI(prompt: string): Promise<ExtractedProduct[]> {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content:
            'You are an e-commerce product extractor. Return ONLY a JSON array of products found on the page. No prose, no markdown fences.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  // The model may return either {products:[...]} or [...] inside an object
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // try to salvage the first JSON array in the text
    const m = content.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('AI did not return valid JSON');
    parsed = JSON.parse(m[0]);
  }
  const arr: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.products)
      ? parsed.products
      : Array.isArray(parsed.items)
        ? parsed.items
        : [];
  return arr
    .filter((p) => p && typeof p === 'object' && p.image_url && p.name)
    .map((p) => ({
      name: String(p.name).slice(0, 200),
      image_url: String(p.image_url),
      product_url: String(p.product_url || ''),
      price: p.price != null && !isNaN(Number(p.price)) ? Number(p.price) : null,
      currency: p.currency ? String(p.currency).slice(0, 8) : null,
      category: CATEGORIES.includes(String(p.category)) ? String(p.category) : 'tops',
    }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // --- Auth: must be a signed-in admin ---
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: 'preview' | 'commit' = body.mode === 'commit' ? 'commit' : 'preview';

    // ---------- PREVIEW MODE ----------
    if (mode === 'preview') {
      const url: string = String(body.url || '').trim();
      const maxPages: number = Math.min(Math.max(Number(body.max_pages) || 1, 1), 10);
      if (!/^https?:\/\//i.test(url)) {
        return new Response(JSON.stringify({ error: 'Provide a valid http(s) URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fetchHtml = async (u: string): Promise<string> => {
        const resp = await fetch(u, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MirrorMeBot/1.0; +https://mirrorme.app)',
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.text();
      };

      // Detect pagination URLs in the HTML — looks for rel="next", common pagination
      // link patterns (?page=N, /page/N, &p=N) and returns absolute URLs in order.
      const detectPaginationUrls = (html: string, baseUrl: string): string[] => {
        const found = new Set<string>();
        const ordered: string[] = [];
        const push = (raw: string) => {
          const abs = absolutize(raw, baseUrl);
          if (!abs.startsWith('http')) return;
          if (found.has(abs)) return;
          found.add(abs);
          ordered.push(abs);
        };

        // rel="next"
        const relNext = html.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i);
        if (relNext) push(relNext[1]);
        const aRelNext = html.match(/<a[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i);
        if (aRelNext) push(aRelNext[1]);

        // anchor hrefs that look paginated
        const hrefRegex = /href=["']([^"']+)["']/gi;
        let m: RegExpExecArray | null;
        while ((m = hrefRegex.exec(html)) !== null) {
          const href = m[1];
          if (/[?&](page|p|pg)=\d+/i.test(href) || /\/page\/\d+/i.test(href)) {
            push(href);
          }
        }
        return ordered;
      };

      // Generate fallback ?page=N URLs by mutating the seed URL
      const generateNumericFallbacks = (seed: string, count: number): string[] => {
        const out: string[] = [];
        try {
          for (let i = 2; i <= count + 1; i++) {
            const u = new URL(seed);
            u.searchParams.set('page', String(i));
            out.push(u.toString());
          }
        } catch { /* ignore */ }
        return out;
      };

      const extractFromPage = async (pageUrl: string, html: string): Promise<ExtractedProduct[]> => {
        const cleaned = cleanHtmlForLLM(html);
        const chunks = chunkHtml(cleaned);
        const out: ExtractedProduct[] = [];
        const seenInPage = new Set<string>(); // image-based de-dupe across chunks
        for (let idx = 0; idx < chunks.length; idx++) {
          const part = chunks[idx];
          const prompt = `Extract EVERY clothing/fashion product visible in this HTML fragment from an e-commerce page.
Return a JSON object: {"products":[{name, image_url, product_url, price, currency, category}, ...]}
- Do NOT cap the count — include ALL products you can see in this fragment.
- image_url MUST be a direct image URL (jpg/png/webp). If relative, leave as-is — I will resolve it.
- product_url: the link to that product's detail page (relative is OK).
- price: number only (no currency symbols).
- currency: 3-letter code if visible (USD, ZAR, EUR, GBP), else null.
- category: ONE of ${CATEGORIES.join(', ')}. Best guess from the product name.
- Skip non-product UI (logos, banners, icons, payment badges, model headshots without a product).

Page URL: ${pageUrl}
Fragment ${idx + 1} of ${chunks.length}.
HTML:
${part}`;
          let products: ExtractedProduct[] = [];
          try {
            products = await callLovableAI(prompt);
          } catch (e) {
            // If a single chunk fails, keep going with the rest
            console.error(`Chunk ${idx + 1}/${chunks.length} failed:`, String(e));
            continue;
          }
          for (const p of products) {
            const img = absolutize(p.image_url, pageUrl);
            if (!img || seenInPage.has(img)) continue;
            seenInPage.add(img);
            out.push({
              ...p,
              image_url: img,
              product_url: p.product_url ? absolutize(p.product_url, pageUrl) : '',
            });
          }
        }
        return out;
      };

      // Crawl: start with seed URL, then follow detected pagination breadth-first
      const visited = new Set<string>();
      const queue: string[] = [url];
      const all: ExtractedProduct[] = [];
      const pagesScanned: string[] = [];
      let firstPageHtml = '';
      let firstError: string | null = null;

      while (queue.length > 0 && pagesScanned.length < maxPages) {
        const next = queue.shift()!;
        if (visited.has(next)) continue;
        visited.add(next);

        let html = '';
        try {
          html = await fetchHtml(next);
        } catch (e) {
          if (pagesScanned.length === 0) {
            firstError = String(e);
            break;
          }
          continue; // skip failed subsequent pages
        }

        if (pagesScanned.length === 0) firstPageHtml = html;

        try {
          const found = await extractFromPage(next, html);
          all.push(...found);
          pagesScanned.push(next);
        } catch (e) {
          if (pagesScanned.length === 0) {
            return new Response(
              JSON.stringify({ error: `AI extraction failed: ${String(e)}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        }

        // Enqueue more pagination links discovered on this page
        if (pagesScanned.length < maxPages) {
          const more = detectPaginationUrls(html, next);
          for (const u of more) {
            if (!visited.has(u) && !queue.includes(u)) queue.push(u);
          }
        }
      }

      if (pagesScanned.length === 0) {
        return new Response(
          JSON.stringify({
            error:
              "Couldn't fetch that website. It may block bots (SHEIN/Zara/etc). Try the brand's product listing page directly.",
            details: firstError,
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // If the site didn't expose pagination links but caller wanted more pages,
      // try ?page=N fallbacks against the seed URL.
      if (pagesScanned.length < maxPages && firstPageHtml) {
        const fallbacks = generateNumericFallbacks(url, maxPages - pagesScanned.length);
        for (const u of fallbacks) {
          if (pagesScanned.length >= maxPages) break;
          if (visited.has(u)) continue;
          visited.add(u);
          try {
            const html = await fetchHtml(u);
            // Heuristic: if we get same body as page 1, stop (no real pagination)
            if (html.length > 500 && Math.abs(html.length - firstPageHtml.length) < 50) break;
            const found = await extractFromPage(u, html);
            if (found.length === 0) break;
            all.push(...found);
            pagesScanned.push(u);
          } catch {
            break;
          }
        }
      }

      // ----- Configurable de-duplication -----
      // dedupe_by: 'image' | 'product_url' | 'name' | 'any'  (default: 'any')
      // 'any' = treat as duplicate if EITHER image OR product_url OR normalized name matches
      // skip_existing: also drop items already present in brand_items for this brand (default: true)
      const dedupeBy: 'image' | 'product_url' | 'name' | 'any' =
        ['image', 'product_url', 'name', 'any'].includes(body.dedupe_by)
          ? body.dedupe_by
          : 'any';
      const skipExisting = body.skip_existing !== false;
      const targetBrandId: string | null = body.brand_id ? String(body.brand_id) : null;

      const normName = (s: string) =>
        (s || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim()
          .replace(/\s+/g, ' ');
      const normUrl = (u: string) => {
        if (!u) return '';
        try {
          const url = new URL(u);
          // strip query/hash to catch tracking params
          return `${url.origin}${url.pathname}`.replace(/\/$/, '').toLowerCase();
        } catch {
          return u.toLowerCase();
        }
      };

      const seenImg = new Set<string>();
      const seenUrl = new Set<string>();
      const seenName = new Set<string>();

      // Pre-load existing items for this brand so we don't re-import
      let existingDuplicates = 0;
      if (skipExisting && targetBrandId) {
        const { data: existing } = await admin
          .from('brand_items')
          .select('product_image, product_url, external_url, product_name')
          .eq('linked_brand_id', targetBrandId)
          .limit(2000);
        for (const e of existing ?? []) {
          if (e.product_image) seenImg.add(normUrl(e.product_image));
          const u = e.product_url || e.external_url;
          if (u) seenUrl.add(normUrl(u));
          if (e.product_name) seenName.add(normName(e.product_name));
        }
      }

      const unique: ExtractedProduct[] = [];
      let droppedInBatch = 0;
      for (const p of all) {
        if (!p.image_url) continue;
        const ki = normUrl(p.image_url);
        const ku = normUrl(p.product_url || '');
        const kn = normName(p.name || '');

        let isDup = false;
        if (dedupeBy === 'image') isDup = seenImg.has(ki);
        else if (dedupeBy === 'product_url') isDup = !!ku && seenUrl.has(ku);
        else if (dedupeBy === 'name') isDup = !!kn && seenName.has(kn);
        else isDup = seenImg.has(ki) || (!!ku && seenUrl.has(ku)) || (!!kn && seenName.has(kn));

        if (isDup) {
          if (skipExisting && targetBrandId) existingDuplicates++;
          else droppedInBatch++;
          continue;
        }
        seenImg.add(ki);
        if (ku) seenUrl.add(ku);
        if (kn) seenName.add(kn);
        unique.push(p);
      }

      return new Response(
        JSON.stringify({
          products: unique,
          pages_scanned: pagesScanned.length,
          pages: pagesScanned,
          dedupe: {
            strategy: dedupeBy,
            skip_existing: skipExisting && !!targetBrandId,
            duplicates_in_batch: droppedInBatch,
            duplicates_already_in_catalog: existingDuplicates,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---------- COMMIT MODE ----------
    const brandId: string = String(body.brand_id || '');
    const products: ExtractedProduct[] = Array.isArray(body.products) ? body.products : [];
    if (!brandId || products.length === 0) {
      return new Response(JSON.stringify({ error: 'brand_id and products[] required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: brand, error: brandErr } = await admin
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .maybeSingle();
    if (brandErr || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = products
      .filter((p) => p.image_url && p.name)
      .slice(0, 500)
      .map((p) => ({
        user_id: user.id,
        brand_name: brand.name,
        linked_brand_id: brand.id,
        product_name: p.name,
        product_image: p.image_url,
        category: CATEGORIES.includes(p.category) ? p.category : 'tops',
        price: p.price,
        currency: p.currency || 'ZAR',
        product_url: p.product_url || null,
        external_url: p.product_url || null,
        is_marketplace: true,
      }));

    const { error: insertErr, count } = await admin
      .from('brand_items')
      .insert(rows, { count: 'exact' });
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ inserted: count ?? rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
