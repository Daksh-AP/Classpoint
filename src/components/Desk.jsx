import React from 'react';
import { motion } from 'framer-motion';
import { User, X, Armchair, Monitor } from 'lucide-react';

/**
 * Desk Component
 * 
 * Renders a desk or smartboard item for the seating chart.
 * 
 * @param {string} id - Unique identifier for the desk.
 * @param {object} student - Student object assigned to this desk (or null).
 * @param {string} type - Type of item: 'desk' or 'smartboard'.
 * @param {boolean} isLayoutMode - Whether the chart is in layout editing mode.
 * @param {boolean} isSelected - Whether this item is currently selected.
 * @param {function} onSelect - Callback when item is clicked.
 * @param {function} onRemove - Callback to remove the item (layout mode).
 * @param {function} onRemoveStudent - Callback to remove the assigned student.
 * @param {number} rotation - Rotation angle in degrees.
 */
const Desk = ({
    id,
    student,
    type = 'desk',
    isLayoutMode,
    isSelected,
    onSelect,
    onRemove,
    onRemoveStudent,
    rotation = 0

}) => {
    // --- SMARTBOARD ---
    if (type === 'smartboard') {
        return (
            <motion.div
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: 1,
                    opacity: 1,
                    borderColor: isSelected ? '#3b82f6' : 'transparent',
                    borderWidth: isSelected ? '2px' : '0px',
                    rotateZ: rotation,
                }}
                className={`
                    relative flex items-center justify-center 
                    w-64 h-12 rounded-md shadow-xl transition-all
                    ${isLayoutMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                    bg-slate-900
                `}
                onClick={(e) => isLayoutMode && onSelect && (e.stopPropagation(), onSelect())}
            >
                <div className="absolute inset-0 bg-black border-[6px] border-slate-900 rounded-lg flex items-center justify-center overflow-hidden shadow-inner ring-1 ring-slate-700">
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center relative">
                        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 pointer-events-none" />
                        <span className="absolute text-[8px] text-slate-500 font-bold tracking-widest uppercase" style={{ transform: `rotate(${-rotation}deg)` }}>Smartboard</span>
                    </div>
                </div>
                {isLayoutMode && isSelected && onRemove && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="absolute -top-4 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 z-20 scale-75"
                        style={{ transform: `rotate(${-rotation}deg)` }}
                    >
                        <X size={14} />
                    </button>
                )}
            </motion.div>
        );
    }


    // --- STUDENT DESK ---
    return (
        <motion.div
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: 1,
                borderColor: isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.3)',
                borderWidth: isSelected ? '2px' : '1px',
                rotateZ: rotation,
            }}
            className={`
                relative flex flex-col items-center justify-center 
                w-28 h-18 rounded-lg shadow-sm transition-all 
                ${isLayoutMode ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-default'}
                ${student ? 'bg-white border border-slate-200' : 'bg-slate-50 border-2 border-dashed border-slate-300'}
            `}
            onClick={(e) => {
                if (onSelect) {
                    e.stopPropagation();
                    onSelect();
                }
            }}
        >
            {/* Chair Icon / Visual */}
            {!student && (
                <div className="flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <Armchair size={40} strokeWidth={1.5} />
                    {isLayoutMode && <span className="text-[10px] mt-1 font-medium">Empty Seat</span>}
                </div>
            )}

            {/* Student Data */}
            {student && (
                <>
                    <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center mb-2 shadow-inner"
                        style={{ transform: `rotate(${-rotation}deg)` }}
                    >
                        <span className="text-white font-bold text-lg">
                            {student.name.charAt(0)}
                        </span>
                    </div>
                    <span
                        className="text-xs font-medium text-slate-700 truncate w-full text-center px-1 bg-white/50 rounded-sm mx-1"
                        style={{ transform: `rotate(${-rotation}deg)` }}
                    >
                        {student.name.split(' ')[0]}
                    </span>

                    {/* Remove Student Button */}
                    {!isLayoutMode && onRemoveStudent && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemoveStudent(); }}
                            className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 transition-opacity shadow-md hover:bg-red-600 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            title="Remove Student"
                            style={{ transform: `rotate(${-rotation}deg)` }}
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    )}
                </>
            )}

            {/* Delete Chair Button (Layout Mode) */}
            {isLayoutMode && isSelected && onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 z-20"
                    style={{ transform: `rotate(${-rotation}deg)` }}
                >
                    <X size={14} />
                </button>
            )}
        </motion.div>
    );
};

export default Desk;
