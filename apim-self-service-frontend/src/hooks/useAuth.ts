import { useAuth as useFeatureAuth, AuthProvider as FeatureAuthProvider } from '../features/auth/hooks/useAuth';

export const useAuth = () => {
    return useFeatureAuth();
};

export const AuthProvider = FeatureAuthProvider;
