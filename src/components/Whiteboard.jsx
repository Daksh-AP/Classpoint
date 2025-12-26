import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import {
    X, Eraser, Download, Trash2, PenTool, Undo, Redo,
    ChevronDown, ChevronUp, MousePointer2, Square, Circle,
    Minus, Move, Type, StickyNote, Grid, AlignJustify,
    ZoomIn, ZoomOut, Triangle, Diamond, Palette
} from 'lucide-react';

const Whiteboard = ({ onClose }) => {
    // Core State
    const canvasRef = useRef(null);
    const [elements, setElements] = useState([]);
    const [history, setHistory] = useState([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const [action, setAction] = useState('none'); // 'drawing', 'moving', 'panning', 'resizing'
    const [tool, setTool] = useState('pen');
    const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

    // Tool Settings
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [backgroundType, setBackgroundType] = useState('blank'); // 'blank', 'grid', 'ruled'
    const [backgroundColor, setBackgroundColor] = useState('#1A1A1A');
    const [isToolbarOpen, setIsToolbarOpen] = useState(true);

    // Sticky Notes State
    const [stickyNotes, setStickyNotes] = useState([]);

    // Text Editing State
    const [textEditing, setTextEditing] = useState(null); // { id, x, y, text }

    // Temporary State for interactions
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // --- Helpers ---

    const getMouseCoordinates = (e) => {
        const clientX = e.clientX;
        const clientY = e.clientY;
        return {
            x: (clientX - camera.x) / camera.zoom,
            y: (clientY - camera.y) / camera.zoom
        };
    };

    const getTouchCoordinates = (e) => {
        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        return {
            x: (clientX - camera.x) / camera.zoom,
            y: (clientY - camera.y) / camera.zoom
        };
    };

    const createElement = (id, x1, y1, x2, y2, type) => {
        return { id, x1, y1, x2, y2, type, color, width: lineWidth, points: [{ x: x1, y: y1 }] };
    };

    const updateElement = (id, x1, y1, x2, y2, type, options) => {
        const elementsCopy = [...elements];
        const index = elementsCopy.findIndex(el => el.id === id);
        if (index === -1) return;

        switch (type) {
            case 'pen':
            case 'eraser':
                elementsCopy[index].points = [...elementsCopy[index].points, { x: x2, y: y2 }];
                break;
            case 'line':
            case 'arrow':
            case 'rectangle':
            case 'circle':
            case 'triangle':
            case 'diamond':
                elementsCopy[index] = { ...elementsCopy[index], x2, y2 };
                break;
            case 'text':
                elementsCopy[index] = { ...elementsCopy[index], text: options.text };
                break;
            default:
                break;
        }
        setElements(elementsCopy, true); // Pass true to skip history push for intermediate updates
    };

    // --- Rendering ---

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Clear Screen
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Apply Camera Transform
        context.save();
        context.translate(camera.x, camera.y);
        context.scale(camera.zoom, camera.zoom);

        // Draw Background
        drawBackground(context, backgroundType, camera, canvas.width, canvas.height);

        // Draw Elements
        elements.forEach(element => {
            if (element.id === textEditing?.id) return; // Don't draw text while editing
            drawElement(context, element);
        });

        context.restore();

    }, [elements, camera, backgroundType, textEditing]);

    const drawBackground = (ctx, type, cam, w, h) => {
        if (type === 'blank') return;

        const gridSize = 50;

        ctx.save();
        ctx.strokeStyle = '#9ca3af'; // Darker gray (Tailwind gray-400)
        ctx.lineWidth = 1 / cam.zoom; // Keep lines thin regardless of zoom

        // We need to draw lines covering the visible area
        // Since we are already transformed, we draw in world coordinates
        const startX = -cam.x / cam.zoom;
        const startY = -cam.y / cam.zoom;
        const endX = startX + w / cam.zoom;
        const endY = startY + h / cam.zoom;

        ctx.beginPath();

        if (type === 'grid') {
            for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
                ctx.moveTo(x, startY);
                ctx.lineTo(x, endY);
            }
            for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
            }
        } else if (type === 'ruled') {
            for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
            }
        }

        ctx.stroke();
        ctx.restore();
    };

    const drawElement = (ctx, element) => {
        const { type, color, width, points, x1, y1, x2, y2, text } = element;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        if (type === 'pen' || type === 'eraser') {
            if (type === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = width * 5;
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            if (points.length > 0) {
                ctx.moveTo(points[0].x, points[0].y);
                points.forEach(point => ctx.lineTo(point.x, point.y));
            }
        } else if (type === 'line') {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        } else if (type === 'arrow') {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const headLen = 15;
            ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        } else if (type === 'rectangle') {
            ctx.rect(x1, y1, x2 - x1, y2 - y1);
        } else if (type === 'circle') {
            const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
        } else if (type === 'triangle') {
            ctx.moveTo(x1, y2);
            ctx.lineTo(x2, y2);
            ctx.lineTo((x1 + x2) / 2, y1);
            ctx.closePath();
        } else if (type === 'diamond') {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            ctx.moveTo(midX, y1);
            ctx.lineTo(x2, midY);
            ctx.lineTo(midX, y2);
            ctx.lineTo(x1, midY);
            ctx.closePath();
        } else if (type === 'text' && text) {
            ctx.font = `${width * 6}px sans-serif`;
            ctx.fillStyle = color;
            ctx.fillText(text, x1, y1);
        }

        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    };

    // --- Event Handlers ---

    const handleMouseDown = (e) => {
        const { x, y } = getMouseCoordinates(e);

        if (tool === 'pan' || e.button === 1 || (e.code === 'Space')) {
            setAction('panning');
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }

        if (tool === 'text') {
            const id = elements.length;
            const newEl = { id, x1: x, y1: y, type: 'text', text: '', color, width: lineWidth };
            setElements(prev => [...prev, newEl]);
            setTextEditing(newEl);
            setTool('pen'); // Reset tool after placing text
            return;
        }

        const id = elements.length;
        const newElement = createElement(id, x, y, x, y, tool);
        setElements(prev => [...prev, newElement]);
        setAction('drawing');
    };

    const handleMouseMove = (e) => {
        if (action === 'panning') {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }

        if (action === 'drawing') {
            const { x, y } = getMouseCoordinates(e);
            const index = elements.length - 1;
            const { x1, y1 } = elements[index];
            updateElement(elements[index].id, x1, y1, x, y, tool);
        }
    };

    const handleMouseUp = () => {
        if (action === 'drawing') {
            addToHistory(elements);
        }
        setAction('none');
    };

    // --- Touch Event Handlers ---

    const handleTouchStart = (e) => {
        if (e.touches.length !== 1) return; // Only handle single touch
        e.preventDefault();
        
        const { x, y } = getTouchCoordinates(e);

        if (tool === 'pan') {
            setAction('panning');
            setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            return;
        }

        if (tool === 'text') {
            const id = elements.length;
            const newEl = { id, x1: x, y1: y, type: 'text', text: '', color, width: lineWidth };
            setElements(prev => [...prev, newEl]);
            setTextEditing(newEl);
            setTool('pen'); // Reset tool after placing text
            return;
        }

        const id = elements.length;
        const newElement = createElement(id, x, y, x, y, tool);
        setElements(prev => [...prev, newElement]);
        setAction('drawing');
    };

    const handleTouchMove = (e) => {
        if (e.touches.length !== 1) return; // Only handle single touch
        e.preventDefault();

        if (action === 'panning') {
            const dx = e.touches[0].clientX - panStart.x;
            const dy = e.touches[0].clientY - panStart.y;
            setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            return;
        }

        if (action === 'drawing') {
            const { x, y } = getTouchCoordinates(e);
            const index = elements.length - 1;
            const { x1, y1 } = elements[index];
            updateElement(elements[index].id, x1, y1, x, y, tool);
        }
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        if (action === 'drawing') {
            addToHistory(elements);
        }
        setAction('none');
    };

    const handleWheel = (e) => {
        const scaleBy = 1.1;
        const scaleFactor = e.deltaY < 0 ? scaleBy : 1 / scaleBy;

        const newZoom = camera.zoom * scaleFactor;
        if (newZoom < 0.1 || newZoom > 5) return;

        const { x, y } = getMouseCoordinates(e);
        const newX = e.clientX - x * newZoom;
        const newY = e.clientY - y * newZoom;

        setCamera({ zoom: newZoom, x: newX, y: newY });
    };

    const zoomIn = () => {
        setCamera(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
    };

    const zoomOut = () => {
        setCamera(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
    };

    // --- Text Editing ---
    const handleTextBlur = (e) => {
        const text = e.target.value;
        if (textEditing) {
            const index = elements.findIndex(el => el.id === textEditing.id);
            if (index !== -1) {
                const updatedElements = [...elements];
                if (text.trim() === '') {
                    updatedElements.splice(index, 1); // Remove empty text
                } else {
                    updatedElements[index] = { ...updatedElements[index], text };
                }
                setElements(updatedElements);
                addToHistory(updatedElements);
            }
        }
        setTextEditing(null);
    };

    // --- Sticky Notes Logic ---
    const addStickyNote = () => {
        const id = Date.now();
        const x = -camera.x / camera.zoom + (window.innerWidth / 2 / camera.zoom) - 100;
        const y = -camera.y / camera.zoom + (window.innerHeight / 2 / camera.zoom) - 100;
        setStickyNotes(prev => [...prev, { id, x, y, content: '', color: '#fef3c7' }]);
    };

    const updateStickyNote = (id, content) => {
        setStickyNotes(prev => prev.map(note => note.id === id ? { ...note, content } : note));
    };

    const moveStickyNote = (id, dx, dy) => {
        setStickyNotes(prev => prev.map(note => note.id === id ? { ...note, x: note.x + dx, y: note.y + dy } : note));
    };

    const deleteStickyNote = (id) => {
        setStickyNotes(prev => prev.filter(note => note.id !== id));
    };

    // --- History ---
    const addToHistory = (newElements) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const undo = () => {
        if (historyStep > 0) {
            setHistoryStep(prev => prev - 1);
            setElements(history[historyStep - 1]);
        }
    };

    const redo = () => {
        if (historyStep < history.length - 1) {
            setHistoryStep(prev => prev + 1);
            setElements(history[historyStep + 1]);
        }
    };

    const clearCanvas = () => {
        setElements([]);
        setStickyNotes([]);
        addToHistory([]);
    };

    // --- Initialization ---
    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            setCamera(prev => ({ ...prev }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const colors = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" style={{ backgroundColor }}>
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                className={`absolute inset-0 ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
            />

            {/* Text Editing Overlay */}
            {textEditing && (
                <textarea
                    className="absolute bg-transparent border border-blue-500 outline-none resize-none overflow-hidden"
                    style={{
                        left: textEditing.x1 * camera.zoom + camera.x,
                        top: textEditing.y1 * camera.zoom + camera.y - (textEditing.width * 6), // Adjust for font size
                        fontSize: `${textEditing.width * 6 * camera.zoom}px`,
                        color: textEditing.color,
                        width: '300px',
                        height: '100px',
                    }}
                    autoFocus
                    onBlur={handleTextBlur}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) e.target.blur(); }}
                />
            )}

            {/* Sticky Notes Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-0 left-0 w-full h-full origin-top-left"
                    style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
                >
                    {stickyNotes.map(note => (
                        <div
                            key={note.id}
                            className="absolute w-48 h-48 p-4 shadow-lg rounded-br-3xl transition-shadow hover:shadow-xl pointer-events-auto flex flex-col"
                            style={{
                                left: note.x,
                                top: note.y,
                                backgroundColor: note.color,
                                transform: 'scale(1)',
                            }}
                        >
                            <div
                                className="h-6 cursor-move opacity-50 hover:opacity-100 flex justify-end"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startY = e.clientY;
                                    const handleMove = (moveEvent) => {
                                        // Calculate delta in screen pixels, then divide by zoom to get world delta
                                        const dx = (moveEvent.clientX - startX) / camera.zoom;
                                        const dy = (moveEvent.clientY - startY) / camera.zoom;
                                        moveStickyNote(note.id, dx, dy);
                                        // Update start position for next frame
                                        // IMPORTANT: We need to update startX/Y to the current event position
                                        // But moveStickyNote adds delta to current position.
                                        // So we need to be careful.
                                        // Actually, standard drag logic:
                                        // On move: calculate delta from LAST move event.
                                    };

                                    // Better drag logic:
                                    let lastX = startX;
                                    let lastY = startY;

                                    const handleMoveBetter = (moveEvent) => {
                                        const dx = (moveEvent.clientX - lastX) / camera.zoom;
                                        const dy = (moveEvent.clientY - lastY) / camera.zoom;
                                        moveStickyNote(note.id, dx, dy);
                                        lastX = moveEvent.clientX;
                                        lastY = moveEvent.clientY;
                                    };

                                    const handleUp = () => {
                                        window.removeEventListener('mousemove', handleMoveBetter);
                                        window.removeEventListener('mouseup', handleUp);
                                    };
                                    window.addEventListener('mousemove', handleMoveBetter);
                                    window.addEventListener('mouseup', handleUp);
                                }}
                            >
                                <X className="w-4 h-4 cursor-pointer hover:text-red-600" onClick={() => deleteStickyNote(note.id)} />
                            </div>
                            <textarea
                                className="w-full h-full bg-transparent resize-none focus:outline-none font-sans text-gray-800"
                                placeholder="Type here..."
                                value={note.content}
                                onChange={(e) => updateStickyNote(note.id, e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Toolbar Container */}
            <div
                className={`fixed bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center transition-transform duration-300 ease-in-out z-50 ${isToolbarOpen ? 'translate-y-[-2rem]' : 'translate-y-[calc(100%-2.5rem)]'}`}
            >
                {/* Toggle Handle */}
                <button
                    onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                    className="p-2 rounded-t-xl bg-black/80 backdrop-blur-md border-t border-x border-white/10 text-white hover:bg-black transition-colors shadow-lg mb-2"
                    title={isToolbarOpen ? "Minimize Toolbar" : "Show Toolbar"}
                >
                    {isToolbarOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>

                {/* Main Toolbar */}
                <div className="glass-card p-4 flex flex-col gap-4">

                    {/* Top Row: Tools & Shapes */}
                    <div className="flex items-center gap-4">
                        {/* Basic Tools */}
                        <div className="flex items-center gap-1 border-r border-white/10 pr-4">
                            <button onClick={() => setTool('pan')} className={`p-2 rounded-lg ${tool === 'pan' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Pan (Spacebar)">
                                <Move className="w-5 h-5" />
                            </button>
                            <button onClick={() => setTool('pen')} className={`p-2 rounded-lg ${tool === 'pen' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Pen">
                                <PenTool className="w-5 h-5" />
                            </button>
                            <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Eraser">
                                <Eraser className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Shapes & Text */}
                        <div className="flex items-center gap-1 border-r border-white/10 pr-4">
                            <button onClick={() => setTool('rectangle')} className={`p-2 rounded-lg ${tool === 'rectangle' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Rectangle">
                                <Square className="w-5 h-5" />
                            </button>
                            <button onClick={() => setTool('circle')} className={`p-2 rounded-lg ${tool === 'circle' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Circle">
                                <Circle className="w-5 h-5" />
                            </button>
                            <button onClick={() => setTool('triangle')} className={`p-2 rounded-lg ${tool === 'triangle' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Triangle">
                                <Triangle className="w-5 h-5" />
                            </button>
                            <button onClick={() => setTool('diamond')} className={`p-2 rounded-lg ${tool === 'diamond' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Diamond">
                                <Diamond className="w-5 h-5" />
                            </button>
                            <button onClick={() => setTool('arrow')} className={`p-2 rounded-lg ${tool === 'arrow' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Arrow">
                                <MousePointer2 className="w-5 h-5 rotate-45" />
                            </button>
                            <button onClick={() => setTool('text')} className={`p-2 rounded-lg ${tool === 'text' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Text">
                                <Type className="w-5 h-5" />
                            </button>
                            <button onClick={addStickyNote} className="p-2 rounded-lg text-yellow-400 hover:text-yellow-300 hover:bg-white/10" title="Add Sticky Note">
                                <StickyNote className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Backgrounds */}
                        <div className="flex items-center gap-1 border-r border-white/10 pr-4">
                            <button onClick={() => setBackgroundType('blank')} className={`p-2 rounded-lg ${backgroundType === 'blank' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Blank">
                                <Square className="w-4 h-4" />
                            </button>
                            <button onClick={() => setBackgroundType('grid')} className={`p-2 rounded-lg ${backgroundType === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Grid">
                                <Grid className="w-4 h-4" />
                            </button>
                            <button onClick={() => setBackgroundType('ruled')} className={`p-2 rounded-lg ${backgroundType === 'ruled' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Ruled">
                                <AlignJustify className="w-4 h-4" />
                            </button>
                            {/* Background Color Picker */}
                            <div className="relative group ml-1">
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                    className="w-6 h-6 rounded-lg overflow-hidden cursor-pointer opacity-0 absolute inset-0 z-10"
                                    title="Background Color"
                                />
                                <div
                                    className="w-6 h-6 rounded-lg ring-1 ring-white/20 group-hover:scale-110 transition-transform"
                                    style={{ backgroundColor }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Colors & Actions */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                        {/* Colors */}
                        <div className="flex items-center gap-2">
                            {colors.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); if (tool !== 'text') setTool('pen'); }}
                                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-black/50 ring-white scale-110' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            {/* Custom Color Picker */}
                            <div className="relative group">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => { setColor(e.target.value); if (tool !== 'text') setTool('pen'); }}
                                    className="w-6 h-6 rounded-full overflow-hidden cursor-pointer opacity-0 absolute inset-0 z-10"
                                />
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 ring-1 ring-white/20 group-hover:scale-110 transition-transform" />
                            </div>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 border-l border-r border-white/10 px-4">
                            <button onClick={zoomOut} className="p-2 text-gray-400 hover:text-white">
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <span className="text-xs text-gray-400 w-12 text-center">{Math.round(camera.zoom * 100)}%</span>
                            <button onClick={zoomIn} className="p-2 text-gray-400 hover:text-white">
                                <ZoomIn className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button onClick={undo} disabled={historyStep <= 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30">
                                <Undo className="w-5 h-5" />
                            </button>
                            <button onClick={redo} disabled={historyStep >= history.length - 1} className="p-2 text-gray-400 hover:text-white disabled:opacity-30">
                                <Redo className="w-5 h-5" />
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-2" />
                            <button onClick={clearCanvas} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-3 rounded-xl bg-black/40 hover:bg-red-500/20 text-gray-400 hover:text-white backdrop-blur-md border border-white/10 transition-all z-50"
            >
                <X className="w-8 h-8" />
            </button>
        </div>
    );
};

export default Whiteboard;
