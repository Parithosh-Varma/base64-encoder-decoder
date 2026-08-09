import { useState, useEffect, useRef } from 'react'

type Mode = 'encode' | 'decode'
type Format = 'standard' | 'url-safe'

const MAX_FILE_BYTES = 20 * 1024 * 1024

function toBase64(buf: Uint8Array, urlsafe: boolean): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk))
  }
  const std = btoa(bin)
  if (!urlsafe) return std
  return std.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64(b64: string, urlsafe: boolean): string {
  let input = b64.replace(/\s+/g, '')
  if (urlsafe) input = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = input.length % 4
  if (pad === 1) throw new Error('Invalid base64 string')
  if (pad > 1) input += '='.repeat(4 - pad)
  const bin = atob(input)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

async function fileToBase64(file: File, urlsafe: boolean): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer())
  return toBase64(buf, urlsafe)
}

const SAMPLE = 'The quick brown fox jumps over the lazy dog.'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return 'dark'
    if (saved === 'light') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [mode, setMode] = useState<Mode>('encode')
  const [format, setFormat] = useState<Format>('standard')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const run = (value: string, m: Mode = mode, fmt: Format = format) => {
    const text = value.trim()
    if (!text) {
      setOutput('')
      setError('')
      return
    }
    setError('')
    try {
      if (m === 'encode') {
        setOutput(toBase64(new TextEncoder().encode(text), fmt === 'url-safe'))
      } else {
        const decoded = fromBase64(text, fmt === 'url-safe')
        setOutput(decoded)
      }
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : 'Could not perform the conversion.')
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setInput(output)
    setOutput('')
    setError('')
    setFileName('')
    setFileSize(0)
  }

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setError('File is too large. Maximum size is 20 MB.')
      return
    }
    setFileName(file.name)
    setFileSize(file.size)
    setMode('encode')
    setInput('')
    setError('')
    setOutput('')
    const b64 = await fileToBase64(file, format === 'url-safe')
    setOutput(b64)
  }

  const downloadFile = () => {
    if (!output) return
    try {
      const bytes = Uint8Array.from(atob(output.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/\.b64$/i, '') || 'decoded.bin'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('The current output is not valid base64 data.')
    }
  }

  const copyOutput = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center transition-colors duration-300">
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-border bg-card/60 backdrop-blur-md w-full">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full object-cover border border-border shadow-sm" />
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">Base64 Encoder / Decoder</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/parithosh-varma/base64-encoder-decoder"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold transition-all border border-border bg-background hover:bg-muted text-foreground rounded-lg shadow-sm hover:border-muted-foreground/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            <span className="hidden sm:inline">Repo</span>
          </a>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="inline-flex items-center justify-center w-9 h-9 border border-border bg-background hover:bg-muted text-foreground rounded-lg transition-all hover:border-muted-foreground/30 shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl px-6 sm:px-8 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{mode === 'encode' ? 'Encode to base64' : 'Decode from base64'}</h2>
            <p className="text-muted-foreground mt-1">Works 100% offline in your browser — encode text or files, or decode back.</p>
          </div>
          <div className="flex items-center gap-2">
            {(['standard', 'url-safe'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFormat(f); if (input) run(input, mode, f) }}
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-all border ${
                  format === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'standard' ? 'Standard' : 'URL-safe'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border w-fit mb-6">
          <button
            onClick={() => switchMode('encode')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'encode' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Encode
          </button>
          <button
            onClick={() => switchMode('decode')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'decode' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Decode
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Input — {mode === 'encode' ? 'plain text' : 'base64'}</span>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
              {mode === 'encode' && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  Upload file
                </button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); run(e.target.value) }}
              placeholder={mode === 'encode' ? 'Type or paste text to encode…' : 'Paste base64 data to decode…'}
              className="w-full h-64 resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
            {fileName && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30 text-xs text-muted-foreground">
                <span className="truncate font-medium">{fileName} · {(fileSize / 1024).toFixed(1)} KB</span>
                <button onClick={() => { setFileName(''); setFileSize(0); setOutput(''); setInput('') }} className="text-foreground hover:text-destructive font-semibold transition-colors">
                  Remove file
                </button>
              </div>
            )}
          </div>

          <div className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Output — {mode === 'encode' ? 'base64' : 'plain text'}</span>
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="Result appears here…"
              className="w-full h-64 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setInput(SAMPLE)}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-all shadow-sm"
          >
            Use sample
          </button>
          <button
            onClick={() => { setInput(''); setOutput(''); setError(''); setFileName(''); setFileSize(0) }}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-all shadow-sm"
          >
            Clear
          </button>
          <div className="flex-1" />
          {mode === 'decode' && output && !error && (
            <button
              onClick={downloadFile}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Download {fileName || 'file'}
            </button>
          )}
          <button
            onClick={copyOutput}
            disabled={!output}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M20 6 9 17l-5-5"/></svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Copy result
              </>
            )}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>} title="Offline & private" text="All encoding is done locally with the Web Crypto-compatible atob/btoa APIs." />
          <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M2 19a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0"/></svg>} title="Files up to 20 MB" text="Encode images, PDFs and binaries straight to base64 strings." />
          <InfoCard icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>} title="Open source" text="Fully client-side React + TypeScript. Check the repo for the code." />
        </div>
      </main>

      <footer className="w-full text-center py-8 border-t border-border text-sm text-muted-foreground">
        <p>Built with ❤️ by <a href="https://github.com/parithosh-varma" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Parithosh Varma</a></p>
      </footer>
    </div>
  )
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="border border-border rounded-2xl bg-card p-5 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-3">{icon}</div>
      <h3 className="font-bold tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}

export default App