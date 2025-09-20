import React, { useLayoutEffect, useState, useRef } from 'react';
import { marked } from 'marked';

interface PdfContentProps {
  markdownContent: string;
}

const PdfContent = React.forwardRef<HTMLDivElement, PdfContentProps>(
  ({ markdownContent }, ref) => {
    const linkedInUrl = "https://www.linkedin.com/in/ganapathi-kakarla-b82341178/";
    const [pages, setPages] = useState<string[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    const tokens = marked.lexer(markdownContent);
    let documentTitle: string | null = null;
    
    if (tokens.length > 0 && tokens[0].type === 'heading' && tokens[0].depth === 1) {
        documentTitle = tokens[0].text;
        tokens.shift();
    }
    const bodyHtml = marked.parser(tokens);

    // This effect handles pagination
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const allNodes = Array.from(contentRef.current.children);
        if (allNodes.length === 0) return;

        const PAGE_HEIGHT_PT = 1170; // A4 height at 96 DPI
        const PAGE_MARGIN_PT = 64 * 2; // 1 inch margins on top/bottom
        const HEADER_HEIGHT_PT = documentTitle ? 120 : 0;
        const FOOTER_HEIGHT_PT = 60;
        const PROFILE_HEADER_FIRST_PAGE_PT = 40;
        // FIX: Add a safety buffer to prevent content from being cut off at the bottom of a page.
        // This addresses inconsistencies in height measurement of rendered HTML elements.
        const SAFE_BUFFER_PT = 24; // Approx 1.5 lines of text
        
        const maxContentHeightFirstPage = PAGE_HEIGHT_PT - PAGE_MARGIN_PT - HEADER_HEIGHT_PT - PROFILE_HEADER_FIRST_PAGE_PT - FOOTER_HEIGHT_PT - SAFE_BUFFER_PT;
        const maxContentHeightSubsequentPages = PAGE_HEIGHT_PT - PAGE_MARGIN_PT - FOOTER_HEIGHT_PT - SAFE_BUFFER_PT;
        
        const paginatedContent: string[] = [];
        let currentPageNodes: Element[] = [];
        let currentPageHeight = 0;
        let isFirstPage = true;

        allNodes.forEach((node) => {
            const nodeHeight = (node as HTMLElement).offsetHeight;
            const maxContentHeight = isFirstPage ? maxContentHeightFirstPage : maxContentHeightSubsequentPages;

            if (currentPageHeight + nodeHeight > maxContentHeight && currentPageNodes.length > 0) {
                paginatedContent.push(currentPageNodes.map(n => n.outerHTML).join(''));
                currentPageNodes = [node];
                currentPageHeight = nodeHeight;
                isFirstPage = false;
            } else {
                currentPageNodes.push(node);
                currentPageHeight += nodeHeight;
            }
        });

        if (currentPageNodes.length > 0) {
            paginatedContent.push(currentPageNodes.map(n => n.outerHTML).join(''));
        }

        setPages(paginatedContent);

    }, [bodyHtml, documentTitle]);

    return (
      <>
        {/* Hidden container for measuring content */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '827px' }}>
             <div className="p-16">
                 <div ref={contentRef} className="prose max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
             </div>
        </div>
        
        {/* Visible container for rendering paginated content */}
        <div ref={ref}>
            {pages.map((pageHtml, index) => (
                <div
                    key={index}
                    className="pdf-page"
                    style={{
                        width: '827px',
                        height: '1170px',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        fontFamily: "'Inter', sans-serif",
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    <div className="p-16 flex flex-col flex-grow">
                         <style>{`
                            /* Shared styles for PDF content */
                            .pdf-prose h1, .pdf-prose h2, .pdf-prose h3 { font-family: 'Playfair Display', serif; color: #111827; }
                            .pdf-prose p, .pdf-prose li { font-family: 'Inter', sans-serif; line-height: 1.7; color: #374151; }
                            .pdf-prose a { color: #2563eb; }
                            .pdf-prose strong { color: #111827; }
                            .pdf-prose code { font-size: 0.875em; background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 4px; }
                            .pdf-prose pre { background-color: #f3f4f6; padding: 1em; border-radius: 8px; }
                            .pdf-prose blockquote { border-left-color: #d1d5db; color: #4b5563; }
                        `}</style>
                        
                        {documentTitle && index === 0 && (
                            <header className="mb-10 pb-5 border-b-2 border-gray-200">
                                <h1 className="text-4xl font-bold break-words">{documentTitle}</h1>
                                <p className="text-sm text-gray-600 mt-3">
                                    By Ganapathi Kakarla | <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{linkedInUrl}</a>
                                </p>
                            </header>
                        )}

                        <main className="flex-grow">
                            <div
                                className="prose max-w-none pdf-prose"
                                dangerouslySetInnerHTML={{ __html: pageHtml }}
                            />
                        </main>
                        
                        <footer className="mt-auto pt-5 border-t-2 border-gray-200 text-xs text-gray-500 flex justify-between items-center">
                            <p id={`linkedin-link-${index}`}>
                                Connect with Ganapathi Kakarla: <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">{linkedInUrl}</a>
                            </p>
                            <p>Page {index + 1} of {pages.length}</p>
                        </footer>
                    </div>
                </div>
            ))}
        </div>
      </>
    );
  }
);

export default PdfContent;