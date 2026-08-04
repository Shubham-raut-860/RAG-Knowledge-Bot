import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Lightweight markdown renderer — no external deps.
 * Handles: **bold**, *italic*, `code`, ```code blocks```,
 * # headings, - lists, [links](url), line breaks.
 * Specially intercepts ```json-chart``` to render Recharts.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+?)_/g, '<em>$1</em>')
    .replace(/`([^`\n]+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+?)\]\((https?:\/\/[^)]+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function parseBlocks(raw: string): string {
  const lines = raw.split('\n');
  let html = '';
  let i = 0;
  let inList = false;

  const flushList = () => {
    if (inList) { html += '</ul>'; inList = false; }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      flushList();
      const lang = line.slice(3).trim();
      i++;
      let code = '';
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += escapeHtml(lines[i]) + '\n';
        i++;
      }
      html += `<pre><code${lang ? ` class="language-${lang}"` : ''}>${code.trimEnd()}</code></pre>`;
      i++;
      continue;
    }

    const hMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      html += `<h${level}>${parseInline(hMatch[2])}</h${level}>`;
      i++;
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)/);
    if (listMatch) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${parseInline(listMatch[1])}</li>`;
      i++;
      continue;
    }

    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    flushList();
    html += `<p>${parseInline(line)}</p>`;
    i++;
  }

  flushList();
  return html;
}

function RenderChart({ dataStr }: { dataStr: string }) {
  try {
    const data = JSON.parse(dataStr);
    return (
      <div className="w-full h-64 mt-4 mb-4 rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey='placeholder_key_value' stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--text-primary)' }}
            />
            <Bar dataKey='placeholder_key_value' fill="var(--badge-bg)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  } catch {
    return <div className="text-red-400 text-xs mt-2 mb-2 p-2 rounded bg-red-500/10 border border-red-500/20">Invalid chart data</div>;
  }
}

interface MarkdownProps {
  content: string;
  className?: string;
}

export default function Markdown({ content, className = '' }: MarkdownProps) {
  const parts = useMemo(() => {
    const regex = /```json-chart\n([\s\S]*?)\n```/g;
    const result = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      result.push({ type: 'chart', content: match[1] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      result.push({ type: 'text', content: content.slice(lastIndex) });
    }
    return result;
  }, [content]);

  return (
    <div className={`prose-chat ${className}`}>
      {parts.map((part, i) => {
        if (part.type === 'chart') {
          return <RenderChart key={i} dataStr={part.content} />;
        }
        
        const hasMarkdown = /(\*\*|__|`|#{1,3} |^[-*] |\[.+?\]\(.+?\)|```)/m.test(part.content);
        if (!hasMarkdown) {
          return (
            <React.Fragment key={i}>
              {part.content.split('\n').map((line, j) =>
                line.trim() ? <p key={`${i}-${j}`}>{line}</p> : <br key={`${i}-${j}`} />
              )}
            </React.Fragment>
          );
        }
        
        return (
          <div
            key={i}
            dangerouslySetInnerHTML={{ __html: parseBlocks(part.content) }}
          />
        );
      })}
    </div>
  );
}
