'use client';

export default function PresenceBar({ users }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {users.slice(0, 5).map((u, i) => (
        <div
          key={u.socketId || i}
          className="w-5 h-5 flex items-center justify-center text-[9px] font-bold"
          style={{ backgroundColor: u.avatarColor || 'var(--accent)', color: 'var(--base)' }}
          title={u.username}
        >
          {u.username[0].toUpperCase()}
        </div>
      ))}
      {users.length > 5 && (
        <span className="text-[10px] text-brand-text3 ml-1">+{users.length - 5}</span>
      )}
    </div>
  );
}
