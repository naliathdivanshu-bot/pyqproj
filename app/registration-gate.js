'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const RegistrationContext = createContext(null);

const fields = [
  ['full_name', 'Full Name', 'Your full name'],
  ['email', 'Email Address', 'you@example.com'],
  ['course', 'Course / Degree', 'e.g. B.Tech CSE'],
  ['state', 'State', 'e.g. Uttar Pradesh'],
  ['college', 'College / University', 'Your college name'],
];

export function useRegistration() {
  const registration = useContext(RegistrationContext);
  if (!registration) throw new Error('useRegistration must be used inside RegistrationGate.');
  return registration;
}

export default function RegistrationGate({ children }) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState({ full_name:'', email:'', course:'', state:'', college:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pyq_student_registered');
      if (saved) setIsRegistered(true);
    } catch {}
  }, []);

  function openRegistration() {
    setError('');
    setIsOpen(true);
  }

  function closeRegistration() {
    if (!saving) setIsOpen(false);
  }

  function change(key, value) {
    setProfile(currentProfile => ({ ...currentProfile, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Registration could not be completed.');

      localStorage.setItem('pyq_student_registered', JSON.stringify(profile));
      setIsRegistered(true);
      setIsOpen(false);
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RegistrationContext.Provider value={{ isRegistered, openRegistration }}>
      {children}
      {isOpen && (
        <div
          className="registration-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-title"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeRegistration();
          }}
        >
          <div className="registration-glow one" />
          <div className="registration-glow two" />
          <section className="registration-card">
            <button className="registration-close" type="button" aria-label="Close student details form" onClick={closeRegistration}>×</button>
            <div className="registration-brand">✦ PYQ <span>Predictor</span></div>
            <div className="registration-eyebrow">STUDENT ACCESS</div>
            <h1 id="registration-title">One quick step before your <em>AI analysis.</em></h1>
            <p>Save your details once to unlock unlimited PYQ analyses and keep your preparation personalized.</p>
            <form onSubmit={submit}>
              <div className="registration-grid">
                {fields.map(([key, label, placeholder]) => (
                  <label key={key}>
                    {label}
                    <input
                      required
                      type={key === 'email' ? 'email' : 'text'}
                      value={profile[key]}
                      placeholder={placeholder}
                      onChange={event => change(key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              {error && <div className="registration-error">{error}</div>}
              <button disabled={saving} type="submit">
                {saving ? 'Saving your details…' : 'Unlock & Analyze →'}
              </button>
            </form>
            <small>🔒 You only need to complete this once. Your current analysis will continue automatically.</small>
          </section>
        </div>
      )}
    </RegistrationContext.Provider>
  );
}
