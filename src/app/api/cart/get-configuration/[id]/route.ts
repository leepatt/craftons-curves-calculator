import { NextRequest, NextResponse } from 'next/server';
import { createSession, getMetaobject } from '@/lib/shopify';

// This function will extract the numeric ID from the full GraphQL GID
function getNumericIdFromGid(gid: string): string | null {
  if (!gid || typeof gid !== 'string') {
    return null;
  }
  const match = gid.match(/Metaobject\/(\d+)$/);
  return match ? match[1] : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, params is a Promise that needs to be awaited
    const { id: metaobjectGid } = await params; 

    const numericId = getNumericIdFromGid(metaobjectGid);

    if (!numericId) {
      return NextResponse.json({ error: 'Invalid Configuration ID format.' }, { status: 400 });
    }

    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('SHOPIFY_ADMIN_ACCESS_TOKEN is not set.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const session = createSession(accessToken);

    const response = await getMetaobject(session, numericId);

    if (response && response.metaobject) {
      // The configuration is stored as a JSON string in the 'configuration_data' field.
      // We need to parse it before sending it back.
      const configurationData = JSON.parse(response.metaobject.fields[0].value);
      return NextResponse.json({ success: true, configuration: configurationData });
    } else {
      return NextResponse.json({ error: 'Configuration not found.' }, { status: 404 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in /api/cart/get-configuration:`, error);
    return NextResponse.json({ error: 'Failed to retrieve configuration.', details: errorMessage }, { status: 500 });
  }
}