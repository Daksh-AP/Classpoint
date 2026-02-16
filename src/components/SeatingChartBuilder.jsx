import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RotateCcw, Users, Armchair, ChevronRight, Check, ArrowLeft, Monitor, Box, Layers } from 'lucide-react';
import { StorageService } from '../services/StorageService';
import Desk from './Desk';

const MODES = {
    WELCOME: 'welcome',
    LAYOUT: 'layout',
    ASSIGN: 'assign'
};

const SeatingChartBuilder = ({ selectedSection, onClose }) => {
    const [mode, setMode] = useState(MODES.WELCOME);
    const [students, setStudents] = useState([]);
    const [chairs, setChairs] = useState([]); // Array of { id, x, y, studentId }
    const [selectedChairId, setSelectedChairId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const canvasRef = useRef(null);

    useEffect(() => {
        loadData();
    }, [selectedSection]);

    const loadData = async () => {
        if (!selectedSection) return;

        // 1. Load Students (Populate from Attendance Logger DB)
        const studentData = await StorageService.getSchoolStudents(selectedSection);
        setStudents(studentData);

        // 2. Load Existing Chart
        const savedChart = await StorageService.getSeatingChart(selectedSection.id);

        if (savedChart && Array.isArray(savedChart) && savedChart.length > 0) {
            setChairs(savedChart);
            setMode(MODES.ASSIGN); // Skip welcome if data exists
        } else {
            setChairs([]);
            setMode(MODES.WELCOME);
        }
    };

    // --- Layout Mode Handlers ---
    // Unified function to add chairs/smartboards
    const addChair = (type, x, y) => {
        const newChair = {
            id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type,
            x,
            y,
            rotation: 0,
            studentId: null
        };
        setChairs(prev => {
            console.log("Adding chair. Current count:", prev.length, "New:", newChair.id);
            return [...prev, newChair];
        });
    };

    const handleAddChairDragEnd = (event, info, type = 'desk') => {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const relativeX = info.point.x - canvasRect.left;
        const relativeY = info.point.y - canvasRect.top;

        // DEBUG LOGGING
        console.log('Drop Attempt:', {
            point: info.point,
            canvasRect: { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height },
            relative: { x: relativeX, y: relativeY },
            isInside: (
                relativeX >= 0 &&
                relativeX <= canvasRect.width &&
                relativeY >= 0 &&
                relativeY <= canvasRect.height
            )
        });

        if (
            relativeX >= 0 &&
            relativeX <= canvasRect.width &&
            relativeY >= 0 &&
            relativeY <= canvasRect.height
        ) {
            // Use the unified add function
            // Center drop logic: 64 is half of desk width (128), 40 is half of desk height (80)
            addChair(type, relativeX - (type === 'smartboard' ? 128 : 64), relativeY - (type === 'smartboard' ? 24 : 40));
        } else {
            console.warn("Drop rejected: Outside canvas bounds");
            // Optional: Alert for debugging purposes (remove later)
            // alert("Missed the classroom area! Try dropping it closer to the center.");
        }
    };

    const handleChairMove = (id, newPos) => {
        setChairs(prev => prev.map(c => c.id === id ? { ...c, x: newPos.x, y: newPos.y } : c));
    };

    const handleRotateChair = (id) => {
        setChairs(prev => prev.map(c => {
            if (c.id === id) {
                const newRotation = (c.rotation || 0) + 90;
                return { ...c, rotation: newRotation >= 360 ? 0 : newRotation };
            }
            return c;
        }));
    };

    const handleRemoveChair = (id) => {
        setChairs(prev => prev.filter(c => c.id !== id));
        if (selectedChairId === id) setSelectedChairId(null);
    };

    // --- Assign Mode Handlers ---
    const handleStudentDrop = (event, info, student) => {
        // Find which chair was dropped onto
        // Simple collision detection
        const dropRect = {
            left: info.point.x - 20,
            right: info.point.x + 20,
            top: info.point.y - 20,
            bottom: info.point.y + 20
        };

        // We need absolute positions of chairs to check collision
        // Since chairs in state have relative positions to canvas
        const canvasRect = canvasRef.current.getBoundingClientRect();

        const targetChair = chairs.find(chair => {
            const chairAbsX = canvasRect.left + chair.x;
            const chairAbsY = canvasRect.top + chair.y;

            // Simplified collision (center point check might be better, but rect overlap is standard)
            const isMatch = (
                dropRect.right > chairAbsX &&
                dropRect.left < chairAbsX + 128 && // 128 is width
                dropRect.bottom > chairAbsY &&
                dropRect.top < chairAbsY + 80 // 80 is height
            );

            return isMatch;
        });

        if (targetChair) {
            // Assign student to chair
            assignStudentToChair(student.id, targetChair.id);
        }
    };

    const assignStudentToChair = (studentId, chairId) => {
        // 1. Remove student from any other chair
        const cleanedChairs = chairs.map(c => c.studentId === studentId ? { ...c, studentId: null } : c);

        // 2. Assign to new chair
        setChairs(cleanedChairs.map(c => c.id === chairId ? { ...c, studentId: studentId } : c));
    };

    const unassignStudent = (chairId) => {
        setChairs(prev => prev.map(c => c.id === chairId ? { ...c, studentId: null } : c));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await StorageService.saveSeatingChart(selectedSection.id, chairs);
        setIsSaving(false);
    };

    const handleReset = () => {
        if (window.confirm("Clear entire layout? This cannot be undone.")) {
            setChairs([]);
            setMode(MODES.LAYOUT);
        }
    };

    // Helper to get unassigned students
    const getUnassignedStudents = () => {
        const assignedIds = new Set(chairs.map(c => c.studentId).filter(Boolean));
        return students.filter(s => !assignedIds.has(s.id));
    };

    // --- Render ---

    if (mode === MODES.WELCOME) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
                    <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-600">
                        <Armchair size={40} />
                    </div>
                    <h2 className="text-3xl font-display font-bold text-slate-800 mb-4">Seating Chart Setup</h2>
                    <p className="text-slate-600 mb-8 text-lg">
                        Let's organize your classroom! We'll start by arranging the desks, then we'll assign your students to them.
                    </p>
                    <button
                        onClick={() => setMode(MODES.LAYOUT)}
                        className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                        Start Layout <ChevronRight />
                    </button>
                    <button
                        onClick={onClose}
                        className="mt-4 text-slate-400 hover:text-slate-600 font-medium text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-slate-100 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-slate-200 shadow-xl flex flex-col z-10">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-display font-bold text-slate-800">
                            {mode === MODES.LAYOUT ? 'Room Layout' : 'Assign Students'}
                        </h2>
                        <span className="text-xs font-bold px-2 py-1 bg-primary-100 text-primary-700 rounded uppercase tracking-wider">
                            Step {mode === MODES.LAYOUT ? '1' : '2'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500">
                        {mode === MODES.LAYOUT
                            ? 'Drag chairs onto the grid to match your room.'
                            : 'Drag students onto the chairs to seat them. Hover over a student to remove them.'}
                    </p>
                </div>

                {/* Action Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                    {mode === MODES.LAYOUT ? (
                        <div className="space-y-6">
                            <div className="space-y-6">
                                {/* Desk Draggable */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Student Desk</p>
                                    <motion.div
                                        drag
                                        dragSnapToOrigin
                                        whileDrag={{ scale: 1.1, zIndex: 100, opacity: 0.8 }}
                                        whileHover={{ scale: 1.05 }}
                                        style={{ cursor: 'pointer' }} // Pointer to indicate clickable
                                        onDragEnd={(e, info) => handleAddChairDragEnd(e, info, 'desk')}
                                        onClick={() => {
                                            if (canvasRef.current) {
                                                const rect = canvasRef.current.getBoundingClientRect();
                                                // Add to center of canvas with random offset. 64/40 is half w/h
                                                addChair('desk', rect.width / 2 - 64 + (Math.random() * 40 - 20), rect.height / 2 - 40 + (Math.random() * 40 - 20));
                                            }
                                        }}
                                        className="w-32 h-20 mx-auto bg-white rounded-xl border-2 border-dashed border-primary-300 flex items-center justify-center shadow-sm hover:border-primary-500 hover:shadow-md transition-all relative overflow-hidden group"
                                    >
                                        <Armchair className="text-primary-500" size={32} />
                                        <div className="absolute inset-0 bg-primary-50 opacity-0 group-hover:opacity-10 transition-opacity" />
                                        <div className="absolute bottom-2 text-[10px] text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Click to Add</div>
                                    </motion.div>
                                    <p className="text-xs text-slate-400 mt-3">Drag to add desk</p>
                                </div>

                                {/* Smartboard Draggable */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Smartboard</p>
                                    <motion.div
                                        drag
                                        dragSnapToOrigin
                                        whileDrag={{ scale: 1.1, zIndex: 100, opacity: 0.8 }}
                                        whileHover={{ scale: 1.05 }}
                                        style={{ cursor: 'pointer' }}
                                        onDragEnd={(e, info) => handleAddChairDragEnd(e, info, 'smartboard')}
                                        onClick={() => {
                                            if (canvasRef.current) {
                                                const rect = canvasRef.current.getBoundingClientRect();
                                                addChair('smartboard', rect.width / 2 - 128 + (Math.random() * 40 - 20), rect.height / 2 - 20 + (Math.random() * 40 - 20));
                                            }
                                        }}
                                        className="w-48 h-10 mx-auto bg-slate-800 rounded-md border-2 border-slate-600 flex items-center justify-center shadow-sm hover:border-slate-500 hover:shadow-md transition-all relative overflow-hidden group"
                                    >
                                        <div className="w-full h-full bg-slate-700/50 absolute inset-0" />
                                        <Monitor className="text-white relative z-10" size={20} />
                                        <div className="absolute bottom-1 text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">Click to Add</div>
                                    </motion.div>
                                    <p className="text-xs text-slate-400 mt-3">Drag to add board</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {getUnassignedStudents().length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    {students.length === 0 ? (
                                        <>
                                            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p className="font-medium text-slate-600">No Students</p>
                                            <p className="text-xs">Add students to this class first.</p>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-10 h-10 mx-auto mb-2 opacity-50 text-green-500" />
                                            <p className="font-medium text-slate-600">All Set!</p>
                                            <p className="text-xs">Every student has a seat.</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                getUnassignedStudents().map(student => (
                                    <motion.div
                                        key={student.id}
                                        drag
                                        dragSnapToOrigin
                                        whileDrag={{ scale: 1.05, zIndex: 100, cursor: 'grabbing' }}
                                        onDragEnd={(e, info) => handleStudentDrop(e, info, student)}
                                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-grab hover:shadow-md hover:border-primary-200 transition-all flex items-center gap-3 group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:from-primary-100 group-hover:to-primary-200 group-hover:text-primary-700 transition-colors">
                                            {student.name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-slate-700 text-sm truncate">{student.name}</span>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="p-4 border-t border-slate-100 bg-white">
                    {mode === MODES.LAYOUT ? (
                        <button
                            onClick={() => setMode(MODES.ASSIGN)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors"
                        >
                            Next: Assign Students <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setMode(MODES.LAYOUT)}
                            className="w-full flex items-center justify-center gap-2 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                        >
                            <ArrowLeft size={16} /> Back to Layout
                        </button>
                    )}
                </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 flex flex-col relative bg-slate-50">
                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-50">
                    <div className="pointer-events-auto bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-slate-200">
                        <h1 className="text-xl font-bold text-slate-800">{selectedSection.name}</h1>
                        <p className="text-sm text-slate-500">
                            {mode === MODES.LAYOUT ? 'Step 1: Arrange Desks' : 'Step 2: Seat Students'}
                        </p>
                    </div>

                    <div className="flex gap-2 pointer-events-auto">
                        <button
                            onClick={handleReset}
                            className="p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200 hover:bg-red-50 text-slate-600 hover:text-red-500 transition-colors"
                            title="Clear All"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-md transition-colors disabled:opacity-70 font-medium"
                        >
                            {isSaving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>

                        {/* Rotation Button (Visible when item selected) */}
                        {selectedChairId && mode === MODES.LAYOUT && (
                            <button
                                onClick={() => handleRotateChair(selectedChairId)}
                                className="p-2 rounded-lg bg-orange-100/90 backdrop-blur-sm shadow-sm border border-orange-200 hover:bg-orange-200 text-orange-700 transition-colors"
                                title="Rotate Selected"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* The Grid Canvas */}
                {/* Canvas Area */}
                <div className="flex-1 bg-slate-200 p-8 overflow-auto flex items-center justify-center">
                    <div
                        ref={canvasRef}
                        className="bg-white shadow-2xl relative transition-all duration-500 overflow-hidden"
                        style={{
                            width: '100%',
                            height: '100%',
                            minHeight: '600px',
                            minWidth: '800px',
                            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}
                    >
                        {/* Floor Texture (Simplified for 2D) */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none bg-slate-100" />
                        {chairs.map(chair => {
                            const assignedStudent = students.find(s => s.id === chair.studentId);
                            return (
                                <motion.div
                                    key={chair.id}
                                    drag={mode === MODES.LAYOUT}
                                    dragMomentum={false}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1, x: chair.x, y: chair.y }}
                                    onDragEnd={(e, info) => {
                                        const canvasRect = canvasRef.current.getBoundingClientRect();
                                        // Use offset (delta from start of drag) to keep implementation smooth
                                        // This prevents "snapping to mouse cursor" (top-left jumping to pointer)
                                        let newX = chair.x + info.offset.x;
                                        let newY = chair.y + info.offset.y;

                                        // Clamping to Canvas Bounds
                                        // Desk size is w-32 (128px) h-20 (80px).
                                        const deskWidth = 128;
                                        const deskHeight = 80;
                                        // Ensure it stays within bounds
                                        newX = Math.max(0, Math.min(newX, canvasRect.width - deskWidth));
                                        newY = Math.max(0, Math.min(newY, canvasRect.height - deskHeight));

                                        handleChairMove(chair.id, { x: newX, y: newY });
                                    }}
                                    className="absolute"
                                    style={{
                                        zIndex: Math.floor(chair.y) // Simple Z-layering
                                    }}
                                >
                                    <Desk
                                        id={chair.id}
                                        type={chair.type}
                                        student={assignedStudent}
                                        isLayoutMode={mode === MODES.LAYOUT}
                                        isSelected={selectedChairId === chair.id}
                                        rotation={chair.rotation || 0}
                                        onSelect={() => setSelectedChairId(chair.id)}
                                        onRemove={() => handleRemoveChair(chair.id)}
                                        onRemoveStudent={() => unassignStudent(chair.id)}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeatingChartBuilder;
