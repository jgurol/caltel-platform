
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFRequest } from './types.ts';
import { fetchSystemSettings, fetchTemplate, fetchUserProfile, fetchAcceptanceDetails } from './dataFetcher.ts';
import { generateHTML } from './htmlGenerator.ts';
import { generatePDFWithShift, convertToBase64 } from './pdfService.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('PDFShift Function - Request received, method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('PDFShift Function - Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { quote, clientInfo, salespersonName, primaryContact }: PDFRequest = requestBody;
    
    console.log('PDFShift Function - Processing quote:', quote?.id, 'with status:', quote?.status);
    console.log('PDFShift Function - Quote user_id:', quote?.user_id);
    console.log('PDFShift Function - Quote items count:', quote?.quoteItems?.length || 0);
    console.log('PDFShift Function - Primary contact:', primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : 'None');
    
    // Check if quote is approved/accepted
    const isApproved = quote?.status === 'approved' || quote?.status === 'accepted';
    console.log('PDFShift Function - Quote is approved:', isApproved);
    
    // Fetch acceptance details if quote is approved
    let acceptanceDetails = null;
    if (isApproved && quote?.id) {
      acceptanceDetails = await fetchAcceptanceDetails(quote.id);
      console.log('PDFShift Function - Acceptance details found:', !!acceptanceDetails);
    }
    
    // Fetch system settings and template
    const businessSettings = await fetchSystemSettings();
    
    // Fetch template content if templateId is provided
    let templateContent = '';
    if (quote?.templateId) {
      templateContent = await fetchTemplate(quote.templateId);
    }
    
    // Fetch the quote creator's name from profiles table
    let accountManagerName = 'N/A';
    
    if (quote?.user_id) {
      accountManagerName = await fetchUserProfile(quote.user_id);
    } else {
      console.log('PDFShift Function - No user_id found in quote');
    }
    
    console.log('PDFShift Function - Final account manager name:', accountManagerName);
    
    // Create HTML template with logo, settings, template content, primary contact, and acceptance details
    const html = generateHTML(
      quote, 
      clientInfo, 
      accountManagerName, 
      businessSettings.logoUrl, 
      businessSettings.companyName, 
      templateContent,
      primaryContact,
      acceptanceDetails
    );
    console.log('PDFShift Function - HTML generated, length:', html.length);
    
    // Call PDFShift API
    const pdfBuffer = await generatePDFWithShift(html);
    
    // Convert to base64
    const pdfBase64 = convertToBase64(pdfBuffer);
    
    console.log('PDFShift Function - PDF generated successfully, base64 length:', pdfBase64.length);
    
    return new Response(JSON.stringify({ pdf: pdfBase64 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    console.error('PDFShift Function - Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
