import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Registration uses the project's public Supabase credentials. RLS on the
// students table permits INSERT only, so these credentials cannot expose or
// modify existing student records.
const SUPABASE_URL = 'https://mvajgodvlpcgbzurvnvr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhYmFzZSIsInJlZiI6Im12YWpnb2R2bHBjZ2J6dXJ2bnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTE5MzMsImV4cCI6MjEwMjEyNzkzM30.Lr2XJXoGs9ElAU8x8DcgiYngYEcG-JjE9BtMuuEOLYo';

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
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111827">
          <h2 style="margin-bottom:8px">🎓 New student registration</h2>
          <p style="color:#4b5563">A student has registered on PYQ Predictor.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:18px">${rows}</table>
        </div>`,
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

    const student = { full_name, email, course, state, college };
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from('students').insert(student);

    // A returning student may already exist. The registration screen should
    // still allow that student to continue without exposing or updating data.
    if (error && error.code !== '23505') {
      console.error('Student registration failed:', error.message, error.code);
      return NextResponse.json(
        { error: 'Could not save your details. Please try again.' },
        { status: 500 }
      );
    }

    // Email forwarding is best-effort: a temporary email-provider problem must
    // not stop a student from using the app after their registration is saved.
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
