import { useAuth } from '../context/AuthProvider';

export const useSchoolId = () => {
  const { currentUser } = useAuth();
  return currentUser?.schoolId || 'default_school';
};
