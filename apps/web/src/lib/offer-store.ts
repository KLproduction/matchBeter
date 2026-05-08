import { Prisma } from "@prisma/client"
import { getDb } from "@/lib/db"
import {
  type DemoBet,
  type DemoOffer,
  type DemoOfferStep,
  generateStandardOfferSteps,
} from "@/lib/offers"

type OfferInclude = Prisma.OfferGetPayload<{
  include: {
    bookmaker: true
    steps: true
    bets: {
      include: {
        layMatches: true
      }
    }
  }
}>

export type OfferListItem = {
  id: string
  bookmaker: string
  title: string
  offerType: DemoOffer["offerType"]
  status: DemoOffer["status"]
  expiresAt?: string
  expectedProfit: number
  actualProfit?: number
  currentStep: string
  summary: string
}

export type OfferDetail = DemoOffer & {
  sourceType?: string
  sourceUrl?: string | null
  rawTerms?: string | null
  bookmakerRegion?: string | null
  qualifyingRulesJson?: Record<string, unknown> | null
  isSeed?: boolean
}

export type BookmakerOption = {
  id: string
  name: string
}

export type WorkflowStepStatus = DemoOfferStep["status"]
export type WorkflowStepType = DemoOfferStep["stepType"]

const defaultBookmakers = ["Coral", "Ladbrokes", "Sky Bet"].map((name) => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name,
}))

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return undefined
  return typeof value === "number" ? value : value.toNumber()
}

function parseDecimalInput(raw: string) {
  const normalized = raw.replace(/[$,\s]/g, "").trim()
  return normalized ? new Prisma.Decimal(normalized) : null
}

function statusFromDb(status: string): OfferListItem["status"] {
  if (status === "draft" || status === "active" || status === "completed" || status === "expired" || status === "cancelled") {
    return status
  }

  return "draft"
}

function offerTypeFromDb(value: string): OfferListItem["offerType"] {
  return value === "reload" ? "reload" : "welcome"
}

function mapSteps(steps: OfferInclude["steps"]): DemoOfferStep[] {
  return steps
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((step) => ({
      id: step.id,
      stepType: step.stepType as DemoOfferStep["stepType"],
      status: step.status as DemoOfferStep["status"],
      label: step.stepType
        .split("_")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" "),
      notes: step.notes ?? undefined,
      completedAt: step.completedAt?.toISOString(),
    }))
}

function mapBets(bets: OfferInclude["bets"]): DemoBet[] {
  return bets.map((bet) => {
    const layMatch = bet.layMatches[0]

    return {
    id: bet.id,
    betType: bet.betType as DemoBet["betType"],
    eventName: bet.eventName,
    marketName: bet.marketName,
    selectionName: bet.selectionName,
    odds: decimalToNumber(bet.odds) ?? 0,
    stake: decimalToNumber(bet.stake) ?? 0,
    result: bet.result as DemoBet["result"],
    offerStepId: bet.offerStepId ?? undefined,
    exchangeCommission: decimalToNumber(bet.exchangeCommission),
    placedAt: bet.placedAt?.toISOString(),
    externalRef: bet.externalRef ?? undefined,
    notes: bet.notes ?? undefined,
    layMatch: layMatch
      ? {
          id: layMatch.id,
          matchQuality: layMatch.matchQuality,
          matchedEventName: layMatch.matchedEventName ?? undefined,
          matchedMarketName: layMatch.matchedMarketName ?? undefined,
          matchedSelectionName: layMatch.matchedSelectionName ?? undefined,
          bestLayPrice: decimalToNumber(layMatch.bestLayPrice),
          bestLaySize: decimalToNumber(layMatch.bestLaySize),
          layStake: decimalToNumber(layMatch.layStake),
          liability: decimalToNumber(layMatch.liability),
          delayedData: layMatch.delayedData,
          warningsJson: layMatch.warningsJson as Array<string> | null,
        }
      : undefined,
    }
  })
}

function mapOffer(offer: OfferInclude): OfferDetail {
  const sortedSteps = mapSteps(offer.steps)
  const currentStep = sortedSteps.find((step) => step.status === "in_progress" || step.status === "pending")?.label ?? "Settlement"

  return {
    id: offer.id,
    bookmaker: offer.bookmaker.name,
    title: offer.title,
    offerType: offerTypeFromDb(offer.offerType),
    status: statusFromDb(offer.status),
    expiresAt: offer.expiresAt?.toISOString(),
    expectedProfit: decimalToNumber(offer.expectedProfit) ?? 0,
    actualProfit: decimalToNumber(offer.actualProfit),
    currentStep,
    summary: offer.summary ?? "",
    steps: sortedSteps,
    bets: mapBets(offer.bets),
    jobs: [],
    isSeed: offer.isSeed,
    sourceType: offer.sourceType,
    sourceUrl: offer.sourceUrl,
    rawTerms: offer.rawTerms,
    bookmakerRegion: offer.bookmaker.region,
    qualifyingRulesJson: offer.qualifyingRulesJson as Record<string, unknown> | null,
  }
}

