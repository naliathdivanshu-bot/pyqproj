import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Use a known Gemini API model first, then a stable fallback.
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const SYSTEM_PROMPT = `You are an expert exam analyst who studies previous year question papers (PYQs) for Indian school, college and competitive exams, and predicts likely future papers.
Given a set of PYQs with class/grade, subject and batch/module, do three things:
1. Produce ONE predicted question paper in the typical format for that subject/level (sections, marks, total marks, duration), using patterns from the given PYQs plus your own knowledge of the subject's exam conventions.
2. Group ALL given questions by topic.
3. Rank the questions most likely to reappear, with a short reason.

Respond with ONLY valid JSON matching exactly this schema:
{"subject_summary":"2-3 sentence summary of patterns you noticed","predicted_paper":{"title":"string","total_marks":number,"duration":"string e.g. 3 Hours","general_instructions":["string"],"sections":[{"name":"string","instructions":"string, brief","questions":[{"number":number,"text":"string","marks":number}]}]},"topic_wise":[{"topic":"string","question_count":number,"questions":["string"]}],"highly_predicted":[{"question":"string","topic":"string","confidence":"Very High|High|Medium","reason":"string, max 20 words"}]}

Keep the paper realistic in length for the subject and level. Output must be valid parseable JSON and nothing else. Do not use LaTeX backslashes or other unescaped backslash characters inside JSON strings; write mathematical expressions in plain text instead.`;

const PDF_EXTRACT_PROMPT = `Extract ALL readable content from this question-paper PDF, especially every previous-year question. This may be a scanned/image-only PDF, so use visual understanding/OCR when necessary. Preserve question wording, numbering, section names, marks, and year labels when visible. Do not summarize, omit, or invent questions. Return plain text only, with one question or meaningful line per line.`;

async function geminiText(parts, generationConfig = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI service is not configured. Please contact the project administrator.');
  }

  let lastStatus = 0;
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = (data.candidates || [])
          .flatMap(candidate => candidate.content?.parts || [])
          .map(part => part.text || '')
          .join('')
          .trim();
        if (text) return text;
        lastStatus = res.status;
        console.error('Gemini returned an empty response for model:', model);
        continue;
      }

      lastStatus = res.status;
      const details = await res.text();
      console.error('Gemini API request failed:', { model, status: res.status, details: details.slice(0, 500) });
      // Try fallback for model availability, quota and transient server errors.
      if (![400, 403, 404, 429, 500, 502, 503, 504].includes(res.status)) break;
    } catch (error) {
      console.error('Gemini network request failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  if (lastStatus === 429) {
    throw new Error('The AI service is at its usage limit right now. Please wait a minute and try again.');
  }
  throw new Error('The AI service could not complete the analysis. Please try again shortly.');
}

function parseGeminiJson(text) {
  let clean = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1);

  try {
    return JSON.parse(clean);
  } catch {
    console.error('Gemini returned invalid JSON.');
    throw new Error('The AI response was not valid JSON. Please try again.');
  }
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return NextResponse.json({ sessions: [] });

    const { data, error } = await supabaseAdmin
      .from('pyq_sessions')
      .select('id, class_grade, subject, batch, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return NextResponse.json({ sessions: data });
  } catch (err) {
    console.error('History fetch error:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(request) {
  try {
    let classGrade = '';
    let subject = '';
    let batch = '';
    let pyqText = '';

    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await request.formData();
      classGrade = String(form.get('classGrade') || '').trim();
      subject = String(form.get('subject') || '').trim();
      batch = String(form.get('batch') || '').trim();

      const file = form.get('pdf');
      if (file && typeof file === 'object' && 'arrayBuffer' in file && file.size > 0) {
        if (file.type !== 'application/pdf') {
          return NextResponse.json({ error: 'Please upload a PDF file.' }, { status: 400 });
        }
        if (file.size > 4 * 1024 * 1024) {
          return NextResponse.json({ error: 'PDF is too large. Please use a PDF smaller than 4 MB.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        try {
          const parsedPdf = await pdfParse(buffer);
          pyqText = (parsedPdf.text || '').trim();
        } catch (pdfError) {
          console.warn('Normal PDF parsing failed; using Gemini PDF OCR fallback.');
        }

        if (!pyqText || pyqText.replace(/\s/g, '').length < 40) {
          pyqText = await geminiText([
            { text: PDF_EXTRACT_PROMPT },
            { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } },
          ]);
        }

        const pastedText = String(form.get('pyqText') || '').trim();
        if (pastedText) pyqText = `${pyqText}\n\nAdditional questions pasted by user:\n${pastedText}`;
      } else {
        pyqText = String(form.get('pyqText') || '').trim();
      }
    } else {
      const body = await request.json();
      classGrade = String(body.classGrade || '').trim();
      subject = String(body.subject || '').trim();
      batch = String(body.batch || '').trim();
      pyqText = String(body.pyqText || '').trim();
    }

    if (!pyqText) {
      return NextResponse.json({ error: 'Upload a PYQ PDF or paste at least a few previous year questions.' }, { status: 400 });
    }

    const userPrompt = `Class/Grade: ${classGrade || 'Not specified'}\nSubject: ${subject || 'Not specified'}\nBatch/Module: ${batch || 'Not specified'}\n\nPrevious year questions extracted from the user's input/PDF:\n${pyqText}`;
    const text = await geminiText(
      [{ text: SYSTEM_PROMPT }, { text: userPrompt }],
      { responseMimeType: 'application/json', maxOutputTokens: 4000 }
    );
    const parsed = parseGeminiJson(text);

    let sessionId = null;
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      const { data: inserted, error: dbError } = await supabaseAdmin
        .from('pyq_sessions')
        .insert({
          class_grade: classGrade || null,
          subject: subject || null,
          batch: batch || null,
          pyq_text: pyqText,
          result: parsed,
        })
        .select('id')
        .single();

      if (dbError) console.error('Supabase insert failed:', dbError.message);
      else sessionId = inserted.id;
    }

    return NextResponse.json({ result: parsed, sessionId });
  } catch (err) {
    console.error('Analyze API error:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
