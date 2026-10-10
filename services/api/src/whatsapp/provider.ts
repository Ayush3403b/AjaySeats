import { errors } from '../lib/errors.js';

/**
 * Provider boundary. Only createMessageLink is implemented: it builds a click-to-chat URL that a
 * staff member opens manually. Everything that would call an official WhatsApp Business API is a
 * stub that throws until that phase is enabled. No tokens or bulk-sending bots live here.
 */
export interface WhatsAppProvider {
  createMessageLink(input: { phoneE164: string; text: string }): string;
  prepareCampaign(campaignId: string): Promise<never>;
  sendTemplateMessage(input: { phoneE164: string; template: string }): Promise<never>;
  processDeliveryStatus(payload: unknown): Promise<never>;
}

export const whatsappProvider: WhatsAppProvider = {
  createMessageLink({ phoneE164, text }) {
    const digits = phoneE164.replace(/\D/g, '');
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  },
  async prepareCampaign() {
    throw errors.notEnabled('Official WhatsApp campaign sending');
  },
  async sendTemplateMessage() {
    throw errors.notEnabled('Official WhatsApp template sending');
  },
  async processDeliveryStatus() {
    throw errors.notEnabled('WhatsApp delivery status processing');
  },
};
