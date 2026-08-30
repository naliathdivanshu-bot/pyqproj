'use client';

import { useEffect, useMemo, useState } from 'react';

const ANALYSIS_STEPS = [
  'Reading your PYQ data…',
  'Extracting topics and recurring concepts…',
  'Comparing patterns across questions…',
  'Ranking high-probability questions…',
  'Generating your predicted paper…',
];

export default function Home() {
  const [classGrade, setClassGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [batch, setBatch] = useState('');
  const [pyqText, setPyqText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analysisStep, setAnalysisStep] = useState(0);
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) { setAnalysisStep(0); return; }
    const timer = window.setInterval(() => setAnalysisStep(s => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 950);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function handleGenerate() {
    if (!pyqText.trim() && !pdfFile) {
      setError('Upload a PYQ PDF or paste at least a few previous year questions.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      let res;
      if (pdfFile) {
        const formData = new FormData();
        formData.append('classGrade', classGrade);
        formData.append('subject', subject);
        formData.append('batch', batch);
        formData.append('pdf', pdfFile);
        if (pyqText.trim()) formData.append('pyqText', pyqText);
        res = await fetch('/api/analyze', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classGrade, subject, batch, pyqText }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setResult(data.result);
      setActiveTab('dashboard');
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.message || 'Could not generate predictions right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setClassGrade(''); setSubject(''); setBatch(''); setPyqText('');
    setPdfFile(null); setResult(null); setError(''); setActiveTab('dashboard');
  }

  return <>
    {intro && <div className="intro-screen" aria-label="Loading PYQ Predictor">
      <div className="intro-stars" />
      <div className="intro-shards"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="intro-ring ring-a" /><div className="intro-ring ring-b" /><div className="intro-ring ring-c" />
      <div className="intro-core"><span>✦</span></div><div className="intro-flash" />
      <div className="intro-wordmark"><b>PYQ</b> Predictor</div>
    </div>}

    <div className={'wrap ' + (intro ? 'site-loading' : 'site-ready')}>
      <nav className="nav">
        <div className="brand">✦ PYQ <span>Predictor</span></div>
        <div className="nav-links"><a href="#analyze">Analyze</a><a href="#how">How it works</a><a href="#results">Predictions</a></div>
        <div className="nav-actions"><a className="nav-cta" href="#analyze">Get Started</a></div>
      </nav>

      <section className="hero">
        <div className="orb one" /><div className="orb two" />
        <div className="tag t1">📐 MATHEMATICS</div><div className="tag t2">⚛ PHYSICS</div><div className="tag t3">&lt;/&gt; DATA STRUCTURES</div>
        <div className="tag t4">⌘ PROGRAMMING</div><div className="tag t5">⚗ CHEMISTRY</div><div className="tag t6">▥ ENGINEERING MATHS</div>
        <div className="hero-inner">
          <div className="eyebrow">✦ AI-Powered PYQ Analysis</div>
          <h1>Predict. Prepare.<span>Perform.</span></h1>
          <p>Upload your previous year question papers and let AI analyze patterns, important topics and predict your next exam paper.</p>
          <a className="hero-btn" href="#analyze">☁ Analyze Your PYQs</a>
          <div className="trust">♢ Secure • Private • AI Powered</div>
        </div>
      </section>

      <section id="analyze" className="app-section">
        <div className="app-card">
          <h2 className="section-title">Your PYQ Analysis Lab</h2>
          <p className="section-sub">Give the AI enough previous-year questions to discover the patterns.</p>
          <div className="field-row">
            <div className="field"><label htmlFor="classGrade">Class / Grade</label><input id="classGrade" type="text" placeholder="e.g. B.Tech 2nd Year" value={classGrade} onChange={e => setClassGrade(e.target.value)} /></div>
            <div className="field"><label htmlFor="subject">Subject</label><input id="subject" type="text" placeholder="e.g. Engineering Mathematics" value={subject} onChange={e => setSubject(e.target.value)} /></div>
            <div className="field"><label htmlFor="batch">Batch / Module</label><input id="batch" type="text" placeholder="Optional" value={batch} onChange={e => setBatch(e.target.value)} /></div>
          </div>

          <div className="upload-box">
            <div className="upload-head">
              <div><div className="upload-title">📄 Upload your PYQ PDF</div><div className="upload-sub">Text PDFs and scanned/image PDFs supported with AI OCR · maximum 4 MB</div></div>
              <label className="file-button" htmlFor="pdfFile">Choose PDF</label>
            </div>
            <input id="pdfFile" type="file" accept="application/pdf,.pdf" onChange={e => { setError(''); setPdfFile(e.target.files?.[0] || null); }} hidden />
            {pdfFile && <div className="file-selected"><span>📎 {pdfFile.name}</span><button className="remove-file" type="button" onClick={() => setPdfFile(null)}>Remove</button></div>}
          </div>

          <div className="paste-divider"><span>OR PASTE QUESTIONS MANUALLY</span></div>
          <div className="field"><label htmlFor="pyqText">Previous year questions</label><textarea id="pyqText" placeholder={'One question per line. Add the year in [brackets] if you know it, e.g.\n[2025] Find the Fourier series of f(x) = x.\n[2024] Solve the differential equation dy/dx + 2y = e^(-x).'} value={pyqText} onChange={e => setPyqText(e.target.value)} /></div>

          <div className="actions">
            <button className="btn-primary" onClick={handleGenerate} disabled={loading}>{loading ? 'Analyzing…' : '✦ Analyze & Predict'}</button>
            <button className="btn-ghost" onClick={handleReset} disabled={loading}>Start Over</button>
          </div>

          {loading && <AnalysisProgress step={analysisStep} />}
          {error && <div className="error-box">{error}</div>}
        </div>
      </section>

      <section id="how" className="steps"><h2 className="section-title">How PYQ Predictor Works</h2><p className="section-sub">From old question papers to smarter preparation in four steps.</p><div className="steps-grid">
        <div className="step"><div className="step-icon">📄</div><h3>1. Upload PYQs</h3><p>Upload PDFs or paste questions manually.</p></div>
        <div className="step"><div className="step-icon">🧠</div><h3>2. AI Analysis</h3><p>Patterns, topics and question trends are analyzed.</p></div>
        <div className="step"><div className="step-icon">◔</div><h3>3. Insights Generated</h3><p>See topic importance and recurring concepts.</p></div>
        <div className="step"><div className="step-icon">🎯</div><h3>4. Predicted Paper</h3><p>Receive an AI-generated predicted question paper.</p></div>
      </div></section>

      {result && <section id="results" className="results">
        <h2 className="section-title">Your Prediction Intelligence</h2>
        <p className="section-sub">A clear breakdown of patterns detected across your PYQs.</p>
        <div className="tabs">
          <button className={'tab-btn ' + (activeTab === 'dashboard' ? 'active' : '')} onClick={() => setActiveTab('dashboard')}>✦ Analysis Dashboard</button>
          <button className={'tab-btn ' + (activeTab === 'paper' ? 'active' : '')} onClick={() => setActiveTab('paper')}>Predicted Paper</button>
          <button className={'tab-btn ' + (activeTab === 'topics' ? 'active' : '')} onClick={() => setActiveTab('topics')}>Topic-wise</button>
          <button className={'tab-btn ' + (activeTab === 'highly' ? 'active' : '')} onClick={() => setActiveTab('highly')}>Highly Predicted</button>
        </div>
        <div className="tab-panel">
          <div hidden={activeTab !== 'dashboard'}><DashboardTab result={result} subject={subject} /></div>
          <div hidden={activeTab !== 'paper'}><PredictedPaperTab result={result} /></div>
          <div hidden={activeTab !== 'topics'}><TopicsTab result={result} /></div>
          <div hidden={activeTab !== 'highly'}><HighlyPredictedTab result={result} /></div>
        </div>
      </section>}

      <section className="stats"><div className="stat"><b>AI</b><span>Pattern Analysis</span></div><div className="stat"><b>PDF</b><span>OCR Supported</span></div><div className="stat"><b>24/7</b><span>Study Assistant</span></div><div className="stat"><b>∞</b><span>Questions to Analyze</span></div></section>
      <footer>AI-generated predictions are based on the PYQs you provide. Always cross-check important topics with your official syllabus.</footer>
    </div>
  </>;
}

function AnalysisProgress({ step }) {
  const progress = ((step + 1) / ANALYSIS_STEPS.length) * 100;
  return <div className="analysis-progress">
    <div className="analysis-progress-head"><span>AI ANALYSIS IN PROGRESS</span><b>{Math.round(progress)}%</b></div>
    <div className="analysis-progress-bar"><i style={{ width: `${progress}%` }} /></div>
    <div className="analysis-step-list">{ANALYSIS_STEPS.map((text, i) => <div key={text} className={'analysis-step ' + (i < step ? 'done' : i === step ? 'current' : '')}><span>{i < step ? '✓' : i === step ? '✦' : '○'}</span>{text}</div>)}</div>
  </div>;
}

function DashboardTab({ result, subject }) {
  const topics = result.topic_wise || [];
  const highly = result.highly_predicted || [];
  const totalQuestions = topics.reduce((sum, t) => sum + Number(t.question_count ?? (t.questions || []).length ?? 0), 0);
  const topTopics = [...topics].sort((a, b) => Number(b.question_count ?? (b.questions || []).length) - Number(a.question_count ?? (a.questions || []).length)).slice(0, 6);
  const veryHigh = highly.filter(x => String(x.confidence).toLowerCase().includes('very high')).length;
  const high = highly.filter(x => String(x.confidence).toLowerCase() === 'high').length;
  const confidence = Math.min(96, Math.max(55, 62 + Math.min(20, topics.length * 3) + Math.min(14, highly.length * 2)));
  const max = Math.max(...topTopics.map(t => Number(t.question_count ?? (t.questions || []).length) || 0), 1);

  return <div className="dashboard">
    <div className="dash-hero">
      <div><span className="dash-kicker">AI EXAM INTELLIGENCE</span><h3>{subject || 'Your Subject'} Analysis</h3><p>{result.subject_summary || 'AI analyzed the uploaded PYQs and detected recurring topics and likely exam patterns.'}</p></div>
      <div className="confidence-card"><span>ANALYSIS CONFIDENCE</span><strong>{confidence}%</strong><small>Based on pattern coverage</small></div>
    </div>

    <div className="metric-grid">
      <Metric label="Topics Detected" value={topics.length || '—'} icon="◈" />
      <Metric label="Questions Analyzed" value={totalQuestions || '—'} icon="◌" />
      <Metric label="High-Priority" value={veryHigh + high || highly.length || '—'} icon="↗" />
      <Metric label="Predicted Questions" value={highly.length || '—'} icon="✦" />
    </div>

    <div className="dash-grid">
      <div className="dash-card topic-frequency"><div className="dash-card-head"><div><span>TOPIC INTELLIGENCE</span><h4>Most recurring topics</h4></div><b>{topics.length} topics</b></div>
        {topTopics.length ? topTopics.map((t, i) => { const count = Number(t.question_count ?? (t.questions || []).length) || 0; return <div className="frequency-row" key={t.topic || i}><div className="frequency-label"><span>{i + 1}. {t.topic || 'Topic'}</span><b>{count}×</b></div><div className="frequency-track"><i style={{ width: `${Math.max(8, (count / max) * 100)}%` }} /></div></div>; }) : <p className="empty-insight">No topic frequency data available yet.</p>}
      </div>

      <div className="dash-card priority-card"><div className="dash-card-head"><div><span>PREDICTION SIGNALS</span><h4>Priority breakdown</h4></div></div>
        <div className="priority-list">
          <div><span className="priority-dot very" />Very High <b>{veryHigh}</b></div>
          <div><span className="priority-dot high" />High <b>{high}</b></div>
          <div><span className="priority-dot medium" />Medium <b>{Math.max(0, highly.length - veryHigh - high)}</b></div>
        </div>
        <div className="study-tip"><span>✦ STUDY SIGNAL</span><p>Prioritize recurring topics first, then use the highly predicted list for focused revision.</p></div>
      </div>
    </div>

    <div className="dash-card insight-strip"><div><span>SMART RECOMMENDATION</span><h4>Start with the strongest pattern</h4></div><p>{topTopics[0]?.topic ? `${topTopics[0].topic} appears most frequently in the analyzed PYQs. Make it your first revision priority.` : 'Upload more PYQs for stronger trend detection and predictions.'}</p></div>
  </div>;
}

function Metric({ label, value, icon }) { return <div className="metric-card"><span className="metric-icon">{icon}</span><div><b>{value}</b><small>{label}</small></div></div>; }

function PredictedPaperTab({ result }) {
  const p = result.predicted_paper || {};
  return <div className="paper-sheet"><div className="paper-head"><h3>{p.title || 'Predicted Question Paper'}</h3><div className="paper-meta"><span>TIME: {p.duration || '—'}</span><span>MAX MARKS: {p.total_marks ?? '—'}</span></div></div>{result.subject_summary && <div className="summary-box">{result.subject_summary}</div>}{p.general_instructions?.length > 0 && <ol>{p.general_instructions.map((x, i) => <li key={i}>{x}</li>)}</ol>}{(p.sections || []).map((sec, i) => <div className="section-block" key={i}><h4>{sec.name || 'Section'}</h4>{sec.instructions && <p className="section-instr">{sec.instructions}</p>}{(sec.questions || []).map((q, j) => <div className="q-row" key={j}><span className="q-num">Q{q.number ?? ''}.</span><span className="q-text">{q.text}</span><span className="q-marks">[{q.marks ?? '—'}]</span></div>)}</div>)}</div>;
}

function TopicsTab({ result }) {
  const topics = result.topic_wise || [];
  if (!topics.length) return <p>No topic breakdown available.</p>;
  return topics.map((t, i) => <details className="topic-card" key={i} open={i === 0}><summary>{t.topic || 'Topic'} <span>{t.question_count ?? (t.questions || []).length} Qs</span></summary><ul className="topic-q-list">{(t.questions || []).map((q, j) => <li key={j}>{q}</li>)}</ul></details>);
}

function HighlyPredictedTab({ result }) {
  const items = result.highly_predicted || [];
  if (!items.length) return <p>No highly predicted questions available.</p>;
  return items.map((it, i) => <div className="predict-card" key={i}><div className="predict-top"><div className="predict-q">{it.question}</div><div className="confidence-badge">{it.confidence || 'Medium'}</div></div>{it.reason && <div className="predict-reason">{it.reason}</div>}{it.topic && <span className="topic-pill">{it.topic}</span>}</div>);
}

function ExtraStyles() { return null; }
