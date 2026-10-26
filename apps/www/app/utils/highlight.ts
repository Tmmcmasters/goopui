// A deliberately tiny highlighter for the landing page's short snippets (docs pages use
// Nuxt Content's Shiki). Emits <span class="tk-*"> around keywords, strings, comments,
// tags, attributes, and CSS custom properties. Input is escaped first.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Lang = 'ts' | 'vue' | 'shell' | 'css'

const RULES: Record<Lang, [RegExp, string][]> = {
  ts: [
    [/(\/\/[^\n]*)/g, 'comment'],
    [/('[^'\n]*'|"[^"\n]*"|`[^`]*`)/g, 'string'],
    [/\b(import|from|export|const|let|function|return|await|async|type|interface|new|if|else)\b/g, 'keyword'],
    [/\b(\d+(?:\.\d+)?)\b/g, 'number'],
    [/\b([a-zA-Z_]\w*)(?=\()/g, 'fn'],
  ],
  vue: [
    [/(&lt;!--[\s\S]*?--&gt;)/g, 'comment'],
    [/(&lt;\/?)([A-Za-z][\w-]*)/g, 'tag'],
    [/\s([:@]?[a-zA-Z-]+)(=)/g, 'attr'],
    [/("[^"\n]*")/g, 'string'],
  ],
  shell: [
    [/(#[^\n]*)/g, 'comment'],
    [/^(\$?\s*)(pnpm|npm|npx|yarn|bun)\b/gm, 'keyword'],
  ],
  css: [
    [/(\/\*[\s\S]*?\*\/)/g, 'comment'],
    [/(--[\w-]+)/g, 'prop'],
    [/(@[a-z-]+)/g, 'keyword'],
    [/("[^"\n]*")/g, 'string'],
    [/:\s*([\d.]+)(px)?/g, 'number'],
  ],
}

export function highlight(code: string, lang: Lang): string {
  // Tokenize by placeholder so later rules can't match inside earlier spans.
  const tokens: string[] = []
  // Placeholder = private-use chars only, so no later rule (\w, \d, \b) can match inside it.
  const enc = (n: number) => String(n).replace(/\d/g, (d) => String.fromCharCode(0xe010 + Number(d)))
  const stash = (html: string) => `\ue000${enc(tokens.push(html) - 1)}\ue001`
  let out = esc(code)
  for (const [re, cls] of RULES[lang]) {
    out = out.replace(re, (...m: string[]) => {
      const full = m[0]!
      if (full.includes('\ue000')) return full
      if (cls === 'tag') return `${m[1]}${stash(`<span class="tk-tag">${m[2]}</span>`)}`
      if (cls === 'attr') return ` ${stash(`<span class="tk-attr">${m[1]}</span>`)}${m[2]}`
      if (cls === 'number' && lang === 'css') return full.replace(m[1]!, stash(`<span class="tk-number">${m[1]}</span>`))
      if (lang === 'shell' && cls === 'keyword') return `${m[1]}${stash(`<span class="tk-keyword">${m[2]}</span>`)}`
      return stash(`<span class="tk-${cls}">${full}</span>`)
    })
  }
  const dec = (s: string) => Number([...s].map((c) => c.charCodeAt(0) - 0xe010).join(''))
  // Tokens can nest placeholders (e.g. css numbers), so resolve until none remain.
  let prev = ''
  while (prev !== out) {
    prev = out
    out = out.replace(/\ue000([\ue010-\ue019]+)\ue001/g, (_, i: string) => tokens[dec(i)]!)
  }
  return out
}
