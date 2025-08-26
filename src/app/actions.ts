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
      error: "Message cannot be empty.",
    };
  }

  const message = validatedFields.data.message;
  const result = await filterContactDetails({ message });

  if (result.containsContactDetails) {
    return {
      error: `Message blocked: ${result.flaggedReason}`,
    };
  }

  return {
    error: null,
    message: {
      id: `msg-${Date.now()}`,
      text: message,
      timestamp: Date.now(),
      senderId: "user-1", // mock sender
      recipientId: "user-2",
    },
  };
}
