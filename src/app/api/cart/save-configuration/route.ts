import { NextRequest, NextResponse } from 'next/server';
import { createSession, createMetaobject } from '@/lib/shopify';

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

    // Prepare the metaobject for creation
    const metaobjectPayload = {
      type: 'custom_curve_configuration',
      fields: [
        {
          key: 'configuration_data',
          value: JSON.stringify(configurationData),
        }
      ]
    };

    const response = await createMetaobject(session, metaobjectPayload);

    if (response && response.metaobject) {
      // The ID we need for the cart is the GID (GraphQL ID)
      const configurationId = response.metaobject.id;
      return NextResponse.json({ success: true, configurationId: configurationId });
    } else {
      console.error('Failed to create metaobject, response:', response);
      throw new Error('Failed to save configuration to Shopify.');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/cart/save-configuration:', error);
    return NextResponse.json({ error: 'Failed to save configuration.', details: errorMessage }, { status: 500 });
  }
} 