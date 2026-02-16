import React from 'react';
import { X } from 'lucide-react';

const PDFViewer = ({ fileUrl, onClose }) => {
    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-xl border-b border-white/10">
                <h2 className="text-white text-lg font-medium truncate max-w-[80%]">
                    {fileUrl ? fileUrl.split(/[/\\]/).pop() : 'PDF Viewer'}
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
                    title="Close"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* PDF Content */}
            <div className="flex-1 bg-gray-900 relative">
                <iframe
                    src={fileUrl}
                    className="w-full h-full border-none"
                    title="PDF Viewer"
                />
            </div>
        </div>
    );
};

export default PDFViewer;
