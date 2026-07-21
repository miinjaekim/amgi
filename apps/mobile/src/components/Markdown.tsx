import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

interface Props {
  children: string;
  style?: TextStyle;
}

// Minimal Markdown renderer for AI-generated explanations. Handles the subset
// the model actually emits: paragraphs, bullet/numbered lists, and inline
// **bold**, *italic*, and `code` — mirroring the web Markdown component
// without pulling in a full markdown dependency.
export default function Markdown({ children, style }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  const blocks = children.replace(/\r\n/g, '\n').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

  return (
    <View>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const isBullet = lines.every(l => /^[-*]\s+/.test(l.trim()));
        const isNumbered = lines.every(l => /^\d+\.\s+/.test(l.trim()));

        if (isBullet || isNumbered) {
          return (
            <View key={bi} style={s.list}>
              {lines.map((line, li) => {
                const content = line.trim().replace(/^([-*]|\d+\.)\s+/, '');
                const marker = isNumbered ? `${li + 1}.` : '•';
                return (
                  <View key={li} style={s.listItem}>
                    <Text style={[s.body, style, s.marker]}>{marker}</Text>
                    <Text style={[s.body, style, s.listText]}>{renderInline(content, s)}</Text>
                  </View>
                );
              })}
            </View>
          );
        }

        return (
          <Text key={bi} style={[s.body, style, bi < blocks.length - 1 && s.paragraphGap]}>
            {renderInline(block.replace(/\n/g, ' '), s)}
          </Text>
        );
      })}
    </View>
  );
}

// Splits a run of text into bold / italic / code / plain spans.
function renderInline(text: string, s: ReturnType<typeof makeStyles>): React.ReactNode[] {
  const parts = text.split(/(\*\*[\s\S]+?\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <Text key={i} style={s.bold}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <Text key={i} style={s.code}>{part.slice(1, -1)}</Text>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <Text key={i} style={s.italic}>{part.slice(1, -1)}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    body: { fontSize: 15, color: C.text, lineHeight: 22, opacity: 0.9 },
    paragraphGap: { marginBottom: 8 },
    bold: { fontWeight: '700', color: C.highlight },
    italic: { fontStyle: 'italic' },
    code: { fontFamily: 'Courier', fontSize: 14 },
    list: { marginBottom: 4 },
    listItem: { flexDirection: 'row', marginBottom: 4 },
    marker: { marginRight: 6 },
    listText: { flex: 1 },
  });
}
