import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import {
    X, PenTool, Eraser, Trash2, Undo, Redo,
    Square, Circle, Triangle, Diamond, MousePointer2
} from 'lucide-react';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const WhiteboardOverlay = () => {
    const canvasRef = useRef(null);
    const [elements, setElements] = useState([]);
    const [history, setHistory] = useState([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const [action, setAction] = useState('none');
    const [tool, setTool] = useState('pen');

    const [color, setColor] = useState('#ff0000');
    const [lineWidth, setLineWidth] = useState(3);

    const getMouseCoordinates = (e) => ({
        x: e.clientX,
        y: e.clientY
    });

    const getTouchCoordinates = (e) => {
        const touch = e.touches[0];
        return {
            x: touch.clientX,
            y: touch.clientY
        };
    };

    const createElement = (id, x1, y1, x2, y2, type) => {
        return { id, x1, y1, x2, y2, type, color, width: lineWidth, points: [{ x: x1, y: y1 }] };
    };

    const updateElement = (id, x1, y1, x2, y2, type) => {
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
            default:
                break;
        }
        setElements(elementsCopy);
    };

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        context.clearRect(0, 0, canvas.width, canvas.height);

        elements.forEach(element => {
            drawElement(context, element);
        });
    }, [elements]);

    const drawElement = (ctx, element) => {
        const { type, color, width, points, x1, y1, x2, y2 } = element;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        if (type === 'pen' || type === 'eraser') {
            if (type === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
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
        }

        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    };

    const handleMouseDown = (e) => {
        const { x, y } = getMouseCoordinates(e);
        const id = elements.length;
        const newElement = createElement(id, x, y, x, y, tool);
        setElements(prev => [...prev, newElement]);
        setAction('drawing');
    };

    const handleMouseMove = (e) => {
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
        const id = elements.length;
        const newElement = createElement(id, x, y, x, y, tool);
        setElements(prev => [...prev, newElement]);
        setAction('drawing');
    };

    const handleTouchMove = (e) => {
        if (e.touches.length !== 1) return; // Only handle single touch
        e.preventDefault();

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
        addToHistory([]);
    };

    const closeOverlay = () => {
        if (ipcRenderer) {
            ipcRenderer.send('close-overlay');
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const colors = ['#ff0000', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Transparent Canvas */}
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="absolute inset-0 cursor-crosshair"
            />

            {/* Floating Toolbar */}
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-white/10">
                <div className="flex items-center gap-3">
                    {/* Tools */}
                    <div className="flex items-center gap-1 border-r border-white/20 pr-3">
                        <button onClick={() => setTool('pen')} className={`p-2 rounded-lg ${tool === 'pen' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <PenTool className="w-5 h-5" />
                        </button>
                        <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <Eraser className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Shapes */}
                    <div className="flex items-center gap-1 border-r border-white/20 pr-3">
                        <button onClick={() => setTool('rectangle')} className={`p-2 rounded-lg ${tool === 'rectangle' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <Square className="w-4 h-4" />
                        </button>
                        <button onClick={() => setTool('circle')} className={`p-2 rounded-lg ${tool === 'circle' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <Circle className="w-4 h-4" />
                        </button>
                        <button onClick={() => setTool('arrow')} className={`p-2 rounded-lg ${tool === 'arrow' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <MousePointer2 className="w-4 h-4 rotate-45" />
                        </button>
                    </div>

                    {/* Colors */}
                    <div className="flex items-center gap-2 border-r border-white/20 pr-3">
                        {colors.map((c) => (
                            <button
                                key={c}
                                onClick={() => { setColor(c); setTool('pen'); }}
                                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-white scale-110' : ''}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <button onClick={undo} disabled={historyStep <= 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30">
                            <Undo className="w-5 h-5" />
                        </button>
                        <button onClick={redo} disabled={historyStep >= history.length - 1} className="p-2 text-gray-400 hover:text-white disabled:opacity-30">
                            <Redo className="w-5 h-5" />
                        </button>
                        <button onClick={clearCanvas} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={closeOverlay} className="p-2 text-gray-400 hover:text-white rounded-lg ml-2">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhiteboardOverlay;