function mapOfferListItem(offer: OfferInclude): OfferListItem {
  const detail = mapOffer(offer)

  return {
    id: detail.id,
    bookmaker: detail.bookmaker,
    title: detail.title,
    offerType: detail.offerType,
    status: detail.status,
    expiresAt: detail.expiresAt,
    expectedProfit: detail.expectedProfit,
    actualProfit: detail.actualProfit,
    currentStep: detail.currentStep,
    summary: detail.summary,
  }
}

export function buildStandardOfferSteps(notes?: string) {
  return generateStandardOfferSteps().map((step, index) => ({
    stepType: step.stepType,
    status: step.status,
    sortOrder: index + 1,
    notes: index === 0 ? notes ?? step.notes ?? null : step.notes ?? null,
    dueAt: null,
  }))
}

export async function getBookmakerOptions(): Promise<BookmakerOption[]> {
  try {
    const db = getDb()
    const bookmakers = await db.bookmaker.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })

    return bookmakers.length > 0 ? bookmakers : defaultBookmakers
  } catch {
    return defaultBookmakers
  }
}

export async function getOffers(): Promise<OfferListItem[]> {
  try {
    const db = getDb()
    const offers = await db.offer.findMany({
      where: { isSeed: false },
      include: {
        bookmaker: true,
        steps: true,
        bets: {
          include: {
            layMatches: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    })

    return offers.map(mapOfferListItem)
  } catch {
    return []
  }
}

export async function getOfferById(offerId: string): Promise<OfferDetail | null> {
  try {
    const db = getDb()
    const offer = await db.offer.findUnique({
      where: { id: offerId },
      include: {
        bookmaker: true,
        steps: true,
        bets: {
          include: {
            layMatches: true,
          },
        },
      },
    })

    if (offer) {
      return mapOffer(offer)
    }
  } catch {
    // fall through to empty result below
  }

  return null
}

export async function createOfferFromFormData(formData: FormData) {
  const bookmakerName = String(formData.get("bookmakerName") ?? "").trim() || "Coral"
  const title = String(formData.get("title") ?? "").trim() || `${bookmakerName} offer`
  const offerType = String(formData.get("offerType") ?? "welcome") === "reload" ? "reload" : "welcome"
  const sourceType = String(formData.get("sourceType") ?? "template")
  const stakeModel = String(formData.get("stakeModel") ?? "cash").trim()
  const welcomePreset = String(formData.get("welcomePreset") ?? "bet_10_get_30_free_bet").trim()
  const qualifyingStake = parseDecimalInput(String(formData.get("qualifyingStake") ?? "").trim())
  const bonusAmount = parseDecimalInput(String(formData.get("bonusAmount") ?? "").trim())
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim()
  const rawTerms = String(formData.get("rawTerms") ?? "").trim()
  const summary = String(formData.get("summary") ?? "").trim()
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim()
  const expectedProfitRaw = String(formData.get("expectedProfit") ?? "").trim()
  const actualProfitRaw = String(formData.get("actualProfit") ?? "").trim()
  const notes = String(formData.get("initialStepNotes") ?? "").trim()

  const db = getDb()
  const bookmaker = await db.bookmaker.upsert({
    where: { name: bookmakerName },
    update: {},
    create: {
      name: bookmakerName,
      region: "UK",
      supportsDirectScrape: false,
    },
  })

  const offer = await db.offer.create({
    data: {
      bookmakerId: bookmaker.id,
      isSeed: false,
      title,
      offerType,
      sourceType: sourceType === "url" ? "url" : sourceType === "text" ? "text" : "template",
      sourceUrl: sourceUrl || null,
      rawTerms: rawTerms || null,
      summary: summary || `Created from ${sourceType} input.`,
      status: "draft",
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
      expectedProfit: parseDecimalInput(expectedProfitRaw),
      actualProfit: parseDecimalInput(actualProfitRaw),
      qualifyingRulesJson: {
        welcomePreset,
        qualifyingStake: qualifyingStake?.toString() ?? null,
        bonusAmount: bonusAmount?.toString() ?? null,
        stakeModel,
        freeBetStakeReturned: stakeModel === "free_bet_stake_returned",
      },
    },
  })

  await db.offerStep.createMany({
    data: buildStandardOfferSteps(notes).map((step) => ({
      offerId: offer.id,
      stepType: step.stepType,
      status: step.status,
      sortOrder: step.sortOrder,
      notes: step.notes,
      dueAt: step.dueAt,
    })),
  })

  return offer.id
}

export async function getOfferStepOptions(offerId: string) {
  const offer = await getOfferById(offerId)

  return offer?.steps.map((step) => ({
    id: step.id ?? step.stepType,
    label: step.label,
    status: step.status,
  })) ?? []
}

export async function createBetForOffer(formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "").trim()
  if (!offerId) throw new Error("Missing offer")

  const db = getDb()
  const betType = String(formData.get("betType") ?? "back") === "lay" ? "lay" : "back"
  const sport = String(formData.get("sport") ?? "").trim() || "football"
  const eventName = String(formData.get("eventName") ?? "").trim()
  const marketName = String(formData.get("marketName") ?? "").trim()
  const selectionName = String(formData.get("selectionName") ?? "").trim()
  const odds = parseDecimalInput(String(formData.get("odds") ?? "").trim()) ?? new Prisma.Decimal("0")
  const stake = parseDecimalInput(String(formData.get("stake") ?? "").trim()) ?? new Prisma.Decimal("0")
  const exchangeCommission =
    parseDecimalInput(String(formData.get("exchangeCommission") ?? "").trim()) ?? new Prisma.Decimal("0")
  const result = String(formData.get("result") ?? "pending") as "won" | "lost" | "void" | "pending"
  const placedAt = String(formData.get("placedAt") ?? "").trim()
    ? new Date(String(formData.get("placedAt") ?? "").trim())
    : null
  const externalRef = String(formData.get("externalRef") ?? "").trim() || null
  const notes = String(formData.get("notes") ?? "").trim() || null

  return db.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({
      where: { id: offerId },
      select: {
        qualifyingRulesJson: true,
      },
    })

    const bet = await tx.bet.create({
      data: {
        offerId,
        offerStepId: String(formData.get("offerStepId") ?? "").trim() || null,
        betType,
        sport,
        eventName,
        marketName,
        selectionName,
        odds,
        stake,
        exchangeCommission,
        result,
        placedAt,
        externalRef,
        notes,
      },
    })

    const stakeModel = String((offer?.qualifyingRulesJson as Record<string, unknown> | null | undefined)?.stakeModel ?? "cash")

    await tx.syncJob.create({
      data: {
        jobType: "match_lay",
        status: "queued",
        payloadJson: {
          offerId,
          betId: bet.id,
          stake_model: stakeModel,
          input: {
            bookmaker: String(formData.get("bookmaker") ?? "").trim() || "Unknown",
            sport,
            event_name: eventName,
            market_name: marketName,
            selection_name: selectionName,
            back_odds: odds.toString(),
            back_stake: stake.toString(),
            event_start_iso: String(formData.get("eventStartIso") ?? "").trim() || null,
          },
        },
      },
    })

    return { offerId, betId: bet.id }
  })
}

