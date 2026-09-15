import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
    currentUser: any| null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }: any) => {
    const [currentUser, setCurrentUser] = useState<any | null>(() => {
        try {
            const cached = localStorage.getItem('cached_genatis_user');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const schoolId = userData.schoolId || 'default_school';
                        localStorage.setItem('schoolId', schoolId);
                        const fullUser = { ...user, ...userData };
                        localStorage.setItem('cached_genatis_user', JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            isAnonymous: user.isAnonymous,
                            ...userData
                        }));
                        setCurrentUser(fullUser);
                    } else {
                        // Fallback to existing cached profile if userDoc fetch returns empty or offline
                        const cachedRaw = localStorage.getItem('cached_genatis_user');
                        if (cachedRaw) {
                            try {
                                const cached = JSON.parse(cachedRaw);
                                if (cached.uid === user.uid) {
                                    setCurrentUser({ ...user, ...cached });
                                    setIsLoading(false);
                                    return;
                                }
                            } catch (e) {}
                        }
                        setCurrentUser(user);
                        localStorage.setItem('cached_genatis_user', JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            isAnonymous: user.isAnonymous
                        }));
                    }
                } catch (error) {
                    // In offline/reconnect state, restore from cache if valid
                    const cachedRaw = localStorage.getItem('cached_genatis_user');
                    if (cachedRaw) {
                        try {
                            const cached = JSON.parse(cachedRaw);
                            if (cached.uid === user.uid) {
                                setCurrentUser({ ...user, ...cached });
                                setIsLoading(false);
                                return;
                            }
                        } catch (e) {}
                    }
                    setCurrentUser(user);
                }
            } else {
                localStorage.removeItem('cached_genatis_user');
                setCurrentUser(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
