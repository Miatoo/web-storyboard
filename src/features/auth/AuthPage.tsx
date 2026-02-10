import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>('');

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || '登录失败');
      }
      return;
    }

    const result = await register({ username, password, inviteCode, email });
    if (!result.success) {
      setError(result.message || '注册失败');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold mb-4 text-center">Storyboard 工具登录</h1>
        <div className="flex mb-4 border-b border-slate-200">
          <button
            className={`flex-1 py-2 text-sm font-semibold ${
              mode === 'login' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'
            }`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            登录
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold ${
              mode === 'register' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'
            }`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            注册（普通用户需注册码）
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="第一次使用请先注册一个管理员账号"
              autoComplete="username"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {mode === 'register' && (
              <p className="mt-1 text-[11px] text-slate-500">
                第一次注册的账号将自动成为管理员，请妥善保管密码。
              </p>
            )}
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入邮箱地址"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">注册码</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="管理员发放的注册码"
                />
              </div>
            </>
          )}

          {error && <div className="text-xs text-red-600">{error}</div>}

          <button
            type="submit"
            className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded"
          >
            {mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>
      </div>
    </div>
  );
}


