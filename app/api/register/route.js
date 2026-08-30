import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Registration uses the project's public Supabase credentials. RLS on the
// students table permits INSERT only, so these credentials cannot expose or
// modify existing student records.
const SUPABASE_URL = 'https://mvajgodvlpcgbzurvnvr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12YWpnb2R2bHBjZ2J6dXJ2bnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTE5MzMsImV4cCI6MjEwMjEyNzkzM30.Lr2XJXoGs9ElAU8x8DcgiYngYEcG-JjE9BtMuuEOLYo';

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase
      .from('students')
      .insert({ full_name, email, course, state, college });

    // A returning student may already exist. The registration screen should
    // still allow that student to continue without exposing or updating data.
    if (error && error.code !== '23505') {
      console.error('Student registration failed:', error.message, error.code);
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
