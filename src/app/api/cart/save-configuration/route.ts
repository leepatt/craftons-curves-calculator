import { NextRequest, NextResponse } from 'next/server';
import { createSession, createDraftOrder } from '@/lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partsList, totalPriceDetails, totalTurnaround, isEngravingEnabled, cartItemId } = body;

    console.log('=== SAVE CONFIGURATION REQUEST START ===');
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Enhanced validation
    if (!partsList || !Array.isArray(partsList) || partsList.length === 0) {
      console.error('Invalid request: missing or empty partsList');
      return NextResponse.json({ 
        error: 'Invalid request: missing or empty parts list',
        details: 'At least one part must be configured before saving.'
      }, { status: 400 });
    }

    if (!totalPriceDetails || typeof totalPriceDetails.totalIncGST !== 'number') {
      console.error('Invalid request: missing or invalid totalPriceDetails');
      return NextResponse.json({ 
        error: 'Invalid request: missing pricing information',
        details: 'Pricing details are required for checkout creation.'
      }, { status: 400 });
    }

    // Validate pricing makes sense
    if (totalPriceDetails.totalIncGST < 0.01) {
      console.error('Invalid pricing: total too low');
      return NextResponse.json({ 
        error: 'Invalid pricing: minimum order value is $0.01',
        details: 'Please check your configuration and try again.'
      }, { status: 400 });
    }

    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('SHOPIFY_ADMIN_ACCESS_TOKEN is not set.');
      return NextResponse.json({ 
        error: 'Server configuration error: Missing access token.',
        details: 'The server is not properly configured. Please contact support.'
      }, { status: 500 });
    }

    // Prepare enhanced configuration data
    const configurationData = {
      partsList,
      totalPriceDetails,
      totalTurnaround,
      isEngravingEnabled,
      cartItemId, // Link to cart item if provided
      createdAt: new Date().toISOString(),
      // Add summary for easy reference
      summary: {
        partsCount: partsList.length,
        totalPrice: totalPriceDetails.totalIncGST,
        turnaround: totalTurnaround,
        engravingEnabled: isEngravingEnabled,
        materials: Object.entries(totalPriceDetails.sheetsByMaterial || {}).map(([matId, count]) => ({
          materialId: matId,
          sheetsNeeded: count
        }))
      },
      // Add individual part summaries for better debugging
      partsSummary: partsList.map((part, index) => ({
        partNumber: index + 1,
        config: {
          material: part.config.material,
          radiusType: part.config.radiusType,
          specifiedRadius: part.config.specifiedRadius,
          width: part.config.width,
          angle: part.config.angle
        },
        quantity: part.quantity,
        numSplits: part.numSplits,
        areaM2: part.singlePartAreaM2,
        efficiency: part.itemIdealEfficiency
      }))
    };

    console.log('Enhanced configuration data prepared:', {
      partsCount: configurationData.summary.partsCount,
      totalPrice: configurationData.summary.totalPrice,
      cartItemId: cartItemId || 'none'
    });

    // Create a Shopify session
    let session;
    try {
      session = createSession(accessToken);
      console.log('Shopify session created for shop:', session.shop);
    } catch (sessionError) {
      console.error('Failed to create Shopify session:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to connect to Shopify',
        details: 'Unable to establish connection with Shopify store.'
      }, { status: 500 });
    }

    // Save configuration as a draft order
    console.log('Creating draft order with enhanced data...');
    let result;
    try {
      result = await createDraftOrder(session, configurationData);
      console.log('Draft order creation successful:', {
        id: result?.draft_order?.id,
        status: result?.draft_order?.status,
        invoiceUrl: result?.draft_order?.invoice_url ? 'present' : 'missing'
      });
    } catch (draftOrderError) {
      console.error('Draft order creation failed:', draftOrderError);
      
      // Check for specific Shopify errors
      if (draftOrderError instanceof Error) {
        const errorMessage = draftOrderError.message.toLowerCase();
        
        if (errorMessage.includes('variant') || errorMessage.includes('product')) {
          return NextResponse.json({ 
            error: 'Product configuration error',
            details: 'The 1-cent product may not exist or be properly configured in your Shopify store.',
            suggestion: 'Please verify the product with variant ID 45300623343794 exists and is active.'
          }, { status: 422 });
        } else if (errorMessage.includes('unauthorized') || errorMessage.includes('access')) {
          return NextResponse.json({ 
            error: 'Shopify access error',
            details: 'Unable to access Shopify store. Please check API credentials.',
            suggestion: 'Verify the SHOPIFY_ADMIN_ACCESS_TOKEN is correct and has proper permissions.'
          }, { status: 401 });
        } else if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
          return NextResponse.json({ 
            error: 'Rate limit exceeded',
            details: 'Too many requests to Shopify. Please wait a moment and try again.',
            suggestion: 'Wait 30 seconds before retrying.'
          }, { status: 429 });
        }
      }
      
      return NextResponse.json({ 
        error: 'Failed to create Shopify draft order',
        details: draftOrderError instanceof Error ? draftOrderError.message : 'Unknown Shopify error',
        suggestion: 'Please try again. If the problem persists, contact support.'
      }, { status: 500 });
    }

    // Enhanced validation of Shopify response
    if (!result || !result.draft_order) {
      console.error('Invalid Shopify response structure:', result);
      return NextResponse.json({ 
        error: 'Invalid response from Shopify',
        details: 'Shopify returned an unexpected response format.',
        suggestion: 'Please try again. If the problem persists, contact support.'
      }, { status: 500 });
    }

    const draftOrder = result.draft_order;
    
    if (!draftOrder.id) {
      console.error('Draft order created but missing ID:', draftOrder);
      return NextResponse.json({ 
        error: 'Draft order creation incomplete',
        details: 'Shopify created the order but did not return a valid ID.',
        suggestion: 'Please try again or contact support.'
      }, { status: 500 });
    }

    if (!draftOrder.invoice_url) {
      console.error('Draft order created but missing invoice URL:', draftOrder);
      return NextResponse.json({ 
        error: 'Checkout URL not available',
        details: 'The order was created but the checkout link is not available.',
        suggestion: 'Please contact support with order ID: ' + draftOrder.id
      }, { status: 500 });
    }

    // Success response with enhanced details
    const successResponse = {
      success: true,
      checkoutUrl: draftOrder.invoice_url,
      draftOrderId: draftOrder.id,
      orderNumber: draftOrder.order_id || draftOrder.name || draftOrder.id,
      details: 'Checkout URL created successfully from draft order.',
      summary: {
        partsCount: configurationData.summary.partsCount,
        totalPrice: configurationData.summary.totalPrice,
        turnaround: configurationData.summary.turnaround,
        cartItemId: cartItemId || null
      },
      timestamp: new Date().toISOString()
    };

    console.log('=== SAVE CONFIGURATION SUCCESS ===');
    console.log('Success response:', {
      draftOrderId: successResponse.draftOrderId,
      orderNumber: successResponse.orderNumber,
      checkoutUrl: 'present',
      partsCount: successResponse.summary.partsCount,
      totalPrice: successResponse.summary.totalPrice
    });

    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('=== SAVE CONFIGURATION ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Enhanced error response with user guidance
    const errorResponse = {
      error: 'Failed to save configuration',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      suggestion: 'Please try again. If the problem persists, contact support with the timestamp above.'
    };
    
    console.log('Error response:', errorResponse);
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 