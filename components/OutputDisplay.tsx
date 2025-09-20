import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { marked } from 'marked';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import Spinner from './Spinner';
import Watermark from './Watermark';
import DownloadableStyledContent from './DownloadableStyledContent';
import PdfEditorModal from './PdfEditorModal';
import PdfContent from './PdfContent';
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
    const pdfContentRef = useRef<HTMLDivElement>(null);
    const downloadMenuRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // PDF specific state
    const [isPdfEditorOpen, setIsPdfEditorOpen] = useState(false);
    const [pdfRenderContent, setPdfRenderContent] = useState<string | null>(null);

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

    const handleDownloadVideo = () => {
        if (!result?.imageUrl) return; // imageUrl now holds the base64 video
        setIsDownloading('mp4');
        const link = document.createElement('a');
        link.href = result.imageUrl;
        link.download = `${sanitizeFilename(topic)}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsDownloading(null);
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
    
    const handleGeneratePdf = async (editedMarkdown: string) => {
        setIsPdfEditorOpen(false);
        setIsDownloading('pdf');
        setPdfRenderContent(editedMarkdown);

        // Allow time for the paginated content to render off-screen
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const container = pdfContentRef.current;
        if (!container) {
            console.error("PDF content container not found.");
            setIsDownloading(null);
            return;
        }

        const pageElements = Array.from(container.querySelectorAll('.pdf-page')) as HTMLElement[];
        if (pageElements.length === 0) {
            console.error("No pages found to generate PDF.");
            setIsDownloading(null);
            setPdfRenderContent(null);
            return;
        }

        try {
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const linkedInUrl = "https://www.linkedin.com/in/ganapathi-kakarla-b82341178/";

            for (let i = 0; i < pageElements.length; i++) {
                const pageElement = pageElements[i];
                const canvas = await html2canvas(pageElement, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: pageElement.offsetWidth,
                    height: pageElement.offsetHeight,
                });
                const imgData = canvas.toDataURL('image/png');

                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

                // Add hyperlink to footer link on the current page
                const linkEl = pageElement.querySelector(`#linkedin-link-${i}`);
                if (linkEl) {
                    const containerRect = pageElement.getBoundingClientRect();
                    const elRect = linkEl.getBoundingClientRect();
                    
                    const relativePos = {
                        x: elRect.left - containerRect.left,
                        y: elRect.top - containerRect.top,
                        width: elRect.width,
                        height: elRect.height,
                    };

                    const pxToPtRatio = pdfWidth / pageElement.offsetWidth;
                    
                    const linkCoords = {
                        x: relativePos.x * pxToPtRatio,
                        y: relativePos.y * pxToPtRatio,
                        w: relativePos.width * pxToPtRatio,
                        h: relativePos.height * pxToPtRatio,
                    };
                    
                    pdf.link(linkCoords.x, linkCoords.y, linkCoords.w, linkCoords.h, { url: linkedInUrl });
                }

                // Add hyperlink to header link on the FIRST page
                if (i === 0) {
                     const headerLinkEl = pageElement.querySelector('header p a');
                     if (headerLinkEl) {
                         const containerRect = pageElement.getBoundingClientRect();
                         const elRect = headerLinkEl.getBoundingClientRect();

                         const relativePos = {
                             x: elRect.left - containerRect.left,
                             y: elRect.top - containerRect.top,
                             width: elRect.width,
                             height: elRect.height,
                         };
                         
                         const pxToPtRatio = pdfWidth / pageElement.offsetWidth;
                         const linkCoords = {
                            x: relativePos.x * pxToPtRatio,
                            y: relativePos.y * pxToPtRatio,
                            w: relativePos.width * pxToPtRatio,
                            h: relativePos.height * pxToPtRatio,
                         };
                         
                         pdf.link(linkCoords.x, linkCoords.y, linkCoords.w, linkCoords.h, { url: linkedInUrl });
                     }
                }
            }

            pdf.save(`${sanitizeFilename(topic)}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(null);
            setPdfRenderContent(null);
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
                    <div className="prose prose-xl prose-invert max-w-none">
                        {result.imageUrl && generationType === GenerationType.ImagePost && (
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
                        {result.imageUrl && generationType === GenerationType.Video && (
                            <div className="not-prose mb-6">
                                <video 
                                    src={result.imageUrl} 
                                    controls 
                                    autoPlay 
                                    muted 
                                    loop
                                    playsInline
                                    className="w-full aspect-video object-contain rounded-lg shadow-lg bg-black"
                                >
                                    Your browser does not support the video tag.
                                </video>
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
                                        <li key={index} className="text-sm">
                                            <a
                                                href={source.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 hover:underline"
                                            >
                                                {index + 1}. {source.title || source.uri}
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
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                     <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-300">Welcome to the Content Engine</h3>
                    <p className="mt-1 text-sm text-gray-500">Configure your content on the left and click 'Generate' to begin.</p>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-800 rounded-2xl shadow-lg h-full flex flex-col relative overflow-hidden">
            <div className="flex-shrink-0 p-3 bg-gray-900/50 flex items-center justify-between border-b border-gray-700">
                <div className="flex-grow"></div> {/* Spacer */}
                <div className="flex items-center gap-2">
                    {result?.text && !isIdeaGenerationType && (
                        <button 
                            onClick={onHumanify}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-800/50 hover:bg-purple-800/80 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            title="Rewrite the text to sound more natural"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                            Humanify
                        </button>
                    )}
                    {result?.text && (
                        <button
                            onClick={handleCopy}
                            className="px-3 py-1.5 text-xs font-semibold text-green-300 bg-green-800/50 hover:bg-green-800/80 rounded-full transition-colors duration-200 flex items-center gap-1.5"
                            title="Copy markdown to clipboard"
                        >
                            {copySuccess ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                                    Copy
                                </>
                            )}
                        </button>
                    )}
                    <div ref={downloadMenuRef} className="relative">
                        <button
                             onClick={() => setDownloadMenuOpen(prev => !prev)}
                             disabled={!result?.text}
                             className="px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-800/50 hover:bg-blue-800/80 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                             title="Download content"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                             Download
                        </button>
                        {downloadMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-20">
                                <ul className="py-1">
                                    {generationType === GenerationType.Video && result?.imageUrl && (
                                         <li>
                                            <button onClick={handleDownloadVideo} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">
                                                {isDownloading === 'mp4' ? 'Downloading...' : 'Download Video (.mp4)'}
                                            </button>
                                        </li>
                                    )}
                                    {generationType !== GenerationType.Video && (
                                         <>
                                            <li>
                                                <button onClick={() => setIsPdfEditorOpen(true)} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">
                                                    {isDownloading === 'pdf' ? 'Generating...' : 'Export as PDF...'}
                                                </button>
                                            </li>
                                            <li>
                                                <button onClick={handleDownloadText} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">
                                                    {isDownloading === 'md' ? 'Downloading...' : 'Download Markdown (.md)'}
                                                </button>
                                            </li>
                                            <li>
                                                <button onClick={() => handleDownloadImage('png')} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">
                                                    {isDownloading === 'png' ? 'Generating...' : 'Download as Image (.png)'}
                                                </button>
                                            </li>
                                            <li>
                                                <button onClick={() => handleDownloadImage('jpeg')} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">
                                                    {isDownloading === 'jpeg' ? 'Generating...' : 'Download as Image (.jpeg)'}
                                                </button>
                                            </li>
                                         </>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {renderContent()}

            {/* Hidden, styled content for image downloads */}
            <div className="absolute -left-[9999px] top-0">
                <DownloadableStyledContent ref={downloadableContentRef} htmlContent={parsedHtml} topic={topic} />
            </div>

            {/* PDF Editor Modal */}
            <PdfEditorModal
                isOpen={isPdfEditorOpen}
                onClose={() => setIsPdfEditorOpen(false)}
                initialContent={result?.text || ''}
                topic={topic}
                onGenerate={handleGeneratePdf}
            />
            
            {/* Hidden container for PDF rendering */}
            {pdfRenderContent && (
                <div className="absolute -left-[9999px] top-0">
                    <PdfContent ref={pdfContentRef} markdownContent={pdfRenderContent} />
                </div>
            )}
        </div>
    );
};

export default OutputDisplay;
