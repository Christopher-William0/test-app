import { cookies, headers, draftMode } from 'next/headers'

export default async function DiagnosePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const awaitedParams = await searchParams
  const draft = await draftMode()
  const cookieStore = await cookies()
  const headersList = await headers()

  // استخراج الكوكيز المهمة
  const prerenderBypassCookie = cookieStore.get('__prerender_bypass')
  const nextPreviewDataCookie = cookieStore.get('__next_preview_data')
  const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`)

  // استخراج الهيدرز المهمة
  const draftModeHeader = headersList.get('x-nextjs-draft-mode')
  const rscHeader = headersList.get('rsc')

  // تحليل المشكلة
  let diagnosis = ''
  let diagnosisType = 'info'
  if (draft.isEnabled) {
    diagnosis = '✅ Draft mode is ENABLED. The issue might be elsewhere.'
    diagnosisType = 'success'
  } else if (prerenderBypassCookie) {
    diagnosis = '⚠️ CRITICAL: Draft mode cookie exists but draftMode.isEnabled = false. This is the core bug.'
    diagnosisType = 'error'
  } else {
    diagnosis = 'ℹ️ Draft mode is disabled because the __prerender_bypass cookie is missing.'
    diagnosisType = 'info'
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '20px' }}>
      <h1>🔬 Next.js Draft Mode - Deep Diagnosis</h1>

      <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
        <h2 style={{ marginTop: 0, color: diagnosisType === 'error' ? 'red' : 'green' }}>{diagnosis}</h2>
      </div>

      <div style={{ background: '#eef', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
        <h3>🍪 Cookies Analysis (Key to the problem)</h3>
        <pre>{JSON.stringify({ __prerender_bypass: prerenderBypassCookie?.value, __next_preview_data: nextPreviewDataCookie?.value, all_cookies: allCookies }, null, 2)}</pre>
        {prerenderBypassCookie && !draft.isEnabled && (
          <p style={{ color: 'red', fontWeight: 'bold' }}>🔥 BUG CONFIRMED: The cookie is sent, but Next.js ignores it. This is what your PR must fix.</p>
        )}
      </div>

      <div style={{ background: '#efe', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
        <h3>📨 Key Headers</h3>
        <pre>{JSON.stringify({ 'x-nextjs-draft-mode': draftModeHeader, rsc: rscHeader }, null, 2)}</pre>
      </div>

      <div style={{ background: '#ffe', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
        <h3>🔗 Request Data</h3>
        <pre>{JSON.stringify({ searchParams: awaitedParams }, null, 2)}</pre>
      </div>
    </div>
  )
}