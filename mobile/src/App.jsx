import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import SectionList from './components/SectionList';
import MobileAttendanceLogger from './components/MobileAttendanceLogger';
import { Loader2 } from 'lucide-react';

function App() {
  const [selectedSection, setSelectedSection] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const gradesRef = collection(db, 'schoolData/grades/gradesList');
        const gradesSnapshot = await getDocs(gradesRef);

        let allSections = [];

        for (const gradeDoc of gradesSnapshot.docs) {
          const sectionsRef = collection(db, `schoolData/grades/gradesList/${gradeDoc.id}/sections`);
          const sectionsSnapshot = await getDocs(sectionsRef);
          sectionsSnapshot.forEach(secDoc => {
            allSections.push({
              id: secDoc.id,
              grade: gradeDoc.id,
              ...secDoc.data()
            });
          });
        }
        setSections(allSections);
      } catch (error) {
        console.error("Error fetching sections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {selectedSection ? (
        <MobileAttendanceLogger
          section={selectedSection}
          onBack={() => setSelectedSection(null)}
        />
      ) : (
        <SectionList
          sections={sections}
          onSelect={setSelectedSection}
        />
      )}
    </div>
  );
}

export default App;
