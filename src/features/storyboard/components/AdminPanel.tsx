import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../../store/authStore';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AdminPanel({ open, onClose }: AdminPanelProps) {
  const token = useAuthStore((s) => s.token);
  const [users, setUsers] = useState<
    { id: number; username: string; role: string; disabled: number; created_at: string; last_login_at?: string | null }[]
  >([]);
  const [inviteCodes, setInviteCodes] = useState<
    { code: string; max_uses: number; used: number; expires_at?: string | null; disabled: number; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (!token) {
      setError('当前未登录或登录已失效');
      return;
    }
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [usersRes, invitesRes] = await Promise.all([
          fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/invites', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!usersRes.ok || !invitesRes.ok) {
          setError('加载数据失败，请确认当前账号为管理员。');
          return;
        }
        const usersData = (await usersRes.json()) as {
          users: {
            id: number;
            username: string;
            role: string;
            disabled: number;
            created_at: string;
            last_login_at?: string | null;
          }[];
        };
        const invitesData = (await invitesRes.json()) as {
          invites: {
            code: string;
            max_uses: number;
            used: number;
            expires_at?: string | null;
            disabled: number;
            created_at: string;
          }[];
        };
        setUsers(usersData.users || []);
        setInviteCodes(invitesData.invites || []);
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, [open, token]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[9998]"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[min(32rem,calc(100vw-2rem))]">
        <div
          className="retro-window bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="retro-header flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold">管理员后台</span>
            <button
              onClick={onClose}
              className="pixel-border-button px-2 py-0.5 text-xs bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ×
            </button>
          </div>

          <div className="p-3 space-y-4 text-xs text-gray-800 dark:text-gray-100">
            {loading && <div className="text-[11px] text-gray-500">加载中...</div>}
            {error && <div className="text-[11px] text-red-600">{error}</div>}

            <div className="flex items-center justify-between">
              <div>已注册用户数：{users.length}</div>
            </div>

            <InviteCodeSection
              inviteCodes={inviteCodes}
              onCreated={(code, maxUses) => {
                setInviteCodes((prev) => [...prev, { code, max_uses: maxUses, used: 0, expires_at: null, disabled: 0, created_at: new Date().toISOString() }]);
              }}
            />

            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 text-[11px] text-gray-500 dark:text-gray-400">
              提示：当前实现已接入后端服务，邀请码与用户信息存储在服务器数据库中。
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

interface InviteCodeSectionProps {
  inviteCodes: { code: string; max_uses: number; used: number }[];
  onCreated: (code: string, maxUses: number) => void;
}

function InviteCodeSection({ inviteCodes, onCreated }: InviteCodeSectionProps) {
  const token = useAuthStore((s) => s.token);
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState(5);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleCreate = () => {
    void (async () => {
      setError('');
      setSuccess('');
      if (!token) {
        setError('当前未登录或登录已失效');
        return;
      }
      try {
        const res = await fetch('/api/admin/invites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, maxUses }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'INVITE_EXISTS') {
            setError('该邀请码已存在');
          } else {
            setError('创建失败');
          }
          return;
        }
        onCreated(code.trim(), maxUses);
        setSuccess('创建成功');
        setCode('');
      } catch {
        setError('网络错误，创建失败');
      }
    })();
  };

  return (
    <div className="space-y-2">
      <div className="font-semibold text-xs">注册码管理</div>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="自定义注册码（例如：TEAM-2024-A）"
          className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs"
        />
        <input
          type="number"
          min={1}
          value={maxUses}
          onChange={(e) => setMaxUses(parseInt(e.target.value || '1', 10))}
          className="w-20 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs"
        />
        <button
          onClick={handleCreate}
          className="pixel-border-button px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
        >
          新建
        </button>
      </div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400">
        使用次数限制：用于控制最多可注册的人数（例如设置为 10，则该码最多可注册 10 个账号）。
      </div>
      {error && <div className="text-[11px] text-red-600">{error}</div>}
      {success && <div className="text-[11px] text-green-600">{success}</div>}

      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-2 py-1 text-left">注册码</th>
              <th className="px-2 py-1 text-right">已用 / 限制</th>
            </tr>
          </thead>
          <tbody>
            {inviteCodes.length === 0 ? (
              <tr>
                <td className="px-2 py-2 text-center text-gray-500" colSpan={2}>
                  暂无注册码，请在上方创建
                </td>
              </tr>
            ) : (
              inviteCodes.map((c) => (
                <tr key={c.code} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-2 py-1">{c.code}</td>
                  <td className="px-2 py-1 text-right">
                    {c.used} / {c.max_uses}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


