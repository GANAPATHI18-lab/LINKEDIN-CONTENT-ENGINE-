import React from 'react';

interface DownloadableStyledContentProps {
  htmlContent: string;
  topic: string;
}

const DownloadableStyledContent = React.forwardRef<HTMLDivElement, DownloadableStyledContentProps>(
  ({ htmlContent, topic }, ref) => {
    // This component is rendered off-screen and used by html-to-image
    // to generate a modern, professionally styled shareable image.
    return (
      <div
        ref={ref}
        className="bg-slate-50 text-slate-900 p-16 w-[1080px] h-[1080px] flex flex-col font-inter"
      >
        {/* Style tag to override prose defaults for a more compact layout suitable for an image */}
        <style>{`
            .image-content p {
                margin-top: 0.75em;
                margin-bottom: 0.75em;
                line-height: 1.6;
            }
            .image-content h2 {
                margin-top: 1.5em;
                margin-bottom: 0.75em;
            }
            .image-content h3 {
                margin-top: 1.25em;
                margin-bottom: 0.5em;
            }
            .image-content ul, .image-content ol {
                margin-top: 0.75em;
                margin-bottom: 0.75em;
            }
            .image-content li {
                margin-top: 0.25em;
                margin-bottom: 0.25em;
            }
        `}</style>
        <header className="mb-8 pb-4 border-b-2 border-slate-200">
            <h1 className="text-5xl font-bold text-slate-800 font-playfair-display break-words">
                {topic}
            </h1>
        </header>

        <main className="flex-grow overflow-hidden">
            <div
                className="prose max-w-none text-slate-800 image-content"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
        </main>
        
        <footer className="mt-auto pt-4 border-t-2 border-slate-200 text-center text-sm text-slate-600">
            <p className="mb-1 font-semibold">
                Found this useful? Repost to share with your network and help spread knowledge!
            </p>
            <a 
                href="https://www.linkedin.com/in/ganapathi-kakarla-b82341178/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline"
            >
                Connect with Ganapathi Kakarla
            </a>
        </footer>
      </div>
    );
  }
);

export default DownloadableStyledContent;