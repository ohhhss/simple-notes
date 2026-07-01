import { marked, Renderer } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import type { Config } from 'dompurify'

const renderer = new Renderer()

renderer.code = function (code: string, infostring: string | undefined): string {
  const lang = (infostring || '').trim().split(/\s+/)[0] || ''
  let highlighted = code
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    } catch {
      // fall through
    }
  } else {
    try {
      highlighted = hljs.highlightAuto(code).value
    } catch {
      // fall through
    }
  }
  return `<pre><code class="hljs${lang ? ' language-' + lang : ''}">${highlighted}</code></pre>`
}

// Allow links to open in system browser via custom hook
renderer.link = function (href: string, title: string | undefined, text: string): string {
  const titleAttr = title ? ` title="${title}"` : ''
  const isExternal = /^https?:\/\//i.test(href)
  const safeHref = DOMPurify.sanitize(href)
  return `<a href="${safeHref}"${titleAttr}${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`
}

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer
} as Parameters<typeof marked.setOptions>[0])

// Configure DOMPurify: whitelist safe tags and attributes, strip all event handlers
const sanitizeConfig: Config = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'span', 'div',
    'a', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'strong', 'em', 'del', 's', 'mark',
    'input', 'sup', 'sub'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title',
    'class', 'id',
    'type', 'checked', 'disabled',  // for task list checkboxes
    'target', 'rel',
    'colspan', 'rowspan',
    'align'
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onsubmit', 'onchange']
}

export function renderMarkdown(md: string): string {
  if (!md) return ''
  try {
    const rawHtml = marked.parse(md, { async: false }) as string
    return DOMPurify.sanitize(rawHtml, sanitizeConfig)
  } catch {
    // On parse failure, return escaped plain text (never raw input)
    const div = document.createElement('div')
    div.textContent = md
    return div.innerHTML
  }
}
