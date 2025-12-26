import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Download, Upload, Bell, Palette, Clock, GraduationCap } from 'lucide-react';
import { StorageService } from '../services/StorageService';

const SECTIONS = [
  { id: 'super1', name: 'Super 1', color: 'bg-blue-500' },
  { id: 'super2', name: 'Super 2', color: 'bg-indigo-500' },
  { id: 'super3', name: 'Super 3', color: 'bg-purple-500' },
  { id: 'whiz1', name: 'Whiz 1', color: 'bg-green-500' },
  { id: 'whiz2', name: 'Whiz 2', color: 'bg-teal-500' },
  { id: 'whiz3', name: 'Whiz 3', color: 'bg-cyan-500' },
];

const SettingsModal = ({ isOpen, onClose, onSettingsChange, selectedSection, onSectionChange }) => {
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    reminderTime: 2,
    autoStartWidget: false,
    widgetPosition: 'right',
    soundEnabled: true
  });
  const [currentSection, setCurrentSection] = useState(selectedSection);

  useEffect(() => {
    if (isOpen) {
      const savedSettings = StorageService.getSettings();
      setSettings(savedSettings);
      setCurrentSection(selectedSection);
    }
  }, [isOpen, selectedSection]);

  const handleSave = () => {
    StorageService.saveSettings(settings);
    onSettingsChange(settings);
    
    // Handle section change if different from current
    if (currentSection && currentSection.id !== selectedSection?.id) {
      StorageService.saveSelectedSection(currentSection);
      onSectionChange(currentSection);
    }
    
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      theme: 'light',
      notifications: true,
      reminderTime: 2,
      autoStartWidget: false,
      widgetPosition: 'right',
      soundEnabled: true
    };
    setSettings(defaultSettings);
    setCurrentSection(selectedSection); // Reset section to current
  };

  const handleSectionChange = (sectionId) => {
    const section = SECTIONS.find(s => s.id === sectionId);
    setCurrentSection(section);
  };

  const handleExport = () => {
    const data = StorageService.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classpoint-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const success = StorageService.importData(data);
        if (success) {
          alert('Settings imported successfully! Please refresh the app.');
        } else {
          alert('Failed to import settings.');
        }
      } catch (error) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Notifications */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary-600" />
              Notifications
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-gray-700">Enable notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-gray-700">Enable sound</span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>

              <div className="space-y-2">
                <label className="text-gray-700 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Reminder time (minutes before class)
                </label>
                <select
                  value={settings.reminderTime}
                  onChange={(e) => setSettings({ ...settings, reminderTime: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={1}>1 minute</option>
                  <option value={2}>2 minutes</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Widget Settings */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Palette className="w-5 h-5 mr-2 text-primary-600" />
              Widget
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-gray-700">Auto-start widget</span>
                <input
                  type="checkbox"
                  checked={settings.autoStartWidget}
                  onChange={(e) => setSettings({ ...settings, autoStartWidget: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>

              <div className="space-y-2">
                <label className="text-gray-700">Widget position</label>
                <select
                  value={settings.widgetPosition}
                  onChange={(e) => setSettings({ ...settings, widgetPosition: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="left">Left side</option>
                  <option value="right">Right side</option>
                  <option value="top-left">Top left</option>
                  <option value="top-right">Top right</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section Settings */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-primary-600" />
              Section
            </h3>
            
            <div className="space-y-2">
              <label className="text-gray-700">Current section</label>
              <select
                value={currentSection?.id || ''}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {SECTIONS.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              {currentSection?.id !== selectedSection?.id && (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                  ⚠️ Section will be changed when you save settings
                </p>
              )}
            </div>
          </div>

          {/* Data Management */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">Data Management</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <label className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;