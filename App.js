import React, { useState, useEffect } from 'react';
import SectionSelector from './components/SectionSelector';
import MainDashboard from './components/MainDashboard';
import Widget from './components/Widget';
import { StorageService } from './services/StorageService';
import { db, auth, doc, setDoc, onSnapshot, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from './firebase';

function App() {
  const [selectedSection, setSelectedSection] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWidget, setIsWidget] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(StorageService.getSettings().theme === 'dark');

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Apply dark mode class to body
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firebase data sync when authenticated
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    // Listen for user settings (selected section)
    const userSettingsRef = doc(db, 'user_settings', currentUser.uid);
    const unsubSettings = onSnapshot(userSettingsRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.selectedSection) {
          setSelectedSection(data.selectedSection);
        }
        if (data.settings) {
          setIsDarkMode(data.settings.theme === 'dark');
        }
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching user settings:', error);
      // Fallback to local storage
      const savedSection = StorageService.getSelectedSection();
      if (savedSection) setSelectedSection(savedSection);
      setIsLoading(false);
    });

    // Listen for timetable data (real-time sync)
    const timetableRef = doc(db, 'timetables', currentUser.uid);
    const unsubTimetable = onSnapshot(timetableRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setTimetableData(docSnapshot.data());
      } else {
        setTimetableData(null);
      }
    }, (error) => {
      console.error('Error fetching timetable:', error);
      // Fallback to local storage
      const savedTimetable = StorageService.getTimetableData();
      if (savedTimetable) setTimetableData(savedTimetable);
    });

    return () => {
      unsubSettings();
      unsubTimetable();
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    // Check if running as widget
    const urlParams = new URLSearchParams(window.location.search);
    const widgetMode = urlParams.get('widget') === 'true';
    setIsWidget(widgetMode);
  }, []);

  const handleSectionSelect = async (section) => {
    setSelectedSection(section);
    StorageService.saveSelectedSection(section);
    // Sync to Firebase
    if (currentUser?.uid) {
      const userSettingsRef = doc(db, 'user_settings', currentUser.uid);
      await setDoc(userSettingsRef, { selectedSection: section }, { merge: true });
    }
  };

  const handleTimetableUpdate = async (data) => {
    setTimetableData(data);
    StorageService.saveTimetableData(data);
    // Sync to Firebase
    if (currentUser?.uid) {
      const timetableRef = doc(db, 'timetables', currentUser.uid);
      await setDoc(timetableRef, data, { merge: true });
    }
  };

  const handleSettingsChange = (newSettings) => {
    setIsDarkMode(newSettings.theme === 'dark');
  };

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

  const handleSignOut = async () => {
    await signOut(auth);
    setSelectedSection(null);
    setTimetableData(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-primary-600 font-medium">Loading ClassPoint...</p>
        </div>
      </div>
    );
  }

  // Widget mode
  if (isWidget) {
    return (
      <Widget
        selectedSection={selectedSection}
        timetableData={timetableData}
      />
    );
  }

  // Auth screen — show when not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ClassPoint</h1>
            <p className="text-gray-500">
              {isSigningUp ? 'Create an account to get started' : 'Welcome back — sign in to continue'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4 mb-6">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && (isSigningUp ? handleEmailSignUp() : handleEmailSignIn())}
            />
            <button
              onClick={isSigningUp ? handleEmailSignUp : handleEmailSignIn}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-md"
            >
              {isSigningUp ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          {/* Toggle */}
          <div className="text-center">
            <button
              onClick={() => { setIsSigningUp(!isSigningUp); setAuthError(null); }}
              className="text-primary-600 text-sm hover:underline transition-colors"
            >
              {isSigningUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>

          {/* Error */}
          {authError && (
            <div className="mt-4 p-3 rounded-xl text-sm text-center bg-red-50 border border-red-200 text-red-600">
              {authError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main app mode
  return (
    <div className="app-background">
      {/* Liquid Bubbles for background effect */}
      <div className="liquid-bubble"></div>
      <div className="liquid-bubble"></div>
      <div className="liquid-bubble"></div>
      <div className="liquid-bubble"></div>
      <div className="liquid-bubble"></div>

      {!selectedSection ? (
        <SectionSelector
          onSectionSelect={handleSectionSelect}
        />
      ) : (
        <MainDashboard
          selectedSection={selectedSection}
          timetableData={timetableData}
          onTimetableUpdate={handleTimetableUpdate}
          onSectionChange={handleSectionSelect}
          onSettingsChange={handleSettingsChange}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}

export default App;
