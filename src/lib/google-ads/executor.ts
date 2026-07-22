import type { GoogleAdsOperatorTask } from './operator';
import type { CampaignConfig } from '@/lib/crm/intelligence';
import { setCampaignDailyBudget, addNegativeKeywords, buildClient } from './mutations';
import fs from 'fs';
import path from 'path';

export interface ExecutionResult {
  success: boolean;
  error?: string;
}

export async function executeGoogleAdsOperatorTask(params: {
  task: GoogleAdsOperatorTask;
  campaignConfig: CampaignConfig;
  campaignId: string;
  clientInstance?: ReturnType<typeof buildClient>;
}): Promise<ExecutionResult> {
  const { task, campaignConfig, campaignId, clientInstance } = params;

  switch (task.kind) {
    case 'budget_tune': {
      // Under pacing: increase daily budget by +15%
      const currentBudget = campaignConfig.targetDailyBudget || 100;
      const newBudget = Math.round(currentBudget * 1.15);

      const mutResult = await setCampaignDailyBudget({
        campaignConfig,
        campaignId,
        dailyBudgetIls: newBudget,
        clientInstance,
      });

      if (!mutResult.success) {
        return { success: false, error: mutResult.error || 'Budget tune mutation failed' };
      }

      // Update on-disk campaign config
      try {
        const updatedConfig: CampaignConfig = {
          ...campaignConfig,
          targetDailyBudget: newBudget,
          targetMonthlyBudget: Math.round(newBudget * 30.4 * 100) / 100,
        };
        const configDir = path.join(process.cwd(), 'data', 'campaigns');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, `${campaignConfig.slug}.json`),
          JSON.stringify(updatedConfig, null, 2),
          'utf8'
        );
      } catch (err: any) {
        console.warn('Failed to update campaign config file after budget tune:', err);
      }

      return { success: true };
    }
    case 'search_term_cleanup': {
      return {
        success: false,
        error:
          'Automatic search-term negative mining requires live GAQL search-term reporting (Priority 3, not yet built). Add negatives manually via POST /api/google-ads/negative-keywords.',
      };
    }
    case 'tracking_audit':
    case 'conversion_review':
    case 'lead_followup':
    case 'general_review':
    default:
      return { success: true };
  }
}
