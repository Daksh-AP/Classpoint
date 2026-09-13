import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ExternalLink, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Move, PenTool, Eraser, Square, Circle, Type, RotateCcw, Save, Undo } from 'lucide-react';
import toast from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({ fileUrl, onClose, onSave }: any) => {
    // Document State
    const [numPages, setNumPages] = useState<any | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);

    // Canvas & Tool State
    const [tool, setTool] = useState('move');
    const [color, setColor] = useState('#ef4444');
    const [lineWidth, setLineWidth] = useState(3);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    // Ref for pan position — mutated directly during drag to avoid React re-renders on every mouse move
    const positionRef = useRef({ x: 0, y: 0 });
    const panTargetRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isDrawing, setIsDrawing] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: '' });

    // History (Per Page)
    const [pageHistories, setPageHistories] = useState<any>({});
    const [pageHistorySteps, setPageHistorySteps] = useState<any>({});

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const pdfPageRef = useRef<HTMLDivElement>(null); // Reference to the rendered page element

    // --- History Management ---
    const getHistory = (page = pageNumber) => pageHistories[page] || [];
    const getStep = (page = pageNumber) => pageHistorySteps[page] ?? -1;

    const saveHistory = () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob((blob) => {
            if (!blob) return;
            const dataUrl = URL.createObjectURL(blob);
            setPageHistories((prev: any) => {
                const currentHist = prev[pageNumber] || [];
                const currentStep = pageHistorySteps[pageNumber] ?? -1;
                const newHist = currentHist.slice(0, currentStep + 1);
                newHist.push(dataUrl);
                return { ...prev, [pageNumber]: newHist };
            });
            setPageHistorySteps((prev: any) => {
                const currentStep = prev[pageNumber] ?? -1;
                return { ...prev, [pageNumber]: currentStep + 1 };
            });
        });
    };

    const loadCanvasFromHistory = (histArray: any, stepOffset = 0) => {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (histArray.length > 0 && histArray.length - 1 + stepOffset >= 0) {
            const img = new Image();
            img.src = histArray[histArray.length - 1 + stepOffset];
            img.onload = () => ctx.drawImage(img, 0, 0);
        }
    };

    const undo = () => {
        const step = getStep();
        if (step > 0) {
            setPageHistorySteps((prev: any) => ({ ...prev, [pageNumber]: step - 1 }));
            const hist = getHistory();
            const img = new Image();
            img.src = hist[step - 1];
            img.onload = () => {
                const ctx = contextRef.current;
                const canvas = canvasRef.current;
                if (!ctx || !canvas) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        } else if (step === 0) {
            setPageHistorySteps((prev: any) => ({ ...prev, [pageNumber]: -1 }));
            if (contextRef.current && canvasRef.current) {
                contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    };

    const clearCanvas = () => {
        if (contextRef.current && canvasRef.current) {
            contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            saveHistory();
        }
    };

    // --- Page Rendering & Setup ---
    const onRenderSuccess = () => {
        if (!pdfPageRef.current) return;
        const pageDiv = pdfPageRef.current;
        // React-pdf sets a wrapper div. Find the first canvas child to get accurate rendered size.
        const renderedCanvas = pageDiv.querySelector('canvas');
        if (renderedCanvas) {
            const w = renderedCanvas.offsetWidth;
            const h = renderedCanvas.offsetHeight;
            setCanvasSize({ width: w, height: h });

            // Initialize our overlay canvas strictly matching the PDF page aspect
            const ourCanvas = canvasRef.current;
            if (!ourCanvas) return;
            ourCanvas.width = w;
            ourCanvas.height = h;

            const ctx = ourCanvas.getContext('2d');
            if (!ctx) return;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            contextRef.current = ctx;

            // Restore previous drawings for this page if they exist
            const hist = getHistory();
            const step = getStep();
            
            if (hist.length > 0 && step >= 0) {
                const img = new Image();
                img.src = hist[step];
                img.onload = () => ctx.drawImage(img, 0, 0);
            }
        }
    };

    // --- Context Updates ---
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
            contextRef.current.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        }
    }, [tool, color, lineWidth]);

    // --- Drawing Handlers ---
    const getMousePos = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        };
    };

    const startDrawing = (e: any) => {
        if (tool === 'move') {
            setIsDragging(true);
            setDragStart({ x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y });
            return;
        }

        const { x, y } = getMousePos(e.nativeEvent);

        if (tool === 'text') {
            setTextInput({ visible: true, x, y, value: '' });
            return;
        }

        if (!contextRef.current) return;
        contextRef.current.beginPath();
        contextRef.current.moveTo(x, y);
        setIsDrawing(true);
        setDragStart({ x, y });
    };

    const draw = (e: any) => {
        if (tool === 'move') {
            if (isDragging && panTargetRef.current) {
                const newX = e.clientX - dragStart.x;
                const newY = e.clientY - dragStart.y;
                // Write directly to DOM — no setState, no React re-render during pan
                positionRef.current = { x: newX, y: newY };
                panTargetRef.current.style.transform = `scale(${scale}) translate(${newX}px, ${newY}px)`;
            }
            return;
        }

        if (!isDrawing) return;
        const { x, y } = getMousePos(e.nativeEvent);

        if (!contextRef.current || !canvasRef.current) return;

        if (tool === 'pen' || tool === 'eraser') {
            contextRef.current.lineTo(x, y);
            contextRef.current.stroke();
        } else if (tool === 'rect' || tool === 'circle') {
            const ctx = contextRef.current;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            const hist = getHistory();
            const step = getStep();
            if (step >= 0) {
                const bg = new Image();
                bg.src = hist[step];
                ctx.drawImage(bg, 0, 0);
            }

            ctx.beginPath();
            if (tool === 'rect') {
                ctx.rect(dragStart.x, dragStart.y, x - dragStart.x, y - dragStart.y);
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(x - dragStart.x, 2) + Math.pow(y - dragStart.y, 2));
                ctx.arc(dragStart.x, dragStart.y, radius, 0, 2 * Math.PI);
            }
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        if (tool === 'move') {
            setIsDragging(false);
            // Sync ref position to React state only once on drag end
            setPosition({ ...positionRef.current });
            return;
        }
        if (isDrawing && contextRef.current) {
            contextRef.current.closePath();
            setIsDrawing(false);
            saveHistory();
        }
    };

    const handleTextSubmit = () => {
        if (textInput.value) {
            const ctx = contextRef.current;
            if (!ctx) return;
            ctx.font = `${lineWidth * 5}px Arial`;
            ctx.fillStyle = color;
            ctx.fillText(textInput.value, textInput.x, textInput.y);
            saveHistory();
        }
        setTextInput({ ...textInput, visible: false });
    };

    // --- Controls ---
    const changePage = (offset: any) => {
        if (isDrawing || isDragging) return;
        setPageNumber((prev: any) => Math.min(Math.max(1, prev + offset), numPages));
    };

    const handleSaveImage = async () => {
        try {
            if (!pdfPageRef.current || !canvasRef.current) return;

            // Grab the internal PDF.js canvas element
            const pdfInternalCanvas = pdfPageRef.current.querySelector('canvas');
            if (!pdfInternalCanvas) {
                toast.error('Cannot save: PDF page not fully rendered yet.');
                return;
            }

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasRef.current.width;
            tempCanvas.height = canvasRef.current.height;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) return;

            // Draw PDF page canvas, then the annotation canvas on top
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(pdfInternalCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(canvasRef.current, 0, 0);

            tempCanvas.toBlob(async (blob) => {
                if (!blob) return;
                const dataUrl = URL.createObjectURL(blob);
                if (onSave) {
                    await onSave(dataUrl);
                    onClose(); // Automatically close returning to ResourceHub on save usually, or show success toast
                } else {
                    // Fallback download if no onSave provided
                    const link = document.createElement('a');
                    link.download = `Annotated_Page_${pageNumber}.png`;
                    link.href = dataUrl;
                    link.click();
                }
            }, 'image/png');
        } catch (error) {
// /* console.error */ ("Failed to save image:", error);
            toast.error("Failed to save annotation.");
        }
    };

    const openExternal = () => {
        try {
            if (window.electronAPI) {
                window.electronAPI.invoke('open-path', fileUrl).then((res: any) => {
                    if (!res.success) {
// /* console.error */ ("Failed to open PDF:", res.error);
                        toast.error("Failed to open PDF.");
                    }
                }).catch((err: any) => {
// /* console.error */ ("IPC Error:", err);
                    toast.error("Failed to communicate with system.");
                });
            } else {
                window.open(fileUrl, '_blank');
            }
        } catch (error) {
// /* console.error */ ("Error opening external:", error);
            toast.error("Failed to open file.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-zen-surface">
            {/* Extended Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-3 gap-3 bg-[#2C2C2E] border-b border-white/10 shrink-0 shadow-lg z-50">
                {/* Left: Info & Tools */}
                <div className="flex items-center gap-4 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
                    <div className="flex items-center bg-white/10 rounded-lg p-1">
                        <button onClick={undo} className="p-2 text-gray-400 hover:text-white" title="Undo Annotation">
                            <Undo className="w-5 h-5" />
                        </button>
                        <div className="h-4 w-px bg-white/20 mx-1" />
                        <button onClick={() => setScale((s: any) => Math.max(s - 0.2, 0.5))} className="p-2 text-gray-400 hover:text-white">
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <span className="text-white text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale((s: any) => Math.min(s + 0.2, 3.0))} className="p-2 text-gray-400 hover:text-white">
                            <ZoomIn className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/20 shrink-0" />

                    {/* Tools */}
                    <div className="flex items-center bg-white/10 rounded-lg p-1 shrink-0">
                        {[
                            { id: 'move', icon: Move, title: 'Pan Tool' },
                            { id: 'pen', icon: PenTool, title: 'Pen' },
                            { id: 'eraser', icon: Eraser, title: 'Eraser' },
                            { id: 'rect', icon: Square, title: 'Rectangle' },
                            { id: 'circle', icon: Circle, title: 'Circle' },
                            { id: 'text', icon: Type, title: 'Text' },
                        ].map((t: any) => (
                            <button
                                key={t.id}
                                onClick={() => setTool(t.id)}
                                className={`p-2 rounded-md transition-all ${tool === t.id ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                                title={t.title}
                            >
                                <t.icon className="w-5 h-5" />
                            </button>
                        ))}
                    </div>

                    {/* Colors & Width */}
                    <div className="flex items-center gap-2 shrink-0">
                        {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ffffff', '#000000'].map((c: any) => (
                            <button
                                key={c}
                                onClick={() => { setColor(c); if (tool === 'eraser' || tool === 'move') setTool('pen'); }}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c && tool !== 'eraser' ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <input
                            type="range" min="1" max="20"
                            value={lineWidth}
                            onChange={(e: any) => setLineWidth(parseInt(e.target.value))}
                            className="w-24 accent-blue-500"
                        />
                    </div>
                </div>

                {/* Right: Pagination & Actions */}
                <div className="flex items-center gap-4 shrink-0">
                    {numPages && (
                        <div className="flex items-center bg-white/10 rounded-lg p-1">
                            <button disabled={pageNumber <= 1} onClick={() => changePage(-1)} className="p-1.5 rounded disabled:opacity-30 hover:bg-white/20 text-white">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <p className="text-white text-sm font-medium w-16 text-center">{pageNumber} / {numPages}</p>
                            <button disabled={pageNumber >= numPages} onClick={() => changePage(1)} className="p-1.5 rounded disabled:opacity-30 hover:bg-white/20 text-white">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    
                    <div className="h-8 w-px bg-white/20" />

                    <button onClick={clearCanvas} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg" title="Clear Annotations">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button onClick={handleSaveImage} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all shadow-md">
                        <Save className="w-4 h-4" />
                        <span className="hidden lg:inline">Save Page</span>
                    </button>
                    <button onClick={openExternal} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all" title="Open PDF">
                        <ExternalLink className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-lg" title="Close Viewer">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Document Render Area */}
            <div className="flex-1 relative overflow-hidden bg-dots-pattern flex items-center justify-center py-8" ref={containerRef}>
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-[200] bg-zen-surface/80 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-white font-medium text-lg shadow-black drop-shadow-md">Loading PDF Engine...</p>
                    </div>
                )}
                
                <div
                    ref={panTargetRef}
                    className="relative shadow-2xl transition-transform duration-75 origin-center"
                    style={{
                        transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                        cursor: tool === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'
                    }}
                >
                    <Document
                        file={fileUrl}
                        onLoadSuccess={({ numPages }: any) => { setNumPages(numPages); setLoading(false); }}
                        onLoadError={(error: any) => { /* console.error */ (error); setLoading(false); toast.error('Could not load native PDF display. Please use Open Externally.'); }}
                        loading={null}
                    >
                        <div ref={pdfPageRef} className="relative">
                            <Page 
                                pageNumber={pageNumber} 
                                scale={1.0} // Scale is handled by the wrapper div instead, ensures sharp resolution mapping to canvas
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                onRenderSuccess={onRenderSuccess}
                                loading={null}
                                className="bg-white pointer-events-none select-none"
                            />
                        </div>
                    </Document>

                    {/* Annotation Overlay Canvas */}
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="absolute inset-0 touch-none z-[60]"
                        style={{ width: canvasSize.width, height: canvasSize.height }}
                    />

                    {textInput.visible && (
                        <div className="absolute z-[70] transform -translate-y-1/2" style={{ left: textInput.x, top: textInput.y }}>
                            <input
                                autoFocus type="text"
                                className="bg-white/90 text-black px-2 py-1 rounded border border-blue-500 outline-none shadow-lg min-w-[100px]"
                                style={{ fontSize: Math.max(16, lineWidth * 5) + 'px', color: color }}
                                placeholder="Type text..."
                                value={textInput.value}
                                onChange={(e: any) => setTextInput({ ...textInput, value: e.target.value })}
                                onKeyDown={(e: any) => { if (e.key === 'Enter' || e.key === 'Escape') handleTextSubmit(); }}
                                onBlur={handleTextSubmit}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PDFViewer;
