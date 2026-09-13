import React from 'react';
import {
    Eraser, Download, Trash2, PenTool, Undo, Redo,
    ChevronDown, ChevronUp, MousePointer2, Square, Circle,
    Minus, Move, Type, StickyNote, Grid, AlignJustify,
    ZoomIn, ZoomOut, Triangle, Diamond, Palette
} from 'lucide-react';

export const WhiteboardToolbar = ({
    tool, setTool,
    color, setColor,
    lineWidth, setLineWidth,
    backgroundType, setBackgroundType,
    backgroundColor, setBackgroundColor,
    isToolbarOpen, setIsToolbarOpen,
    undo, redo, clearAll,
    addStickyNote, handleDownload,
    historyStep, historyLength, colors
}: any) => {
    return (
        <div className={`fixed top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center transition-transform duration-300 ease-in-out z-50 ${isToolbarOpen ? 'translate-y-4' : 'translate-y-[calc(-100%+3rem)]'} max-w-[95vw] md:max-w-max`}>
            <div className="bg-zen-surface/90 backdrop-blur-3xl border border-zen-text/10 p-3 md:p-5 rounded-[32px] shadow-2xl flex flex-col gap-3 md:gap-4 w-full">
                
                {/* Top Row: Tools & Shapes */}
                <div className="flex flex-wrap items-center justify-center gap-x-2 md:gap-x-4 gap-y-2">
                    {/* Basic Tools */}
                    <div className="flex items-center gap-1 border-zen-text/10 md:border-r md:pr-4">
                        <button onClick={() => setTool('pan')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'pan' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Pan (Spacebar)">
                            <Move className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={() => setTool('pen')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'pen' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Pen">
                            <PenTool className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={() => setTool('eraser')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'eraser' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Eraser">
                            <Eraser className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>

                    {/* Shapes */}
                    <div className="flex items-center gap-1 border-zen-text/10 md:border-r md:pr-4">
                        <button onClick={() => setTool('line')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'line' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Line">
                            <Minus className="w-4 h-4 md:w-5 md:h-5 transform rotate-45" />
                        </button>
                        <button onClick={() => setTool('arrow')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'arrow' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Arrow">
                            <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </button>
                        <button onClick={() => setTool('rectangle')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'rectangle' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Rectangle">
                            <Square className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={() => setTool('circle')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'circle' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Circle">
                            <Circle className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={() => setTool('triangle')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'triangle' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Triangle">
                            <Triangle className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={() => setTool('diamond')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'diamond' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Diamond">
                            <Diamond className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>

                    {/* Additions */}
                    <div className="flex items-center gap-1 border-zen-text/10 md:border-r md:pr-4">
                        <button onClick={() => setTool('text')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'text' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Text">
                            <Type className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={addStickyNote} className="p-1.5 md:p-2 rounded-lg text-zen-text-2 hover:text-zen-text hover:bg-yellow-100 hover:text-yellow-600 transition-colors" title="Add Sticky Note">
                            <StickyNote className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <button onClick={undo} disabled={historyStep === 0} className="p-1.5 md:p-2 rounded-lg text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
                            <Undo className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={redo} disabled={historyStep === historyLength - 1} className="p-1.5 md:p-2 rounded-lg text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5 disabled:opacity-30 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)">
                            <Redo className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={clearAll} className="p-1.5 md:p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" title="Clear All">
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button onClick={handleDownload} className="p-1.5 md:p-2 rounded-lg text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5" title="Export as PNG">
                            <Download className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Styles */}
                <div className="flex flex-wrap items-center justify-center gap-x-2 md:gap-x-4 gap-y-2 pt-2 md:pt-0">
                    {/* Colors */}
                    <div className="flex items-center gap-2 border-zen-text/10 md:border-r md:pr-4">
                        {colors.map((c: any) => (
                            <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 md:w-7 md:h-7 rounded-full shadow-sm border-2 transition-transform ${color === c ? 'scale-110 border-zen-text' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>

                    {/* Line Width */}
                    <div className="flex items-center gap-2 border-zen-text/10 md:border-r md:pr-4 min-w-[100px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-zen-text-2"></span>
                        <input type="range" min="1" max="20" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="flex-1 accent-zen-accent h-1.5 bg-zen-surface-2 rounded-lg appearance-none cursor-pointer" />
                        <span className="w-3 h-3 rounded-full bg-zen-text-2"></span>
                    </div>

                    {/* Canvas Background */}
                    <div className="flex items-center gap-1 border-zen-text/10 md:border-r md:pr-4">
                        <button onClick={() => setBackgroundType('blank')} className={`p-1.5 rounded ${backgroundType === 'blank' ? 'bg-zen-surface-2 shadow-inner' : 'hover:bg-zen-text/5'}`} title="Blank Canvas">
                            <Square className="w-4 h-4 text-zen-text-2" />
                        </button>
                        <button onClick={() => setBackgroundType('grid')} className={`p-1.5 rounded ${backgroundType === 'grid' ? 'bg-zen-surface-2 shadow-inner' : 'hover:bg-zen-text/5'}`} title="Grid Canvas">
                            <Grid className="w-4 h-4 text-zen-text-2" />
                        </button>
                        <button onClick={() => setBackgroundType('ruled')} className={`p-1.5 rounded ${backgroundType === 'ruled' ? 'bg-zen-surface-2 shadow-inner' : 'hover:bg-zen-text/5'}`} title="Ruled Canvas">
                            <AlignJustify className="w-4 h-4 text-zen-text-2" />
                        </button>
                    </div>

                    {/* Background Color Picker */}
                    <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-zen-text-2" />
                        <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-6 h-6 md:w-8 md:h-8 p-0 border-0 rounded cursor-pointer bg-transparent" title="Canvas Background Color" />
                    </div>
                </div>
            </div>

            {/* Toolbar Toggle Button */}
            <button
                onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                className="mt-2 bg-zen-surface/90 backdrop-blur border border-zen-text/10 p-1.5 rounded-full shadow-md text-zen-text-2 hover:text-zen-text hover:bg-zen-surface transition-colors"
            >
                {isToolbarOpen ? <ChevronUp className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
        </div>
    );
};
