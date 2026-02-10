import { useEffect } from 'react';
import { StoryboardEditor } from '../storyboard/StoryboardEditor';
import { AuthPage } from './AuthPage';
import { useAuthStore } from '../../store/authStore';

export function AuthGate() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const initialized = useAuthStore((s) => s.initialized);
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-sm text-gray-500">Initializing...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  return <StoryboardEditor />;
}











