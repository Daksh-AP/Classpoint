import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileUp,
  Sparkles,
  Edit3,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  BookOpen,
  Trash2,
  Plus,
  ArrowRight,
  RefreshCw,
  Save,
  Check,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AITimetableService } from '../services/aiTimetableService';
import ManualTimetableEntry from './ManualTimetableEntry';
import {
  normalizeSectionName,
  toSectionId,
  normalizeTime,
  getSetRotationNotice,
  TimetableClassEntry
} from '../utils/timetableNormalizer';

interface ScheduleUploaderProps {
  selectedSection: any;
  initialTimetable?: any;
  onSave: (timetableData: any) => void;
  onCancel: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ScheduleUploader: React.FC<ScheduleUploaderProps> = ({
  selectedSection,
  initialTimetable,
  onSave,
  onCancel,
}) => {
  const [activeMode, setActiveMode] = useState<'ai' | 'manual'>('ai');
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const getInitialSchedule = useCallback((): Record<string, TimetableClassEntry[]> | null => {
    if (!initialTimetable?.sections || !selectedSection?.id) return null;
    const secId = selectedSection.id;
    if (initialTimetable.sections[secId]) {
      return initialTimetable.sections[secId];
    }
    const cleanSecId = secId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchingKey = Object.keys(initialTimetable.sections).find(
      k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanSecId
    );
    if (matchingKey && initialTimetable.sections[matchingKey]) {
      return initialTimetable.sections[matchingKey];
    }
    return null;
  }, [initialTimetable, selectedSection]);

  const [parsedSchedule, setParsedSchedule] = useState<Record<string, TimetableClassEntry[]> | null>(
    () => getInitialSchedule()
  );

  const lastLoadedSectionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const secId = selectedSection?.id || null;
    // Only re-hydrate from initialTimetable when selected section changes or on initial load
    if (secId !== lastLoadedSectionIdRef.current) {
      lastLoadedSectionIdRef.current = secId;
      const init = getInitialSchedule();
      setParsedSchedule(init);
      setDetectedSectionName(normalizeSectionName(selectedSection?.name || 'Whiz 1'));
    }
  }, [selectedSection?.id, getInitialSchedule]);

  const [detectedSectionName, setDetectedSectionName] = useState<string>(
    normalizeSectionName(selectedSection?.name || 'Whiz 1')
  );
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = useCallback(async (file: File) => {
    if (!file) return;
    setAnalyzing(true);
    setAnalysisStep(`Reading ${file.name}...`);

    try {
      const stepTimer1 = setTimeout(() => {
        setAnalysisStep('Analyzing schedule structure with Gemini AI OCR...');
      }, 1000);

      const stepTimer2 = setTimeout(() => {
        setAnalysisStep('Resolving streams & section codes (e.g. W1 ➔ Whiz 1, S1 ➔ Super 1)...');
      }, 2500);

      const result = await AITimetableService.parseTimetableFile(
        file,
        selectedSection?.name || 'Whiz 1'
      );

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (result.success && result.timetableData) {
        const sectionId = Object.keys(result.timetableData.sections)[0];
        const schedule = sectionId ? result.timetableData.sections[sectionId] : {};

        setParsedSchedule(schedule || null);
        if (result.detectedSection) {
          setDetectedSectionName(result.detectedSection);
        }
        toast.success(`Schedule extracted from ${file.name}!`);
      } else {
        toast.error(result.error || 'Could not parse timetable. Please try manual entry.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process file.');
    } finally {
      setAnalyzing(false);
      setAnalysisStep('');
    }
  }, [selectedSection]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const toMins = (t: string) => {
      const parts = t.replace(/\s?(AM|PM)/i, '').split(':').map(Number);
      if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined || isNaN(parts[0]) || isNaN(parts[1])) return null;
      const h = parts[0];
      const m = parts[1];
      const isPM = /PM/i.test(t) && h !== 12;
      const isAM = /AM/i.test(t) && h === 12;
      return (isPM ? h + 12 : isAM ? 0 : h) * 60 + m;
    };
    const m1 = toMins(start);
    const m2 = toMins(end);
    if (m1 === null || m2 === null || m2 <= m1) return '';
    return `${m2 - m1}m`;
  };

  const handleClassChange = (
    day: string,
    index: number,
    field: keyof TimetableClassEntry,
    value: string
  ) => {
    if (!parsedSchedule) return;
    const dayClasses = [...(parsedSchedule[day] || [])];
    if (!dayClasses[index]) return;

    const currentItem = dayClasses[index];
    if (!currentItem) return;

    if (field === 'subject') {
      const notice = currentItem.setNotice !== undefined ? currentItem.setNotice : getSetRotationNotice(value);
      dayClasses[index] = {
        ...currentItem,
        subject: value,
        setNotice: notice || undefined,
      };
    } else if (field === 'setNotice') {
      dayClasses[index] = {
        ...currentItem,
        setNotice: value,
      };
    } else {
      dayClasses[index] = {
        ...currentItem,
        [field]: value,
      };
    }

    setParsedSchedule({
      ...parsedSchedule,
      [day]: dayClasses,
    });
  };

  const handleAddClass = (day: string) => {
    if (!parsedSchedule) return;
    const dayClasses = [...(parsedSchedule[day] || [])];
    dayClasses.push({
      subject: 'Mathematics',
      teacher: 'Staff',
      startTime: '08:00',
      endTime: '08:45',
      location: 'Room 204',
    });
    setParsedSchedule({
      ...parsedSchedule,
      [day]: dayClasses,
    });
  };

  const handleRemoveClass = (day: string, index: number) => {
    if (!parsedSchedule) return;
    const dayClasses = [...(parsedSchedule[day] || [])];
    dayClasses.splice(index, 1);
    setParsedSchedule({
      ...parsedSchedule,
      [day]: dayClasses,
    });
  };

  const handleSaveToClassroom = async () => {
    if (!parsedSchedule) return;
    setIsSaving(true);

    try {
      const activeId = selectedSection?.id || toSectionId(selectedSection?.grade || '9', detectedSectionName);
      const cleanActiveId = activeId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const allSubjects = new Set<string>();

      Object.values(parsedSchedule).forEach(dayList => {
        dayList.forEach(cls => {
          if (cls.subject && cls.subject.trim()) allSubjects.add(cls.subject.trim());
        });
      });

      // Keep existing sections from other classrooms, but sanitize duplicates for this classroom
      const sanitizedSections: Record<string, any> = {};
      if (initialTimetable?.sections) {
        Object.entries(initialTimetable.sections).forEach(([k, v]) => {
          if (k.toLowerCase().replace(/[^a-z0-9]/g, '') !== cleanActiveId) {
            sanitizedSections[k] = v;
          }
        });
      }
      sanitizedSections[activeId] = parsedSchedule;

      const finalTimetablePayload = {
        ...(initialTimetable || {}),
        sections: sanitizedSections,
        extractedText: `Schedule for ${selectedSection?.name || detectedSectionName}`,
        subjects: Array.from(allSubjects),
        extractedAt: new Date().toISOString(),
      };

      await onSave(finalTimetablePayload);
      toast.success(`Timetable saved for ${selectedSection?.name || detectedSectionName}!`);
    } catch (err: any) {
      toast.error('Failed to save timetable: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalClassesCount = parsedSchedule
    ? Object.values(parsedSchedule).reduce((sum, list) => sum + list.length, 0)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mode Selector Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--glass-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)] text-white">
              {selectedSection?.name || 'Current Section'}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-mono">
              ID: {selectedSection?.id || 'default'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Upload or edit the master weekly schedule for this classroom.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]">
          <button
            onClick={() => setActiveMode('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeMode === 'ai'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI OCR Uploader
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeMode === 'manual'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Manual Entry
          </button>
        </div>
      </div>

      {activeMode === 'manual' ? (
        <ManualTimetableEntry
          selectedSection={selectedSection}
          initialTimetable={initialTimetable}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <div className="space-y-6">
          {/* AI Knowledge Base Callout */}
          <div className="p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-[var(--text-primary)]">
                Smart Section & Stream Recognition Active
              </p>
              <p className="text-[var(--text-secondary)] mt-0.5 text-xs">
                Gemini AI OCR automatically maps shorthand section codes:
                <strong className="text-[var(--accent)] ml-1">W1, W2, W3 ➔ Whiz 1, 2, 3</strong> and
                <strong className="text-[var(--accent)] ml-1">S1, S2, S3 ➔ Super 1, 2, 3</strong>.
                Supports Whiteboard Photos, Printed Sheets, PDFs, Excel & CSV.
              </p>
            </div>
          </div>

          {/* Hidden File Input Always Mounted */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0]);
              }
              // Reset so selecting the same file again triggers onChange
              e.target.value = '';
            }}
          />

          {/* Active Scanning Banner */}
          {analyzing && (
            <div className="p-8 rounded-3xl bg-[var(--surface)] border-2 border-[var(--accent)] flex flex-col items-center justify-center space-y-4 shadow-xl animate-fade-in">
              <div className="w-12 h-12 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
              <div className="text-center">
                <h4 className="text-base font-semibold text-[var(--text-primary)]">
                  Scanning Timetable Document with Gemini AI OCR
                </h4>
                <p className="text-xs text-[var(--accent)] font-medium mt-1 animate-pulse">
                  {analysisStep}
                </p>
              </div>
            </div>
          )}

          {/* Drag & Drop File Zone (When no schedule loaded and not analyzing) */}
          {!parsedSchedule && !analyzing && (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
                isDragging
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] scale-[1.01]'
                  : 'border-[var(--glass-border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--glass-bg)]'
              }`}
            >
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--accent)] shadow-sm">
                  <FileUp className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Drag and drop timetable document
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    or click to browse your files (PNG, JPG, PDF, XLSX, CSV)
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
                    Max 20MB
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
                    Gemini OCR v2
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Review Grid */}
          {parsedSchedule && (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`space-y-5 animate-fade-in transition-all ${
                isDragging ? 'ring-2 ring-[var(--accent)] rounded-2xl bg-[var(--accent-soft)]/20' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--glass-border)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                      {totalClassesCount > 0 ? `Active Schedule (${totalClassesCount} classes)` : 'Empty Schedule'}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Classroom: <strong className="text-[var(--accent)]">{detectedSectionName}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    disabled={analyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    Upload / AI Scan
                  </button>

                  <button
                    onClick={handleSaveToClassroom}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-95 shadow-md transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save to Classroom
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Day Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {DAYS.map(day => {
                  const count = parsedSchedule ? (parsedSchedule[day]?.length || 0) : 0;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border ${
                        selectedDay === day
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                          : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {day}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedDay === day ? 'bg-white/20 text-white' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Classes Table for Selected Day */}
              <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--accent)]" />
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {selectedDay}'s Classes
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddClass(selectedDay)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Period
                  </button>
                </div>

                {(!parsedSchedule || !parsedSchedule[selectedDay] || (parsedSchedule[selectedDay]?.length ?? 0) === 0) ? (
                  <div className="text-center py-10 text-[var(--text-secondary)] text-sm">
                    No classes scheduled for {selectedDay}. Click "Add Period" to create one.
                  </div>
                ) : (
                  <div className="p-3.5 space-y-3">
                    {(parsedSchedule[selectedDay] || []).map((cls, idx) => {
                      const notice = cls.setNotice !== undefined ? cls.setNotice : getSetRotationNotice(cls.subject);
                      const duration = calculateDuration(cls.startTime, cls.endTime);
                      const hasNotice = Boolean(notice && notice.trim().length > 0);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--accent)]/40 hover:shadow-md transition-all duration-200 flex flex-col gap-3 group"
                        >
                          {/* Main Period Row */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* Period Badge */}
                            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold tracking-wide flex-shrink-0">
                              <span>P{idx + 1}</span>
                              {duration && (
                                <span className="text-[10px] opacity-75 font-normal ml-0.5">({duration})</span>
                              )}
                            </div>

                            {/* Timing Container */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--glass-border)] text-xs flex-shrink-0 shadow-inner">
                              <Clock className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                              <input
                                type="text"
                                value={cls.startTime}
                                onChange={e => handleClassChange(selectedDay, idx, 'startTime', e.target.value)}
                                className="w-14 bg-transparent text-center font-mono font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded"
                                placeholder="08:30"
                              />
                              <span className="text-[var(--text-secondary)] font-bold text-xs">→</span>
                              <input
                                type="text"
                                value={cls.endTime}
                                onChange={e => handleClassChange(selectedDay, idx, 'endTime', e.target.value)}
                                className="w-14 bg-transparent text-center font-mono font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded"
                                placeholder="09:00"
                              />
                            </div>

                            {/* Subject Input */}
                            <div className="flex-1 min-w-[170px] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--glass-border)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
                              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                              <input
                                type="text"
                                value={cls.subject}
                                onChange={e => handleClassChange(selectedDay, idx, 'subject', e.target.value)}
                                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]"
                                placeholder="Subject name..."
                              />
                            </div>

                            {/* Teacher Input */}
                            <div className="w-full sm:w-36 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--glass-border)] focus-within:border-[var(--accent)] transition-all">
                              <User className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
                              <input
                                type="text"
                                value={cls.teacher || ''}
                                onChange={e => handleClassChange(selectedDay, idx, 'teacher', e.target.value)}
                                className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]"
                                placeholder="Teacher"
                              />
                            </div>

                            {/* Room Input */}
                            <div className="w-full sm:w-28 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--glass-border)] focus-within:border-[var(--accent)] transition-all">
                              <MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
                              <input
                                type="text"
                                value={cls.location || ''}
                                onChange={e => handleClassChange(selectedDay, idx, 'location', e.target.value)}
                                className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]"
                                placeholder="Room"
                              />
                            </div>

                            {/* Actions: Notice Toggle & Delete */}
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  if (hasNotice) {
                                    handleClassChange(selectedDay, idx, 'setNotice', '');
                                  } else {
                                    handleClassChange(
                                      selectedDay,
                                      idx,
                                      'setNotice',
                                      getSetRotationNotice(cls.subject) || `${cls.subject} Notice / Activity Rotations`
                                    );
                                  }
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                  hasNotice
                                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]'
                                }`}
                                title={hasNotice ? 'Clear notice' : 'Add rotational notice'}
                              >
                                <Info className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{hasNotice ? 'Notice Active' : '+ Notice'}</span>
                              </button>

                              <button
                                onClick={() => handleRemoveClass(selectedDay, idx)}
                                className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition-all flex-shrink-0"
                                title="Remove period"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Notice Editor Row */}
                          {hasNotice && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs animate-fade-in">
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-500">
                                  <Info className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-semibold text-amber-500 whitespace-nowrap">
                                  Edit Notice / Rotation:
                                </span>
                              </div>
                              <input
                                type="text"
                                value={notice || ''}
                                onChange={e => handleClassChange(selectedDay, idx, 'setNotice', e.target.value)}
                                className="flex-1 w-full bg-[var(--surface)] border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                                placeholder="e.g. Sports: Cricket, Tennis | Academic Rotation: Group A: Hindi, Group B: Math"
                              />
                              <button
                                type="button"
                                onClick={() => handleClassChange(selectedDay, idx, 'setNotice', '')}
                                className="text-amber-500/70 hover:text-rose-400 text-xs px-2 py-1 rounded hover:bg-amber-500/10 transition-all self-end sm:self-center flex-shrink-0 font-medium"
                                title="Remove this notice"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleUploader;
