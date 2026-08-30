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

    // Support both the current public URL variable and the legacy server-only name.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase server environment variables', {
        hasUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      return NextResponse.json({ error: 'Registration service is not configured yet.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase
      .from('students')
      .upsert(
        { full_name, email, course, state, college },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Student registration failed:', error.message);
      return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration request failed:', error);
    return NextResponse.json({ error: 'Invalid registration request.' }, { status: 400 });
  }
}
