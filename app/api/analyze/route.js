import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

const SYSTEM_PROMPT = `You are an expert exam analyst who studies previous year question papers (PYQs) for Indian school, college and competitive exams, and predicts likely future papers.
Given a set of PYQs with class/grade, subject and batch/module, do three things:
1. Produce ONE predicted question paper in the typical format for that subject/level (sections, marks, total marks, duration), using patterns from the given PYQs plus your own knowledge of the subject's exam conventions.
2. Group ALL given questions by topic.
3. Rank the questions most likely to reappear, with a short reason.

Respond with ONLY minified JSON (no markdown fences, no preamble) matching exactly this schema:
{"subject_summary":"2-3 sentence summary of patterns you noticed","predicted_paper":{"title":"string","total_marks":number,"duration":"string e.g. 3 Hours","general_instructions":["string"],"sections":[{"name":"string","instructions":"string, brief","questions":[{"number":number,"text":"string","marks":number}]}]},"topic_wise":[{"topic":"string","question_count":number,"questions":["string"]}],"highly_predicted":[{"question":"string","topic":"string","confidence":"Very High|High|Medium","reason":"string, max 20 words"}]}

Keep the paper realistic in length for the subject and level. Output must be valid parseable JSON and nothing else.`;

export async function GET() {
  // Returns your most recent sessions from Supabase (for a "history" list).
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ sessions: [] });
    }
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
    const body = await request.json();
    const classGrade = (body.classGrade || '').trim();
    const subject = (body.subject || '').trim();
    const batch = (body.batch || '').trim();
    const pyqText = (body.pyqText || '').trim();

    if (!pyqText) {
      return NextResponse.json({ error: 'Please paste at least a few previous year questions.' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel project settings.' }, { status: 500 });
    }

    const userPrompt = `Class/Grade: ${classGrade || 'Not specified'}\nSubject: ${subject || 'Not specified'}\nBatch/Module: ${batch || 'Not specified'}\n\nPrevious year questions:\n${pyqText}`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json({ error: 'The AI engine could not be reached. Please try again.' }, { status: 502 });
    }

    const data = await anthropicRes.json();
    const textBlock = (data.content || []).find((c) => c.type === 'text');
    if (!textBlock) {
      return NextResponse.json({ error: 'The AI engine returned an empty response.' }, { status: 502 });
    }

    let clean = textBlock.text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('Could not parse AI response.');
      parsed = JSON.parse(clean.slice(start, end + 1));
    }

    // Persist to Supabase (storage). Non-fatal if this fails.
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
