import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, RotateCcw, LogOut, GraduationCap, Monitor, Search, Settings, Power, Trash2, Edit2, Check, Lock } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { registerSmartboard, getSmartboard } from '../firebase';
import toast from 'react-hot-toast';
import { paths } from '../lib/firebase/paths';
import { AnimatedSelect } from './AnimatedSelect';
import { useSchoolId } from '../hooks/useSchoolId';
import { resolveAccountSection } from '../utils/sectionUtils';

const SettingsModal = ({
  isOpen,
  onClose,
  onSettingsChange,
  selectedSection,
  onSectionChange,
  onSignOut,
  currentUser,
  connectedSmartboardId,
  glanceabilityMode,
  onToggleGlanceabilityMode,
  onConnectSmartboard,
  currentSettings,
  isSectionLocked: propIsSectionLocked
}: any) => {
  const lockedSection = useMemo(() => resolveAccountSection(currentUser), [currentUser]);
  const isSectionLocked = propIsSectionLocked ?? Boolean(lockedSection);
  const [currentSection, setCurrentSection] = useState(lockedSection || selectedSection);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [schoolGradesSections, setSchoolGradesSections] = useState<any[]>([]);
  const [themeSetting, setThemeSetting] = useState(currentSettings?.theme || 'system');
  const [startOnLoginSetting, setStartOnLoginSetting] = useState(currentSettings?.startOnLogin || false);
  const modalRef = useRef<HTMLDivElement>(null);

  const [smartboardName, setSmartboardName] = useState('');
  const [smartboardLocation, setSmartboardLocation] = useState('');
  const [registeredSmartboards, setRegisteredSmartboards] = useState<any[]>([]);
  const [connectingSmartboardId, setConnectingSmartboardId] = useState('');
  const [editingBoardId, setEditingBoardId] = useState<any | null>(null);
  const [editBoardName, setEditBoardName] = useState('');
  const [editBoardLocation, setEditBoardLocation] = useState('');
  const schoolId = useSchoolId();

  useEffect(() => {
    const body = document.body;
    if (isOpen) {
      body.style.overflow = 'hidden';
      setShowResetConfirmation(false);
    } else {
      body.style.overflow = 'auto';
    }
    return () => { body.style.overflow = 'auto'; };
  }, [isOpen]);

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const gradesCollectionRef = collection(db, `schools/${schoolId}/grades`);
        const q = query(gradesCollectionRef, orderBy('grade'));
        const querySnapshot = await getDocs(q);
        const fetchedGrades = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setSchoolGradesSections(fetchedGrades);
      } catch (error) {
        console.error(error);
      }
    };
    if (isOpen) {
      fetchSchoolData();
      const locked = resolveAccountSection(currentUser);
      setCurrentSection(locked || selectedSection);
      setThemeSetting(currentSettings?.theme || 'system');
      setStartOnLoginSetting(currentSettings?.startOnLogin || false);
      if (currentUser?.uid) fetchRegisteredSmartboards(currentUser.uid);
      setConnectingSmartboardId(connectedSmartboardId || '');
    }
  }, [isOpen, selectedSection, currentUser, connectedSmartboardId, currentSettings]);

  const fetchRegisteredSmartboards = async (uid: any) => {
    try {
      const smartboardsRef = collection(db, 'schools', schoolId, 'smartboards');
      const q = query(smartboardsRef, where("ownerUid", "==", uid), orderBy('createdAt'));
      const querySnapshot = await getDocs(q);
      setRegisteredSmartboards(querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = () => {
    if (!isSectionLocked && currentSection && currentSection.id !== selectedSection?.id) {
      onSectionChange(currentSection);
    }
    if (onSettingsChange && currentSettings) {
      onSettingsChange({ ...currentSettings, theme: themeSetting, startOnLogin: startOnLoginSetting });
    }
    onClose();
  };

  const handleReset = () => {
    if (!isSectionLocked) {
      setCurrentSection(selectedSection);
    }
    setThemeSetting(currentSettings?.theme || 'system');
    setStartOnLoginSetting(currentSettings?.startOnLogin || false);
    setShowResetConfirmation(false);
  };

  const handleSectionChange = (sectionId: any) => {
    if (isSectionLocked) return;
    const allSections = getAllSectionsFlat();
    setCurrentSection(allSections.find((s: any) => s.id === sectionId));
  };

  const getAllSectionsFlat = () => {
    return schoolGradesSections.flatMap((gradeData: any) => {
      const sections: any[] = [];
      for (const type in gradeData.sections) {
        gradeData.sections[type].forEach((num: any) => {
          sections.push({
            id: `grade${gradeData.grade}-${type.toLowerCase()}${num}`,
            name: `Grade ${gradeData.grade} ${type} ${num}`,
            grade: gradeData.id,
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
      const newSmartboardRef = doc(db, 'schools', schoolId, 'smartboards', boardId);
      await setDoc(newSmartboardRef, {
        boardId,
        ownerUid: currentUser.uid,
        name: smartboardName,
        location: smartboardLocation,
        status: 'offline',
        createdAt: new Date().toISOString()
      });
      setSmartboardName('');
      setSmartboardLocation('');
      fetchRegisteredSmartboards(currentUser.uid);
      toast.success('Smartboard registered successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to register smartboard.');
    }
  };

  const handleDeleteSmartboard = async (boardId: any) => {
    try {
      await deleteDoc(doc(db, 'schools', schoolId, 'smartboards', boardId));
      if (currentUser?.uid) fetchRegisteredSmartboards(currentUser.uid);
      if (connectedSmartboardId === boardId) onConnectSmartboard(null);
      toast.success('Smartboard deleted.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete smartboard.');
    }
  };

  const handleStartEditBoard = (board: any) => {
    setEditingBoardId(board.id);
    setEditBoardName(board.name);
    setEditBoardLocation(board.location || '');
  };

  const handleSaveEditBoard = async (boardId: any) => {
    if (!editBoardName.trim()) return;
    try {
      await updateDoc(doc(db, 'schools', schoolId, 'smartboards', boardId), {
        name: editBoardName,
        location: editBoardLocation
      });
      setEditingBoardId(null);
      if (currentUser?.uid) fetchRegisteredSmartboards(currentUser.uid);
      toast.success('Board updated.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update board.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-6 animate-fade-in"
      style={{
        background: 'rgba(0, 0, 0, 0.48)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="zen-modal-card w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col"
        style={{
          maxHeight: '86vh',
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between p-6 px-8 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-h2 font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
            <p className="text-small mt-0.5" style={{ color: 'var(--text-secondary)' }}>Configure classroom preferences and hardware link</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            aria-label="Close settings"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto max-h-[70vh]" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

          {/* App Appearance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 className="text-h3 font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Settings className="w-4 h-4" strokeWidth={2} />
              </span>
              <span>App Appearance</span>
            </h3>
            <div className="flex gap-2 p-1.5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {['light', 'dark', 'system'].map((t: any) => (
                <button
                  key={t}
                  onClick={() => setThemeSetting(t)}
                  className="flex-1 py-2.5 rounded-xl font-medium transition-all capitalize text-sm"
                  style={{
                    background: themeSetting === t ? 'var(--accent)' : 'transparent',
                    color: themeSetting === t ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: themeSetting === t ? 600 : 500,
                    boxShadow: themeSetting === t ? '0 2px 8px var(--accent-glow)' : 'none'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* System Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 className="text-h3 font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Power className="w-4 h-4" strokeWidth={2} />
              </span>
              <span>System Behavior</span>
            </h3>
            <div
              className="flex items-center justify-between p-5 rounded-2xl shadow-sm transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <h4 className="font-semibold text-body" style={{ color: 'var(--text-primary)' }}>Start on Login</h4>
                <p className="text-small mt-0.5" style={{ color: 'var(--text-secondary)' }}>Automatically launch Genatis Board when your computer starts.</p>
              </div>
              <button
                onClick={() => setStartOnLoginSetting(!startOnLoginSetting)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${startOnLoginSetting ? 'bg-green-500' : 'bg-gray-400/30'}`}
                aria-label="Toggle Start on Login"
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${startOnLoginSetting ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Section Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 className="text-h3 font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <GraduationCap className="w-4 h-4" strokeWidth={2} />
              </span>
              <span>Active Classroom Section</span>
            </h3>
            {isSectionLocked ? (
              <div
                className="p-4 rounded-2xl flex items-center justify-between shadow-sm transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-amber-500 shrink-0"
                    style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }}
                  >
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-body" style={{ color: 'var(--text-primary)' }}>
                      {(lockedSection || currentSection || selectedSection)?.name || 'Assigned Section'}
                    </h4>
                    <span className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-0.5">
                      Assigned to this account • Locked
                    </span>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Fixed
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <AnimatedSelect
                    value={currentSection?.id || ''}
                    onChange={(val: any) => handleSectionChange(val)}
                    options={getAllSectionsFlat().map((section: any) => ({ value: section.id, label: section.name }))}
                    placeholder="Select a section..."
                  />
                </div>
                <p className="text-small ml-1" style={{ color: 'var(--text-secondary)' }}>Selecting a section filters the timetable and dashboard view.</p>
              </>
            )}
          </div>

          {/* Smartboard Management */}
          {currentUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <h3 className="text-h3 font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Monitor className="w-4 h-4" strokeWidth={2} />
                </span>
                <span>Smartboard Management</span>
              </h3>

              <div
                className="p-6 rounded-2xl shadow-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
              >
                <h4 className="font-semibold text-body" style={{ color: 'var(--text-primary)' }}>Register New Board</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Board Name"
                    value={smartboardName}
                    onChange={(e: any) => setSmartboardName(e.target.value)}
                    className="zen-input flex-1 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={smartboardLocation}
                    onChange={(e: any) => setSmartboardLocation(e.target.value)}
                    className="zen-input flex-1 rounded-xl"
                  />
                </div>
                <button
                  onClick={handleRegisterSmartboard}
                  className="zen-btn zen-btn-accent w-full py-3 rounded-full font-semibold shadow-sm active:scale-98"
                >
                  Add to Account
                </button>
              </div>

              {registeredSmartboards.length > 0 && (
                <div
                  className="p-6 rounded-2xl shadow-sm"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}
                >
                  <h4 className="font-semibold text-body" style={{ color: 'var(--text-primary)' }}>Your Registered Boards</h4>
                  <div className="space-y-2">
                    {registeredSmartboards.map((board: any) => (
                      <div
                        key={board.id}
                        className="p-4 rounded-xl"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                      >
                        {editingBoardId === board.id ? (
                          /* Edit Mode */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            <div className="flex gap-3">
                              <input
                                type="text"
                                value={editBoardName}
                                onChange={(e: any) => setEditBoardName(e.target.value)}
                                className="zen-input flex-1 rounded-xl"
                                placeholder="Board Name"
                                onKeyDown={(e: any) => e.key === 'Enter' && handleSaveEditBoard(board.id)}
                              />
                              <input
                                type="text"
                                value={editBoardLocation}
                                onChange={(e: any) => setEditBoardLocation(e.target.value)}
                                className="zen-input flex-1 rounded-xl"
                                placeholder="Location"
                                onKeyDown={(e: any) => e.key === 'Enter' && handleSaveEditBoard(board.id)}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingBoardId(null)}
                                className="zen-btn px-4 py-2 text-small rounded-full font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEditBoard(board.id)}
                                className="zen-btn zen-btn-accent px-4 py-2 text-small rounded-full font-semibold flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" strokeWidth={2} />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>{board.name}</p>
                              <p className="text-small font-mono mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>{board.location || 'No location set'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartEditBoard(board)}
                                className="p-2 rounded-lg transition-all active:scale-95 hover:bg-[var(--surface-hover)]"
                                style={{ color: 'var(--text-secondary)' }}
                                title="Edit Board"
                              >
                                <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => handleDeleteSmartboard(board.id)}
                                className="p-2 rounded-lg transition-all active:scale-95 hover:bg-red-500/10"
                                style={{ color: '#DC3C3C' }}
                                title="Delete Board"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => {
                                  setConnectingSmartboardId(board.id);
                                  onConnectSmartboard(board.id);
                                }}
                                className="zen-btn px-4 py-2 text-small font-medium rounded-full transition-all"
                                style={{
                                  background: connectedSmartboardId === board.id ? 'var(--accent)' : 'transparent',
                                  color: connectedSmartboardId === board.id ? '#FFFFFF' : 'var(--text-primary)',
                                  border: `1px solid ${connectedSmartboardId === board.id ? 'var(--accent)' : 'var(--border)'}`
                                }}
                              >
                                {connectedSmartboardId === board.id ? 'Active' : 'Link'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account */}
          <div style={{ paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-full font-medium transition-all active:scale-95"
              style={{
                background: 'rgba(220, 60, 60, 0.08)',
                color: '#DC3C3C',
                border: '1px solid rgba(220, 60, 60, 0.18)',
              }}
            >
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-between p-6 px-8 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setShowResetConfirmation(true)}
            className="flex items-center gap-2 font-medium px-4 py-2.5 rounded-full active:scale-95 transition-all hover:bg-red-500/10"
            style={{ color: '#DC3C3C' }}
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
            <span>Discard</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="zen-btn px-6 py-2.5 rounded-full font-medium shadow-sm active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="zen-btn zen-btn-accent px-6 py-2.5 rounded-full font-semibold flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Save className="w-4 h-4" strokeWidth={1.5} />
              <span>Save Setup</span>
            </button>
          </div>
        </div>

        {/* Reset Confirmation Overlay */}
        {showResetConfirmation && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20 p-6 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          >
            <div
              className="zen-modal-card p-8 text-center max-w-sm w-full animate-slide-up shadow-2xl"
              style={{ borderRadius: '24px' }}
            >
              <h3 className="text-h2 font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Reset Settings?</h3>
              <p className="text-body mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Are you sure you want to discard your unsaved changes and revert to previous settings?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReset}
                  className="w-full py-3.5 rounded-full font-semibold active:scale-95 transition-all shadow-sm"
                  style={{ background: '#DC3C3C', color: '#FFFFFF' }}
                >
                  Yes, Discard
                </button>
                <button
                  onClick={() => setShowResetConfirmation(false)}
                  className="zen-btn w-full py-3.5 rounded-full font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsModal;
