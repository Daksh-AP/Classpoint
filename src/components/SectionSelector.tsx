import React, { useState, useEffect } from 'react';
import { GraduationCap, ChevronRight, ChevronLeft } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { useSchoolId } from '../hooks/useSchoolId';

const SectionSelector = ({ onSectionSelect, currentUser }: any) => {
  const [selectedGrade, setSelectedGrade] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<any | null>(null);
  const [selectedSectionNumber, setSelectedSectionNumber] = useState<any | null>(null);
  const [finalSelection, setFinalSelection] = useState<any | null>(null);
  const [confirmationStepActive, setConfirmationStepActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [schoolGradesSections, setSchoolGradesSections] = useState<any[]>([]);
  const [isLoadingSchoolData, setIsLoadingSchoolData] = useState(true);
  const animationTimeoutRef = React.useRef<any>(null);
  const schoolId = useSchoolId();

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const triggerAnimation = () => {
    setIsAnimating(true);
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 300);
  };

  useEffect(() => {
    const fetchSchoolData = async () => {
      setIsLoadingSchoolData(true);
      try {
        const gradesCollectionRef = collection(db, `schools/${schoolId}/grades`);
        const q = query(gradesCollectionRef, orderBy('grade'));
        const querySnapshot = await getDocs(q);
        const fetchedGrades = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setSchoolGradesSections(fetchedGrades);
      } catch (error) {
// /* console.error */ ("Error fetching school data: ", error);
      } finally {
        setIsLoadingSchoolData(false);
      }
    };
    fetchSchoolData();
  }, [currentUser?.uid]);

  const handleGradeClick = (grade: any) => {
    setSelectedGrade(grade);
    setSelectedType(null);
    setSelectedSectionNumber(null);
    setFinalSelection(null);
    setConfirmationStepActive(false);
    setConfirmationStepActive(false);
    triggerAnimation();
  };

  const handleTypeClick = (type: any) => {
    setSelectedType(type);
    setSelectedSectionNumber(null);
    setFinalSelection(null);
    setConfirmationStepActive(false);
    setConfirmationStepActive(false);
    triggerAnimation();
  };

  const handleSectionNumberClick = (number: any) => {
    const section = {
      id: `grade${selectedGrade}-${selectedType.toLowerCase()}${number}`,
      name: `Grade ${selectedGrade} ${selectedType} ${number}`,
      grade: `grade${selectedGrade}`,
      type: selectedType,
      number: number,
    };
    setFinalSelection(section);
    setSelectedSectionNumber(number);
    setConfirmationStepActive(true);
    setConfirmationStepActive(true);
    triggerAnimation();
  };

  const handleConfirm = async () => {
    onSectionSelect(finalSelection);
    setSelectedGrade(null);
    setSelectedType(null);
    setSelectedSectionNumber(null);
    setFinalSelection(null);
    setConfirmationStepActive(false);
    setConfirmationStepActive(false);
    triggerAnimation();
  };

  const handleCancelConfirmation = () => {
    setFinalSelection(null);
    setConfirmationStepActive(false);
    setConfirmationStepActive(false);
    triggerAnimation();
  };

  const handleBack = () => {
    if (selectedSectionNumber !== null) {
      setSelectedSectionNumber(null);
    } else if (selectedType !== null) {
      setSelectedType(null);
    } else if (selectedGrade !== null) {
      setSelectedGrade(null);
    }
    triggerAnimation();
  };

  const BackButton = ({ onClick }: any) => (
    <button
      onClick={onClick}
      className="mb-6 flex items-center gap-1 text-small transition-colors"
      style={{ color: 'var(--accent)' }}
    >
      <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
      <span>Back</span>
    </button>
  );

  const renderGrades = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {schoolGradesSections.map((gradeData: any, index: number) => (
        <button
          key={gradeData.grade}
          className={`zen-card-flat p-6 text-left transition-all cursor-pointer group ${selectedGrade === gradeData.grade
              ? 'ring-2'
              : ''
            }`}
          style={{
            animationDelay: `${index * 60}ms`,
            ...(selectedGrade === gradeData.grade && { borderColor: 'var(--accent)' })
          }}
          onClick={() => handleGradeClick(gradeData.grade)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-h3"
                style={{ background: 'var(--glass-bg)' }}
              >
                {gradeData.grade}
              </div>
              <div>
                <h3 className="text-h3">Grade {gradeData.grade}</h3>
                <p className="text-small">Select Grade</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-secondary)' }} strokeWidth={1.5} />
          </div>
        </button>
      ))}
    </div>
  );

  const renderSectionTypes = () => {
    const gradeData = schoolGradesSections.find((g: any) => g.grade === selectedGrade);
    if (!gradeData || !gradeData.sections) return null;
    return (
      <div>
        <BackButton onClick={handleBack} />
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(gradeData.sections || {}).map((type: any, index: number) => (
            <button
              key={type}
              className={`zen-card-flat p-6 text-left transition-all cursor-pointer group ${selectedType === type ? 'ring-2' : ''
                }`}
              style={{
                animationDelay: `${index * 60}ms`,
                ...(selectedType === type && { borderColor: 'var(--accent)' })
              }}
              onClick={() => handleTypeClick(type)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-h3 font-medium"
                    style={{ background: 'var(--glass-bg)' }}
                  >
                    {type.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-h3">{type}</h3>
                    <p className="text-small">Select Type</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-secondary)' }} strokeWidth={1.5} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSectionNumbers = () => {
    const gradeData = schoolGradesSections.find((g: any) => g.grade === selectedGrade);
    if (!gradeData || !gradeData.sections || !selectedType) return null;
    const numbers = gradeData.sections[selectedType] || [];
    return (
      <div>
        <BackButton onClick={handleBack} />
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {numbers.map((number: any, index: number) => (
            <button
              key={number}
              className={`zen-card-flat p-6 text-center transition-all cursor-pointer ${selectedSectionNumber === number ? 'ring-2' : ''
                }`}
              style={{
                animationDelay: `${index * 60}ms`,
                ...(selectedSectionNumber === number && { borderColor: 'var(--accent)' })
              }}
              onClick={() => handleSectionNumberClick(number)}
            >
              <h3 className="text-h3">{number}</h3>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    if (!finalSelection) return null;
    return (
      <div>
        <BackButton onClick={handleCancelConfirmation} />
        <div className="zen-card p-10 text-center">
          <h3 className="text-h2 mb-3">Confirm Selection</h3>
          <p className="text-body mb-8" style={{ color: 'var(--text-secondary)' }}>
            Is this correct?
            <br />
            <span className="font-medium" style={{ color: 'var(--accent)' }}>{finalSelection.name}</span>
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCancelConfirmation}
              className="zen-btn"
            >
              No, change
            </button>
            <button
              onClick={handleConfirm}
              className="zen-btn zen-btn-accent"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              <span>Yes, confirm</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full zen-card p-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div
              className="p-4 rounded-full"
              style={{ background: 'var(--surface)' }}
            >
              <GraduationCap className="w-10 h-10" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-h1 mb-3">
            Welcome to Genatis Board
          </h1>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            Select your section to get started
          </p>
        </div>

        {/* Content */}
        {isLoadingSchoolData ? (
          <div className="text-center py-10">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
            <p className="text-small">Loading school data...</p>
          </div>
        ) : (
          <>
            {!confirmationStepActive && !selectedGrade && renderGrades()}
            {!confirmationStepActive && selectedGrade && !selectedType && renderSectionTypes()}
            {!confirmationStepActive && selectedGrade && selectedType && !selectedSectionNumber && renderSectionNumbers()}
            {confirmationStepActive && renderConfirmation()}
          </>
        )}

        <div className="text-center mt-10">
          <p className="text-small">
            Your selection will be saved for future sessions
          </p>
        </div>
      </div>
    </div>
  );
};

export default SectionSelector;


