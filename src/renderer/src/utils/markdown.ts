import { marked } from 'marked'
import hljs from 'highlight.js'

// marked v12+ 使用扩展方式配置代码高亮
const renderer = new marked.Renderer()

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  let highlighted = text
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(text, { language: lang, ignoreIllegals: true }).value
    } catch {
      // fall through
    }
  } else {
    try {
      highlighted = hljs.highlightAuto(text).value
    } catch {
      // fall through
    }
  }
  return `<pre><code class="hljs${lang ? ' language-' + lang : ''}">${highlighted}</code></pre>`
}

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer
})

export function renderMarkdown(md: string): string {
  if (!md) return ''
  try {
    return marked.parse(md, { async: false }) as string
  } catch {
    return md
  }
}
