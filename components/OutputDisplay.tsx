import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { marked } from 'marked';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';

import Spinner from './Spinner';
import Watermark from './Watermark';
import DownloadableStyledContent from './DownloadableStyledContent';
import { GenerationResult, GenerationType, TextOverlayOptions } from '../types';

interface OutputDisplayProps {
    result: GenerationResult | null;
    isLoading: boolean;
    error: string | null;
    topic: string;
    onHumanify: () => void;
    onFollowUp: (newType: GenerationType) => void;
    onIdeaClick: (topic: string) => void;
    generationType: GenerationType;
    textOverlay?: TextOverlayOptions;
}

// This component is specifically designed for off-screen rendering for PDF generation.
// It uses a standard width and NO PADDING, as margins are now handled by jsPDF's .html() method.
const PdfContent: React.FC<{ htmlContent: string }> = ({ htmlContent }) => {
    return (
      <div
        className="bg-white text-black"
        style={{
          width: '1080px', // A fixed-width layout is more stable for canvas rendering
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
            className="prose prose-xl max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    );
};


const FollowUpActions: React.FC<{
    currentType: GenerationType;
    onFollowUp: (newType: GenerationType) => void;
}> = ({ currentType, onFollowUp }) => {
    const actions: { label: string; icon: JSX.Element; type: GenerationType }[] = [];

    switch (currentType) {
        case GenerationType.Post:
        case GenerationType.ImagePost:
        case GenerationType.ExamplePost:
            actions.push({
                label: 'Get Content Ideas',
                type: GenerationType.ContentIdeas,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            });
            actions.push({
                label: 'Expand to Document',
                type: GenerationType.Document,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            });
            break;
        case GenerationType.Document:
             actions.push({
                label: 'Create Summary Post',
                type: GenerationType.Post,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6M9 17h6m-9-8h12a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>
            });
            actions.push({
                label: 'Create Tutorial Outline',
                type: GenerationType.TutorialOutline,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            });
            break;
        case GenerationType.InterviewQuestions:
        case GenerationType.CvEnhancement:
        case GenerationType.ResumeTailoring:
             actions.push({
                label: 'Prospect Companies',
                type: GenerationType.CompanyProspector,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            });
            break;
        default:
            break;
    }

    if (actions.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 pt-6 border-t border-gray-700">
            <h4 className="text-lg font-semibold text-gray-300 mb-4">Topic Follow-ups</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {actions.map((action) => (
                    <button
                        key={action.type}
                        onClick={() => onFollowUp(action.type)}
                        className="flex items-center text-left gap-4 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <div className="flex-shrink-0 bg-gray-900/50 p-3 rounded-full">
                            {action.icon}
                        </div>
                        <div>
                            <span className="font-semibold text-white text-sm">{action.label}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};


const OutputDisplay: React.FC<OutputDisplayProps> = ({ result, isLoading, error, topic, onHumanify, onFollowUp, onIdeaClick, generationType, textOverlay }) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const [sourcesVisible, setSourcesVisible] = useState(true);
    const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const downloadableContentRef = useRef<HTMLDivElement>(null);
    const downloadableImageRef = useRef<HTMLDivElement>(null);
    const downloadMenuRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const isIdeaGenerationType = [
        GenerationType.ContentIdeas,
        GenerationType.Top10Ideas,
        GenerationType.ProfessionalIdeas,
        GenerationType.MythBusting,
        GenerationType.QuickWins,
        GenerationType.ComparativeAnalysis,
        GenerationType.TutorialOutline,
    ].includes(generationType);

    useLayoutEffect(() => {
        if (isIdeaGenerationType && contentRef.current && result) {
            const clickableElements = contentRef.current.querySelectorAll('h3, h4, li');
            const listeners: { el: HTMLElement; handler: (e: MouseEvent) => void }[] = [];

            clickableElements.forEach(el => {
                const htmlEl = el as HTMLElement;
                const strongTag = htmlEl.querySelector('strong');
                let potentialTopic = (strongTag || htmlEl).innerText.trim();

                potentialTopic = potentialTopic.split('\n')[0]; // Take only the first line
                potentialTopic = potentialTopic.replace(/^\d+\.\s*/, ''); // Remove list numbering

                if (potentialTopic.length > 5 && potentialTopic.length < 200) {
                    htmlEl.style.cursor = 'pointer';
                    htmlEl.style.transition = 'background-color 0.2s';
                    htmlEl.style.borderRadius = '4px';
                    htmlEl.style.padding = '4px';
                    htmlEl.style.margin = '-4px';
                    htmlEl.title = `Click to generate a post about: "${potentialTopic}"`;

                    const handleMouseEnter = () => { htmlEl.style.backgroundColor = 'rgba(75, 85, 99, 0.5)'; };
                    const handleMouseLeave = () => { htmlEl.style.backgroundColor = 'transparent'; };
                    const handleClick = (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onIdeaClick(potentialTopic);
                    };

                    htmlEl.addEventListener('mouseenter', handleMouseEnter);
                    htmlEl.addEventListener('mouseleave', handleMouseLeave);
                    htmlEl.addEventListener('click', handleClick);
                    
                    listeners.push({ el: htmlEl, handler: handleClick });
                }
            });

            // Cleanup function to remove listeners when the component re-renders or unmounts
            return () => {
                listeners.forEach(({ el, handler }) => {
                    el.removeEventListener('click', handler);
                    // Reset styles if needed, though not strictly necessary as element is destroyed
                    el.style.cursor = '';
                    el.style.backgroundColor = '';
                });
            };
        }
    }, [result, isIdeaGenerationType, onIdeaClick]);

    useEffect(() => {
        if (copySuccess) {
            const timer = setTimeout(() => setCopySuccess(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copySuccess]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setDownloadMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sanitizeFilename = (name: string) => {
      return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50) || 'generated-content';
    };

    const handleCopy = () => {
        if (result?.text) {
            navigator.clipboard.writeText(result.text).then(() => {
                setCopySuccess(true);
            }, (err) => {
                console.error('Failed to copy text: ', err);
            });
        }
    };

    const handleDownloadText = () => {
        if (!result?.text) return;
        setIsDownloading('md');
        const blob = new Blob([result.text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizeFilename(topic)}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(null);
    };

    const handleDownloadImage = async (format: 'png' | 'jpeg') => {
        const elementToCapture = downloadableImageRef.current || downloadableContentRef.current;
        if (!elementToCapture) return;

        setIsDownloading(format);
        try {
            const options = {
                quality: 0.98,
                backgroundColor: '#111827', // bg-gray-900
                width: 1080,
                height: 1080,
                pixelRatio: 2,
            };
            let dataUrl;
            if (format === 'png') {
                dataUrl = await toPng(elementToCapture, options);
            } else {
                dataUrl = await toJpeg(elementToCapture, options);
            }
            const link = document.createElement('a');
            link.download = `${sanitizeFilename(topic)}.${format}`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error(`Failed to generate ${format}`, err);
        } finally {
            setIsDownloading(null);
        }
    };
    
    const handleDownloadPdf = async () => {
        if (!result?.text) return;
        setIsDownloading('pdf');
    
        // Create a temporary off-screen container.
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0px';
        document.body.appendChild(container);
    
        try {
            const root = ReactDOM.createRoot(container);
            const parsedHtmlForPdf = marked.parse(result.text) as string;
    
            // Render the dedicated PDF component, which has no internal padding.
            root.render(<PdfContent htmlContent={parsedHtmlForPdf} />);
    
            // Wait for rendering and layout. A longer timeout might be needed for complex content.
            await new Promise(resolve => setTimeout(resolve, 500));
    
            const elementToCapture = container.firstChild as HTMLElement;
            if (!elementToCapture) throw new Error("PDF content failed to render.");
    
            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const marginX = pdfWidth * 0.1; // 10% margin on left and right
            const marginY = pdf.internal.pageSize.getHeight() * 0.1; // 10% margin on top and bottom

            // Use the powerful .html() method which handles pagination automatically.
            await pdf.html(elementToCapture, {
                // We use the promise-based version of .html()
                margin: [marginY, marginX, marginY, marginX],
                autoPaging: 'text', // Intelligently avoids cutting text lines
                width: pdfWidth - (marginX * 2), // The width of the content in the PDF
                windowWidth: 1080, // The width of the source HTML element
            });
    
            pdf.save(`${sanitizeFilename(topic)}.pdf`);
    
        } catch (err) {
            console.error('Failed to generate PDF', err);
        } finally {
            // Ensure cleanup happens after PDF generation is complete.
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
            setIsDownloading(null);
        }
    };

    const parsedHtml = result?.text ? marked.parse(result.text) as string : '';
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex items-center justify-center h-full"><Spinner /></div>;
        }

        if (error) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-red-400 bg-red-900/20 border border-red-500/50 rounded-lg p-8 max-w-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl font-bold mb-2 text-white">Generation Failed</h3>
                        <p className="text-red-300">{error}</p>
                    </div>
                </div>
            );
        }

        if (result?.text) {
            const hasOverlayText = textOverlay && textOverlay.text.trim() !== '';
            const placementClasses = {
                top: 'justify-start pt-8',
                center: 'justify-center',
                bottom: 'justify-end pb-8',
            };
            const fontClasses = {
                'Inter': 'font-inter',
                'Roboto Slab': 'font-roboto-slab',
                'Playfair Display': 'font-playfair-display',
            };
            
            return (
                 <div className="h-full overflow-y-auto p-6 relative">
                    <Watermark text="GANAPATHI KAKARLA" />
                    <div className="prose prose-invert max-w-none">
                        {result.imageUrl && (
                            <div ref={downloadableImageRef} className="not-prose mb-6 relative">
                               <img 
                                    src={result.imageUrl} 
                                    alt="Generated visual for the post" 
                                    className="w-full aspect-square object-cover rounded-lg shadow-lg"
                                />
                                {hasOverlayText && (
                                    <div className={`absolute inset-0 flex p-6 text-center ${placementClasses[textOverlay.placement]}`}>
                                        <p
                                            className={`w-full ${fontClasses[textOverlay.fontFamily]}`}
                                            style={{
                                                color: textOverlay.color,
                                                fontSize: `${textOverlay.fontSize}px`,
                                                lineHeight: 1.2,
                                                textShadow: '0px 2px 8px rgba(0, 0, 0, 0.7)',
                                                wordWrap: 'break-word',
                                                overflowWrap: 'break-word'
                                            }}
                                        >
                                            {textOverlay.text}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div
                            ref={contentRef}
                            className="relative z-1"
                            dangerouslySetInnerHTML={{ __html: parsedHtml }}
                        ></div>
                    </div>
                     {result.sources && result.sources.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-gray-700">
                             <button
                                onClick={() => setSourcesVisible(!sourcesVisible)}
                                className="flex justify-between items-center w-full text-left"
                            >
                                <h4 className="text-lg font-semibold text-gray-300">Sources from Google Search</h4>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transition-transform ${sourcesVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {sourcesVisible && (
                                <ul className="space-y-2 mt-2">
                                    {result.sources.map((source, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-1 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
                                                {source.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    <FollowUpActions currentType={generationType} onFollowUp={onFollowUp} />
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-semibold">Your AI-generated content will appear here</h3>
                <p className="mt-2 max-w-md">Select your content type, enter a topic, and click "Generate" to start.</p>
            </div>
        );
    }
    
    const renderDownloadButtonContent = (label: string, format: string) => (
        <>
            {isDownloading === format ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                </>
            ) : (
                label
            )}
        </>
    );

    return (
        <div className="bg-gray-800 rounded-2xl shadow-lg relative h-full flex flex-col">
            {result?.text && (
                 <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                    <DownloadableStyledContent
                        ref={downloadableContentRef}
                        htmlContent={parsedHtml}
                    />
                </div>
            )}
            {result?.text && !isLoading && !error && (
                 <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    <button
                        onClick={onHumanify}
                        className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                        title="Rewrite the text to sound more natural and less like AI."
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Humanify
                     </button>
                     
                    <div ref={downloadMenuRef} className="relative">
                        <button
                            onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                            className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                        >
                            Download As
                             <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {downloadMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-600 rounded-lg shadow-xl py-1 z-30">
                                <button onClick={() => handleDownloadImage('png')} disabled={!!isDownloading} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-500 flex items-center disabled:opacity-50 disabled:cursor-wait">
                                    {renderDownloadButtonContent('PNG Image', 'png')}
                                </button>
                                <button onClick={() => handleDownloadImage('jpeg')} disabled={!!isDownloading} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-500 flex items-center disabled:opacity-50 disabled:cursor-wait">
                                    {renderDownloadButtonContent('JPG Image', 'jpeg')}
                                </button>
                                 <button onClick={handleDownloadPdf} disabled={!!isDownloading} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-500 flex items-center disabled:opacity-50 disabled:cursor-wait">
                                    {renderDownloadButtonContent('PDF Document', 'pdf')}
                                </button>
                                <button onClick={handleDownloadText} disabled={!!isDownloading} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-500 flex items-center disabled:opacity-50 disabled:cursor-wait">
                                    {renderDownloadButtonContent('Markdown (.md)', 'md')}
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleCopy}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${copySuccess ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        {copySuccess ? 'Copied!' : 'Copy Text'}
                    </button>
                </div>
            )}
            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default OutputDisplay;
