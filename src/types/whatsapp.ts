export type WhatsAppTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type WhatsAppConversationCategory =
  | WhatsAppTemplateCategory
  | "SERVICE";

export type WhatsAppTemplateHeaderFormat =
  | "NONE"
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "DOCUMENT"
  | "LOCATION";

export type WhatsAppTemplateButtonMode =
  | "NONE"
  | "QUICK_REPLY"
  | "CALL_TO_ACTION";

export type WhatsAppTemplateQualityScore = {
  score?: string;
  reasons?: string[];
} | null;

export type WhatsAppTemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<Record<string, unknown>>;
  example?: Record<string, unknown>;
};

export type WhatsAppTemplateRecord = {
  id?: string;
  name: string;
  language: string;
  status?: string;
  category?: string;
  previous_category?: string;
  rejected_reason?: string | null;
  quality_score?: WhatsAppTemplateQualityScore;
  components: WhatsAppTemplateComponent[];
};

export type WhatsAppTemplateListResponse = {
  data: WhatsAppTemplateRecord[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
};

export type WhatsAppTemplateCreatePayload = {
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  components: Array<Record<string, unknown>>;
};

export type WhatsAppTemplateCreateResponse = {
  id: string;
  status: string;
  category: string;
};

export type WhatsAppTemplateDeleteResponse = {
  success?: boolean;
};

export type WhatsAppMessageSendResponse = {
  messaging_product?: string;
  contacts?: Array<Record<string, unknown>>;
  messages?: Array<{
    id: string;
  }>;
};

export type WhatsAppPhoneNumber = {
  verified_name?: string;
  display_phone_number?: string;
  id: string;
  quality_rating?: string;
};

export type WhatsAppPhoneNumbersResponse = {
  data: WhatsAppPhoneNumber[];
};

export type WhatsAppMediaUploadResponse = {
  id: string;
};

export type WhatsAppTemplateActivityLog = {
  id: string;
  name: string;
  category: string;
  status: string;
  createdAt: string;
};

export type WhatsAppMessageActivityLog = {
  id: string;
  externalMessageId?: string;
  channel: "TEMPLATE" | "TEXT";
  conversationCategory: WhatsAppConversationCategory;
  recipient: string;
  templateName?: string;
  preview: string;
  createdAt: string;
  status: string;
};

export type WhatsAppWebhookEventLog = {
  kind: string;
  receivedAt: string;
  payload: Record<string, unknown>;
};

export type WhatsAppManagerState = {
  templateActivity: WhatsAppTemplateActivityLog[];
  messageActivity: WhatsAppMessageActivityLog[];
  webhookEvents?: WhatsAppWebhookEventLog[];
};
