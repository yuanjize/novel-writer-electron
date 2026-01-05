import JSZip from 'jszip'
import crypto from 'crypto'
import { outlineDAO, projectDAO } from '../database/dao'
import type { Chapter, Outline, Project } from '../database/dao'

export type ExportFormat = 'txt' | 'epub' | 'docx'

export interface SmartExportOptions {
  includeProjectHeader?: boolean
  includeVolumeTitles?: boolean
  includeChapterTitles?: boolean
  cleanBlankLines?: boolean
  indentParagraphs?: boolean
  paragraphIndentText?: string
  maxPreviewChars?: number
}

interface BookChapter {
  chapterNumber: number
  title: string
  content: string
}

interface BookVolume {
  title: string
  chapters: BookChapter[]
}

interface BookData {
  project: Project
  volumes: BookVolume[]
}

function safeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'export'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeNewlines(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function splitIntoParagraphs(raw: string, cleanBlankLines: boolean): string[] {
  const text = normalizeNewlines(raw)
  const lines = text.split('\n').map(l => l.trim())

  const paragraphs: string[] = []
  let pendingBlank = false

  for (const line of lines) {
    if (!line) {
      pendingBlank = true
      continue
    }

    if (pendingBlank && !cleanBlankLines) {
      paragraphs.push('')
    }
    pendingBlank = false
    paragraphs.push(line)
  }

  if (!cleanBlankLines) {
    while (paragraphs.length > 0 && paragraphs[0] === '') paragraphs.shift()
    while (paragraphs.length > 0 && paragraphs[paragraphs.length - 1] === '') paragraphs.pop()
  }

  return cleanBlankLines ? paragraphs.filter(p => p.trim().length > 0) : paragraphs
}

function toTxtBody(content: string, options: Required<Pick<SmartExportOptions, 'cleanBlankLines' | 'indentParagraphs' | 'paragraphIndentText'>>): string {
  const paragraphs = splitIntoParagraphs(content, options.cleanBlankLines)
  const indent = options.indentParagraphs ? options.paragraphIndentText : ''

  const out: string[] = []
  for (const p of paragraphs) {
    if (!p) {
      out.push('')
      continue
    }
    out.push(`${indent}${p}`)
    out.push('')
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function toHtmlParagraphs(content: string, cleanBlankLines: boolean): string {
  const paragraphs = splitIntoParagraphs(content, cleanBlankLines)
  return paragraphs
    .map((p) => (p.trim().length === 0 ? '<p class="blank"></p>' : `<p>${escapeHtml(p)}</p>`))
    .join('\n')
}

function buildBookTitle(project: Project): string {
  const title = project.name?.trim() || '未命名作品'
  return title
}

function buildBookAuthor(project: Project): string {
  return project.author?.trim() || ''
}

function buildDefaultOptions(options?: SmartExportOptions): Required<SmartExportOptions> {
  return {
    includeProjectHeader: options?.includeProjectHeader ?? true,
    includeVolumeTitles: options?.includeVolumeTitles ?? true,
    includeChapterTitles: options?.includeChapterTitles ?? true,
    cleanBlankLines: options?.cleanBlankLines ?? true,
    indentParagraphs: options?.indentParagraphs ?? true,
    paragraphIndentText: options?.paragraphIndentText ?? '　　',
    maxPreviewChars: options?.maxPreviewChars ?? 60000
  }
}

function buildVolumesFromOutlines(
  outlines: Outline[],
  chapters: Chapter[]
): BookVolume[] {
  const byNumber = new Map<number, Chapter>()
  const byTitle = new Map<string, Chapter>()
  for (const c of chapters) {
    byNumber.set(c.chapter_number, c)
    const key = c.title?.trim().toLowerCase()
    if (key && !byTitle.has(key)) byTitle.set(key, c)
  }

  const usedChapterIds = new Set<number>()

  const volumes: BookVolume[] = []
  let currentVolume: BookVolume | null = null

  const sorted = [...outlines].sort((a, b) => {
    const d = a.sequence - b.sequence
    if (d !== 0) return d
    return a.created_at.localeCompare(b.created_at)
  })

  const ensureVolume = (title: string) => {
    if (!currentVolume) {
      currentVolume = { title: title || '正文', chapters: [] }
      volumes.push(currentVolume)
      return
    }
    if (currentVolume.title !== title) {
      currentVolume = { title: title || '正文', chapters: [] }
      volumes.push(currentVolume)
    }
  }

  for (const o of sorted) {
    if (o.type === 'volume') {
      ensureVolume(o.title)
      continue
    }
    if (o.type !== 'chapter') continue

    if (!currentVolume) {
      currentVolume = { title: '正文', chapters: [] }
      volumes.push(currentVolume)
    }

    const assumedNumber = o.sequence + 1
    const matched =
      byNumber.get(assumedNumber) ||
      byTitle.get(o.title?.trim().toLowerCase() || '')

    if (matched) {
      usedChapterIds.add(matched.id)
      currentVolume.chapters.push({
        chapterNumber: matched.chapter_number,
        title: matched.title || `第${matched.chapter_number}章`,
        content: matched.content || ''
      })
    } else {
      currentVolume.chapters.push({
        chapterNumber: assumedNumber,
        title: o.title || `第${assumedNumber}章`,
        content: o.content || ''
      })
    }
  }

  // Append remaining chapters not referenced by outlines
  const remaining = chapters
    .filter(c => !usedChapterIds.has(c.id))
    .sort((a, b) => a.chapter_number - b.chapter_number)

  if (remaining.length > 0) {
    if (!currentVolume) {
      currentVolume = { title: '正文', chapters: [] }
      volumes.push(currentVolume)
    }

    for (const c of remaining) {
      currentVolume.chapters.push({
        chapterNumber: c.chapter_number,
        title: c.title || `第${c.chapter_number}章`,
        content: c.content || ''
      })
    }
  }

  // If outlines produced no chapters, fall back to chapter list
  const totalChapters = volumes.reduce((acc, v) => acc + v.chapters.length, 0)
  if (totalChapters === 0) {
    return [{
      title: '正文',
      chapters: chapters
        .slice()
        .sort((a, b) => a.chapter_number - b.chapter_number)
        .map(c => ({
          chapterNumber: c.chapter_number,
          title: c.title || `第${c.chapter_number}章`,
          content: c.content || ''
        }))
    }]
  }

  return volumes
}

async function loadBook(projectId: number): Promise<BookData> {
  const project = projectDAO.getById(projectId)
  if (!project) throw new Error('Project not found')

  const chapters = projectDAO.getChapters(projectId)
  const outlines = outlineDAO.getAllByProject(projectId)

  const hasOutline = outlines.length > 0
  const volumes = hasOutline ? buildVolumesFromOutlines(outlines, chapters) : buildVolumesFromOutlines([], chapters)

  return { project, volumes }
}

function buildTxt(book: BookData, options: Required<SmartExportOptions>): string {
  const title = buildBookTitle(book.project)
  const author = buildBookAuthor(book.project)

  const out: string[] = []

  if (options.includeProjectHeader) {
    out.push(`《${title}》`)
    if (author) out.push(`作者：${author}`)
    out.push('')
  }

  book.volumes.forEach((volume, volumeIndex) => {
    if (options.includeVolumeTitles) {
      const volumeTitle = volume.title?.trim() || '正文'
      out.push(`【第${volumeIndex + 1}卷 ${volumeTitle}】`)
      out.push('')
    }

    volume.chapters.forEach((chapter) => {
      if (options.includeChapterTitles) {
        out.push(`第${chapter.chapterNumber}章 ${chapter.title}`.trim())
        out.push('')
      }

      const body = toTxtBody(chapter.content, {
        cleanBlankLines: options.cleanBlankLines,
        indentParagraphs: options.indentParagraphs,
        paragraphIndentText: options.paragraphIndentText
      })

      if (body) out.push(body)
      out.push('')
      out.push('')
    })
  })

  const text = out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  // UTF-8 BOM for better compatibility with editors on Windows
  return `\uFEFF${text}\n`
}

function buildPreviewHtmlForTxt(txt: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>TXT 预览</title>
    <style>
      body { margin: 0; padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #fff; }
      pre { white-space: pre-wrap; word-break: break-word; line-height: 1.8; font-size: 14px; }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(txt)}</pre>
  </body>
</html>`
}

function buildPreviewHtmlForBook(book: BookData, options: Required<SmartExportOptions>): string {
  const title = escapeHtml(buildBookTitle(book.project))
  const author = escapeHtml(buildBookAuthor(book.project))
  const header = options.includeProjectHeader ? `<h1>${title}</h1>${author ? `<div class="meta">作者：${author}</div>` : ''}` : ''

  const parts: string[] = [header]

  book.volumes.forEach((volume, volumeIndex) => {
    if (options.includeVolumeTitles) {
      parts.push(`<h2 class="volume">第${volumeIndex + 1}卷 ${escapeHtml(volume.title || '正文')}</h2>`)
    }
    volume.chapters.forEach((c) => {
      if (options.includeChapterTitles) {
        parts.push(`<h3 class="chapter">第${c.chapterNumber}章 ${escapeHtml(c.title)}</h3>`)
      }
      parts.push(toHtmlParagraphs(c.content, options.cleanBlankLines))
    })
  })

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; background: #fff; color: #111827; }
      .meta { color: #6b7280; margin-top: 4px; margin-bottom: 24px; }
      h1 { margin: 0; font-size: 28px; }
      h2.volume { margin-top: 28px; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
      h3.chapter { margin-top: 20px; font-size: 18px; }
      p { text-indent: ${options.indentParagraphs ? '2em' : '0'}; line-height: 1.9; margin: 0 0 0.9em 0; }
      p.blank { text-indent: 0; }
    </style>
  </head>
  <body>
    ${parts.join('\n')}
  </body>
</html>`
}

async function buildEpub(book: BookData, options: Required<SmartExportOptions>): Promise<Buffer> {
  const zip = new JSZip()

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )

  const oebps = zip.folder('OEBPS')!

  const title = buildBookTitle(book.project)
  const author = buildBookAuthor(book.project)
  const identifier = `urn:uuid:${crypto.randomUUID()}`

  const css = `
body { font-family: "Noto Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; }
h1,h2,h3 { margin: 1em 0 0.6em; }
p { text-indent: ${options.indentParagraphs ? '2em' : '0'}; line-height: 1.9; margin: 0 0 0.9em 0; }
p.blank { text-indent: 0; }
`
  oebps.file('styles.css', css.trim())

  const coverSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#1f2937"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#bg)"/>
  <text x="50%" y="42%" text-anchor="middle" fill="#ffffff" font-size="44" font-family="PingFang SC, Microsoft YaHei, sans-serif">${escapeXml(title)}</text>
  ${author ? `<text x="50%" y="52%" text-anchor="middle" fill="#d1d5db" font-size="22" font-family="PingFang SC, Microsoft YaHei, sans-serif">作者：${escapeXml(author)}</text>` : ''}
  <text x="50%" y="90%" text-anchor="middle" fill="#9ca3af" font-size="14" font-family="sans-serif">Generated by novel-writer-electron</text>
</svg>`
  oebps.file('cover.svg', coverSvg)

  const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Cover</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
    <meta name="viewport" content="width=device-width, height=device-height"/>
  </head>
  <body style="margin:0;padding:0;">
    <div style="text-align:center;">
      <img src="cover.svg" alt="cover" style="max-width:100%;height:auto;" />
    </div>
  </body>
</html>`
  oebps.file('cover.xhtml', coverXhtml)

  const titlePageIncluded = options.includeProjectHeader
  if (titlePageIncluded) {
    const titleXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN">
  <head>
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${author ? `<p>作者：${escapeHtml(author)}</p>` : ''}
  </body>
</html>`
    oebps.file('title.xhtml', titleXhtml)
  }

  const chapterItems: Array<{ id: string; href: string; title: string }> = []
  let chapterFileIndex = 1
  for (const [volumeIndex, volume] of book.volumes.entries()) {
    const volumeTitle = volume.title?.trim() || '正文'
    for (let chapterIndex = 0; chapterIndex < volume.chapters.length; chapterIndex++) {
      const c = volume.chapters[chapterIndex]
      const id = `chap${chapterFileIndex}`
      const href = `chapter-${chapterFileIndex}.xhtml`
      const chapterTitle = `第${c.chapterNumber}章 ${c.title}`.trim()
      const volumeHeading =
        options.includeVolumeTitles && chapterIndex === 0
          ? `<h1>第${volumeIndex + 1}卷 ${escapeHtml(volumeTitle)}</h1>`
          : ''
      const chapterHeading = options.includeChapterTitles ? `<h2>${escapeHtml(chapterTitle)}</h2>` : ''
      const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN">
  <head>
    <title>${escapeXml(chapterTitle)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
  </head>
  <body>
    ${volumeHeading}
    ${chapterHeading}
    ${toHtmlParagraphs(c.content, options.cleanBlankLines)}
  </body>
</html>`
      oebps.file(href, xhtml)
      chapterItems.push({ id, href, title: chapterTitle })
      chapterFileIndex++
    }
  }

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN">
  <head>
    <title>目录</title>
  </head>
  <body>
    <nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">
      <h1>目录</h1>
      <ol>
        ${(titlePageIncluded ? [`<li><a href="title.xhtml">扉页</a></li>`] : [])
          .concat(chapterItems.map(i => `<li><a href="${escapeXml(i.href)}">${escapeHtml(i.title)}</a></li>`))
          .join('\n')}
      </ol>
    </nav>
  </body>
</html>`
  oebps.file('nav.xhtml', nav)

  const manifestItems = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="css" href="styles.css" media-type="text/css"/>`,
    `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    ...(titlePageIncluded ? [`<item id="titlepage" href="title.xhtml" media-type="application/xhtml+xml"/>`] : []),
    `<item id="cover-image" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/>`,
    ...chapterItems.map(i => `<item id="${escapeXml(i.id)}" href="${escapeXml(i.href)}" media-type="application/xhtml+xml"/>`)
  ].join('\n      ')

  const spineItems = [
    `<itemref idref="cover"/>`,
    ...(titlePageIncluded ? [`<itemref idref="titlepage"/>`] : []),
    ...chapterItems.map(i => `<itemref idref="${escapeXml(i.id)}"/>`)
  ].join('\n      ')

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0" xml:lang="zh-CN">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    ${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ''}
    <dc:language>zh-CN</dc:language>
    <meta property="dcterms:modified">${escapeXml(new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'))}</meta>
  </metadata>
  <manifest>
      ${manifestItems}
  </manifest>
  <spine>
      ${spineItems}
  </spine>
</package>`
  oebps.file('content.opf', opf)

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function buildDocxDocumentXml(book: BookData, options: Required<SmartExportOptions>): string {
  const title = buildBookTitle(book.project)
  const author = buildBookAuthor(book.project)

  const paragraphs: string[] = []

  const p = (text: string, opts?: { style?: string; jc?: 'left' | 'center'; isBold?: boolean }) => {
    const styleXml = opts?.style ? `<w:pStyle w:val="${escapeXml(opts.style)}"/>` : ''
    const jcXml = opts?.jc ? `<w:jc w:val="${opts.jc}"/>` : ''
    const pPr = styleXml || jcXml ? `<w:pPr>${styleXml}${jcXml}</w:pPr>` : ''
    const rPr = opts?.isBold ? '<w:rPr><w:b/></w:rPr>' : ''
    const safe = escapeXml(text)
    paragraphs.push(`<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`)
  }

  const blank = () => paragraphs.push('<w:p/>')

  // Title page
  if (options.includeProjectHeader) {
    p(`《${title}》`, { style: 'Heading1', jc: 'center', isBold: true })
    if (author) p(`作者：${author}`, { jc: 'center' })
    blank()
    blank()
  }

  // Body
  let volumeIndex = 0
  for (const volume of book.volumes) {
    volumeIndex++
    if (options.includeVolumeTitles) {
      p(`第${volumeIndex}卷 ${volume.title || '正文'}`, { style: 'Heading1' })
    }

    for (const c of volume.chapters) {
      if (options.includeChapterTitles) {
        p(`第${c.chapterNumber}章 ${c.title}`.trim(), { style: 'Heading2' })
      }

      const lines = splitIntoParagraphs(c.content, options.cleanBlankLines)
      for (const line of lines) {
        if (!line) {
          blank()
          continue
        }
        p(line, { style: 'Normal' })
      }
      blank()
    }
    blank()
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`
}

function buildDocxStylesXml(indentParagraphs: boolean): string {
  const firstLineChars = indentParagraphs ? '200' : '0'
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto"/>
      <w:ind w:firstLineChars="${firstLineChars}"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="360" w:after="180"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="240" w:after="120"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
</w:styles>`
}

async function buildDocx(book: BookData, options: Required<SmartExportOptions>): Promise<Buffer> {
  const zip = new JSZip()

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const title = buildBookTitle(book.project)
  const author = buildBookAuthor(book.project)

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
  xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
>
  <dc:title>${escapeXml(title)}</dc:title>
  ${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ''}
  <cp:lastModifiedBy>novel-writer-electron</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${escapeXml(now)}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${escapeXml(now)}</dcterms:modified>
</cp:coreProperties>`

  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>novel-writer-electron</Application>
</Properties>`

  zip.file('[Content_Types].xml', contentTypes)
  zip.folder('_rels')?.file('.rels', rels)
  zip.folder('docProps')?.file('core.xml', core)
  zip.folder('docProps')?.file('app.xml', app)
  zip.folder('word')?.file('document.xml', buildDocxDocumentXml(book, options))
  zip.folder('word')?.file('styles.xml', buildDocxStylesXml(options.indentParagraphs))
  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', docRels)

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export const exportService = {
  async preview(projectId: number, format: ExportFormat, options?: SmartExportOptions): Promise<{ html: string; suggestedName: string }> {
    const resolved = buildDefaultOptions(options)
    const book = await loadBook(projectId)
    const baseName = safeFileName(buildBookTitle(book.project))

    if (format === 'txt') {
      const txt = buildTxt(book, resolved).replace(/^\uFEFF/, '')
      const trimmed = txt.length > resolved.maxPreviewChars ? `${txt.slice(0, resolved.maxPreviewChars)}\n…` : txt
      return { html: buildPreviewHtmlForTxt(trimmed), suggestedName: `${baseName}.txt` }
    }

    // For EPUB/DOCX preview, render a common HTML preview.
    const html = buildPreviewHtmlForBook(book, resolved)
    const ext = format === 'epub' ? 'epub' : 'docx'
    return { html, suggestedName: `${baseName}.${ext}` }
  },

  async exportProject(projectId: number, format: ExportFormat, options?: SmartExportOptions): Promise<{ buffer: Buffer; suggestedName: string }> {
    const resolved = buildDefaultOptions(options)
    const book = await loadBook(projectId)
    const baseName = safeFileName(buildBookTitle(book.project))

    if (format === 'txt') {
      const txt = buildTxt(book, resolved)
      return { buffer: Buffer.from(txt, 'utf8'), suggestedName: `${baseName}.txt` }
    }

    if (format === 'epub') {
      const buffer = await buildEpub(book, resolved)
      return { buffer, suggestedName: `${baseName}.epub` }
    }

    const buffer = await buildDocx(book, resolved)
    return { buffer, suggestedName: `${baseName}.docx` }
  },

  async exportBible(projectId: number): Promise<{ html: string; suggestedName: string }> {
    const project = projectDAO.getById(projectId)
    if (!project) throw new Error('Project not found')
    
    const { characterDAO, worldSettingDAO } = require('../database/dao')
    const characters = characterDAO.getAllByProject(projectId)
    const settings = worldSettingDAO.getAllByProject(projectId)
    
    const charHtml = characters.map((c: any) => `
      <div class="card">
        <h3>${escapeHtml(c.name)}</h3>
        <p><b>性格：</b>${escapeHtml(c.personality || '未设定')}</p>
        <p><b>背景：</b>${escapeHtml(c.background || '未设定')}</p>
      </div>
    `).join('')

    const settingHtml = settings.map((s: any) => `
      <div class="card">
        <h3>[${escapeHtml(s.category)}] ${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.content || '')}</p>
      </div>
    `).join('')

    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; background: #f9f9f9; }
            h1 { text-align: center; color: #111; }
            h2 { border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-top: 40px; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>《${escapeHtml(project.name)}》设定集</h1>
          <h2>一、角色档案</h2>
          ${charHtml || '<p>暂无角色数据</p>'}
          <h2>二、世界观设定</h2>
          ${settingHtml || '<p>暂无设定数据</p>'}
        </body>
      </html>
    `
    return { html, suggestedName: `${safeFileName(project.name)}_设定集.html` }
  }
}
