import React from 'react';
import { ChevronRight, BookOpen } from 'lucide-react';

export default function SectionList({ sections, onSelect }) {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Select Class
            </h1>
            <div className="space-y-3">
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => onSelect(section)}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-lg text-white">{section.name}</h3>
                                <p className="text-sm text-gray-400">Grade {section.grade}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                    </button>
                ))}
            </div>
        </div>
    );
}
