import { useSchoolId } from './hooks/useSchoolId';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SectionSelector from './components/SectionSelector';
import MainDashboard from './components/MainDashboard';
import Widget from './components/Widget';
import SettingsModal from './components/SettingsModal';

import SlideOutMenu from './components/SlideOutMenu';
import ResourceHub from './components/ResourceHub';
import Whiteboard from './components/Whiteboard';
import Browser from './components/Browser';
import ImageViewer from './components/ImageViewer';
import PDFViewer from './components/PDFViewer';
import VideoViewer from './components/VideoViewer';
import AttendanceLogger from './components/AttendanceLogger';
import Timer from './components/Timer';
import ErrorBoundary from './components/ErrorBoundary';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';
import GenatisSpark from './components/GenatisSpark';
import AmbientDashboard from './components/AmbientDashboard';
import AlertOverlay from './components/AlertOverlay';

import { useAuth } from './context/AuthProvider';
import { useSettings } from './context/SettingsProvider';
import { useSystem } from './context/SystemProvider';
import { useData } from './context/DataProvider';
import { useTools } from './context/ToolProvider';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebase';

declare global {
  interface Window {
    require: any
  }
}

function App() {
  const isOverlayMode = window.location.hash === '#/overlay';

  const { currentUser, isLoading } = useAuth();
  const { settings, theme, connectedSmartboardId, handleSettingsChange, handleConnectSmartboard, themeOverlay, overlayTheme } = useSettings();
  const { isIdle, isOffline, resetIdleTimer } = useSystem();
  const { selectedSection, isSectionLocked, timetableData, handleSectionSelect, handleTimetableUpload } = useData();
  const { activeTool, toolPayload, openTool, closeTool } = useTools();
  const schoolId = useSchoolId();

  const [showSpark, setShowSpark] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDashboardView, setActiveDashboardView] = useState<'dashboard' | 'classContext' | 'schedule'>('dashboard');
  const [glanceabilityMode, setGlanceabilityMode] = useState<boolean>(() => localStorage.getItem('glanceabilityMode') === 'true');
  const toggleGlanceabilityMode = () => setGlanceabilityMode(prev => {
    const next = !prev;
    localStorage.setItem('glanceabilityMode', String(next));
    return next;
  });

  // Auth local state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPinLogin, setIsPinLogin] = useState(false);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Sync smartboard status to Firestore with continuous heartbeat
  useEffect(() => {
    if (!connectedSmartboardId) return;
    
    const boardRef = doc(db, 'schools', schoolId, 'smartboards', connectedSmartboardId);
    
    const sendHeartbeat = (statusOverride?: string) => {
      const status = statusOverride || (isOffline ? 'offline' : 'online');
      updateDoc(boardRef, { 
        status,
        lastSync: new Date().toISOString()
      }).catch(() => {});
    };

    // Send initial status
    sendHeartbeat();

    // 30-second recurring heartbeat
    const intervalId = setInterval(() => {
      sendHeartbeat();
    }, 30000);

    const handleBeforeUnload = () => {
      // Best effort to set offline when closing
      updateDoc(boardRef, { 
        status: 'offline',
        lastSync: new Date().toISOString()
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateDoc(boardRef, { 
        status: 'offline',
        lastSync: new Date().toISOString()
      }).catch(() => {});
    };
  }, [connectedSmartboardId, isOffline, schoolId]);

  useEffect(() => {
    if (!selectedSection || isOffline) return;

    const targetGradeNum = String(selectedSection.grade || '').replace(/\D/g, "");
    const cleanTargetSection = String(selectedSection.id || '').toLowerCase();

    const q = query(
      collection(db, "schools", schoolId, "shared_files"),
      where("transferQueue", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const file = change.doc.data();
          const fileSection = String(file.sectionContext || '').toLowerCase();
          
          // If targeted to a different section, ignore
          if (fileSection && fileSection !== cleanTargetSection) return;

          const fileGradeNum = String(file.gradeContext || '').replace(/\D/g, "");
          const isExplicitSectionMatch = fileSection && fileSection === cleanTargetSection;
          const isGradeMatch = targetGradeNum && fileGradeNum && targetGradeNum === fileGradeNum;

          if (!isExplicitSectionMatch && !isGradeMatch) return;
          
          if (file.transferQueue && file.downloadUrl) {
            if (window.electronAPI) {
              window.electronAPI.send('download-url', file.downloadUrl);
              toast.success(`Downloading queued file: ${file.fileName}`);
            }
            updateDoc(doc(db, 'schools', schoolId, 'shared_files', change.doc.id), { transferQueue: false }).catch(() => {});
          }
        }
      });
    });

    return () => unsubscribe();
  }, [selectedSection, isOffline, schoolId]);

  useEffect(() => {
    if (window.electronAPI) {
      const handleDownloadComplete = (event: any, fileInfo: any) => {
      if (selectedSection) {
        const storageKey = `resource_hub_files_${selectedSection.id}`;
        const existingFiles = JSON.parse(localStorage.getItem(storageKey) || '[]') as any[];
        const newFiles = [...existingFiles, fileInfo];
        localStorage.setItem(storageKey, JSON.stringify(newFiles));
        window.dispatchEvent(new Event('resource-hub-updated'));
        toast.success(`File downloaded to Resource Hub: ${fileInfo.name}`);
      } else {
        toast.success(`File downloaded: ${fileInfo.name}. Select a section to save it to the Resource Hub.`);
      }
    };

    const handleScreenCaptured = (event: any, image: any) => {
      openTool('imageViewer', image);
    };

    const handleRequestWidgetSync = () => {
      window.electronAPI.send('broadcast-widget-data', {
        section: selectedSection,
        timetable: timetableData
      });
    };

    const cleanupDownload = window.electronAPI.on('download-complete', handleDownloadComplete);
    const cleanupScreen = window.electronAPI.on('screen-captured', handleScreenCaptured);
    const cleanupSync = window.electronAPI.on('request-widget-sync', handleRequestWidgetSync);

    return () => {
      if (cleanupDownload) cleanupDownload();
      if (cleanupScreen) cleanupScreen();
      if (cleanupSync) cleanupSync();
    };
    }
  }, [selectedSection, timetableData, openTool]);

  // ─── Auth Handlers ─────────────────────────────
  const handleEmailSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handlePinSignIn = async () => {
    setAuthError(null);
    setIsUnlocking(true);
    const unlockToast = toast.loading('Verifying Substitute PIN...');
    try {
      // Secure substitute session: authenticate anonymously first so Firestore rules permit reading the substitution entry
      try {
        const { signInAnonymously } = await import('firebase/auth');
        await signInAnonymously(auth);
      } catch (authErr) {
        console.warn('Anonymous fallback auth notice:', authErr);
      }

      // Query active substitution with verified credentials
      const subsRef = collection(db, 'schools', schoolId, 'substitutions');
      const q = query(subsRef, where('pin', '==', pin), where('active', '==', true));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        throw new Error("Invalid or expired PIN");
      }
      
      const firstDoc = snap.docs[0];
      if (!firstDoc) throw new Error("Invalid or expired PIN");
      const subData = firstDoc.data();
      
      localStorage.setItem('substituteActive', 'true');
      localStorage.setItem('substituteName', subData.subName || 'Substitute Teacher');
      localStorage.setItem('substituteAbsentEmail', subData.absentTeacherEmail || '');

      if (subData.sectionId) {
        handleSectionSelect({
          id: subData.sectionId,
          name: subData.sectionName || subData.sectionId,
          grade: subData.grade || '9',
          studentCount: 0
        });
      }
      
      toast.success(`Welcome, ${subData.subName || 'Substitute'}!`, { id: unlockToast });
    } catch (error: any) {
      setAuthError(error.message);
      toast.error(error.message, { id: unlockToast });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSaveAnnotatedImage = async (dataUrl: string) => {
    if (!toolPayload) return;

    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.invoke('save-file', { dataUrl, payloadPath: toolPayload });
        if (result && result.success) {
          toast.success('Image saved successfully!');
          closeTool();
          window.dispatchEvent(new Event('resource-hub-updated'));
        } else {
          toast.error('Failed to save image: ' + (result?.error || 'Unknown error'));
        }
      } catch (error: any) {
// /* console.error */ ('Error saving image:', error);
        toast.error('Failed to save image: ' + error.message);
      }
    }
  };

  // ─── Render ─────────────────────────────
  if (isOverlayMode) {
    return <Widget isOverlay={true} selectedSection={selectedSection} timetableData={timetableData} />;
  }

  if (showSpark) {
    return (
      <div data-theme={theme}>
        <GenatisSpark isLoading={isLoading} onComplete={() => setShowSpark(false)} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div data-theme={theme} className="app-background min-h-screen flex items-center justify-center p-6">
        <div className="zen-card p-10 w-full max-w-md animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="text-h1 mb-3">Genatis Board</h1>
            <p className="text-small" style={{ color: 'var(--text-secondary)' }}>
              {isPinLogin ? 'Enter your 6-digit Substitute PIN' : 'Welcome back'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {!isPinLogin ? (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  className="zen-input"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  className="zen-input"
                />
                <button onClick={handleEmailSignIn} className="zen-btn zen-btn-accent w-full py-3 text-base">
                  Sign In
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="6-Digit PIN"
                  value={pin}
                  onChange={(e: any) => setPin(e.target.value)}
                  className="zen-input text-center text-2xl tracking-widest"
                  maxLength={6}
                />
                <button
                  onClick={handlePinSignIn}
                  className="zen-btn zen-btn-accent w-full py-3 text-base flex items-center justify-center"
                  disabled={pin.length !== 6 || isUnlocking}
                >
                  {isUnlocking ? (
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    'Unlock Smartboard'
                  )}
                </button>
              </>
            )}
          </div>

          <div className="text-center flex flex-col space-y-2">
            <button
              onClick={() => setIsPinLogin(!isPinLogin)}
              className="text-small transition-colors font-bold mt-2"
              style={{ color: 'var(--accent)' }}
            >
              {isPinLogin ? 'Use Email / Password' : 'Substitute Teacher? Use PIN'}
            </button>
          </div>

          {authError && (
            <div className="mt-6 p-3 rounded-lg text-small text-center"
              style={{
                background: 'rgba(220, 60, 60, 0.1)',
                border: '1px solid rgba(220, 60, 60, 0.2)',
                color: '#DC3C3C'
              }}
            >
              {authError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedSection) {
    return (
      <div data-theme={theme} className="app-background min-h-screen">
        <SectionSelector onSectionSelect={handleSectionSelect} currentUser={currentUser} />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="app-background min-h-screen relative overflow-hidden" style={glanceabilityMode ? { zoom: 1.12 } : undefined}>
      {themeOverlay && (
        <div
          data-theme={overlayTheme}
          className={`theme-overlay-${themeOverlay}`}
          style={{ background: 'var(--bg)' }}
        />
      )}

      <AlertOverlay currentUser={currentUser} />

      <SlideOutMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onShowResourceHub={() => openTool('resourceHub')}
        onShowAttendanceLogger={() => openTool('attendanceLogger')}
        onShowWhiteboard={() => openTool('whiteboard')}
        onShowBrowser={() => openTool('browser', 'https://www.google.com')}
        onShowTimer={() => openTool('timer')}
        onShowClassContext={() => setActiveDashboardView('classContext')}
        onShowDashboard={() => setActiveDashboardView('dashboard')}
        onShowSchedule={() => setActiveDashboardView('schedule')}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <MainDashboard
        selectedSection={selectedSection}
        timetableData={timetableData}
        onTimetableUpload={handleTimetableUpload}
        onSectionChange={handleSectionSelect}
        setShowAttendanceTracker={() => openTool('attendanceLogger')}
        openSettingsModal={() => setIsSettingsModalOpen(true)}
        isSettingsOpen={isSettingsModalOpen}
        openMenu={() => setIsMenuOpen(true)}
        onShowResourceHub={() => openTool('resourceHub')}
        onShowWhiteboard={() => openTool('whiteboard')}
        onShowBrowser={(url?: string) => openTool('browser', url || 'https://www.google.com')}
        onShowTimer={() => openTool('timer')}
        activeView={activeDashboardView}
        setActiveView={setActiveDashboardView}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        selectedSection={selectedSection}
        onSectionChange={handleSectionSelect}
        currentUser={currentUser}
        isSectionLocked={isSectionLocked}
        onSettingsChange={handleSettingsChange}
        currentSettings={settings}
        connectedSmartboardId={connectedSmartboardId}
        glanceabilityMode={glanceabilityMode}
        onToggleGlanceabilityMode={toggleGlanceabilityMode}
        onConnectSmartboard={handleConnectSmartboard}
        onSignOut={async () => {
          try {
            await auth.signOut();
            localStorage.removeItem('cached_genatis_user');
            localStorage.removeItem('substituteActive');
            localStorage.removeItem('substituteName');
            localStorage.removeItem('substituteAbsentEmail');
            toast.success("Signed out successfully");
          } catch (e: any) {
            toast.error("Sign out failed");
          }
        }}
      />

      <AnimatePresence mode="wait">
        {activeTool === 'resourceHub' && (
          <ErrorBoundary key="err-resource-hub">
            <PageTransition type="modal" key="resource-hub" className="z-[100]">
              <ResourceHub
                selectedSection={selectedSection}
                onClose={closeTool}
                onOpenImage={(url: string) => openTool('imageViewer', url)}
                onOpenPDF={(url: string) => openTool('pdfViewer', url)}
                onOpenVideo={(url: string) => openTool('videoViewer', url)}
              />
            </PageTransition>
          </ErrorBoundary>
        )}
        {activeTool === 'whiteboard' && (
          <ErrorBoundary key="err-whiteboard">
            <PageTransition type="modal" key="whiteboard" className="z-[100]">
              <Whiteboard onClose={closeTool} />
            </PageTransition>
          </ErrorBoundary>
        )}
        {activeTool === 'browser' && (
          <ErrorBoundary key="err-browser">
            <PageTransition type="modal" key="browser" className="z-[100]">
              <Browser initialUrl={toolPayload || undefined} onClose={closeTool} />
            </PageTransition>
          </ErrorBoundary>
        )}
        {activeTool === 'imageViewer' && toolPayload && (
          <ErrorBoundary key="err-image-viewer">
            <PageTransition type="modal" key="image-viewer" className="z-[100]">
              <ImageViewer imageUrl={toolPayload} onClose={closeTool} onSave={handleSaveAnnotatedImage} />
            </PageTransition>
          </ErrorBoundary>
        )}
        {activeTool === 'pdfViewer' && toolPayload && (
          <ErrorBoundary key="err-pdf-viewer">
            <PageTransition type="modal" key="pdf-viewer" className="z-[100]">
              <PDFViewer fileUrl={toolPayload} onClose={closeTool} onSave={() => {}} />
            </PageTransition>
          </ErrorBoundary>
        )}
        {activeTool === 'attendanceLogger' && (
          <ErrorBoundary key="err-attendance-logger">
            <PageTransition type="modal" key="attendance-logger" className="z-[100]">
              <AttendanceLogger selectedSection={selectedSection} onClose={closeTool} />
            </PageTransition>
          </ErrorBoundary>
        )}
        {activeTool === 'timer' && (
          <ErrorBoundary key="err-timer">
            <PageTransition type="modal" key="timer" className="z-[100]">
              <Timer onClose={closeTool} />
            </PageTransition>
          </ErrorBoundary>
        )}
        {activeTool === 'videoViewer' && toolPayload && (
          <ErrorBoundary key="err-video-viewer">
            <PageTransition type="modal" key="video-viewer" className="z-[100]">
              <VideoViewer videoUrl={toolPayload} onClose={closeTool} />
            </PageTransition>
          </ErrorBoundary>
        )}

        {(isIdle || isOffline) && currentUser && (
          <AmbientDashboard
            key="ambient-dashboard"
            selectedSection={selectedSection}
            timetableData={timetableData}
            onResume={resetIdleTimer}
            isOffline={isOffline}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;





