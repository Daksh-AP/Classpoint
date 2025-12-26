import React, { useState } from 'react';
import { GraduationCap, ChevronRight } from 'lucide-react';

const SECTIONS = [
  { id: 'super1', name: 'Super 1', color: 'bg-blue-500' },
  { id: 'super2', name: 'Super 2', color: 'bg-indigo-500' },
  { id: 'super3', name: 'Super 3', color: 'bg-purple-500' },
  { id: 'whiz1', name: 'Whiz 1', color: 'bg-green-500' },
  { id: 'whiz2', name: 'Whiz 2', color: 'bg-teal-500' },
  { id: 'whiz3', name: 'Whiz 3', color: 'bg-cyan-500' },
];

const SectionSelector = ({ onSectionSelect }) => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSectionClick = (section) => {
    setSelectedSection(section);
    setIsAnimating(true);
    
    setTimeout(() => {
      onSectionSelect(section);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 animate-pop-in"> {/* Added max-w-3xl, rounded-3xl, shadow-2xl, and pop-in animation */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary-600 p-5 rounded-full shadow-xl animate-float"> {/* Increased padding, shadow, and added float animation */}
              <GraduationCap className="w-14 h-14 text-white" /> {/* Increased icon size */}
            </div>
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4 leading-tight"> {/* Increased font size and weight */}
            Welcome to ClassPoint
          </h1>
          <p className="text-xl text-gray-700 max-w-lg mx-auto leading-relaxed"> {/* Increased max-width, darker text, and relaxed line height */}
            Select your section to get started with tracking your class schedule comfortably.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up"> {/* Increased gap */}
          {SECTIONS.map((section, index) => (
            <div
              key={section.id}
              className={`
                relative overflow-hidden rounded-2xl cursor-pointer transform transition-all duration-500 ease-in-out
                hover:scale-105 hover:shadow-xl hover:bg-gradient-to-r from-white to-primary-50
                ${selectedSection?.id === section.id ? 'ring-4 ring-primary-500 scale-105 shadow-2xl animate-pulse-soft' : 'bg-white shadow-md'}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleSectionClick(section)}
            >
              <div className="p-6"> {/* Removed redundant border and rounded-xl */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 ${section.color} rounded-xl flex items-center justify-center shadow-lg`}> {/* Increased size, rounded-xl, shadow */}
                      <span className="text-white font-extrabold text-xl"> {/* Increased font size and weight */}
                        {section.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900"> {/* Increased font size and weight */}
                        {section.name}
                      </h3>
                      <p className="text-gray-600 text-base"> {/* Darker text, slightly larger */}
                        Class Section
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-8 h-8 text-primary-400 group-hover:translate-x-1 transition-transform duration-300" /> {/* Increased size, primary color, hover animation */}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 animate-fade-in"> {/* Increased margin-top */}
          <p className="text-base text-gray-600"> {/* Slightly larger and darker text */}
            Your selection will be saved for future sessions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SectionSelector;
