import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { appEnv } from '../../lib/env';
import type { Member, MemberRole } from '../../lib/types';

export function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAffiliation, setEditAffiliation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function reload() {
    const data = await api.listMembers();
    setMembers(data);
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : 'メンバーの取得に失敗しました。'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setInviteMessage(null);

    try {
      const result = await api.inviteMember(email, name, role);
      setEmail('');
      setName('');
      setRole('member');
      setInviteMessage(result.message);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(member: Member) {
    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditAffiliation(member.affiliation ?? '');
  }

  async function handleProfileSave(event: FormEvent) {
    event.preventDefault();
    if (!editingMemberId) return;

    setIsSaving(true);
    setError(null);
    try {
      await api.updateMemberProfile(editingMemberId, editName, editAffiliation || null);
      setEditingMemberId(null);
      setEditName('');
      setEditAffiliation('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバー情報の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(member: Member, nextStatus: Member['status']) {
    setIsSaving(true);
    setError(null);
    try {
      await api.updateMemberStatus(member.id, nextStatus);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバー状態の更新に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page-section" aria-labelledby="members-title">
      <Link className="back-link" to="/admin">
        管理へ戻る
      </Link>
      <div className="section-header">
        <div>
          <p className="eyebrow">Members</p>
          <h2 id="members-title">メンバー</h2>
        </div>
      </div>

      <form className="invite-form" onSubmit={handleInvite}>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="メール" required />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="名前" required />
        <select value={role} onChange={(event) => setRole(event.target.value as MemberRole)}>
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
        <button className="primary-button" type="submit" disabled={isSaving}>
          招待
        </button>
      </form>

      {api.isDemo && <p className="notice">デモ環境のため招待メールは送信されません。</p>}
      {!api.isDemo && !appEnv.inviteEmailEnabled && <p className="notice">メール送信は未設定です。招待メールは送信されません。</p>}
      {inviteMessage && <p className="notice">{inviteMessage}</p>}

      {error && <p className="notice error">{error}</p>}

      {isLoading ? (
        <p className="empty-state">読み込み中</p>
      ) : (
        <div className="admin-list">
          {members.map((member) => (
            <div className="admin-row" key={member.id}>
              {editingMemberId === member.id ? (
                <form className="member-edit-form" onSubmit={handleProfileSave}>
                  <input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="表示名" required />
                  <input value={editAffiliation} onChange={(event) => setEditAffiliation(event.target.value)} placeholder="所属" />
                  <button className="primary-button" type="submit" disabled={isSaving}>
                    保存
                  </button>
                  <button className="secondary-button inline" type="button" onClick={() => setEditingMemberId(null)}>
                    取消
                  </button>
                </form>
              ) : (
                <>
                  <div>
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                    <span>{member.affiliation || '所属未設定'}</span>
                  </div>
                  <div className="member-row-actions">
                    <span className="status-badge neutral">
                      {member.role} / {member.status}
                    </span>
                    {member.status === 'pending' && (
                      <>
                        <button className="primary-button inline" type="button" disabled={isSaving} onClick={() => handleStatusChange(member, 'active')}>
                          承認
                        </button>
                        <button className="danger-button inline" type="button" disabled={isSaving} onClick={() => handleStatusChange(member, 'rejected')}>
                          却下
                        </button>
                      </>
                    )}
                    {member.status === 'rejected' && (
                      <button className="primary-button inline" type="button" disabled={isSaving} onClick={() => handleStatusChange(member, 'active')}>
                        承認
                      </button>
                    )}
                    {member.status === 'active' && member.role !== 'admin' && (
                      <button className="danger-button inline" type="button" disabled={isSaving} onClick={() => handleStatusChange(member, 'disabled')}>
                        無効化
                      </button>
                    )}
                    {member.status === 'disabled' && (
                      <button className="secondary-button inline" type="button" disabled={isSaving} onClick={() => handleStatusChange(member, 'active')}>
                        有効化
                      </button>
                    )}
                    <button className="secondary-button inline" type="button" onClick={() => startEdit(member)}>
                      編集
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
