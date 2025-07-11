import { NextResponse } from 'next/server';
import { APP_CONFIG } from '../../lib/config';

export async function GET() {
  try {
    return NextResponse.json(APP_CONFIG.product);
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
  }
} 