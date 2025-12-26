import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import ManualTimetableEntry from './ManualTimetableEntry.jsx';

const TimetableUploader = ({ onUpload, onCancel, selectedSection }) => {
  const handleManualSave = (timetableData) => {
    onUpload(timetableData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm border-primary-500 text-primary-600`}
            >
              <Edit3 className="w-4 h-4 inline mr-2" />
              Manual Entry
            </button>
          </nav>
        </div>
      </div>
      <ManualTimetableEntry
        onSave={handleManualSave}
        onCancel={onCancel}
        selectedSection={selectedSection}
      />
    </div>
  );
};

export default TimetableUploader;
