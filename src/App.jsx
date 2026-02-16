import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SectionSelector from './components/SectionSelector.jsx';
import MainDashboard from './components/MainDashboard.jsx';
import Widget from './components/Widget.jsx';
import SettingsModal from './components/SettingsModal.jsx';

import SlideOutMenu from './components/SlideOutMenu.jsx';
import ResourceHub from './components/ResourceHub.jsx';
import Whiteboard from './components/Whiteboard.jsx';
import WhiteboardOverlay from './components/WhiteboardOverlay.jsx';
import Browser from './components/Browser.jsx';
import ImageViewer from './components/ImageViewer.jsx';
import PDFViewer from './components/PDFViewer.jsx';
import AttendanceLogger from './components/AttendanceLogger.jsx';
import Timer from './components/Timer.jsx';
import SeatingChartBuilder from './components/SeatingChartBuilder.jsx';
import { db, getDoc } from './firebase.js';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth } from './firebase.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { StorageService } from './services/StorageService.js';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition.jsx';

function App() {
  // Check if we're in overlay mode
  const isOverlayMode = window.location.hash === '#/overlay';

  // If overlay mode, render only the widget
  if (isOverlayMode) {
    return <Widget isOverlay={true} />;
  }

  const [selectedSection, setSelectedSection] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWidget, setIsWidget] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showAttendanceLogger, setShowAttendanceLogger] = useState(false);
  const [showResourceHub, setShowResourceHub] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('https://www.google.com'); // Default URL
  const [showTimer, setShowTimer] = useState(false);
  const [showSeatingChart, setShowSeatingChart] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [settings, setSettings] = useState(() => StorageService.getSettings()); // Initialize settings

  // Listen for downloads and screen captures from Electron
  useEffect(() => {
    const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
    if (!ipcRenderer) return;

    const handleDownloadComplete = (event, fileInfo) => {
      if (selectedSection) {
        const storageKey = `resource_hub_files_${selectedSection.id}`;
        const existingFiles = JSON.parse(localStorage.getItem(storageKey)) || [];
        const newFiles = [...existingFiles, fileInfo];
        localStorage.setItem(storageKey, JSON.stringify(newFiles));

        // Notify ResourceHub to update
        window.dispatchEvent(new Event('resource-hub-updated'));

        // Optional: Show a notification
        alert(`File downloaded to Resource Hub: ${fileInfo.name}`);
      } else {
        alert(`File downloaded: ${fileInfo.name}. Select a section to save it to the Resource Hub.`);
      }
    };

    const handleScreenCaptured = (event, image) => {
      handleOpenImage(image);
    };

    const handleRequestWidgetSync = () => {
      console.log("App: request-widget-sync received", { selectedSection, timetableData });
      // Send whatever we have, even if null, to verify connectivity
      ipcRenderer.send('broadcast-widget-data', {
        section: selectedSection,
        timetable: timetableData
      });
    };

    ipcRenderer.on('download-complete', handleDownloadComplete);
    ipcRenderer.on('screen-captured', handleScreenCaptured);
    ipcRenderer.on('request-widget-sync', handleRequestWidgetSync);

    return () => {
      ipcRenderer.removeListener('download-complete', handleDownloadComplete);
      ipcRenderer.removeListener('screen-captured', handleScreenCaptured);
      ipcRenderer.removeListener('request-widget-sync', handleRequestWidgetSync);
    };
  }, [selectedSection, timetableData]);

  // Broadcast data to widget when it changes
  useEffect(() => {
    const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
    if (ipcRenderer) {
      console.log("App: Broadcasting update", { selectedSection, timetableData });
      ipcRenderer.send('broadcast-widget-data', {
        section: selectedSection,
        timetable: timetableData
      });
    }
  }, [selectedSection, timetableData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect to apply dark mode class to HTML element
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const userSettingsRef = doc(db, `user_settings`, currentUser.uid);
    const unsubscribe = onSnapshot(userSettingsRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setSelectedSection(data.selectedSection || null);
      } else {
        setSelectedSection(null);
      }
    }, (error) => {
      console.error("Error fetching user settings:", error);
      if (error.code === 'permission-denied') {
        // Handle permission error gracefully, maybe set default state
        setSelectedSection(null);
      }
    });

    const timetableRef = doc(db, 'timetables', currentUser.uid);
    const unsubscribeTimetable = onSnapshot(timetableRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setTimetableData(docSnapshot.data());
      } else {
        setTimetableData(null);
      }
    }, (error) => {
      console.error("Error fetching timetable:", error);
      if (error.code === 'permission-denied') {
        setTimetableData(null);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeTimetable();
    };
  }, [currentUser?.uid]);

  const handleSectionSelect = useCallback(async (section) => {
    setSelectedSection(section);
    if (currentUser?.uid) {
      const userSettingsRef = doc(db, `user_settings`, currentUser.uid);
      await setDoc(userSettingsRef, { selectedSection: section }, { merge: true });
    }
  }, [currentUser?.uid]);

  const handleTimetableUpload = useCallback(async (data) => {
    setTimetableData(data);
    if (currentUser?.uid) {
      const timetableRef = doc(db, 'timetables', currentUser.uid);
      await setDoc(timetableRef, data, { merge: true });
    }
  }, [currentUser?.uid]);

  const handleEmailSignUp = async () => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleEmailSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleOpenOverlay = () => {
    const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
    if (ipcRenderer) {
      ipcRenderer.send('capture-screen');
    }
  };

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    setSelectedSection(null);
    setTimetableData(null);
  }, []);

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  }, []);

  const handleOpenImage = useCallback((imagePath) => {
    setSelectedImage(imagePath);
    setShowImageViewer(true);
    setShowResourceHub(false);
    setShowWhiteboard(false);
    setShowBrowser(false);
    setShowTimer(false);
    setShowSeatingChart(false);
    setShowAttendanceLogger(false);
  }, []);

  const handleOpenPDF = useCallback((pdfPath) => {
    setSelectedPDF(pdfPath);
    setShowPDFViewer(true);
    setShowResourceHub(false);
    setShowWhiteboard(false);
    setShowBrowser(false);
    setShowTimer(false);
    setShowSeatingChart(false);
    setShowAttendanceLogger(false);
    setShowImageViewer(false);
  }, []);

  const handleSaveAnnotatedImage = async (dataUrl) => {
    if (!selectedImage) return;

    const { ipcRenderer } = window.require ? window.require('electron') : {};
    if (window.require) {
      try {
        const fs = window.require('fs');
        const path = window.require('path');

        // Generate new filename
        const dir = path.dirname(selectedImage);
        const ext = path.extname(selectedImage);
        const name = path.basename(selectedImage, ext);
        const newPath = path.join(dir, `${name}-annotated-${Date.now()}${ext}`);

        // Remove header from dataUrl
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");

        fs.writeFileSync(newPath, base64Data, 'base64');

        alert('Image saved successfully!');
        setShowImageViewer(false);

        // Notify ResourceHub to refresh
        window.dispatchEvent(new Event('resource-hub-updated'));

      } catch (error) {
        console.error('Error saving image:', error);
        alert('Failed to save image: ' + error.message);
      }
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return (
      <div className="app-background min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-display font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-300">
              Welcome to ClassPoint
            </h1>
            <p className="text-gray-300">
              {isSigningUp ? 'Create an account to get started' : 'Sign in to continue'}
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full"
            />
            <button
              onClick={isSigningUp ? handleEmailSignUp : handleEmailSignIn}
              className="glass-button w-full py-3 justify-center font-semibold text-lg group"
            >
              {isSigningUp ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSigningUp(!isSigningUp)}
              className="text-accent-400 hover:text-accent-300 transition-colors text-sm font-medium"
            >
              {isSigningUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>

          {authError && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
              {authError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedSection) {
    return (
      <div className="app-background min-h-screen">
        <SectionSelector onSectionSelect={handleSectionSelect} currentUser={currentUser} />
      </div>
    );
  }

  return (
    <div className="app-background min-h-screen relative overflow-hidden">
      <SlideOutMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onShowResourceHub={() => {
          setShowResourceHub(true);
          setShowWhiteboard(false);
          setShowBrowser(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowSeatingChart(false);
          setShowPDFViewer(false);
        }}
        onShowAttendanceLogger={() => {
          setShowAttendanceLogger(true);
          setShowResourceHub(false);
          setShowWhiteboard(false);
          setShowBrowser(false);
          setShowTimer(false);
          setShowImageViewer(false);
          setShowSeatingChart(false);
        }}
        onShowWhiteboard={() => {
          setShowWhiteboard(true);
          setShowResourceHub(false);
          setShowBrowser(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowSeatingChart(false);
          setShowPDFViewer(false);
        }}
        onShowBrowser={() => {
          setShowBrowser(true);
          setShowResourceHub(false);
          setShowWhiteboard(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          onShowAttendanceLogger(false);
          setShowSeatingChart(false);
        }}
        onShowTimer={() => {
          setShowTimer(true);
          setShowResourceHub(false);
          setShowWhiteboard(false);
          setShowBrowser(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowSeatingChart(false);
          setShowPDFViewer(false);
        }}
        onShowSeatingChart={() => {
          setShowSeatingChart(true);
          setShowResourceHub(false);
          setShowWhiteboard(false);
          setShowBrowser(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowTimer(false);
        }}
      />

      <MainDashboard
        selectedSection={selectedSection}
        timetableData={timetableData}
        onTimetableUpload={handleTimetableUpload}
        onSectionChange={handleSectionSelect}
        setShowAttendanceTracker={() => setShowAttendanceLogger(true)}
        openSettingsModal={() => setIsSettingsModalOpen(true)}
        openMenu={() => setIsMenuOpen(true)}
        onShowResourceHub={() => {
          setShowResourceHub(true);
          setShowWhiteboard(false);
          setShowBrowser(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowSeatingChart(false);
          setShowPDFViewer(false);
        }}
        onShowWhiteboard={() => {
          setShowWhiteboard(true);
          setShowResourceHub(false);
          setShowBrowser(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowSeatingChart(false);
          setShowPDFViewer(false);
        }}
        onShowBrowser={(url) => {
          setBrowserUrl(url || 'https://www.google.com');
          setShowBrowser(true);
          setShowResourceHub(false);
          setShowWhiteboard(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowSeatingChart(false);
          setShowPDFViewer(false);
        }}
        onShowTimer={() => {
          setShowTimer(true);
          setShowResourceHub(false);
          setShowWhiteboard(false);
          setShowBrowser(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowSeatingChart(false);
        }}
        onShowSeatingChart={() => {
          setShowSeatingChart(true);
          setShowResourceHub(false);
          setShowWhiteboard(false);
          setShowBrowser(false);
          setShowImageViewer(false);
          setShowAttendanceLogger(false);
          setShowTimer(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSignOut={handleSignOut}
        selectedSection={selectedSection}
        onSectionChange={handleSectionSelect}
        currentUser={currentUser}
        onSettingsChange={handleSettingsChange}
        currentSettings={settings}
      />

      <AnimatePresence mode="wait">
        {showResourceHub && (
          <PageTransition key="resource-hub" className="z-[100]">
            <ResourceHub
              selectedSection={selectedSection}
              onClose={() => setShowResourceHub(false)}
              onOpenImage={handleOpenImage}
              onOpenPDF={handleOpenPDF}
            />
          </PageTransition>
        )}
        {!showResourceHub && showWhiteboard && (
          <PageTransition key="whiteboard" className="z-[100]">
            <Whiteboard
              onClose={() => setShowWhiteboard(false)}
            />
          </PageTransition>
        )}
        {!showResourceHub && !showWhiteboard && showBrowser && (
          <PageTransition key="browser" className="z-[100]">
            <Browser
              initialUrl={browserUrl}
              onClose={() => setShowBrowser(false)}
            />
          </PageTransition>
        )}
        {!showResourceHub && !showWhiteboard && !showBrowser && showImageViewer && selectedImage && (
          <PageTransition key="image-viewer" className="z-[100]">
            <ImageViewer
              imageUrl={selectedImage}
              onClose={() => setShowImageViewer(false)}
              onSave={handleSaveAnnotatedImage}
            />
          </PageTransition>
        )}
        {!showResourceHub && !showWhiteboard && !showBrowser && !showImageViewer && showPDFViewer && selectedPDF && (
          <PageTransition key="pdf-viewer" className="z-[100]">
            <PDFViewer
              fileUrl={selectedPDF}
              onClose={() => setShowPDFViewer(false)}
            />
          </PageTransition>
        )}
        {!showResourceHub && !showWhiteboard && !showBrowser && !showImageViewer && !showPDFViewer && showAttendanceLogger && (
          <PageTransition key="attendance-logger" className="z-[100]">
            <AttendanceLogger
              selectedSection={selectedSection}
              onClose={() => setShowAttendanceLogger(false)}
            />
          </PageTransition>
        )}
        {!showResourceHub && !showWhiteboard && !showBrowser && !showImageViewer && !showAttendanceLogger && showTimer && (
          <PageTransition key="timer" className="z-[100]">
            <Timer
              onClose={() => setShowTimer(false)}
            />
          </PageTransition>
        )}
        {!showResourceHub && !showWhiteboard && !showBrowser && !showImageViewer && !showAttendanceLogger && !showTimer && showSeatingChart && (
          <PageTransition key="seating-chart" className="z-[100]">
            <SeatingChartBuilder
              selectedSection={selectedSection}
              onClose={() => setShowSeatingChart(false)}
            />
          </PageTransition>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
