export interface TypeformWebhookBody {
  event_id?: string;
  event_type?: string;
  form_response?: {
    form_id?: string;
    token?: string;
    answers?: Array<{
      type: string;
      email?: string;
      text?: string;
      url?: string;
      field?: {
        id: string;
        type: string;
        ref: string;
      };
    }>;
  };
}

export interface ExtractedTypeformData {
  email?: string;
  appName?: string;
  appUrl?: string;
}

export function extractTypeformData(
  body: TypeformWebhookBody,
): ExtractedTypeformData {
  const result: ExtractedTypeformData = {};

  if (!body.form_response?.answers) {
    return result;
  }

  for (const answer of body.form_response.answers) {
    if (!answer.field) {
      continue;
    }

    if (answer.field.id === "sxcPQKI2Q7mJ" && answer.type === "email") {
      result.email = answer.email;
    }

    if (answer.field.id === "bmXsKJeY0x5H" && answer.type === "text") {
      result.appName = answer.text;
    }

    if (answer.field.id === "1vmkVfbCWVjU" && answer.type === "url") {
      result.appUrl = answer.url;
    }
  }

  return result;
}
