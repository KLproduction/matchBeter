"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createBetForOffer, deleteBetById, updateBetFromFormData } from "@/lib/offer-store"

export async function createBetAction(formData: FormData) {
  const { offerId } = await createBetForOffer(formData)
  revalidatePath("/offers")
  revalidatePath(`/offers/${offerId}`)
  redirect(`/offers/${offerId}`)
}

export async function updateBetAction(formData: FormData) {
  const { offerId } = await updateBetFromFormData(formData)
  revalidatePath("/offers")
  revalidatePath(`/offers/${offerId}`)
  redirect(`/offers/${offerId}`)
}

export async function deleteBetAction(formData: FormData) {
  const betId = String(formData.get("betId") ?? "").trim()
  if (!betId) {
    throw new Error("Missing bet")
  }

  const { offerId } = await deleteBetById(betId)
  revalidatePath("/offers")
  revalidatePath(`/offers/${offerId}`)
  redirect(`/offers/${offerId}`)
}
