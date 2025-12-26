import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Image, File, Plus, Trash2, Download, ExternalLink, Search, X } from 'lucide-react';

const ResourceHub = ({ selectedSection, onClose, onOpenImage }) => {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);

  const sectionRef = useRef(selectedSection);

  // Update ref when section changes
  useEffect(() => {
    sectionRef.current = selectedSection;
  }, [selectedSection]);

  // Load files from local storage on component mount or section change
  useEffect(() => {
    const savedFiles = JSON.parse(localStorage.getItem(`resource_hub_files_${selectedSection.id}`)) || [];
    setFiles(savedFiles);
    setIsLoaded(true);
  }, [selectedSection]);

  // Save files to local storage ONLY when 'files' state changes
  // We use the ref to get the current section ID without triggering this effect when the section changes
  useEffect(() => {
    if (isLoaded && sectionRef.current) {
      localStorage.setItem(`resource_hub_files_${sectionRef.current.id}`, JSON.stringify(files));
    }
  }, [files, isLoaded]);

  // Listen for external updates (e.g. downloads)
  useEffect(() => {
    const handleUpdate = () => {
      const savedFiles = JSON.parse(localStorage.getItem(`resource_hub_files_${selectedSection.id}`)) || [];
      setFiles(savedFiles);
    };

    window.addEventListener('resource-hub-updated', handleUpdate);
    return () => window.removeEventListener('resource-hub-updated', handleUpdate);
  }, [selectedSection]);

  const handleFileChange = (event) => {
    const { webUtils } = window.require ? window.require('electron') : {};
    const newFiles = Array.from(event.target.files).map(file => {
      let filePath = file.path;
      if (webUtils) {
        try {
          filePath = webUtils.getPathForFile(file);
        } catch (e) {
          console.warn("Failed to get path via webUtils:", e);
        }
      }
      return {
        name: file.name,
        type: file.type,
        path: filePath,
        size: file.size,
        addedAt: new Date().toISOString(),
      };
    });
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const { ipcRenderer, webUtils } = window.require ? window.require('electron') : {};

    // First, handle files dropped from desktop
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(event.dataTransfer.files).map(file => {
        let filePath = file.path;
        if (webUtils) {
          try {
            filePath = webUtils.getPathForFile(file);
          } catch (e) {
            console.warn("Failed to get path via webUtils:", e);
          }
        }
        return {
          name: file.name,
          type: file.type,
          path: filePath,
          size: file.size,
          addedAt: new Date().toISOString(),
        };
      });
      setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
      return;
    }

    // Next, handle URLs (e.g., images dragged from the browser)
    const items = event.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'string' && (item.type === 'text/uri-list' || item.type === 'text/plain')) {
        item.getAsString((url) => {
          if (url) {
            // Send URL to Electron to download
            if (ipcRenderer && ipcRenderer.send) {
              ipcRenderer.send('download-url', url);
            }
          }
        });
        break;
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const openFile = async (filePath, fileType) => {
    if (!filePath) {
      alert('Error: File path is missing.');
      return;
    }

    // Check if it's an image
    if (fileType && fileType.startsWith('image/') && onOpenImage) {
      onOpenImage(filePath);
      return;
    }

    if (window.require) {
      try {
        const { shell } = window.require('electron');
        const error = await shell.openPath(filePath);
        if (error) {
          console.error('Failed to open file:', error);
          alert(`Failed to open file: ${error}`);
        }
      } catch (err) {
        console.error('Error invoking shell:', err);
        alert(`Error opening file: ${err.message}`);
      }
    } else {
      alert('File opening is only supported in the desktop application.');
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-primary-500" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-5xl h-[85vh] glass-card flex flex-col text-default-text-light dark:text-default-text-dark overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold text-default-text-light dark:text-default-text-dark flex items-center">
            <Folder className="w-8 h-8 mr-3 text-blue-500 dark:text-blue-300" />
            Resource Hub
            <span className="ml-3 text-lg font-normal text-gray-400">
              {selectedSection.name}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {/* Search and Add Files */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-black/20 text-default-text-light dark:text-default-text-dark placeholder-gray-500 backdrop-blur-sm transition-all"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Add File</span>
            </button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Drag and Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-500/30 rounded-xl p-8 text-center text-gray-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all mb-6 shrink-0"
          >
            <div className="flex flex-col items-center gap-2">
              <Download className="w-8 h-8 opacity-50" />
              <p>Drag & drop files here, or click "Add File"</p>
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {filteredFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <File className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">No files in your Resource Hub yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((file, index) => (
                  <div
                    key={index}
                    onClick={() => openFile(file.path, file.type)}
                    className="group relative p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all duration-300 flex flex-col gap-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="p-3 rounded-lg bg-white/5">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFile(file.path, file.type);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Open File"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-default-text-light dark:text-default-text-dark truncate" title={file.name}>
                        {file.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceHub;
