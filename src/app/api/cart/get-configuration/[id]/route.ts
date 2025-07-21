import { NextRequest, NextResponse } from 'next/server';
import { createSession, getDraftOrder } from '@/lib/shopify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, params is a Promise that needs to be awaited
    const { id: draftOrderId } = await params; 

    if (!draftOrderId) {
      return NextResponse.json({ error: 'Invalid Configuration ID format.' }, { status: 400 });
    }

    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('SHOPIFY_ADMIN_ACCESS_TOKEN is not set.');
      return NextResponse.json({ error: 'Server configuration error: Missing access token.' }, { status: 500 });
    }

    // Create a Shopify session
    const session = createSession(accessToken);

    // Fetch the draft order
    const result = await getDraftOrder(session, draftOrderId);

    if (result && result.draft_order) {
      const draftOrder = result.draft_order;
      
      // Extract configuration data from the line item properties
      const configurationProperty = draftOrder.line_items?.[0]?.properties?.find(
        (prop: { name: string; value: string }) => prop.name === '_configuration_data'
      );

      if (configurationProperty && configurationProperty.value) {
        try {
          const configuration = JSON.parse(configurationProperty.value);
          return NextResponse.json({
            success: true,
            configuration: configuration,
            details: 'Configuration retrieved successfully.',
          });
        } catch (parseError) {
          console.error('Error parsing configuration data:', parseError);
          return NextResponse.json({ error: 'Invalid configuration data format.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Configuration data not found in draft order.' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'Draft order not found.' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error in get-configuration:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration.', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}