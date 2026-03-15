'use client';

// Feature: photorealistic-avatar
// Requirements: 1.1, 1.2, 1.3, 1.4

import { useState } from 'react';
import AdminAvatarPanel from '@/components/AdminAvatarPanel';

/**
 * AdminAuthGate
 *
 * Renders a passphrase form when unauthenticated.
 * Session state is stored in sessionStorage (not cookie or localStorage).
 * On success, renders AdminAvatarPanel.
 */
export default function AdminAuthGate() {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_avatar_token');
    }
    return null;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/avatar/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });

      if (res.status === 401) {
        setError('Incorrect passphrase. Please try again.');
        return;
      }

      if (!res.ok) {
        setError('Authentication failed. Please try again.');
        return;
      }

      const { token: sessionToken } = await res.json();
      sessionStorage.setItem('admin_avatar_token', sessionToken);
      setToken(sessionToken);
      setPassphrase('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Authenticated — render admin panel (Req 1.2)
  if (token) {
    return (
      <AdminAvatarPanel
        sessionToken={token}
        onLogout={() => {
          sessionStorage.removeItem('admin_avatar_token');
          setToken(null);
        }}
      />
    );
  }

  // Unauthenticated — render passphrase form only (Req 1.4: no upload controls)
  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '80px auto',
        padding: '32px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
      }}
    >
      <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#111827' }}>
        Avatar Admin
      </h1>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
        Enter the admin passphrase to manage avatar assignments.
      </p>

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="passphrase"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px',
          }}
        >
          Passphrase
        </label>
        <input
          id="passphrase"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          required
          autoComplete="current-password"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p role="alert" style={{ color: '#b91c1c', fontSize: '13px', marginTop: '8px' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !passphrase}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '10px',
            background: loading ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Authenticating…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
