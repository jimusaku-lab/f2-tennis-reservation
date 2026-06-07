import { Mail, PlayCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { toJapaneseErrorMessage } from '../../lib/errorMessages';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { member, isDemo, signInWithEmail, startDemo, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [applicationName, setApplicationName] = useState('');
  const [applicationAffiliation, setApplicationAffiliation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/events';

  if (member?.status === 'active') return <Navigate to={from} replace />;
  if (member) return <Navigate to="/pending" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await signInWithEmail(email);
      setMessage(isDemo ? 'デモセッションを開始しました。' : 'ログイン用リンクをメールで送信しました。');
    } catch (err) {
      setError(toJapaneseErrorMessage(err, 'ログイン処理に失敗しました。'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApplicationSubmit(event: FormEvent) {
    event.preventDefault();
    setIsApplying(true);
    setError(null);
    setMessage(null);

    try {
      const result = await api.requestMembership(applicationEmail, applicationName, applicationAffiliation || null);
      setApplicationEmail('');
      setApplicationName('');
      setApplicationAffiliation('');
      setMessage(result.message);
    } catch (err) {
      setError(toJapaneseErrorMessage(err, '利用申請に失敗しました。'));
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <img src={`${import.meta.env.BASE_URL}tennis-ball.svg`} alt="" className="login-logo" />
        <p className="eyebrow">F2テニス</p>
        <h1 id="login-title">F2テニス参加予約</h1>
        <p className="login-copy">メールだけで予定一覧へ。パスワード入力はありません。</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">メールアドレス</label>
          <div className="input-with-icon">
            <Mail size={18} aria-hidden="true" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '送信中' : 'ログインリンクを送る'}
          </button>
        </form>

        {isDemo && (
          <button className="secondary-button" type="button" onClick={startDemo}>
            <PlayCircle size={18} aria-hidden="true" />
            デモで開く
          </button>
        )}

        <form className="login-form application-form" onSubmit={handleApplicationSubmit}>
          <div>
            <p className="eyebrow">Apply</p>
            <h2>利用申請</h2>
          </div>
          <label htmlFor="application-name">表示名またはニックネーム</label>
          <input
            id="application-name"
            value={applicationName}
            onChange={(event) => setApplicationName(event.target.value)}
            placeholder="例: 山田 太郎"
            required
          />
          <label htmlFor="application-email">メールアドレス</label>
          <input
            id="application-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={applicationEmail}
            onChange={(event) => setApplicationEmail(event.target.value)}
            placeholder="name@example.com"
            required
          />
          <label htmlFor="application-affiliation">所属</label>
          <input
            id="application-affiliation"
            value={applicationAffiliation}
            onChange={(event) => setApplicationAffiliation(event.target.value)}
            placeholder="任意"
          />
          <button className="secondary-button" type="submit" disabled={isApplying}>
            {isApplying ? '申請中' : '利用申請を送る'}
          </button>
        </form>

        {(message || error || authError) && (
          <p className={error || authError ? 'notice error' : 'notice'} role="status">
            {error || authError || message}
          </p>
        )}
      </section>
    </main>
  );
}
