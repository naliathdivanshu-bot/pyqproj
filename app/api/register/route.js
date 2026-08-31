import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendRegistrationEmail(student) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.REGISTRATION_EMAIL_TO;
  const from = process.env.REGISTRATION_EMAIL_FROM || 'PYQ Predictor <onboarding@resend.dev>';

  if (!apiKey || !recipient) {
    console.warn('Registration email is not configured: missing RESEND_API_KEY or REGISTRATION_EMAIL_TO.');
    return { sent: false, configured: false };
  }

  const rows = [
    ['Full Name', student.full_name],
    ['Email Address', student.email],
    ['Course / Degree', student.course],
    ['State', student.state],
    ['College / University', student.college],
    ['Registered At', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
  ]
    .map(([label, value]) => `<tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:700">${escapeHtml(label)}</td><td style="padding:10px 14px;border:1px solid #e5e7eb">${escapeHtml(value)}</td></tr>`)
    .join('');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      reply_to: student.email,
      subject: `New PYQ Predictor registration — ${student.full_name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111827"><h2 style="margin-bottom:8px">🎓 New student registration</h2><p style="color:#4b5563">A student has registered on PYQ Predictor.</p><table style="width:100%;border-collapse:collapse;margin-top:18px">${rows}</table></div>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider rejected the request: ${response.status} ${details}`);
  }

  return { sent: true, configured: true };
}

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

    const student = { full_name, email, course, state, college };
    const supabase = createClient(SUPABASE_URL, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from('students').insert(student);

    if (error && error.code !== '23505') {
      console.error('Student registration failed:', error.message, error.code, error.details);
      return NextResponse.json(
        { error: 'Could not save your details. Please try again.' },
        { status: 500 }
      );
    }

    let emailForwarded = false;
    try {
      const result = await sendRegistrationEmail(student);
      emailForwarded = result.sent;
    } catch (emailError) {
      console.error('Registration saved, but email forwarding failed:', emailError);
    }

    return NextResponse.json({ success: true, emailForwarded });
  } catch (error) {
    console.error('Registration request failed:', error);
    return NextResponse.json({ error: 'Invalid registration request.' }, { status: 400 });
  }
}
