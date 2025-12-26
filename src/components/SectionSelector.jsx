import React, { useState, useEffect } from 'react';
import { GraduationCap, ChevronRight, ChevronLeft, X } from 'lucide-react'; // Added ChevronLeft and X for back/cancel
import { db } from '../firebase.js';
import { collection, doc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';

const SectionSelector = ({ onSectionSelect, currentUser }) => {
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSectionNumber, setSelectedSectionNumber] = useState(null);
  const [finalSelection, setFinalSelection] = useState(null); // To store the final selection before confirmation
  const [confirmationStepActive, setConfirmationStepActive] = useState(false); // State to control confirmation step visibility
  const [isAnimating, setIsAnimating] = useState(false);
  const [schoolGradesSections, setSchoolGradesSections] = useState([]);
  const [isLoadingSchoolData, setIsLoadingSchoolData] = useState(true);
  // userId is now passed as a prop: currentUser?.uid

  useEffect(() => {
    const fetchSchoolData = async () => {
      setIsLoadingSchoolData(true);
      try {
        const gradesCollectionRef = collection(db, 'schoolData/grades/gradesList');
        const q = query(gradesCollectionRef, orderBy('grade'));
        const querySnapshot = await getDocs(q);
        const fetchedGrades = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Fetched grades from Firestore:", fetchedGrades); // Debug log
        setSchoolGradesSections(fetchedGrades);
      } catch (error) {
        console.error("Error fetching school data: ", error);
      } finally {
        setIsLoadingSchoolData(false);
      }
    };
    fetchSchoolData();
  }, [currentUser?.uid]); // Add currentUser.uid to dependency array to re-fetch when user changes

  const handleGradeClick = (grade) => {
    setSelectedGrade(grade);
    setSelectedType(null);
    setSelectedSectionNumber(null);
    setFinalSelection(null); // Reset final selection
    setConfirmationStepActive(false); // Reset confirmation step
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleTypeClick = (type) => {
    console.log('handleTypeClick called with type:', type);
    setSelectedType(type);
    setSelectedSectionNumber(null);
    setFinalSelection(null); // Reset final selection
    setConfirmationStepActive(false); // Reset confirmation step
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleSectionNumberClick = (number) => {
    const section = {
      id: `grade${selectedGrade}-${selectedType.toLowerCase()}${number}`,
      name: `Grade ${selectedGrade} ${selectedType} ${number}`,
      grade: selectedGrade,
      type: selectedType,
      number: number,
    };
    setFinalSelection(section); // Store the selection
    setSelectedSectionNumber(number); // Keep track of the selected number for styling
    setConfirmationStepActive(true); // Activate confirmation step
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleConfirm = async () => {
    onSectionSelect(finalSelection); // This will now save to Firestore via App.js
    // Reset state after confirmation
    setSelectedGrade(null);
    setSelectedType(null);
    setSelectedSectionNumber(null);
    setFinalSelection(null);
    setConfirmationStepActive(false);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleCancelConfirmation = () => {
    // Stay on the section number selection screen
    setFinalSelection(null);
    setConfirmationStepActive(false);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleBack = () => {
    if (selectedSectionNumber !== null) {
      setSelectedSectionNumber(null); // Go back to section number selection
    } else if (selectedType !== null) {
      setSelectedType(null); // Go back to type selection
    } else if (selectedGrade !== null) {
      setSelectedGrade(null); // Go back to grade selection
    }
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const renderGrades = () => (
    <div className="relative">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {schoolGradesSections.map((gradeData, index) => (
          <div
            key={gradeData.grade}
            className={`
              relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105
              ${selectedGrade === gradeData.grade ? 'ring-4 ring-blue-400 scale-105' : 'ring-2 ring-white/20'}
            `}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleGradeClick(gradeData.grade)}
          >
            <div className="glass-card p-6 transition-all duration-300 hover:bg-white/20 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-default-text-light dark:text-default-text-dark font-bold text-lg">
                      {gradeData.grade}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-default-text-light dark:text-default-text-dark text-xl font-semibold">
                      Grade {gradeData.grade}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Select Grade
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSectionTypes = () => {
    const gradeData = schoolGradesSections.find(g => g.grade === selectedGrade);
    if (!gradeData) return null;

    return (
      <div className="relative">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="absolute -top-12 left-0 p-2 text-default-text-light dark:text-default-text-dark hover:text-blue-500 dark:hover:text-white transition-colors flex items-center"
        >
          <ChevronLeft className="w-6 h-6" /> <span>Back</span>
        </button>
        <div className="grid grid-cols-2 gap-4"> {/* Removed animate-slide-up */}
          {Object.keys(gradeData.sections).map((type, index) => (
            <div
              key={type}
            className={`
              relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105
              ${selectedType === type ? 'ring-4 ring-blue-400 scale-105' : 'ring-2 ring-white/20'}
            `}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleTypeClick(type)}
          >
            <div className="glass-card p-6 transition-all duration-300 hover:bg-white/20 h-full">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-default-text-light dark:text-default-text-dark font-bold text-lg">
                    {type.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-default-text-light dark:text-default-text-dark text-xl font-semibold">
                    {type}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    Select Type
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSectionNumbers = () => {
    const gradeData = schoolGradesSections.find(g => g.grade === selectedGrade);
    if (!gradeData || !selectedType) return null;

    const numbers = gradeData.sections[selectedType];

    return (
      <div className="relative">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="absolute -top-12 left-0 p-2 text-default-text-light dark:text-default-text-dark hover:text-blue-500 dark:hover:text-white transition-colors flex items-center"
        >
          <ChevronLeft className="w-6 h-6" /> <span>Back</span>
        </button>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"> {/* Removed animate-slide-up */}
          {numbers.map((number, index) => (
            <div
              key={number}
            className={`
              relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105
              ${selectedSectionNumber === number ? 'ring-4 ring-blue-400 scale-105' : 'ring-2 ring-white/20'}
            `}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleSectionNumberClick(number)}
          >
            <div className="glass-card p-6 transition-all duration-300 hover:bg-white/20 flex items-center justify-center h-full">
              <h3 className="text-xl font-semibold text-default-text-light dark:text-default-text-dark">
                {number}
              </h3>
            </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    if (!finalSelection) return null;

    return (
      <div className="relative"> {/* Removed animate-slide-up */}
        {/* Back Button */}
        <button
          onClick={handleCancelConfirmation}
          className="absolute -top-12 left-0 p-2 text-default-text-light dark:text-default-text-dark hover:text-blue-500 dark:hover:text-white transition-colors flex items-center"
        >
          <ChevronLeft className="w-6 h-6" /> <span>Back</span>
        </button>
        <div className="glass-card p-8 text-center">
          <h3 className="text-2xl font-bold text-default-text-light dark:text-default-text-dark mb-4">Confirm Selection</h3>
          <p className="text-lg text-gray-700 dark:text-gray-200 mb-6">
            Is this correct?
            <br />
            <span className="font-semibold text-blue-500 dark:text-white">{finalSelection.name}</span>
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleCancelConfirmation}
              className="px-6 py-2 bg-gray-200/50 text-default-text-light rounded-lg hover:bg-gray-300 dark:bg-white/20 dark:text-default-text-dark dark:hover:bg-white/30 transition-colors"
            >
              No, change
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <ChevronRight className="w-4 h-4" />
              <span>Yes, confirm</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-default-text-light dark:text-default-text-dark">
      <div className="max-w-3xl w-full glass-card p-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/20 p-4 rounded-full shadow-lg">
              <GraduationCap className="w-12 h-12 text-default-text-light dark:text-default-text-dark" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-default-text-light dark:text-default-text-dark mb-4">
            Welcome to ClassPoint
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-200 max-w-md mx-auto">
            Select your section to get started with tracking your class schedule
          </p>
        </div>

        {isLoadingSchoolData ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-default-text-light dark:border-default-text-dark mx-auto mb-4"></div>
            <p className="font-medium text-default-text-light dark:text-default-text-dark">Loading school data...</p>
          </div>
        ) : (
          <>
            {!confirmationStepActive && !selectedGrade && renderGrades()}
            {!confirmationStepActive && selectedGrade && !selectedType && renderSectionTypes()}
            {!confirmationStepActive && selectedGrade && selectedType && !selectedSectionNumber && renderSectionNumbers()}
            {confirmationStepActive && renderConfirmation()}
          </>
        )}

        <div className="text-center mt-8">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your selection will be saved for future sessions
          </p>
        </div>
      </div>
    </div>
  );
};

export default SectionSelector;
