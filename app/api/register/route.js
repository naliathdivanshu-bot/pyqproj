import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !supabaseKey) {
      console.error('Supabase registration is not configured: missing URL or key.');
      return NextResponse.json({ error: 'Registration service is not configured.' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, supabaseKey, {
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
