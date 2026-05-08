"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createOfferFromFormData } from "@/lib/offer-store"

export async function createOfferAction(formData: FormData) {
  const offerId = await createOfferFromFormData(formData)
  revalidatePath("/offers")
  revalidatePath(`/offers/${offerId}`)
  redirect(`/offers/${offerId}`)
}
