import { NextResponse } from 'next/server';
import { APP_CONFIG } from '../../lib/config';

export async function GET() {
  try {
    return NextResponse.json(APP_CONFIG.materials);
  } catch (error) {
    console.error('Materials API error:', error);
    return NextResponse.json({ error: 'Failed to load materials' }, { status: 500 });
  }
} 