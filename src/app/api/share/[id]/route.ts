import { NextRequest, NextResponse } from 'next/server';
import { shareStorage } from '@/lib/shareStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    
    console.log('=== SHARE RETRIEVE REQUEST ===');
    console.log('Share ID:', shareId);
    
    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }
    
    // Get the shared configuration
    const sharedConfig = await shareStorage.get(shareId);
    
    if (!sharedConfig) {
      return NextResponse.json(
        { error: 'Shared configuration not found or expired' },
        { status: 404 }
      );
    }
    
    console.log('Retrieved shared configuration:', sharedConfig);
    console.log('=== SHARE RETRIEVE SUCCESS ===');
    
    return NextResponse.json({
      success: true,
      sharedConfig
    });
    
  } catch (error) {
    console.error('=== SHARE RETRIEVE ERROR ===');
    console.error('Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 