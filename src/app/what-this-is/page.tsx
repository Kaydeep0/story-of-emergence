import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Parse markdown content into structured sections
 * Preserves exact text from markdown file - no paraphrasing, no additions
 */
function parseMarkdown(content: string): Array<{ type: 'h1' | 'h2' | 'p'; text: string }> {
  const lines = content.split('\n');
  const sections: Array<{ type: 'h1' | 'h2' | 'p'; text: string }> = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('# ')) {
      sections.push({ type: 'h1', text: trimmed.slice(2).trim() });
    } else if (trimmed.startsWith('## ')) {
      sections.push({ type: 'h2', text: trimmed.slice(3).trim() });
    } else {
      sections.push({ type: 'p', text: trimmed });
    }
  }
  
  return sections;
}

export default async function WhatThisIsPage() {
  // Read markdown file from docs directory - exact source, no modifications
  const filePath = join(process.cwd(), 'docs', 'WHAT_THIS_IS.md');
  const fileContent = await readFile(filePath, 'utf-8');
  const sections = parseMarkdown(fileContent);

  return (
    <>
      {/* Hide root layout header and overlay for this route */}
      <style dangerouslySetInnerHTML={{ __html: `
        header:not(.what-this-is-header),
        [data-vault-overlay] {
          display: none !important;
        }
        body {
          background: white !important;
          color: #111827 !important;
        }
        main {
          padding: 0 !important;
          max-width: none !important;
        }
      `}} />
      
      <article className="max-w-[680px] mx-auto px-6 py-16">
        <div className="space-y-6">
          {sections.map((section, index) => {
            if (section.type === 'h1') {
              return (
                <h1 key={index} className="text-3xl font-normal text-gray-900 mb-6">
                  {section.text}
                </h1>
              );
            }
            
            if (section.type === 'h2') {
              return (
                <h2 key={index} className="text-xl font-normal text-gray-900 mt-10 mb-4 first:mt-0">
                  {section.text}
                </h2>
              );
            }
            
            return (
              <p key={index} className="text-base leading-relaxed text-gray-700">
                {section.text}
              </p>
            );
          })}
        </div>
      </article>
    </>
  );
}

