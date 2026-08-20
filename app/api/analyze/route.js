import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert exam analyst who studies previous year question papers (PYQs) for Indian school, college and competitive exams, and predicts likely future papers.
Given a set of PYQs with class/grade, subject and batch/module, do three things:
1. Produce ONE predicted question paper in the typical format for that subject/level (sections, marks, total marks, duration), using patterns from the given PYQs plus your own knowledge of the subject's exam conventions.
2. Group ALL given questions by topic.
3. Rank the questions most likely to reappear, with a short reason.

Respond with ONLY valid JSON matching exactly this schema:
{"subject_summary":"2-3 sentence summary of patterns you noticed","predicted_paper":{"title":"string","total_marks":number,"duration":"string e.g. 3 Hours","general_instructions":["string"],"sections":[{"name":"string","instructions":"string, brief","questions":[{"number":number,"text":"string","marks":number}]}]},"topic_wise":[{"topic":"string","question_count":number,"questions":["string"]}],"highly_predicted":[{"question":"string","topic":"string","confidence":"Very High|High|Medium","reason":"string, max 20 words"}]}

Keep the paper realistic in length for the subject and level. Output must be valid parseable JSON and nothing else.`;

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
    console.error('History fetch error:', err);
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(request) {
  try {
    let classGrade = '';
    let subject = '';
    let batch = '';
    let pyqText = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      classGrade = String(form.get('classGrade') || '').trim();
      subject = String(form.get('subject') || '').trim();
      batch = String(form.get('batch') || '').trim();

      const file = form.get('pdf');
      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        if (file.type !== 'application/pdf') {
          return NextResponse.json({ error: 'Please upload a PDF file.' }, { status: 400 });
        }
        if (file.size > 4 * 1024 * 1024) {
          return NextResponse.json({ error: 'PDF is too large. Please use a PDF smaller than 4 MB.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const parsedPdf = await pdfParse(buffer);
        pyqText = (parsedPdf.text || '').trim();

        if (!pyqText) {
          return NextResponse.json({
            error: 'I could not extract readable text from this PDF. Try a text-based PDF or paste the questions manually.'
          }, { status: 422 });
        }
      }

      pyqText = String(form.get('pyqText') || pyqText).trim();
    } else {
      const body = await request.json();
      classGrade = (body.classGrade || '').trim();
      subject = (body.subject || '').trim();
      batch = (body.batch || '').trim();
      pyqText = (body.pyqText || '').trim();
    }

    if (!pyqText) {
      return NextResponse.json({ error: 'Upload a PYQ PDF or paste at least a few previous year questions.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY. Add it in Vercel project settings.' }, { status: 500 });
    }

    const userPrompt = `Class/Grade: ${classGrade || 'Not specified'}\nSubject: ${subject || 'Not specified'}\nBatch/Module: ${batch || 'Not specified'}\n\nPrevious year questions extracted from the user's input/PDF:\n${pyqText}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json({ error: 'The AI engine could not be reached. Please try again.' }, { status: 502 });
    }

    const data = await geminiRes.json();
    const text = (data.candidates || [])
      .flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || '')
      .join('')
      .trim();

    if (!text) {
      return NextResponse.json({ error: 'The AI engine returned an empty response.' }, { status: 502 });
    }

    let clean = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('Could not parse AI response.');
      parsed = JSON.parse(clean.slice(start, end + 1));
    }

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

      if (dbError) {
        console.error('Supabase insert failed:', dbError.message);
      } else {
        sessionId = inserted.id;
      }
    }

    return NextResponse.json({ result: parsed, sessionId });
  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json({ error: err.message || 'Something went wrong.' }, { status: 500 });
  }
}
