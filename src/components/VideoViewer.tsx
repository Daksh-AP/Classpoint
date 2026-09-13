import React from 'react';
import { X } from 'lucide-react';

const VideoViewer = ({ videoUrl, onClose }: any) => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-xl">
             <div className="flex items-center justify-end p-4 border-b border-white/10 shrink-0 z-50">
                 <button
                     onClick={onClose}
                     className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                 >
                     <X className="w-6 h-6" />
                 </button>
             </div>
             <div className="flex-1 w-full h-full flex items-center justify-center p-8">
                 <video 
                     src={videoUrl} 
                     controls 
                     autoPlay 
                     className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                 />
             </div>
        </div>
    );
};

export default VideoViewer;
