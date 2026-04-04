import { useMemo, useRef, useCallback, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import hljs from 'highlight.js';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest('.md-code-copy');
    if (!btn) return;
    const pre = btn.closest('.md-code-block');
    const code = pre?.querySelector('.md-code');
    if (code) {
      navigator.clipboard.writeText(code.textContent || '');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    }
  }, []);

  const html = useMemo(() => parseMarkdown(content), [content]);

  useEffect(() => {
    if (!containerRef.current) return;
    const blocks = containerRef.current.querySelectorAll<HTMLElement>('code.md-code[data-lang]');
    blocks.forEach((block) => {
      const lang = block.getAttribute('data-lang');
      if (lang && hljs.getLanguage(lang)) {
        block.removeAttribute('data-highlighted');
        try {
          const result = hljs.highlight(block.textContent || '', { language: lang });
          block.innerHTML = result.value;
        } catch {
        }
      }
    });
  }, [html]);

  return (
    <div className={`md-renderer ${className}`}>
      <div ref={containerRef} onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseMarkdown(text: string): string {
  let html = escapeHtml(text);

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const langAttr = lang ? ` data-lang="${lang}"` : '';
    const langLabel = lang ? `<span class="md-code-lang">${lang}</span>` : '';
    return `<pre class="md-code-block"${langAttr}><div class="md-code-header">${langLabel}<button class="md-code-copy" data-copy="true">Copy</button></div><code class="md-code"${langAttr}>${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

  html = html.replace(/^- \[ \] (.+)$/gm, '<div class="md-checkbox unchecked"><span class="md-checkbox-box"></span>$1</div>');
  html = html.replace(/^- \[x\] (.+)$/gm, '<div class="md-checkbox checked"><span class="md-checkbox-box-checked"></span>$1</div>');
  html = html.replace(/^- (.+)$/gm, '<li class="md-list-item">$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="md-list-item numbered"><span class="md-number">$1.</span>$2</li>');

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  html = html.replace(/^\| (.+) \|$/gm, (_m, row) => {
    const cells = row.split('|').map((c: string) => c.trim());
    const isHeader = cells.some((c: string) => c.match(/^-+$/));
    if (isHeader) return '';
    return `<tr>${cells.map((c: string) => `<td class="md-table-cell">${c}</td>`).join('')}</tr>`;
  });

  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  for (const line of lines) {
    if (line.startsWith('<tr>')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
    } else {
      if (inTable) {
        processedLines.push('<table class="md-table"><tbody>');
        tableRows.forEach((r) => processedLines.push(r));
        processedLines.push('</tbody></table>');
        tableRows = [];
        inTable = false;
      }
      processedLines.push(line);
    }
  }
  if (inTable) {
    processedLines.push('<table class="md-table"><tbody>');
    tableRows.forEach((r) => processedLines.push(r));
    processedLines.push('</tbody></table>');
  }

  html = processedLines.join('\n');
  html = html.replace(/\n{3,}/g, '\n\n');

  return html;
}
