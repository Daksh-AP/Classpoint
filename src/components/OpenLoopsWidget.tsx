import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, MessageSquare, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClassContextService, ClassContext, OpenLoop } from '../services/ClassContextService';
import { useSchoolId } from '../hooks/useSchoolId';

interface OpenLoopsWidgetProps {
  selectedSection: any
  currentClass: any
}

const OpenLoopsWidget: React.FC<OpenLoopsWidgetProps> = ({ selectedSection, currentClass }) => {
  const schoolId = useSchoolId();
  const [context, setContext] = useState<ClassContext | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSection || !currentClass || !currentClass.subject) {
      setContext(null);
      return;
    }

    // Attempt to extract grade and section correctly. Assuming selectedSection has id 'gradeX_sectionY' or similar.
    const gradeId = selectedSection.grade || selectedSection.gradeId || 'grade9';
    const sectionId = selectedSection.id || selectedSection.sectionId;

    const unsubscribe = ClassContextService.subscribeToContext(
      gradeId,
      sectionId,
      currentClass.subject,
      (data) => setContext(data),
      schoolId
    );

    return () => unsubscribe();
  }, [selectedSection, currentClass, schoolId]);

  const handleResolve = async (loopId: string) => {
    if (!selectedSection || !currentClass || !currentClass.subject) return;
    setResolvingId(loopId);
    
    const gradeId = selectedSection.grade || selectedSection.gradeId || 'grade9';
    const sectionId = selectedSection.id || selectedSection.sectionId;

    try {
      await ClassContextService.resolveOpenLoop(gradeId, sectionId, currentClass.subject, loopId, schoolId);
    } catch (e) {
// /* console.error */ ("Failed to resolve loop", e);
    } finally {
      setResolvingId(null);
    }
  };

  if (!context || !context.openLoops || context.openLoops.length === 0) {
    return null; // Don't render anything if there are no open loops
  }

  return (
    <div className="mt-6 mb-2 animate-fade-up">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-h2 flex items-center gap-2">
          <Flame className="w-6 h-6 text-[#FF9F0A]" strokeWidth={2} />
          Attention Required
        </h2>
        <span className="bg-[#FF9F0A]/20 text-[#FF9F0A] text-xs font-bold px-2.5 py-1 rounded-full">
          {context.openLoops.length} Open Loops
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {context.openLoops.map((loop: OpenLoop) => (
            <motion.div
              key={loop.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="zen-card-flat p-5 border-l-4 border-[#FF9F0A] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-[#FF9F0A]/10 rounded-lg">
                    {loop.type === 'confusion' ? (
                      <AlertCircle className="w-5 h-5 text-[#FF9F0A]" strokeWidth={2} />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-[#FF9F0A]" strokeWidth={2} />
                    )}
                  </div>
                  <h3 className="text-body font-semibold text-zen-text-1">
                    {loop.type === 'confusion' ? 'Unresolved Confusion' : 'Pending Question'}
                  </h3>
                </div>
                <p className="text-small text-zen-text-2 mb-4 leading-relaxed">
                  "{loop.note}"
                </p>
              </div>

              <button
                onClick={() => handleResolve(loop.id)}
                disabled={resolvingId === loop.id}
                className="w-full flex items-center justify-center gap-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors rounded-xl py-3 text-sm font-semibold active:scale-[0.98]"
              >
                {resolvingId === loop.id ? (
                  <span className="animate-pulse">Resolving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Mark Resolved
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OpenLoopsWidget;
