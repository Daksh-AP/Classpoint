import React, { useState, useRef, useEffect } from 'react';
import { X, Save, PenTool, Eraser, RotateCcw, Download, Minus, Plus, Undo, ZoomIn, ZoomOut, Move, Type, Square, Circle } from 'lucide-react';

const ImageViewer = ({ imageUrl, onClose, onSave }: any) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [history, setHistory] = useState<string[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);
    const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: '' });
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pen'); // 'pen', 'eraser', 'rect', 'circle', 'text', 'move'
    const [color, setColor] = useState('#ef4444'); // Default red
    const [lineWidth, setLineWidth] = useState(3);

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Initialize canvas when image loads
    const handleImageLoad = () => {
        if (containerRef.current && imageRef.current && canvasRef.current) {
            const { width, height } = imageRef.current.getBoundingClientRect();
            setCanvasSize({ width, height });

            const canvas = canvasRef.current;
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            contextRef.current = ctx;

            // Save initial empty state
            saveHistory();
        }
    };

    const saveHistory = () => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const dataUrl = canvas.toDataURL();
            const newHistory = history.slice(0, historyStep + 1);
            newHistory.push(dataUrl);
            setHistory(newHistory);
            setHistoryStep(newHistory.length - 1);
        }
    };

    const undo = () => {
        if (historyStep > 0 && canvasRef.current) {
            const newStep = historyStep - 1;
            setHistoryStep(newStep);
            const img = new Image();
            img.src = history[newStep] || '';
            img.onload = () => {
                const ctx = contextRef.current;
                if (!ctx || !canvasRef.current) return;
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    };

    const getMousePos = (e: any) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        };
    };

    // Update context when tool/color/width changes
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
            contextRef.current.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        }
    }, [tool, color, lineWidth]);

    const startDrawing = (e: any) => {
        if (tool === 'move') {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
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
        // Store start position for shapes
        setDragStart({ x, y });
    };

    const draw = (e: any) => {
        if (tool === 'move') {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                });
            }
            return;
        }

        if (!isDrawing || !contextRef.current || !canvasRef.current) return;
        const { x, y } = getMousePos(e.nativeEvent);

        if (tool === 'pen' || tool === 'eraser') {
            contextRef.current.lineTo(x, y);
            contextRef.current.stroke();
        } else if (tool === 'rect' || tool === 'circle') {
            // redraw logic for shapes (requires clearing and redrawing from history)
            // For simplicity in this "simple" version, we might just draw on top, 
            // but real shape tools need a temp layer or redraw.
            // Let's implement a simple "preview" by restoring history first.
            const img = new Image();
            img.src = history[historyStep] || '';
            // We need to wait for image to load to redraw, which might cause lag. 
            // Better approach for smooth shapes is a temp canvas, but let's try this first.
            // Actually, for a single file component, let's use the layout effect or just standard clear/redraw.

            // To avoid complexity, we will NOT preview shapes dynamically in this step without a temp canvas.
            // We will just draw the shape on mouse up? No, user needs feedback.

            // Re-implementing preview: restore last state then draw shape.
            const ctx = contextRef.current;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Draw background image
            // We need to redraw the BASE image + the history state? 
            // Actually history contains the full canvas state (minus the background image element, which is separate <img> tag).
            // The canvas is transparent overlay.

            const restore = new Image();
            restore.src = history[historyStep] || '';
            ctx.drawImage(restore, 0, 0);

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
            return;
        }

        if (isDrawing) {
            if (contextRef.current) {
                contextRef.current.closePath();
            }
            setIsDrawing(false);
            saveHistory();
        }
    };

    const handleTextSubmit = () => {
        if (textInput.value && contextRef.current) {
            const ctx = contextRef.current;
            ctx.font = `${lineWidth * 5}px Arial`;
            ctx.fillStyle = color;
            ctx.fillText(textInput.value, textInput.x, textInput.y);
            saveHistory();
        }
        setTextInput({ ...textInput, visible: false });
    };

    const clearCanvas = () => {
        if (canvasRef.current && contextRef.current) {
            contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const handleZoomIn = () => setScale((prev: any) => Math.min(prev + 0.1, 5));
    const handleZoomOut = () => setScale((prev: any) => Math.max(prev - 0.1, 0.5));

    const handleSave = async () => {
        try {
            if (!imageRef.current || !canvasRef.current) return;

            // Create a temporary canvas to merge image and annotations
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageRef.current.naturalWidth;
            tempCanvas.height = imageRef.current.naturalHeight;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) return;

            // Draw original image
            ctx.drawImage(imageRef.current, 0, 0);

            // Draw annotations (scaled to match natural size)
            ctx.drawImage(canvasRef.current, 0, 0, tempCanvas.width, tempCanvas.height);

            // Convert to data URL
            const dataUrl = tempCanvas.toDataURL('image/png');

            // Call parent save handler
            if (onSave) {
                await onSave(dataUrl);
            }
        } catch (error) {
// /* console.error */ ("Failed to save image:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-xl border-b border-white/10 shrink-0 z-50">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-white/10 rounded-lg p-1">
                        <button onClick={undo} className="p-2 text-gray-400 hover:text-white" title="Undo">
                            <Undo className="w-5 h-5" />
                        </button>
                        <div className="h-4 w-px bg-white/20 mx-1" />
                        <button onClick={handleZoomOut} className="p-2 text-gray-400 hover:text-white" title="Zoom Out">
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <span className="text-white text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={handleZoomIn} className="p-2 text-gray-400 hover:text-white" title="Zoom In">
                            <ZoomIn className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/20" />

                    <div className="flex items-center bg-white/10 rounded-lg p-1 space-x-1">
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

                    <div className="h-8 w-px bg-white/20" />

                    {/* Colors */}
                    <div className="flex items-center space-x-2">
                        {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ffffff'].map((c: any) => (
                            <button
                                key={c}
                                onClick={() => {
                                    setColor(c);
                                    if (tool === 'eraser' || tool === 'move') setTool('pen');
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c && tool !== 'eraser' ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="h-8 w-px bg-white/20" />

                    {/* Line Width */}
                    <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 flex items-center justify-center">
                            <div className="rounded-full bg-white" style={{ width: lineWidth, height: lineWidth }} />
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={lineWidth}
                            onChange={(e: any) => setLineWidth(parseInt(e.target.value))}
                            className="w-24 accent-blue-500"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button
                        onClick={clearCanvas}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Clear All"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
                    >
                        <Save className="w-4 h-4" />
                        <span>Save Copy</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-hidden flex items-center justify-center p-8 relative bg-dots-pattern" ref={containerRef}>
                <div
                    className="relative shadow-2xl shadow-black/50 transition-transform duration-75 ease-out origin-center"
                    style={{
                        transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                        cursor: tool === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'
                    }}
                >
                    <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="Annotation Target"
                        className="max-h-[80vh] max-w-[90vw] object-contain select-none pointer-events-none"
                        onLoad={handleImageLoad}
                    />
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="absolute inset-0 touch-none"
                        style={{ width: canvasSize.width, height: canvasSize.height }}
                    />

                    {/* Text Input Overlay */}
                    {textInput.visible && (
                        <div
                            className="absolute z-50 transform -translate-y-1/2"
                            style={{ left: textInput.x, top: textInput.y }}
                        >
                            <input
                                autoFocus
                                type="text"
                                className="bg-white/90 text-black px-2 py-1 rounded border border-blue-500 outline-none shadow-lg min-w-[100px]"
                                style={{
                                    fontSize: Math.max(12, lineWidth * 3) + 'px',
                                    color: color
                                }}
                                placeholder="Type..."
                                value={textInput.value}
                                onChange={(e: any) => setTextInput({ ...textInput, value: e.target.value })}
                                onKeyDown={(e: any) => {
                                    if (e.key === 'Enter') handleTextSubmit();
                                    if (e.key === 'Escape') setTextInput({ ...textInput, visible: false });
                                }}
                                onBlur={handleTextSubmit}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageViewer;
