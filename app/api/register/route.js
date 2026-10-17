import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function isServiceUnavailable(error) {
  const message = String(error?.message || '');
  return error?.cause?.code === 'ENOTFOUND' || /(?:fetch failed|ENOTFOUND|network)/i.test(message);
}

function unavailableResponse() {
  return NextResponse.json(
    { error: 'Registration is temporarily unavailable. Please try again in a moment.' },
    { status: 503 }
  );
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid registration request.' }, { status: 400 });
  }

  const full_name = String(body.full_name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const course = String(body.course || '').trim();
  const state = String(body.state || '').trim();
  const college = String(body.college || '').trim();

  if (!full_name || !email || !course || !state || !college) {
    return NextResponse.json({ error: 'Please complete all fields.' }, { status: 400 });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('Student registration unavailable: Supabase server configuration is missing.');
    return unavailableResponse();
  }

  try {
    const { error } = await supabase
      .from('students')
      .insert({ full_name, email, course, state, college });

    // A returning student may already exist. Allow them to continue without
    // exposing or updating the existing record.
    if (error && error.code !== '23505') {
      const unavailable = isServiceUnavailable(error);
      console.error('Student registration failed', {
        code: error.code || null,
        unavailable,
      });
      return unavailable
        ? unavailableResponse()
        : NextResponse.json(
            { error: 'Could not save your details. Please try again.' },
            { status: 500 }
          );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const unavailable = isServiceUnavailable(error);
    console.error('Student registration request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      unavailable,
    });
    return unavailable
      ? unavailableResponse()
      : NextResponse.json(
          { error: 'Could not save your details. Please try again.' },
          { status: 500 }
        );
  }
}
