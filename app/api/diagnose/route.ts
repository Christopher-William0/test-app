import { draftMode, cookies, headers } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const results = {
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
    
    // 1. Draft Mode Detection
    draftMode: {
      isEnabled: false,
      cookiePresent: false,
      headerPresent: false,
    },
    
    // 2. Request Details
    request: {
      url: req.url,
      method: req.method,
      headers: {} as Record<string, string>,
      cookies: {} as Record<string, string>,
      searchParams: Object.fromEntries(req.nextUrl.searchParams),
    },
    
    // 3. Next.js Internal State
    workStore: {} as any,
    workUnitStore: {} as any,
    
    // 4. Diagnostic Info
    diagnostics: [] as string[],
    errors: [] as string[],
  };
  
  // Capture all headers (limited to relevant ones)
  const relevantHeaders = [
    'rsc',
    'next-router-prefetch',
    'next-router-state-tree',
    'next-url',
    'x-nextjs-draft-mode',
    'x-vercel-id',
    'x-matched-path',
  ];
  
  for (const header of relevantHeaders) {
    const value = req.headers.get(header);
    if (value) {
      results.request.headers[header] = value;
    }
  }
  
  // Capture cookies
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    results.request.cookies[cookie.name] = cookie.value;
    if (cookie.name === '__prerender_bypass' || cookie.name === '__next_preview_data') {
      results.draftMode.cookiePresent = true;
    }
  }
  
  // Check draft mode header
  const draftHeader = req.headers.get('x-nextjs-draft-mode');
  if (draftHeader === '1') {
    results.draftMode.headerPresent = true;
  }
  
  // Try to enable draft mode (for testing)
  let draft;
  try {
    draft = await draftMode();
    results.draftMode.isEnabled = draft.isEnabled;
    results.diagnostics.push("✅ draftMode() API accessible");
  } catch (err: any) {
    results.errors.push(`❌ draftMode() failed: ${err.message}`);
  }
  
  // Try to access cookies
  try {
    const cookieList = await cookies();
    const cookieNames = cookieList.getAll().map(c => c.name);
    results.diagnostics.push(`✅ cookies() accessible. Found: ${cookieNames.join(', ') || 'none'}`);
  } catch (err: any) {
    results.errors.push(`❌ cookies() failed: ${err.message}`);
  }
  
  // Try to access headers
  try {
    const headersList = await headers();
    const headerNames = Array.from(headersList.entries()).map(([k]) => k);
    results.diagnostics.push(`✅ headers() accessible. Sample: ${headerNames.slice(0, 5).join(', ')}...`);
  } catch (err: any) {
    results.errors.push(`❌ headers() failed: ${err.message}`);
  }
  
  // Check static generation flags
  results.diagnostics.push(`
    🔍 To check if isStaticGeneration is being overridden,
    look for this log in the terminal:
    "[Next.js] Draft Mode detected on static page: ... Switching to dynamic render."
  `);
  
  // Determine the issue
  if (results.draftMode.cookiePresent && !results.draftMode.isEnabled) {
    results.diagnostics.push(`
      ⚠️ ISSUE DETECTED: Draft Mode cookie exists but draftMode.isEnabled = false
      This means the cookie is not being properly recognized.
      Expected behavior: Cookie should enable draft mode.
    `);
  }
  
  if (results.request.searchParams.language && results.request.searchParams.timestamp) {
    if (results.draftMode.isEnabled) {
      results.diagnostics.push(`
        ✅ SUCCESS: Draft mode enabled with searchParams:
        language=${results.request.searchParams.language}
        timestamp=${results.request.searchParams.timestamp}
      `);
    } else {
      results.diagnostics.push(`
        ❌ FAILURE: Draft mode NOT enabled but searchParams were provided.
        Expected: searchParams should be populated when draft mode is enabled.
      `);
    }
  }
  
  // Return as HTML for easy viewing
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Next.js Draft Mode Diagnostic Tool</title>
      <style>
        body { font-family: monospace; padding: 20px; background: #0a0a0a; color: #e0e0e0; }
        h1 { color: #00ff88; }
        h2 { color: #ffaa00; margin-top: 30px; }
        .success { color: #00ff88; }
        .error { color: #ff4444; }
        .warning { color: #ffaa00; }
        pre { background: #1a1a1a; padding: 15px; border-radius: 8px; overflow-x: auto; }
        .card { border: 1px solid #333; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .card h3 { margin-top: 0; }
      </style>
    </head>
    <body>
      <h1>🔍 Next.js Draft Mode Diagnostic Tool</h1>
      <p>Use this tool to debug why searchParams are empty in production.</p>
      
      <div class="card">
        <h2>📊 Test Result</h2>
        ${results.diagnostics.map(d => `<pre>${d}</pre>`).join('')}
        ${results.errors.map(e => `<pre class="error">${e}</pre>`).join('')}
      </div>
      
      <div class="card">
        <h2>🍪 Cookies Detected</h2>
        <pre>${JSON.stringify(results.request.cookies, null, 2)}</pre>
      </div>
      
      <div class="card">
        <h2>📨 Headers Detected</h2>
        <pre>${JSON.stringify(results.request.headers, null, 2)}</pre>
      </div>
      
      <div class="card">
        <h2>🔗 URL Parameters</h2>
        <pre>${JSON.stringify(results.request.searchParams, null, 2)}</pre>
      </div>
      
      <div class="card">
        <h2>🌍 Environment</h2>
        <pre>${JSON.stringify({ environment: results.environment, isVercel: results.vercel }, null, 2)}</pre>
      </div>
      
      <div class="card">
        <h2>💡 How to Fix</h2>
        <pre>
If you see "Draft Mode cookie exists but draftMode.isEnabled = false":

1. Check if isStaticGeneration is being overridden in app-render.tsx
2. Look for the console log: "[Next.js] Draft Mode detected..."
3. Verify that forceDynamic is being set to true

The fix should be applied in:
- packages/next/src/server/app-render/app-render.tsx
- packages/next/src/server/app-render/work-async-storage.external.ts
- packages/next/src/server/app-render/dynamic-rendering.ts
        </pre>
      </div>
      
      <div class="card">
        <h2>🧪 Quick Test</h2>
        <p>
          <a href="/api/render?language=en&timestamp=123456" target="_blank">
            ➡️ Test Draft Mode with /api/render
          </a>
        </p>
        <p>
          <a href="/diagnose?language=en&timestamp=123456" target="_blank">
            🔄 Run this diagnostic again with parameters
          </a>
        </p>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}