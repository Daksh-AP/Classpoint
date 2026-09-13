import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useSchoolId } from '../hooks/useSchoolId';

interface AlertOverlayProps {
  currentUser: any
}

export default function AlertOverlay({ currentUser }: AlertOverlayProps) {
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const schoolId = useSchoolId();

  useEffect(() => {
    const alertsRef = collection(db, `schools/${schoolId}/alerts`);
    const q = query(alertsRef, where('active', '==', true));
    
    const unsub = onSnapshot(q, (snap) => {
      const alerts: any[] = [];
      snap.forEach(d => alerts.push({ id: d.id, ...d.data() }));
      // Sort so most recent is first
      alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActiveAlerts(alerts);
    });

    return () => unsub();
  }, []);

  if (activeAlerts.length === 0) return null;

  // For simplicity, just handle the first active alert
  const alert = activeAlerts[0];
  const isAcknowledged = currentUser?.email && alert.acknowledgedTeacherEmails?.includes(currentUser.email);

  const handleMarkSafe = async () => {
    if (!currentUser?.email) return;
    try {
      const alertRef = doc(db, `schools/${schoolId}/alerts`, alert.id);
      await setDoc(alertRef, {
        acknowledgedTeacherEmails: arrayUnion(currentUser.email)
      }, { merge: true });
    } catch (error) {
// /* console.error */ ("Failed to mark safe:", error);
    }
  };

  const getAlertColor = () => {
    switch (alert.type) {
      case 'evacuate': return '#ef4444'; // red-500
      case 'weather': return '#f59e0b';  // amber-500
      default: return '#3b82f6';         // blue-500
    }
  };

  const color = getAlertColor();

  if (isAcknowledged) {
    // Minimized banner state
    return (
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, 
          background: color, color: '#fff', 
          padding: '0.75rem 2rem', zIndex: 999999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideDown 0.3s ease-out'
        }}
      >
        <ShieldAlert size={20} />
        <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>{alert.title}</span>
        <span style={{ opacity: 0.8 }}>—</span>
        <span style={{ fontSize: '0.9rem' }}>You have marked yourself safe. Awaiting All Clear.</span>
      </div>
    );
  }

  // Full screen takeover state
  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 999999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <div 
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%', maxWidth: '800px',
          overflow: 'hidden',
          boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 100px ${color}40`,
          animation: 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ background: color, padding: '2rem', color: '#fff', textAlign: 'center' }}>
          <AlertTriangle size={64} style={{ margin: '0 auto 1rem', animation: 'pulse 2s infinite' }} />
          <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '0.1em', margin: 0, lineHeight: 1.1 }}>
            {alert.title}
          </h1>
        </div>
        
        <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc' }}>
          <p style={{ fontSize: '1.5rem', color: '#334155', fontWeight: 500, lineHeight: 1.5, marginBottom: '3rem' }}>
            {alert.message}
          </p>
          
          <button 
            onClick={handleMarkSafe}
            style={{
              background: color, color: '#fff', border: 'none',
              padding: '1.25rem 3rem', borderRadius: '999px',
              fontSize: '1.25rem', fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: `0 8px 24px ${color}60`, transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <CheckCircle size={28} />
            MARK CLASS AS SAFE / ACCOUNTED FOR
          </button>
          
          <p style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            Clicking this alerts the administration that your current section is secure.
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
