import React, { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import {
    X, Eraser, Download, Trash2, PenTool, Undo, Redo,
    ChevronDown, ChevronUp, MousePointer2, Square, Circle,
    Minus, Move, Type, StickyNote, Grid, AlignJustify,
    ZoomIn, ZoomOut, Triangle, Diamond, Palette
} from 'lucide-react';

const Whiteboard = ({ onClose }: any) => {
    // Core State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [elements, setElements] = useState<any[]>([]);
    const [history, setHistory] = useState<any[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const [action, setAction] = useState('none'); // 'drawing', 'moving', 'panning', 'resizing'
    const [tool, setTool] = useState('pen');
    const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

    // Tool Settings
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [backgroundType, setBackgroundType] = useState('blank'); // 'blank', 'grid', 'ruled'
    const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
    const [isToolbarOpen, setIsToolbarOpen] = useState(true);


    // Sticky Notes State
    const [stickyNotes, setStickyNotes] = useState<any[]>([]);
    const [draggingNoteId, setDraggingNoteId] = useState<any>(null);
    const lastDragPos = useRef({ x: 0, y: 0 });

    // Text Editing State
    const [textEditing, setTextEditing] = useState<any | null>(null); // { id, x, y, text }

    // Temporary State for interactions
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const lastUpdateRef = useRef(0);

    const getCanvasCoordinates = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return {
                x: (clientX - camera.x) / camera.zoom,
                y: (clientY - camera.y) / camera.zoom
            };
        }
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
        const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        return {
            x: (canvasX - camera.x) / camera.zoom,
            y: (canvasY - camera.y) / camera.zoom
        };
    };

    const getMouseCoordinates = (e: any) => getCanvasCoordinates(e.clientX, e.clientY);

    const getTouchCoordinates = (e: any) => {
        const touch = e.touches[0];
        return touch ? getCanvasCoordinates(touch.clientX, touch.clientY) : { x: 0, y: 0 };
    };

    const createElement = (id: any, x1: any, y1: any, x2: any, y2: any, type: any) => {
        return { id, x1, y1, x2, y2, type, color, width: lineWidth, points: [{ x: x1, y: y1 }] };
    };

    const updateElement = (id: any, x1: any, y1: any, x2: any, y2: any, type: any, options?: any) => {
        setElements((prevElements) => {
            const elementsCopy = [...prevElements];
            const index = elementsCopy.findIndex((el: any) => el.id === id);
            if (index === -1) return prevElements;

            switch (type) {
                case 'pen':
                case 'eraser':
                    elementsCopy[index] = { ...elementsCopy[index], points: [...elementsCopy[index].points, { x: x2, y: y2 }] };
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
            return elementsCopy;
        }); // Skip history push for intermediate updates handled outside
    };

    // --- Rendering ---

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Clear Screen
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Apply Camera Transform
        context.save();
        context.translate(camera.x, camera.y);
        context.scale(camera.zoom, camera.zoom);

        // Draw Background
        drawBackground(context, backgroundType, camera, canvas.width, canvas.height);

        // Draw Elements
        elements.forEach((element: any) => {
            if (element.id === textEditing?.id) return; // Don't draw text while editing
            drawElement(context, element);
        });

        context.restore();

    }, [elements, camera, backgroundType, textEditing]);

    const drawBackground = (ctx: any, type: any, cam: any, w: any, h: any) => {
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

    const drawElement = (ctx: any, element: any) => {
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
                points.forEach((point: any) => ctx.lineTo(point.x, point.y));
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

    const handleMouseDown = (e: any) => {
        const { x, y } = getMouseCoordinates(e);

        if (tool === 'pan' || e.button === 1 || (e.code === 'Space')) {
            setAction('panning');
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }

        if (tool === 'text') {
            const id = elements.length;
            const newEl = { id, x1: x, y1: y, type: 'text', text: '', color, width: lineWidth };
            setElements((prev: any) => [...prev, newEl]);
            setTextEditing(newEl);
            setTool('pen'); // Reset tool after placing text
            return;
        }

        const id = elements.length;
        const newElement = createElement(id, x, y, x, y, tool);
        setElements((prev: any) => [...prev, newElement]);
        setAction('drawing');
    };

    const handleMouseMove = (e: any) => {
        if (action === 'panning') {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            setCamera((prev: any) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }

        if (action === 'drawing') {
            const { x, y } = getMouseCoordinates(e);
            const index = elements.length - 1;
            const { x1, y1 } = elements[index];
            
            const now = performance.now();
            if (now - lastUpdateRef.current > 16) {
                updateElement(elements[index].id, x1, y1, x, y, tool);
                lastUpdateRef.current = now;
            }
        }
    };

    const handleMouseUp = (e: any) => {
        if (action === 'drawing') {
            if (e && e.clientX !== undefined) {
                const { x, y } = getMouseCoordinates(e);
                const index = elements.length - 1;
                const { x1, y1 } = elements[index];
                updateElement(elements[index].id, x1, y1, x, y, tool);
            }
            setElements((prev) => {
                addToHistory(prev);
                return prev;
            });
        }
        setAction('none');
    };

    // --- Touch Event Handlers ---

    const handleTouchStart = (e: any) => {
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
            setElements((prev: any) => [...prev, newEl]);
            setTextEditing(newEl);
            setTool('pen'); // Reset tool after placing text
            return;
        }

        const id = elements.length;
        const newElement = createElement(id, x, y, x, y, tool);
        setElements((prev: any) => [...prev, newElement]);
        setAction('drawing');
    };

    const handleTouchMove = (e: any) => {
        if (e.touches.length !== 1) return; // Only handle single touch
        e.preventDefault();

        if (action === 'panning') {
            const dx = e.touches[0].clientX - panStart.x;
            const dy = e.touches[0].clientY - panStart.y;
            setCamera((prev: any) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            return;
        }

        if (action === 'drawing') {
            const { x, y } = getTouchCoordinates(e);
            const index = elements.length - 1;
            const { x1, y1 } = elements[index];
            
            const now = performance.now();
            if (now - lastUpdateRef.current > 16) {
                updateElement(elements[index].id, x1, y1, x, y, tool);
                lastUpdateRef.current = now;
            }
        }
    };

    const handleTouchEnd = (e: any) => {
        e.preventDefault();
        if (action === 'drawing') {
            if (e.changedTouches && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                const clientX = touch.clientX;
                const clientY = touch.clientY;
                const x = (clientX - camera.x) / camera.zoom;
                const y = (clientY - camera.y) / camera.zoom;
                const index = elements.length - 1;
                const { x1, y1 } = elements[index];
                updateElement(elements[index].id, x1, y1, x, y, tool);
            }
            setElements((prev) => {
                addToHistory(prev);
                return prev;
            });
        }
        setAction('none');
    };

    const handleWheel = (e: any) => {
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
        setCamera((prev: any) => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
    };

    const zoomOut = () => {
        setCamera((prev: any) => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
    };

    // --- Text Editing ---
    const handleTextBlur = (e: any) => {
        const text = e.target.value;
        if (textEditing) {
            const index = elements.findIndex((el: any) => el.id === textEditing.id);
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
        setStickyNotes((prev: any) => [...prev, { id, x, y, content: '', color: '#fef3c7' }]);
    };

    const updateStickyNote = (id: any, content: any) => {
        setStickyNotes((prev: any) => prev.map((note: any) => note.id === id ? { ...note, content } : note));
    };

    const moveStickyNote = (id: any, dx: any, dy: any) => {
        setStickyNotes((prev: any) => prev.map((note: any) => note.id === id ? { ...note, x: note.x + dx, y: note.y + dy } : note));
    };

    const deleteStickyNote = (id: any) => {
        setStickyNotes((prev: any) => prev.filter((note: any) => note.id !== id));
    };

    // --- History ---
    const addToHistory = (newElements: any) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const undo = () => {
        if (historyStep > 0 && history[historyStep - 1]) {
            setHistoryStep((prev: any) => prev - 1);
            setElements(history[historyStep - 1] as any[]);
        }
    };

    const redo = () => {
        if (historyStep < history.length - 1 && history[historyStep + 1]) {
            setHistoryStep((prev: any) => prev + 1);
            setElements(history[historyStep + 1] as any[]);
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
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Lock body scroll
        document.body.style.overflow = 'hidden';

        // Prevent default touch actions (scrolling/zooming) on the canvas
        canvas.style.touchAction = 'none';

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            setCamera((prev: any) => ({ ...prev }));
        };

        // Prevent default wheel behavior (browser zoom/scroll)
        const preventWheel = (e: any) => {
            e.preventDefault();
        };

        window.addEventListener('resize', handleResize);
        canvas.addEventListener('wheel', preventWheel, { passive: false });

        return () => {
            window.removeEventListener('resize', handleResize);
            if (canvas) canvas.removeEventListener('wheel', preventWheel);
            document.body.style.overflow = ''; // Restore body scroll
        };
    }, []);

    const colors = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

    // Stable callbacks for toolbar to prevent re-renders from propagating on mouse move
    const stableSetTool = useCallback((t: string) => setTool(t), []);
    const stableSetColor = useCallback((c: string) => setColor(c), []);
    const stableSetBackgroundType = useCallback((b: string) => setBackgroundType(b), []);
    const stableSetBackgroundColor = useCallback((c: string) => setBackgroundColor(c), []);
    const stableSetIsToolbarOpen = useCallback(() => setIsToolbarOpen(prev => !prev), []);

    // Memoized toolbar — only re-renders when tool/color/lineWidth/bg state changes, NOT on every mouse move
    const toolbar = useMemo(() => (
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
                style={{ touchAction: 'none' }}
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
                    onKeyDown={(e: any) => { if (e.key === 'Enter' && !e.shiftKey) e.target.blur(); }}
                />
            )}

            {/* Sticky Notes Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-0 left-0 w-full h-full origin-top-left"
                    style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
                >
                    {stickyNotes.map((note: any) => (
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
                                onPointerDown={(e: any) => {
                                    e.stopPropagation();
                                    e.currentTarget.setPointerCapture(e.pointerId);
                                    setDraggingNoteId(note.id);
                                    lastDragPos.current = { x: e.clientX, y: e.clientY };
                                }}
                                onPointerMove={(e: any) => {
                                    if (draggingNoteId !== note.id) return;
                                    e.stopPropagation();
                                    const dx = (e.clientX - lastDragPos.current.x) / camera.zoom;
                                    const dy = (e.clientY - lastDragPos.current.y) / camera.zoom;
                                    moveStickyNote(note.id, dx, dy);
                                    lastDragPos.current = { x: e.clientX, y: e.clientY };
                                }}
                                onPointerUp={(e: any) => {
                                    if (draggingNoteId !== note.id) return;
                                    e.stopPropagation();
                                    e.currentTarget.releasePointerCapture(e.pointerId);
                                    setDraggingNoteId(null);
                                }}
                            >
                                <X className="w-4 h-4 cursor-pointer hover:text-red-600" onPointerDown={(e: any) => e.stopPropagation()} onClick={() => deleteStickyNote(note.id)} />
                            </div>
                            <textarea
                                className="w-full h-full bg-transparent resize-none focus:outline-none font-sans text-gray-800"
                                placeholder="Type here..."
                                value={note.content}
                                onChange={(e: any) => updateStickyNote(note.id, e.target.value)}
                                onMouseDown={(e: any) => e.stopPropagation()}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Toolbar Container */}
            <div
                className={`fixed top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center transition-transform duration-300 ease-in-out z-50 ${isToolbarOpen ? 'translate-y-4' : 'translate-y-[calc(-100%+3rem)]'} max-w-[95vw] md:max-w-max`}
            >
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

                        {/* Shapes & Text */}
                        <div className="flex flex-wrap justify-center items-center gap-1 border-zen-text/10 md:border-r md:pr-4">
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
                            <button onClick={() => setTool('arrow')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'arrow' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Arrow">
                                <MousePointer2 className="w-4 h-4 md:w-5 md:h-5 rotate-45" />
                            </button>
                            <button onClick={() => setTool('text')} className={`p-1.5 md:p-2 rounded-lg ${tool === 'text' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Text">
                                <Type className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button onClick={addStickyNote} className="p-1.5 md:p-2 rounded-lg text-yellow-500 hover:text-yellow-600 hover:bg-zen-text/10" title="Add Sticky Note">
                                <StickyNote className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        {/* Backgrounds */}
                        <div className="flex items-center gap-1 md:pr-4">
                            <button onClick={() => setBackgroundType('blank')} className={`p-1.5 md:p-2 rounded-lg ${backgroundType === 'blank' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Blank">
                                <Square className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => setBackgroundType('grid')} className={`p-1.5 md:p-2 rounded-lg ${backgroundType === 'grid' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Grid">
                                <Grid className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => setBackgroundType('ruled')} className={`p-1.5 md:p-2 rounded-lg ${backgroundType === 'ruled' ? 'bg-zen-accent text-white' : 'text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5'}`} title="Ruled">
                                <AlignJustify className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            {/* Background Color Picker */}
                            <div className="relative group ml-1">
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={(e: any) => setBackgroundColor(e.target.value)}
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
                    <div className="flex items-center justify-between border-t border-zen-text/10 pt-3 md:pt-4">
                        {/* Colors */}
                        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar pb-1">
                            {colors.map((c: any) => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); if (tool !== 'text') setTool('pen'); }}
                                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full transition-transform hover:scale-110 shrink-0 ${color === c ? 'ring-2 ring-offset-2 ring-offset-zen-surface ring-zen-text scale-110' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            {/* Custom Color Picker */}
                            <div className="relative group shrink-0 ml-1">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e: any) => { setColor(e.target.value); if (tool !== 'text') setTool('pen'); }}
                                    className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden cursor-pointer opacity-0 absolute inset-0 z-10"
                                />
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 ring-1 ring-zen-text/20 group-hover:scale-110 transition-transform" />
                            </div>
                        </div>

                        {/* Zoom Controls */}
                        <div className="hidden md:flex items-center gap-1 border-l border-r border-zen-text/10 px-4 shrink-0">
                            <button onClick={zoomOut} className="p-2 text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5 rounded-lg">
                                <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <span className="text-xs font-medium text-zen-text-2 w-10 text-center">{Math.round(camera.zoom * 100)}%</span>
                            <button onClick={zoomIn} className="p-2 text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5 rounded-lg">
                                <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={undo} disabled={historyStep <= 0} className="p-1.5 md:p-2 text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5 rounded-lg disabled:opacity-30">
                                <Undo className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button onClick={redo} disabled={historyStep >= history.length - 1} className="p-1.5 md:p-2 text-zen-text-2 hover:text-zen-text hover:bg-zen-text/5 rounded-lg disabled:opacity-30">
                                <Redo className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <div className="w-px h-4 bg-zen-text/10 mx-1 md:mx-2 hidden sm:block" />
                            <button onClick={clearCanvas} className="p-1.5 md:p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toggle Handle */}
                <button
                    onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                    className="p-1.5 md:p-2.5 rounded-b-[20px] bg-zen-surface/90 backdrop-blur-3xl border-b border-x border-zen-text/10 text-zen-text-2 hover:text-zen-text transition-colors shadow-lg mt-0.5"
                    title={isToolbarOpen ? "Minimize Toolbar" : "Show Toolbar"}
                >
                    {isToolbarOpen ? <ChevronUp className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-3 md:p-4 rounded-full bg-zen-text/5 hover:bg-red-500/20 transition-all active:scale-95 text-zen-text-2 hover:text-red-500 shadow-md border border-zen-text/10 z-50"
            >
                <X className="w-6 h-6 md:w-8 md:h-8" />
            </button>
        </div >
    ), [tool, color, lineWidth, backgroundType, backgroundColor, isToolbarOpen, camera, historyStep, history.length, textEditing, stickyNotes, draggingNoteId,
        stableSetTool, stableSetColor, stableSetBackgroundType, stableSetBackgroundColor, stableSetIsToolbarOpen,
        undo, redo, clearCanvas, zoomIn, zoomOut, onClose, addStickyNote
    ]);

    return toolbar;
};

export default Whiteboard;
