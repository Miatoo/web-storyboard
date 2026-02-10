import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/authStore';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const initAuth = useAuthStore((s) => s.initAuth);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    if (!open) return;
    initAuth();
    setUsername('');
    setPassword('');
    setError('');
    setLoading(false);
  }, [open, initAuth]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || '登录失败');
        return;
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 z-[9998]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[min(26rem,calc(100vw-2rem))]">
        <div
          className="retro-window bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="retro-header flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold">
              登录
            </span>
            <button
              onClick={onClose}
              className="pixel-border-button px-2 py-0.5 text-xs bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ×
            </button>
          </div>

          <div className="p-3">
            <form onSubmit={handleSubmit} className="space-y-3 text-xs text-gray-800 dark:text-gray-100">
              <div>
                <label className="block mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {mode !== 'verify' && (
                <div>
                  <label className="block mb-1">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {error && <div className="text-[11px] text-red-600">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="pixel-border-button w-full px-3 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? '处理中...' : '登录'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}


