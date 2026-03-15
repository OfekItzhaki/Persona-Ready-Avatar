'use client';

// Feature: photorealistic-avatar
// Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7

import { useEffect, useState, useRef } from 'react';
import type { AvatarAssignment } from '@/types/avatar';

interface Agent {
  id: string;
  name: string;
}

interface AdminAvatarPanelProps {
  sessionToken: string;
  onLogout: () => void;
}

/**
 * AdminAvatarPanel
 *
 * Lists all agents with their current AvatarAssignment.
 * Provides photo upload (D-ID mode) and GLB/VRM upload (GLB mode) per agent.
 * Refreshes assignment display on success without full page reload.
 */
export default function AdminAvatarPanel({ sessionToken, onLogout }: AdminAvatarPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AvatarAssignment | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, string>>({});
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const modelInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch agents on mount
  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data) => {
        const list: Agent[] = Array.isArray(data.agents) ? data.agents : [];
        setAgents(list);
        // Fetch assignments for each agent
        list.forEach((agent) => fetchAssignment(agent.id));
      })
      .catch(() => setAgents([]));
  }, []);

  const fetchAssignment = async (agentId: string) => {
    try {
      const res = await fetch(`/api/avatar/assignment?agentId=${encodeURIComponent(agentId)}`);
      if (res.status === 404) {
        setAssignments((prev) => ({ ...prev, [agentId]: null }));
        return;
      }
      if (res.ok) {
        const data: AvatarAssignment = await res.json();
        setAssignments((prev) => ({ ...prev, [agentId]: data }));
      }
    } catch {
      setAssignments((prev) => ({ ...prev, [agentId]: null }));
    }
  };

  const setAgentError = (agentId: string, msg: string) =>
    setErrors((prev) => ({ ...prev, [agentId]: msg }));

  const setAgentSuccess = (agentId: string, msg: string) =>
    setSuccess((prev) => ({ ...prev, [agentId]: msg }));

  const clearMessages = (agentId: string) => {
    setErrors((prev) => {
      const n = { ...prev };
      delete n[agentId];
      return n;
    });
    setSuccess((prev) => {
      const n = { ...prev };
      delete n[agentId];
      return n;
    });
  };

  const uploadPhoto = async (agentId: string, file: File) => {
    clearMessages(agentId);
    setUploading((prev) => ({ ...prev, [agentId]: true }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);

    try {
      const res = await fetch('/api/admin/avatar/upload-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAgentError(agentId, body.error ?? `Upload failed (HTTP ${res.status})`);
        return;
      }

      setAgentSuccess(agentId, 'Photo uploaded and D-ID presenter created.');
      await fetchAssignment(agentId);
    } catch {
      setAgentError(agentId, 'Network error during photo upload.');
    } finally {
      setUploading((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  const uploadModel = async (agentId: string, file: File) => {
    clearMessages(agentId);
    setUploading((prev) => ({ ...prev, [agentId]: true }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);

    try {
      const res = await fetch('/api/admin/avatar/upload-model', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAgentError(agentId, body.error ?? `Upload failed (HTTP ${res.status})`);
        return;
      }

      setAgentSuccess(agentId, 'GLB/VRM model uploaded successfully.');
      await fetchAssignment(agentId);
    } catch {
      setAgentError(agentId, 'Network error during model upload.');
    } finally {
      setUploading((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>
          Avatar Assignments
        </h1>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>

      {agents.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No agents found.</p>
      )}

      {agents.map((agent) => {
        const assignment = assignments[agent.id];
        const isUploading = uploading[agent.id] ?? false;

        return (
          <div
            key={agent.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
              padding: '20px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div>
                <p style={{ fontWeight: '600', fontSize: '15px', color: '#111827', margin: 0 }}>
                  {agent.name}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>{agent.id}</p>
              </div>
              <AssignmentBadge assignment={assignment ?? null} />
            </div>

            {assignment && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                {assignment.mode === 'did'
                  ? `Presenter ID: ${assignment.presenterId}`
                  : `Model: ${assignment.modelPath}`}
              </p>
            )}

            {errors[agent.id] && (
              <p role="alert" style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '10px' }}>
                {errors[agent.id]}
              </p>
            )}
            {success[agent.id] && (
              <p role="status" style={{ color: '#15803d', fontSize: '13px', marginBottom: '10px' }}>
                {success[agent.id]}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* Photo upload */}
              <input
                ref={(el) => {
                  photoInputRefs.current[agent.id] = el;
                }}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPhoto(agent.id, file);
                  e.target.value = '';
                }}
              />
              <button
                disabled={isUploading}
                onClick={() => photoInputRefs.current[agent.id]?.click()}
                style={btnStyle(isUploading, '#2563eb')}
              >
                {isUploading ? 'Uploading…' : '📷 Upload Photo (D-ID)'}
              </button>

              {/* Model upload */}
              <input
                ref={(el) => {
                  modelInputRefs.current[agent.id] = el;
                }}
                type="file"
                accept=".glb,.vrm"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadModel(agent.id, file);
                  e.target.value = '';
                }}
              />
              <button
                disabled={isUploading}
                onClick={() => modelInputRefs.current[agent.id]?.click()}
                style={btnStyle(isUploading, '#7c3aed')}
              >
                {isUploading ? 'Uploading…' : '🧊 Upload GLB/VRM'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssignmentBadge({ assignment }: { assignment: AvatarAssignment | null }) {
  if (!assignment) {
    return <span style={badge('#f3f4f6', '#6b7280')}>No assignment</span>;
  }
  if (assignment.mode === 'did') {
    return <span style={badge('#dbeafe', '#1d4ed8')}>D-ID</span>;
  }
  return <span style={badge('#ede9fe', '#6d28d9')}>GLB/VRM</span>;
}

function badge(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
  };
}

function btnStyle(disabled: boolean, bg: string): React.CSSProperties {
  return {
    padding: '8px 14px',
    background: disabled ? '#d1d5db' : bg,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
