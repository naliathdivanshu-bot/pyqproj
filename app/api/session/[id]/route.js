import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(request, { params }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 });
    }
    const { data, error } = await supabaseAdmin
      .from('pyq_sessions')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (err) {
    console.error('Session fetch error:', err);
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }
}
