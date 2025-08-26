"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1),
});

export async function sendMessageAction(prevState: any, formData: FormData) {
  const validatedFields = messageSchema.safeParse({
    message: formData.get("message"),
  });

  if (!validatedFields.success) {
    return {
      ...prevState,
      error: "Message cannot be empty.",
    };
  }

  const originalMessage = validatedFields.data.message;
  const result = await filterContactDetails({ message: originalMessage });

  // Always succeed, but include the modification reason if there was one.
  return {
    error: null,
    modificationReason: result.modificationReason || null,
    message: {
      id: `msg-${Date.now()}`,
      text: result.modifiedMessage, // Use the (potentially modified) message
      timestamp: Date.now(),
      senderId: "user-1", // mock sender
      recipientId: "user-2",
    },
  };
}
