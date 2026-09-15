import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Folder, FileText, Image as ImageIcon, File, Search, X, Video } from 'lucide-react';
import { db } from '../firebase';
import { useSchoolId } from '../hooks/useSchoolId';
import { query, collection, where, onSnapshot } from 'firebase/firestore';

const ResourceHub = ({ selectedSection, onClose, onOpenImage, onOpenPDF, onOpenVideo }: any) => {
  const schoolId = useSchoolId();
  const [files, setFiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSection) {
      setFiles([]);
      setLoading(false);
      return;
    }

    const targetGradeNum = String(selectedSection.grade || '').replace(/\D/g, "");
    const cleanTargetSection = String(selectedSection.id || '').toLowerCase();

    const q = query(
      collection(db, "schools", schoolId, "shared_files"),
      where("isArchived", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetched: any[] = [];
        querySnapshot.forEach((doc: any) => {
          const data = doc.data();
          if (data.isDeleted) return;

          const fileSection = String(data.sectionContext || '').toLowerCase();
          const isExplicitSectionMatch = fileSection && fileSection === cleanTargetSection;
          const isOtherSection = fileSection && fileSection !== cleanTargetSection;

          // If targeted to a different section, ignore
          if (isOtherSection) return;

          // Check grade match (or if explicitly targeted to this section)
          const fileGradeNum = String(data.gradeContext || '').replace(/\D/g, "");
          const isGradeMatch = targetGradeNum && fileGradeNum && targetGradeNum === fileGradeNum;

          if (isExplicitSectionMatch || isGradeMatch) {
            fetched.push({ id: doc.id, ...data });
          }
        });

        fetched.sort((a: any, b: any) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setFiles(fetched);
        setLoading(false);
      },
      (error) => {
        console.error("Error subscribing to shared files:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedSection, schoolId]);



  const openFile = async (file: any) => {
    if (!file || !file.downloadUrl) {
      toast.error('Error: File path is missing.');
      return;
    }

    const filePath = file.downloadUrl;
    const { type, resourceType } = file;

    const isPDFName = file.fileName?.toLowerCase().endsWith('.pdf');
    const isPDF = type === 'pdf' || isPDFName;
    const isVideo = type === 'video' || resourceType === 'video';
    const isImage = !isPDF && (type === 'image' || resourceType === 'image');

    if (isPDF && onOpenPDF) return onOpenPDF(filePath);
    if (isVideo && onOpenVideo) return onOpenVideo(filePath);
    if (isImage && onOpenImage) return onOpenImage(filePath);

    const openInDefaultApp = (fileUrl: any, e: any) => {
        if (e) e.stopPropagation();
        if (window.electronAPI) {
            window.electronAPI.invoke('open-path', fileUrl).then((res: any) => {
                if (!res.success) {
                    window.open(fileUrl, '_blank');
                }
            });
        } else {
            window.open(fileUrl, '_blank');
        }
    };
    
    openInDefaultApp(filePath, null);
  };

  const getFileIcon = (file: any) => {
    const type = file.type || '';
    const resourceType = file.resourceType || '';
    const name = file.fileName?.toLowerCase() || '';

    if (type === 'image' || resourceType === 'image') return <ImageIcon className="w-6 h-6 text-[#AF52DE]" strokeWidth={1.5} />;
    if (type === 'pdf' || name.endsWith('.pdf')) return <FileText className="w-6 h-6 text-[#FF453A]" strokeWidth={1.5} />;
    if (type === 'video' || resourceType === 'video') return <Video className="w-6 h-6 text-[#32D74B]" strokeWidth={1.5} />;
    return <File className="w-6 h-6 text-[#0A84FF]" strokeWidth={1.5} />;
  };

  const filteredFiles = files.filter((file: any) => file.fileName && file.fileName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-zen-text">
      <div className="w-full max-w-6xl h-[88vh] bg-zen-surface rounded-[32px] border border-zen-text/10 shadow-2xl overflow-hidden flex flex-col pt-2 animate-slide-up">
        {/* Header */}
        <div className="px-8 flex items-center justify-between shrink-0 h-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zen-accent/20">
              <Folder className="w-6 h-6 text-zen-accent" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zen-text tracking-tight leading-none">Files</h2>
              <p className="text-sm font-medium text-zen-text-2 mt-1">{selectedSection.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-zen-text/5 hover:bg-zen-text/10 transition-all text-zen-text-2 hover:text-zen-text"
          >
            <X className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-8 pb-8">
          {/* Action Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-text-2" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-5 py-3.5 bg-zen-bg border-none rounded-2xl text-zen-text placeholder-zen-text-2 focus:ring-2 focus:ring-zen-accent transition-all font-medium"
              />
            </div>
          </div>

          {/* File Grid */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-zen-text-2 py-10">
                <div className="animate-spin h-10 w-10 border-4 border-zen-accent border-t-transparent rounded-full mb-6"></div>
                <p className="text-lg font-medium">Loading files...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zen-text-2 py-10">
                <File className="w-16 h-16 mb-6 opacity-20" strokeWidth={1} />
                <p className="text-lg font-medium">No files found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
                {filteredFiles.map((file: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => openFile(file)}
                    className={`group relative p-5 bg-zen-bg hover:brightness-110 rounded-2xl transition-all duration-300 flex flex-col gap-4 cursor-pointer active:scale-95 border shadow-sm ${file.isPinned ? "border-zen-accent" : "border-transparent"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-3.5 rounded-xl bg-zen-text/5 border border-zen-text/5">
                        {getFileIcon(file)}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-zen-text truncate w-full pr-2" title={file.fileName}>
                        {file.fileName}
                      </h3>
                      <p className="text-xs text-zen-text-2 mt-1.5 font-medium flex items-center justify-between">
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>{file.createdAt ? new Date(file.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Just now'}</span>
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
