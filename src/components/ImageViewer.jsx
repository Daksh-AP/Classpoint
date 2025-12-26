import React, { useState, useRef, useEffect } from 'react';
import { X, Save, PenTool, Eraser, RotateCcw, Download, Minus, Plus, Undo } from 'lucide-react';

const ImageViewer = ({ imageUrl, onClose, onSave }) => {
    const [scale, setScale] = useState(1);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'
    const [color, setColor] = useState('#ef4444'); // Default red
    const [lineWidth, setLineWidth] = useState(3);

    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
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
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            contextRef.current = ctx;
        }
    };

    // Update context when tool/color/width changes
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
            contextRef.current.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        }
    }, [tool, color, lineWidth]);

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    };

    const stopDrawing = () => {
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        if (canvasRef.current && contextRef.current) {
            contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const handleSave = async () => {
        if (!imageRef.current || !canvasRef.current) return;

        // Create a temporary canvas to merge image and annotations
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageRef.current.naturalWidth;
        tempCanvas.height = imageRef.current.naturalHeight;
        const ctx = tempCanvas.getContext('2d');

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
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-white/10 rounded-lg p-1">
                        <button
                            onClick={() => setTool('pen')}
                            className={`p-2 rounded-md transition-all ${tool === 'pen' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Pen"
                        >
                            <PenTool className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setTool('eraser')}
                            className={`p-2 rounded-md transition-all ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Eraser"
                        >
                            <Eraser className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/20" />

                    {/* Colors */}
                    <div className="flex items-center space-x-2">
                        {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ffffff'].map((c) => (
                            <button
                                key={c}
                                onClick={() => {
                                    setColor(c);
                                    setTool('pen');
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c && tool === 'pen' ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="h-8 w-px bg-white/20" />

                    {/* Line Width */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(parseInt(e.target.value))}
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
                <div className="relative shadow-2xl shadow-black/50">
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
                        className="absolute inset-0 cursor-crosshair touch-none"
                        style={{ width: canvasSize.width, height: canvasSize.height }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageViewer;
