'use client';

import ReactMarkdown from 'react-markdown';
import { visit } from 'unist-util-visit';
import type { Root, Text, Strong } from 'mdast';

// CommonMark's delimiter rules fail when ** is adjacent to CJK characters (e.g.
// closing ** preceded by punctuation like ' or ) and followed by a Korean letter).
// This plugin finds any remaining literal **...** text nodes after remark's parse
// pass and promotes them to proper strong AST nodes.
function remarkForceBold() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (index == null || !parent || !node.value.includes('**')) return;

      const parts = node.value.split(/(\*\*[\s\S]+?\*\*)/);
      if (parts.length === 1) return;

      const newNodes = parts
        .filter((p) => p !== '')
        .map((part) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return {
              type: 'strong',
              children: [{ type: 'text', value: part.slice(2, -2) }],
            } as Strong;
          }
          return { type: 'text', value: part } as Text;
        });

      parent.children.splice(index, 1, ...newNodes);
      return index + newNodes.length;
    });
  };
}

interface MarkdownProps {
  children: string;
  className?: string;
}

export default function Markdown({ children, className = '' }: MarkdownProps) {
  return (
    <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkForceBold]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-[#EAA09C]">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children }) => <code className="bg-[#173F35] px-1 rounded text-sm">{children}</code>,
      }}
    >
      {children}
    </ReactMarkdown>
    </div>
  );
}
