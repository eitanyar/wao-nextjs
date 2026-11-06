export interface HelpSubmissionOptions {
  fetchFn: typeof fetch;
  makeId: () => string;
  onState: (state: 'loading' | 'received' | 'unconfirmed' | 'retry' | 'blocked') => void;
  isCurrent: () => boolean;
  recoveryOnly?: boolean;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}
export interface HelpSubmission {
  submit(identity: { auditId: string; placeId: string }, contact: {
    name: string; phone: string; email: string; privacyAccepted: boolean;
  }): Promise<void>;
  dispose(): void;
}
export function helpAttemptKey(identity: { auditId: string; placeId: string }): string;
export function createHelpSubmission(options: HelpSubmissionOptions): HelpSubmission;
