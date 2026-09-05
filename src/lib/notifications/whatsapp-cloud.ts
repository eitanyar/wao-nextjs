export interface WhatsAppCloudConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
}

export type WhatsAppHttpClient = (url: string, init: RequestInit) => Promise<Response>;

export interface SendWhatsAppTemplateInput {
  to: string;
  templateName: string;
  templateLanguage: string;
  config?: WhatsAppCloudConfig;
  httpClient?: WhatsAppHttpClient;
}

export interface SendWhatsAppTemplateResult {
  messageId: string;
}

function loadConfig(): WhatsAppCloudConfig {
  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION;
  if (!accessToken || !phoneNumberId || !apiVersion) {
    throw new Error('WhatsApp Cloud configuration is incomplete');
  }
  return { accessToken, phoneNumberId, apiVersion };
}

export function normalizeIsraeliPhone(value: string): string | null {
  const compact = value.replace(/[^\d+]/g, '');
  let national: string;
  if (compact.startsWith('+972')) national = `0${compact.slice(4)}`;
  else if (compact.startsWith('972')) national = `0${compact.slice(3)}`;
  else national = compact;

  if (!/^05\d{8}$/.test(national)) return null;
  return `972${national.slice(1)}`;
}

export async function sendWhatsAppTemplate(input: SendWhatsAppTemplateInput): Promise<SendWhatsAppTemplateResult> {
  const config = input.config ?? loadConfig();
  const httpClient = input.httpClient ?? fetch;
  const response = await httpClient(
    `https://graph.facebook.com/${encodeURIComponent(config.apiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: input.to,
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: input.templateLanguage },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`WhatsApp provider request failed with status ${response.status}`);
  }

  const body = await response.json() as { messages?: Array<{ id?: unknown }> };
  const messageId = body.messages?.[0]?.id;
  if (typeof messageId !== 'string' || !messageId) {
    throw new Error('WhatsApp provider response did not include a message id');
  }
  return { messageId };
}
