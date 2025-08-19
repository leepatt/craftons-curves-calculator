import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { shareStorage, SharedConfiguration } from '@/lib/shareStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== SHARE SAVE REQUEST (URL-based) ===');
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
    
    // Create the configuration object
    const sharedConfig: SharedConfiguration = {
      id: shareId,
      partsList: body.partsList,
      totalPriceDetails: body.totalPriceDetails,
      totalTurnaround: body.totalTurnaround,
      isEngravingEnabled: body.isEngravingEnabled,
      isJoinerBlocksEnabled: body.isJoinerBlocksEnabled,
      appType: body.appType || 'curves', // Include app type in shared configuration
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // No database save needed - we'll encode everything in the URL!
    
    // Generate the base URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : request.headers.get('origin') || 'http://localhost:3000';
    
    // Generate the share URL with encoded data
    const shareUrl = shareStorage.encodeConfigToUrl(sharedConfig, baseUrl);
    
    console.log('Generated URL-based share URL:', shareUrl);
    console.log('=== SHARE SAVE SUCCESS (No database required!) ===');
    
    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
      expiresAt: sharedConfig.expiresAt,
      message: 'Share URL generated successfully - no login required!'
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
  return NextResponse.json({
    message: 'URL-based share save endpoint is working - no authentication required!',
    type: 'url-based-sharing',
    database: 'none'
  });
} 