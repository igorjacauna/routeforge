import { javascript } from '@codemirror/lang-javascript'
import { Decoration, EditorView } from '@codemirror/view'
import { StateField, RangeSetBuilder } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'

const headingMark = Decoration.mark({ class: 'cmt-heading' })
const httpMethodMark = Decoration.mark({ class: 'cmt-http-method' })
const pathMark = Decoration.mark({ class: 'cmt-path' })
const typeParamMark = Decoration.mark({ class: 'cmt-type-param' })
const keywordMark = Decoration.mark({ class: 'cmt-keyword' })

function buildDecorations(doc: { toString: () => string }) {
  const builder = new RangeSetBuilder<Decoration>()
  const text = doc.toString()
  const lines = text.split('\n')

  let pos = 0
  for (const rawLine of lines) {
    const len = rawLine.length
    const trimmed = rawLine.trimStart()
    const indent = rawLine.length - trimmed.length

    const heading = trimmed.match(/^(#[ \t]+)(.+)/)
    if (heading) {
      const from = pos + indent
      builder.add(from, from + heading[1].length + heading[2].length, headingMark)
      pos += len + 1
      continue
    }

    if (/^\/\//.test(trimmed) || /^#[^a-zA-Z]/.test(trimmed)) {
      pos += len + 1
      continue
    }

    const method = trimmed.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i)
    if (method) {
      const from = pos + indent
      builder.add(from, from + method[1].length, httpMethodMark)

      const afterMethod = trimmed.slice(method[0].length)
      const path = afterMethod.match(/^(\s+)(\/\S+)/)
      if (path) {
        const pathFrom = pos + indent + method[0].length + path[1].length
        builder.add(pathFrom, pathFrom + path[2].length, pathMark)
      }
    }

    const blockMatch = trimmed.match(/^(Request|Response)\b/)
    if (blockMatch) {
      const from = pos + indent
      builder.add(from, from + blockMatch[1].length, keywordMark)
    }

    const tagRegex = /<(\w+)>/g
    let tagMatch
    while ((tagMatch = tagRegex.exec(rawLine)) !== null) {
      const from = pos + tagMatch.index
      builder.add(from, from + tagMatch[0].length, typeParamMark)
    }

    pos += len + 1
  }

  return builder.finish()
}

const routeForgeDecorations = StateField.define({
  create(state) { return buildDecorations(state.doc) },
  update(_decorations, tr) { return tr.docChanged ? buildDecorations(tr.state.doc) : _decorations },
  provide: (field) => EditorView.decorations.from(field),
})

// Injected stylesheet — !important beats HighlightStyle inline styles
const styleId = 'routeforge-syntax'
function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById(styleId)) return
  const el = document.createElement('style')
  el.id = styleId
  el.textContent = `
    .cmt-heading, .cmt-heading * { color: #61AFEF !important; }
    .cmt-heading { font-weight: bold !important; }
    .cmt-http-method, .cmt-http-method * { color: #98C379 !important; }
    .cmt-http-method { font-weight: 600 !important; }
    .cmt-path, .cmt-path * { color: #56B6C2 !important; }
    .cmt-type-param, .cmt-type-param * { color: #D19A66 !important; }
    .cmt-keyword, .cmt-keyword * { color: #C678DD !important; }
    .cmt-keyword { font-weight: 600 !important; }
  `
  document.head.appendChild(el)
}

export function routeforge() {
  injectStyles()
  return [javascript({ typescript: true }), oneDark, routeForgeDecorations]
}
