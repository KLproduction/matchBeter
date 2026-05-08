"use server"

import { revalidatePath } from "next/cache"
import { updateOfferStepStatus } from "@/lib/offer-store"

export async function updateOfferStepAction(formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "")
  const stepType = String(formData.get("stepType") ?? "")
  const nextStatus = String(formData.get("nextStatus") ?? "")

  if (!offerId || !stepType) {
    throw new Error("Missing offer or step")
  }

  if (nextStatus !== "pending" && nextStatus !== "in_progress" && nextStatus !== "completed" && nextStatus !== "skipped") {
    throw new Error("Invalid step status")
  }

  await updateOfferStepStatus(offerId, stepType as Parameters<typeof updateOfferStepStatus>[1], nextStatus as Parameters<typeof updateOfferStepStatus>[2])
  revalidatePath("/offers")
  revalidatePath(`/offers/${offerId}`)
}
