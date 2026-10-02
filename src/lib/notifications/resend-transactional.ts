import { Resend } from 'resend';

export type ResendTransactionalEmailInput = { to: string; from: string; subject: string; text: string };
export type ResendTransactionalEmailResult = { messageId: string };
type ResendClient = { emails: { send(input: ResendTransactionalEmailInput): Promise<{ data?: { id?: unknown } | null; error?: unknown }> } };

export async function sendResendTransactionalEmail(input: ResendTransactionalEmailInput, dependencies: { apiKey?: string; client?: ResendClient } = {}): Promise<ResendTransactionalEmailResult> {
  if (!input.from.trim() || !input.to.trim() || !input.subject.trim() || !input.text.trim()) throw new Error('invalid_transactional_email');
  const apiKey = dependencies.apiKey ?? process.env.RESEND_API_KEY ?? '';
  if (!apiKey) throw new Error('missing_resend_configuration');
  const client = dependencies.client ?? new Resend(apiKey) as unknown as ResendClient;
  const result = await client.emails.send(input);
  const messageId = result.data?.id;
  if (result.error || typeof messageId !== 'string' || !messageId) throw new Error('invalid_resend_response');
  return { messageId };
}
