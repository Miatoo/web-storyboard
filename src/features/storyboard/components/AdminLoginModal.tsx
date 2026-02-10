import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminAuthStore } from '../../../store/adminAuthStore';

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminLoginModal({ open, onClose, onSuccess }: AdminLoginModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const init = useAdminAuthStore((s) => s.init);
  const initialized = useAdminAuthStore((s) => s.initialized);
  const hasPassword = useAdminAuthStore((s) => s.hasPassword);
  const setPasswordAction = useAdminAuthStore((s) => s.setPassword);
  const login = useAdminAuthStore((s) => s.login);

  useEffect(() => {
    if (open) {
      init();
      setPassword('');
      setConfirmPassword('');
      setError('');
      setLoading(false);
    }
  }, [open, init]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!initialized) return;

    setLoading(true);
    try {
      if (!hasPassword) {
        // 初始化管理员密码
        if (!password || password.length < 8) {
          setError('请设置至少 8 位的管理员密码');
          return;
        }
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          return;
        }
        await setPasswordAction(password);
        onSuccess();
        onClose();
      } else {
        // 管理员登录
        const result = await login(password);
        if (!result.success) {
          setError(result.message || '登录失败');
          return;
        }
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[9998]"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2 w-[min(22rem,calc(100vw-2rem))]">
        <div
          className="retro-window bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-sm font-semibold mb-3">
            {hasPassword ? '管理员登录' : '初始化管理员密码'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3 text-xs text-gray-800 dark:text-gray-100">
            <div>
              <label className="block mb-1">管理员密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!hasPassword && (
              <div>
                <label className="block mb-1">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  仅本机有效，密码以加盐哈希形式保存在浏览器 localStorage 中，请妥善保管。
                </p>
              </div>
            )}
            {error && <div className="text-[11px] text-red-600">{error}</div>}
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="pixel-border-button px-3 py-1 text-xs bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="pixel-border-button px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {hasPassword ? (loading ? '登录中...' : '登录') : loading ? '保存中...' : '设置并进入后台'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}











