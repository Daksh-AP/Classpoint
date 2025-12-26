import React, { useState, useEffect, useRef } from 'react';
import { X, Save, RotateCcw, LogOut, GraduationCap, Monitor } from 'lucide-react';
import { db } from '../firebase.js';
import { collection, getDocs, query, where, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { registerSmartboard, getSmartboard } from '../firebase.js';

const SettingsModal = ({ isOpen, onClose, onSettingsChange, selectedSection, onSectionChange, onSignOut, currentUser, connectedSmartboardId, onConnectSmartboard }) => {
  const [currentSection, setCurrentSection] = useState(selectedSection);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [schoolGradesSections, setSchoolGradesSections] = useState([]);
  const modalRef = useRef(null);
  const [smartboardName, setSmartboardName] = useState('');
  const [smartboardLocation, setSmartboardLocation] = useState('');
  const [registeredSmartboards, setRegisteredSmartboards] = useState([]);
  const [connectingSmartboardId, setConnectingSmartboardId] = useState('');
  const [smartboardConnectionStatus, setSmartboardConnectionStatus] = useState('');

  useEffect(() => {
    const body = document.body;
    if (isOpen) {
      body.style.overflow = 'hidden';
      setShowResetConfirmation(false);
    } else {
      body.style.overflow = 'auto';
    }
    return () => {
      body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const gradesCollectionRef = collection(db, 'schoolData/grades/gradesList');
        const q = query(gradesCollectionRef, orderBy('grade'));
        const querySnapshot = await getDocs(q);
        const fetchedGrades = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSchoolGradesSections(fetchedGrades);
      } catch (error) {
        console.error("Error fetching school data for settings: ", error);
      }
    };
    if (isOpen) {
      fetchSchoolData();
      setCurrentSection(selectedSection);
      if (currentUser?.uid) {
        fetchRegisteredSmartboards(currentUser.uid);
      }
      setConnectingSmartboardId(connectedSmartboardId || '');
    }
  }, [isOpen, selectedSection, currentUser?.uid, connectedSmartboardId]);

  const fetchRegisteredSmartboards = async (uid) => {
    try {
      const smartboardsCollectionRef = collection(db, 'smartboards');
      const q = query(smartboardsCollectionRef, where("ownerUid", "==", uid), orderBy('createdAt'));
      const querySnapshot = await getDocs(q);
      const userSmartboards = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegisteredSmartboards(userSmartboards);
    } catch (error) {
      console.error("Error fetching registered smartboards: ", error);
    }
  };

  const handleSave = () => {
    if (currentSection && currentSection.id !== selectedSection?.id) {
      onSectionChange(currentSection);
    }
    onClose();
  };

  const handleReset = () => {
    setCurrentSection(selectedSection);
    setShowResetConfirmation(false);
  };

  const handleSectionChange = (sectionId) => {
    const allSections = getAllSectionsFlat();
    const section = allSections.find(s => s.id === sectionId);
    setCurrentSection(section);
  };

  const getAllSectionsFlat = () => {
    return schoolGradesSections.flatMap((gradeData) => {
      const grade = gradeData.grade;
      const sections = [];
      for (const type in gradeData.sections) {
        gradeData.sections[type].forEach((num) => {
          sections.push({
            id: `grade${grade}-${type.toLowerCase()}${num}`,
            name: `Grade ${grade} ${type} ${num}`,
            grade: grade,
            type: type,
            number: num,
          });
        });
      }
      return sections;
    });
  };

  const handleRegisterSmartboard = async () => {
    if (!currentUser?.uid || !smartboardName || !smartboardLocation) return;
    try {
      const boardId = uuidv4();
      const newSmartboardRef = doc(db, "smartboards", boardId);
      await setDoc(newSmartboardRef, {
        boardId: boardId,
        ownerUid: currentUser.uid,
        name: smartboardName,
        location: smartboardLocation,
        createdAt: new Date()
      });
      setSmartboardName('');
      setSmartboardLocation('');
      fetchRegisteredSmartboards(currentUser.uid);
    } catch (error) {
      console.error("Error registering smartboard: ", error);
    }
  };

  const handleConnectSmartboard = async () => {
    if (!currentUser?.uid || !connectingSmartboardId) return;
    try {
      const smartboardRef = doc(db, "smartboards", connectingSmartboardId);
      const docSnap = await getDoc(smartboardRef);
      if (docSnap.exists() && docSnap.data().ownerUid === currentUser.uid) {
        onConnectSmartboard(connectingSmartboardId);
      }
    } catch (error) {
      console.error("Error connecting to smartboard: ", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 text-default-text-light dark:text-default-text-dark" ref={modalRef}>
      <div className="glass-card rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center"><GraduationCap className="w-5 h-5 mr-2" />Section</h3>
            <select value={currentSection?.id || ''} onChange={(e) => handleSectionChange(e.target.value)} className="w-full p-2 border rounded-lg bg-white/10">
              {getAllSectionsFlat().map((section) => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>
          {currentUser && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium flex items-center"><Monitor className="w-5 h-5 mr-2" />Smartboard Management</h3>
              <div className="space-y-2">
                <h4 className="font-semibold">Register New Smartboard</h4>
                <input type="text" placeholder="Smartboard Name" value={smartboardName} onChange={(e) => setSmartboardName(e.target.value)} className="w-full p-2 border rounded-lg bg-white/10" />
                <input type="text" placeholder="Location" value={smartboardLocation} onChange={(e) => setSmartboardLocation(e.target.value)} className="w-full p-2 border rounded-lg bg-white/10" />
                <button onClick={handleRegisterSmartboard} className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Register</button>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Connect to Smartboard</h4>
                <input type="text" placeholder="Enter Smartboard ID" value={connectingSmartboardId} onChange={(e) => setConnectingSmartboardId(e.target.value)} className="w-full p-2 border rounded-lg bg-white/10" />
                <button onClick={handleConnectSmartboard} className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">Connect</button>
              </div>
              {registeredSmartboards.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Your Registered Smartboards</h4>
                  <ul className="list-disc list-inside">
                    {registeredSmartboards.map((board) => (
                      <li key={board.id} className="text-sm">{board.name} ({board.id})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Account</h3>
            <button onClick={onSignOut} className="w-full flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"><LogOut className="w-4 h-4 mr-2" />Sign Out</button>
          </div>
        </div>
        <div className="flex items-center justify-between p-6 border-t border-white/20 mt-auto">
          <button onClick={() => setShowResetConfirmation(true)} className="flex items-center space-x-2 text-red-500 hover:text-red-400"><RotateCcw className="w-4 h-4" /><span>Reset</span></button>
          <div className="flex space-x-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-white/20">Cancel</button>
            <button onClick={handleSave} className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Save className="w-4 h-4" /><span>Save</span></button>
          </div>
        </div>
        {showResetConfirmation && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
            <div className="glass-card p-8 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-4">Confirm Reset</h3>
              <p className="mb-6">Are you sure you want to reset the section?</p>
              <div className="flex justify-center space-x-4">
                <button onClick={() => setShowResetConfirmation(false)} className="px-4 py-2 rounded-lg hover:bg-white/20">No</button>
                <button onClick={handleReset} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Yes, Reset</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
