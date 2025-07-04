
import { supabase } from "@/integrations/supabase/client";

export interface CreditCheckResult {
  creditScore: number;
  creditRating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor';
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendation: string;
  reportDate: string;
  businessName: string;
}

export const creditCheckService = {
  async performCreditCheck(businessName: string): Promise<CreditCheckResult> {
    try {
      console.log('[CreditCheck] Performing credit check for:', businessName);
      
      // Call the edge function for credit check
      const { data, error } = await supabase.functions.invoke('credit-check', {
        body: { businessName }
      });

      if (error) {
        console.error('[CreditCheck] Error:', error);
        throw new Error(`Credit check failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[CreditCheck] Exception:', error);
      throw error;
    }
  },

  async storeCreditCheckResult(clientInfoId: string, result: CreditCheckResult): Promise<void> {
    try {
      console.log('[CreditCheck] Storing credit check result for client:', clientInfoId);
      
      const { error } = await supabase
        .from('client_info')
        .update({
          credit_score: result.creditScore,
          credit_rating: result.creditRating,
          credit_risk_level: result.riskLevel,
          credit_recommendation: result.recommendation,
          credit_check_date: new Date().toISOString()
        })
        .eq('id', clientInfoId);

      if (error) {
        console.error('[CreditCheck] Error storing result:', error);
        throw new Error(`Failed to store credit check result: ${error.message}`);
      }

      console.log('[CreditCheck] Credit check result stored successfully');
    } catch (error) {
      console.error('[CreditCheck] Exception storing result:', error);
      throw error;
    }
  },

  getCreditRating(score: number): CreditCheckResult['creditRating'] {
    if (score >= 800) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 600) return 'Fair';
    if (score >= 500) return 'Poor';
    return 'Very Poor';
  },

  getRiskLevel(score: number): CreditCheckResult['riskLevel'] {
    if (score >= 700) return 'Low';
    if (score >= 600) return 'Medium';
    return 'High';
  },

  getRecommendation(score: number): string {
    if (score >= 800) return 'Excellent credit - Approve with standard terms';
    if (score >= 700) return 'Good credit - Approve with standard terms';
    if (score >= 600) return 'Fair credit - Consider requiring deposit or shorter terms';
    if (score >= 500) return 'Poor credit - Require deposit and shorter payment terms';
    return 'Very poor credit - Consider declining or require significant deposit';
  }
};
