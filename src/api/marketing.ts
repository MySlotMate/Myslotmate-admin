import { apiFetch } from './client';

export interface HomepageMarketingConfig {
  featured_limit?: number;
  curated_limit?: number;
  featured_event_ids?: string[];
  curated_event_ids?: string[];
}

export function fetchMarketingConfig(): Promise<HomepageMarketingConfig> {
  return apiFetch<HomepageMarketingConfig>('/platform-settings/homepage_marketing_config');
}

export function updateMarketingConfig(config: HomepageMarketingConfig): Promise<unknown> {
  return apiFetch('/admin/platform-settings/homepage_marketing_config', {
    method: 'PUT',
    body: config,
  });
}