export async function updateBetFromFormData(formData: FormData) {
  const betId = String(formData.get("betId") ?? "").trim()
  if (!betId) throw new Error("Missing bet")

  const db = getDb()
  const bet = await db.bet.update({
    where: { id: betId },
    data: {
      offerStepId: String(formData.get("offerStepId") ?? "").trim() || null,
      betType: String(formData.get("betType") ?? "back") === "lay" ? "lay" : "back",
      sport: String(formData.get("sport") ?? "").trim() || "football",
      eventName: String(formData.get("eventName") ?? "").trim(),
      marketName: String(formData.get("marketName") ?? "").trim(),
      selectionName: String(formData.get("selectionName") ?? "").trim(),
      odds: parseDecimalInput(String(formData.get("odds") ?? "").trim()) ?? new Prisma.Decimal("0"),
      stake: parseDecimalInput(String(formData.get("stake") ?? "").trim()) ?? new Prisma.Decimal("0"),
      exchangeCommission:
        parseDecimalInput(String(formData.get("exchangeCommission") ?? "").trim()) ?? new Prisma.Decimal("0"),
      result: String(formData.get("result") ?? "pending") as "won" | "lost" | "void" | "pending",
      placedAt: String(formData.get("placedAt") ?? "").trim() ? new Date(String(formData.get("placedAt") ?? "").trim()) : null,
      externalRef: String(formData.get("externalRef") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
    select: { offerId: true },
  })

  return { offerId: bet.offerId, betId }
}

export async function deleteBetById(betId: string) {
  const db = getDb()
  const bet = await db.bet.delete({
    where: { id: betId },
    select: { offerId: true },
  })

  return { offerId: bet.offerId, betId }
}

export async function updateOfferStepStatus(offerId: string, stepType: WorkflowStepType, nextStatus: WorkflowStepStatus) {
  const db = getDb()

  await db.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({
      where: { id: offerId },
      include: {
        steps: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!offer) {
      throw new Error("Offer not found")
    }

    const steps = offer.steps
    const targetIndex = steps.findIndex((step) => step.stepType === stepType)

    if (targetIndex === -1) {
      throw new Error("Step not found")
    }

    const now = new Date()

    await tx.offerStep.update({
      where: { id: steps[targetIndex].id },
      data: {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? now : nextStatus === "skipped" ? now : null,
      },
    })

    if (nextStatus === "completed" || nextStatus === "skipped") {
      const nextOpenStep = steps.slice(targetIndex + 1).find((step) => step.status !== "completed" && step.status !== "skipped")

      if (nextOpenStep) {
        await tx.offerStep.update({
          where: { id: nextOpenStep.id },
          data: {
            status: "in_progress",
          },
        })
      } else {
        await tx.offer.update({
          where: { id: offerId },
          data: {
            status: "completed",
          },
        })
      }
    } else if (nextStatus === "in_progress") {
      await tx.offer.update({
        where: { id: offerId },
        data: {
          status: "active",
        },
      })
    }
  })
}
