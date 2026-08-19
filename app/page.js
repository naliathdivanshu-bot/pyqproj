'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [classGrade, setClassGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('');
  const [pyqText, setPyqText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('paper');
  const [formCode, setFormCode] = useState('0000');

  useEffect(() => {
    setFormCode(String(Math.floor(1000 + Math.random() * 8999)));
  }, []);

  async function handleGenerate() {
    if (!pyqText.trim()) {
      setError('Paste at least a few previous year questions before analyzing.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classGrade, subject, batch, pyqText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }
      setResult(data.result);
      setActiveTab('paper');
    } catch (err) {
      setError(err.message || 'Could not generate predictions right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setClassGrade('');
    setSubject('');
    setBatch('');
    setPyqText('');
    setResult(null);
    setError('');
  }

  return (
    <div className="wrap">
      <div className="masthead">
        <span className="code">{formCode}</span>
        <h1>PYQ Predictor</h1>
        <p>Paste previous year questions · get an AI-predicted paper</p>
        {result && (
          <div>
            <span className="stamp">Analysis Complete</span>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Question paper details</h2>
        <div className="field-row">
          <div>
            <label htmlFor="classGrade">Class / Grade</label>
            <input
              type="text"
              id="classGrade"
              placeholder="e.g. Class 10, B.Sc 2nd Year"
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              placeholder="e.g. Physics, Data Structures"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="batch">Batch / Module (optional)</label>
            <input
              type="text"
              id="batch"
              placeholder="e.g. Batch 2026, Module 4"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="pyqText">Paste previous year questions</label>
          <textarea
            id="pyqText"
            placeholder={
              'One question per line. Add the year in [brackets] if you know it, e.g.\n[2023] State and explain Newton\'s second law of motion.\n[2022] Derive the equation of motion for uniform acceleration.'
            }
            value={pyqText}
            onChange={(e) => setPyqText(e.target.value)}
          />
          <div className="hint">More years and questions you paste in, the more accurate the prediction.</div>
        </div>
        <div className="actions">
          <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze & Predict'}
          </button>
          <button className="btn-ghost" onClick={handleReset}>
            Start over
          </button>
          {loading && (
            <div className="status-box">
              <span className="spinner"></span> Analyzing patterns across your PYQs…
            </div>
          )}
        </div>
        {error && <div className="error-box">{error}</div>}
      </div>

      {result && (
        <div>
          <div className="tabs" role="tablist">
            <button
              className={'tab-btn' + (activeTab === 'paper' ? ' active' : '')}
              onClick={() => setActiveTab('paper')}
            >
              Predicted Paper
            </button>
            <button
              className={'tab-btn' + (activeTab === 'topics' ? ' active' : '')}
              onClick={() => setActiveTab('topics')}
            >
              Topic-wise
            </button>
            <button
              className={'tab-btn' + (activeTab === 'highly' ? ' active' : '')}
              onClick={() => setActiveTab('highly')}
            >
              Highly Predicted
            </button>
          </div>

          <div className="tab-panel" hidden={activeTab !== 'paper'}>
            <PredictedPaperTab result={result} />
          </div>
          <div className="tab-panel" hidden={activeTab !== 'topics'}>
            <TopicsTab result={result} />
          </div>
          <div className="tab-panel" hidden={activeTab !== 'highly'}>
            <HighlyPredictedTab result={result} />
          </div>
        </div>
      )}

      <footer>
        AI-generated predictions based on patterns in the PYQs you provide — always cross-check with your syllabus
        before relying on it.
      </footer>
    </div>
  );
}

function PredictedPaperTab({ result }) {
  const p = result.predicted_paper || {};
  const sections = p.sections || [];
  return (
    <div className="paper-sheet">
      <div className="paper-head">
        <h3>{p.title || 'Predicted Question Paper'}</h3>
        <div className="paper-meta">
          <span>TIME: {p.duration || '—'}</span>
          <span>MAX MARKS: {p.total_marks ?? '—'}</span>
        </div>
      </div>
      {result.subject_summary && <div className="summary-box">{result.subject_summary}</div>}
      {p.general_instructions && p.general_instructions.length > 0 && (
        <ol className="instructions">
          {p.general_instructions.map((instr, i) => (
            <li key={i}>{instr}</li>
          ))}
        </ol>
      )}
      {sections.map((sec, sIdx) => (
        <div className="section-block" key={sIdx}>
          <h4>{sec.name || 'Section'}</h4>
          {sec.instructions && <div className="section-instr">{sec.instructions}</div>}
          {(sec.questions || []).map((q, qIdx) => (
            <div className="q-row" key={qIdx}>
              <span className="q-num">Q{q.number ?? ''}.</span>
              <span className="q-text">{q.text}</span>
              <span className="q-marks">[{q.marks ?? '—'}]</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TopicsTab({ result }) {
  const topics = result.topic_wise || [];
  if (!topics.length) return <p>No topic breakdown available.</p>;
  return (
    <>
      {topics.map((t, idx) => (
        <details className="topic-card" key={idx} open={idx === 0}>
          <summary>
            <span>{t.topic || 'Topic'}</span>
            <span className="topic-count">{t.question_count ?? (t.questions || []).length} Qs</span>
          </summary>
          <ul className="topic-q-list">
            {(t.questions || []).map((q, qi) => (
              <li key={qi}>{q}</li>
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}

function HighlyPredictedTab({ result }) {
  const items = result.highly_predicted || [];
  if (!items.length) return <p>No highly predicted questions available.</p>;
  return (
    <>
      {items.map((it, idx) => {
        const confKey = (it.confidence || '').toLowerCase().replace(/\s+/g, '');
        const confClass = confKey === 'veryhigh' ? 'conf-veryhigh' : confKey === 'high' ? 'conf-high' : 'conf-medium';
        return (
          <div className="predict-card" key={idx}>
            <div className="predict-top">
              <div className="predict-q">{it.question}</div>
              <div className={'confidence-badge ' + confClass}>{it.confidence || 'Medium'}</div>
            </div>
            {it.reason && <div className="predict-reason">{it.reason}</div>}
            {it.topic && <span className="topic-pill">{it.topic}</span>}
          </div>
        );
      })}
    </>
  );
}
