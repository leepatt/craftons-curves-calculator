import { NextRequest, NextResponse } from 'next/server';
import { createSession, createDraftOrder } from '@/lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partsList, totalPriceDetails, totalTurnaround, isEngravingEnabled } = body;

    // Basic validation
    if (!partsList || !Array.isArray(partsList) || partsList.length === 0 || !totalPriceDetails) {
      return NextResponse.json({ error: 'Invalid request: missing required configuration data.' }, { status: 400 });
    }

    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('SHOPIFY_ADMIN_ACCESS_TOKEN is not set.');
      return NextResponse.json({ error: 'Server configuration error: Missing access token.' }, { status: 500 });
    }

    // Prepare data for saving
    const configurationData = {
      partsList,
      totalPriceDetails,
      totalTurnaround,
      isEngravingEnabled,
      createdAt: new Date().toISOString(),
    };

    // Create a Shopify session
    const session = createSession(accessToken);

    // Save configuration as a draft order
    console.log('Creating draft order with data:', JSON.stringify(configurationData, null, 2));
    const result = await createDraftOrder(session, configurationData);
    console.log('Draft order result:', JSON.stringify(result, null, 2));

    if (result && result.draft_order && result.draft_order.id) {
      return NextResponse.json({
        success: true,
        configurationId: result.draft_order.id.toString(),
        details: 'Configuration saved successfully as draft order.',
      });
    }

    if (result && Array.isArray(result.draft_orders) && result.draft_orders.length > 0) {
      const draftOrder = result.draft_orders[0];
      if (draftOrder && draftOrder.id) {
        return NextResponse.json({
          success: true,
          configurationId: draftOrder.id.toString(),
          details: 'Configuration saved successfully as draft order.',
        });
      }
    }

    console.error('Invalid Shopify response structure:', result);
    return NextResponse.json({ error: 'Failed to save configuration: Invalid response from Shopify.' }, { status: 500 });
  } catch (error) {
    console.error('Error in save-configuration:', error);
    console.error('Error details:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Failed to save configuration.', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 