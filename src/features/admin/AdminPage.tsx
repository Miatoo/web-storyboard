import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';

type AdminUserRow = {
  id: number;
  username: string;
  role: string;
  disabled: number;
  email?: string | null;
  email_verified?: number;
  created_at: string;
  last_login_at?: string | null;
};

type InviteRow = {
  code: string;
  max_uses: number;
  used: number;
  expires_at?: string | null;
  disabled: number;
  created_at: string;
};

export function AdminPage() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.currentUser);
  const initialized = useAuthStore((s) => s.initialized);
  const initAuth = useAuthStore((s) => s.initAuth);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);

  const [maxUses, setMaxUses] = useState(5);
  const [newCode, setNewCode] = useState('');
  const [msg, setMsg] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  const headers = useMemo(() => {
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const refresh = async () => {
    if (!headers) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const [uRes, iRes] = await Promise.allSettled([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/invites', { headers }),
      ]);

      let hadAnyError = false;

      if (uRes.status === 'fulfilled') {
        if (uRes.value.ok) {
          const uData = (await uRes.value.json()) as { users: AdminUserRow[] };
          setUsers(uData.users || []);
        } else {
          hadAnyError = true;
        }
      } else {
        hadAnyError = true;
      }

      if (iRes.status === 'fulfilled') {
        if (iRes.value.ok) {
          const iData = (await iRes.value.json()) as { invites: InviteRow[] };
          setInvites(iData.invites || []);
        } else {
          hadAnyError = true;
        }
      } else {
        hadAnyError = true;
      }

      if (hadAnyError) {
        // 注意：这里不清空已有数据，避免“刷新后全空白”
        setError('加载失败：可能是登录态失效或后端未启动。请先在主页面确认已登录管理员账号，并确认 API 正在运行。');
      }
    } catch {
      // 注意：这里不清空已有数据，避免“刷新后全空白”
      setError('网络错误：加载失败（已保留上一次数据显示）');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 窗口打开时先从 localStorage 恢复登录状态
    void initAuth().then(() => {
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-6">
        <div className="retro-window max-w-xl mx-auto p-4">
          <div className="retro-header px-3 py-2 mb-3">管理员后台</div>
          <div className="text-sm">正在检查登录状态...</div>
        </div>
      </div>
    );
  }

  const handleAutoInvite = async () => {
    if (!headers) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch('/api/admin/invites/auto', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses, count: 10 }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        codes?: string[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ? `生成失败：${data.error}` : '生成失败');
        return;
      }
      const list = data.codes && Array.isArray(data.codes) ? data.codes : data.code ? [data.code] : [];
      if (list.length === 0) {
        setError('生成失败：未获取到注册码');
        return;
      }
      setMsg(`已生成 ${list.length} 个注册码`);
      setNewCode(list[0] || '');
      await refresh();
    } catch {
      setError('网络错误：生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!headers) return;
    const c = String(newCode || '').trim();
    if (!c) {
      setError('请输入注册码或点击自动生成');
      return;
    }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, maxUses }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === 'INVITE_EXISTS' ? '该邀请码已存在' : '创建失败');
        return;
      }
      setMsg('创建成功');
      await refresh();
    } catch {
      setError('网络错误：创建失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = async (id: number, nextDisabled: boolean) => {
    if (!headers) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/users/${id}/${nextDisabled ? 'disable' : 'enable'}`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        setError('操作失败');
        return;
      }
      await refresh();
    } catch {
      setError('网络错误：操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (!headers) return;
    if (!window.confirm(`确定要删除用户「${username}」吗？此操作不可恢复。`)) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const reason =
          data.error === 'CANNOT_DELETE_SELF'
            ? '不能删除当前登录的自己'
            : data.error === 'CANNOT_DELETE_ADMIN'
              ? '不能删除管理员账号'
              : data.error === 'NOT_FOUND'
                ? '用户不存在'
                : '删除失败';
        setError(reason);
        return;
      }
      setMsg('已删除用户');
      await refresh();
    } catch {
      setError('网络错误：删除失败');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-6">
        <div className="retro-window max-w-xl mx-auto p-4">
          <div className="retro-header px-3 py-2 mb-3">管理员后台</div>
          <div className="text-sm">当前未登录。请先在主页面右上角登录管理员账号。</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-6">
        <div className="retro-window max-w-xl mx-auto p-4">
          <div className="retro-header px-3 py-2 mb-3">管理员后台</div>
          <div className="text-sm">当前账号不是管理员，无权访问。</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-5 text-sm">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="retro-window overflow-hidden text-base">
          <div className="retro-header flex items-center justify-between px-3 py-2 text-base">
            <div className="font-semibold">管理员后台</div>
            <div className="flex items-center gap-2">
              <button
                className="pixel-border-button px-3 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => window.close()}
                type="button"
                title="关闭当前窗口"
              >
                关闭窗口
              </button>
              <button
                className="pixel-border-button px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => void refresh()}
                type="button"
              >
                刷新
              </button>
            </div>
          </div>
          <div className="p-3 text-sm">
            {loading && <div className="text-xs text-gray-500">处理中/加载中...</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
            {msg && <div className="text-xs text-green-700">{msg}</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="retro-window p-4 text-sm">
            <div className="font-semibold mb-3 text-base">注册码（Invite Codes）</div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <input
                className="flex-1 min-w-[12rem] border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-2 py-1 text-sm"
                placeholder="10 位随机码或自定义"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
              <input
                className="w-24 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-2 py-1 text-sm"
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value || '1', 10))}
                title="最大使用次数"
              />
              <button
                className="pixel-border-button px-3 py-1 text-sm bg-gray-900 text-white hover:bg-gray-800"
                onClick={() => void handleAutoInvite()}
                type="button"
              >
                批量生成 10 个
              </button>
              <button
                className="pixel-border-button px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => void handleCreateInvite()}
                type="button"
              >
                创建
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              下表包含<strong>已用</strong>与<strong>未用</strong>的注册码（used / max_uses）。
            </div>
            <div className="max-h-[24rem] overflow-auto border border-gray-200 dark:border-gray-800 rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Code</th>
                    <th className="px-2 py-1 text-right">Used / Max</th>
                    <th className="px-2 py-1 text-right">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.length === 0 ? (
                    <tr>
                      <td className="px-2 py-2 text-center text-gray-500" colSpan={3}>
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    invites.map((it) => {
                      const exhausted = it.used >= it.max_uses;
                      const status = it.disabled ? '禁用' : exhausted ? '已用完' : '可用';
                      return (
                        <tr key={it.code} className="border-t border-gray-200 dark:border-gray-800">
                          <td className="px-2 py-1 font-mono">{it.code}</td>
                          <td className="px-2 py-1 text-right">
                            {it.used} / {it.max_uses}
                          </td>
                          <td className="px-2 py-1 text-right">{status}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="retro-window p-4 text-sm">
            <div className="font-semibold mb-3 text-base">用户管理（Users）</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              可对用户进行<strong>禁用/启用</strong>，或<strong>删除普通用户</strong>；禁用后将无法登录/导出/使用 AI。
            </div>
            <div className="max-h-[24rem] overflow-auto border border-gray-200 dark:border-gray-800 rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">用户名</th>
                    <th className="px-2 py-1 text-left">邮箱</th>
                    <th className="px-2 py-1 text-left">角色</th>
                    <th className="px-2 py-1 text-left">邮箱验证</th>
                    <th className="px-2 py-1 text-right">状态</th>
                    <th className="px-2 py-1 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td className="px-2 py-2 text-center text-gray-500" colSpan={6}>
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const disabled = u.disabled === 1;
                      return (
                        <tr key={u.id} className="border-t border-gray-200 dark:border-gray-800">
                          <td className="px-2 py-1">{u.username}</td>
                          <td className="px-2 py-1">{u.email || '-'}</td>
                          <td className="px-2 py-1">{u.role}</td>
                          <td className="px-2 py-1">{u.email_verified === 1 ? '已验证' : u.role === 'admin' ? '—' : '未验证'}</td>
                          <td className="px-2 py-1 text-right">{disabled ? '禁用' : '正常'}</td>
                          <td className="px-2 py-1 text-right space-x-1">
                            {u.role === 'admin' ? (
                              <span className="text-gray-500">—</span>
                            ) : (
                              <>
                                <button
                                  className={`pixel-border-button px-2 py-0.5 text-xs ${
                                    disabled
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  }`}
                                  onClick={() => void toggleUser(u.id, !disabled)}
                                  type="button"
                                >
                                  {disabled ? '启用' : '禁用'}
                                </button>
                                <button
                                  className="pixel-border-button px-2 py-0.5 text-xs bg-gray-700 text-white hover:bg-black"
                                  onClick={() => void handleDeleteUser(u.id, u.username)}
                                  type="button"
                                >
                                  删除
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


