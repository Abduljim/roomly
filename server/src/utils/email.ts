/**
 * Transactional email abstraction. Dev stub logs to console.
 * Swap in Resend/Postmark by implementing send() here — nothing else changes.
 */
export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

const provider: (payload: EmailPayload) => Promise<void> = async ({ to, subject, body }) => {
  console.log(`[email:dev] to=${to} subject="${subject}" body="${body}"`);
};

export async function sendEmail(payload: EmailPayload) {
  await provider(payload);
}
