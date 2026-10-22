import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getRegistrationClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

  // Accept standard email addresses, including university domains such as user@gkv.ac.in.
  // Keep this intentionally simple; detailed mailbox verification is not possible here.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const supabase = getRegistrationClient();
  if (!supabase) {
    console.error('Student registration unavailable: Supabase URL/key is missing.');
    return NextResponse.json(
      { error: 'Registration setup is incomplete. Please contact the project administrator.' },
      { status: 503 }
    );
  }

  try {
    const { error } = await supabase.from('students').insert({
      full_name,
      email,
      course,
      state,
      college,
    });

    // Existing email means this student has already registered; allow them to continue.
    if (error?.code === '23505') {
      return NextResponse.json({ success: true, alreadyRegistered: true });
    }

    if (error) {
      console.error('Student registration failed:', {
        code: error.code || null,
        message: error.message || null,
      });
      return NextResponse.json(
        { error: 'Could not save your details. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, alreadyRegistered: false });
  } catch (error) {
    console.error('Student registration request failed:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      causeCode: error?.cause?.code || null,
    });
    return NextResponse.json(
      { error: 'Registration service could not be reached. Please try again.' },
      { status: 503 }
    );
  }
}
