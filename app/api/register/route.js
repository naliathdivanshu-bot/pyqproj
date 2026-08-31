import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Registration uses this project's public Supabase API credentials. The table
// is protected by RLS and only permits INSERT for the anon role.
const SUPABASE_URL = 'https://mvajgodvlpcgbzurvnvr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yqKpbo4mqCSYWrQe0f2vKA__8UZ-r5U';

export async function POST(request) {
  try {
    const body = await request.json();
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase
      .from('students')
      .insert({ full_name, email, course, state, college });

    // A returning student may already exist. Allow them to continue without
    // exposing or updating the existing record.
    if (error && error.code !== '23505') {
      console.error('Student registration failed:', error.message, error.code, error.details);
      return NextResponse.json(
        { error: 'Could not save your details. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration request failed:', error);
    return NextResponse.json({ error: 'Invalid registration request.' }, { status: 400 });
  }
}
