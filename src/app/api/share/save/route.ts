import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { shareStorage, SharedConfiguration } from '@/lib/shareStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== SHARE SAVE REQUEST ===');
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    if (!body || !body.partsList || !Array.isArray(body.partsList)) {
      return NextResponse.json(
        { error: 'Invalid request: missing partsList' },
        { status: 400 }
      );
    }
    
    // Generate unique ID for the shared configuration
    const shareId = uuidv4();
    
    // Store the configuration with timestamp
    const sharedConfig: SharedConfiguration = {
      id: shareId,
      partsList: body.partsList,
      totalPriceDetails: body.totalPriceDetails,
      totalTurnaround: body.totalTurnaround,
      isEngravingEnabled: body.isEngravingEnabled,
      createdAt: new Date().toISOString(),
      // Optional: Add expiration date (e.g., 30 days)
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    await shareStorage.save(sharedConfig);
    
    // Generate the share URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const shareUrl = `${baseUrl}/share/${shareId}`;
    
    console.log('Generated share URL:', shareUrl);
    console.log('=== SHARE SAVE SUCCESS ===');
    
    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
      expiresAt: sharedConfig.expiresAt
    });
    
  } catch (error) {
    console.error('=== SHARE SAVE ERROR ===');
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

export async function GET() {
  // Return stats about shared configurations
  const stats = await shareStorage.getStats();
  return NextResponse.json({
    ...stats,
    message: 'Share save endpoint is working'
  });
} 