import React from 'react';

interface DownloadableStyledContentProps {
  htmlContent: string;
}

const DownloadableStyledContent = React.forwardRef<HTMLDivElement, DownloadableStyledContentProps>(
  ({ htmlContent }, ref) => {
    // This component is rendered off-screen and used by html-to-image and jspdf
    // to generate styled, shareable content.
    return (
      <div
        ref={ref}
        className="bg-white text-black p-12 w-[1080px] h-[1080px] border-[16px] border-black flex flex-col"
        style={{ fontFamily: 'Georgia, serif', borderStyle: 'double' }}
      >
        <div className="flex-grow flex items-center justify-center overflow-hidden">
             <div
                className="prose prose-xl max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
        </div>
      </div>
    );
  }
);

export default DownloadableStyledContent;