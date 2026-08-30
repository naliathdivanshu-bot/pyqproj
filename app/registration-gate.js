'use client';

import { useEffect, useState } from 'react';

const fields = [
  ['full_name', 'Full Name', 'Your full name'],
  ['email', 'Email Address', 'you@example.com'],
  ['course', 'Course / Degree', 'e.g. B.Tech CSE'],
  ['state', 'State', 'e.g. Uttar Pradesh'],
  ['college', 'College / University', 'Your college name'],
];

export default function RegistrationGate({ children }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState({ full_name:'', email:'', course:'', state:'', college:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pyq_student_registered');
      if (saved) setReady(true);
    } catch {}
  }, []);

  function change(key, value) { setProfile(p => ({ ...p, [key]: value })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Registration could not be completed.');
      localStorage.setItem('pyq_student_registered', JSON.stringify(profile));
      setReady(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setSaving(false); }
  }

  if (ready) return children;
  return <main className="registration-shell">
    <div className="registration-glow one" /><div className="registration-glow two" />
    <section className="registration-card">
      <div className="registration-brand">✦ PYQ <span>Predictor</span></div>
      <div className="registration-eyebrow">STUDENT ACCESS</div>
      <h1>Welcome to your <em>PYQ intelligence lab.</em></h1>
      <p>Tell us a little about yourself to unlock personalized exam preparation.</p>
      <form onSubmit={submit}>
        <div className="registration-grid">
          {fields.map(([key, label, placeholder]) => <label key={key}>{label}<input required type={key === 'email' ? 'email' : 'text'} value={profile[key]} placeholder={placeholder} onChange={e => change(key, e.target.value)} /></label>)}
        </div>
        {error && <div className="registration-error">{error}</div>}
        <button disabled={saving} type="submit">{saving ? 'Saving your details…' : 'Continue to PYQ Predictor →'}</button>
      </form>
      <small>🔒 Your information is used to personalize your experience and improve the service.</small>
    </section>
  </main>;
}
