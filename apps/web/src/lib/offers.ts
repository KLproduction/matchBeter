export type OfferStatus = "draft" | "active" | "completed" | "expired" | "cancelled"
export type OfferType = "welcome" | "reload"
export type OfferStepType =
  | "qualifying_bet"
  | "qualifying_lay"
  | "bonus_received"
  | "bonus_bet"
  | "bonus_lay"
  | "settlement"
export type OfferStepStatus = "pending" | "in_progress" | "completed" | "skipped"

export type DemoOffer = {
  id: string
  bookmaker: string
  title: string
  offerType: OfferType
  status: OfferStatus
  expiresAt?: string
  expectedProfit: number
  actualProfit?: number
  currentStep: string
  summary: string
  steps: DemoOfferStep[]
  bets: DemoBet[]
  jobs: DemoJob[]
}

export type DemoOfferStep = {
  id?: string
  stepType: OfferStepType
  status: OfferStepStatus
  label: string
  notes?: string
  dueAt?: string
  completedAt?: string
}

export type DemoBet = {
  id: string
  betType: "back" | "lay"
  eventName: string
  marketName: string
  selectionName: string
  odds: number
  stake: number
  result: "won" | "lost" | "void" | "pending"
  offerStepId?: string
  exchangeCommission?: number
  placedAt?: string
  externalRef?: string
  notes?: string
  layMatch?: {
    id: string
    matchQuality: string
    matchedEventName?: string
    matchedMarketName?: string
    matchedSelectionName?: string
    bestLayPrice?: number
    bestLaySize?: number
    layStake?: number
    liability?: number
    delayedData: boolean
    warningsJson?: string[] | null
  }
}

export type DemoJob = {
  jobType: "match_lay" | "parse_terms" | "scrape_offer"
  status: "queued" | "running" | "completed" | "failed"
  summary: string
}

const stepLabels: Record<OfferStepType, string> = {
  qualifying_bet: "Qualifying bet",
  qualifying_lay: "Qualifying lay",
  bonus_received: "Bonus received",
  bonus_bet: "Bonus bet",
  bonus_lay: "Bonus lay",
  settlement: "Settlement",
}

export function generateStandardOfferSteps(): DemoOfferStep[] {
  const stepTypes: OfferStepType[] = [
    "qualifying_bet",
    "qualifying_lay",
    "bonus_received",
    "bonus_bet",
    "bonus_lay",
    "settlement",
  ]

  return stepTypes.map((stepType, index) => ({
    stepType,
    status: index === 0 ? "in_progress" : "pending",
    label: stepLabels[stepType],
    notes:
      stepType === "qualifying_bet"
        ? "Place the opening back bet."
        : stepType === "settlement"
          ? "Close out the offer and verify profit."
          : undefined,
  }))
}

export const demoOffers: DemoOffer[] = [
  {
    id: "coral-arsenal-welcome",
    bookmaker: "Coral",
    title: "Arsenal welcome offer",
    offerType: "welcome",
    status: "active",
    expiresAt: "2026-05-10T18:00:00.000Z",
    expectedProfit: 41.2,
    currentStep: "Qualifying bet",
    summary: "Matched betting workflow with a pending qualifying back bet and an open lay match request.",
    steps: generateStandardOfferSteps(),
    bets: [
      {
        id: "coral-back-1",
        betType: "back",
        eventName: "Arsenal v Chelsea",
        marketName: "Match Odds",
        selectionName: "Arsenal",
        odds: 2.3,
        stake: 10,
        result: "won",
        exchangeCommission: 0.02,
      },
    ],
    jobs: [
      {
        jobType: "match_lay",
        status: "running",
        summary: "Looking for the best lay on Match Odds.",
      },
    ],
  },
  {
    id: "ladbrokes-reload-tennis",
    bookmaker: "Ladbrokes",
    title: "Tennis reload offer",
    offerType: "reload",
    status: "draft",
    expectedProfit: 24.5,
    currentStep: "Bonus received",
    summary: "Template created. Waiting for the bonus confirmation before the next step can be triggered.",
    steps: generateStandardOfferSteps(),
    bets: [],
    jobs: [
      {
        jobType: "parse_terms",
        status: "completed",
        summary: "Parsed terms text and extracted expiry plus qualifying rules.",
      },
    ],
  },
  {
    id: "skybet-btts-complete",
    bookmaker: "Sky Bet",
    title: "BTTS offer closed out",
    offerType: "welcome",
    status: "completed",
    expiresAt: "2026-05-02T19:00:00.000Z",
    expectedProfit: 33.8,
    actualProfit: 31.6,
    currentStep: "Settlement",
    summary: "Workflow completed and profit recorded. This is the kind of state the app needs to make boring.",
    steps: generateStandardOfferSteps().map((step, index) => ({
      ...step,
      status: index < 5 ? "completed" : "in_progress",
    })),
    bets: [
      {
        id: "skybet-back-1",
        betType: "back",
        eventName: "Liverpool v Spurs",
        marketName: "Both Teams To Score",
        selectionName: "Yes",
        odds: 1.9,
        stake: 15,
        result: "won",
        exchangeCommission: 0.02,
      },
      {
        id: "skybet-lay-1",
        betType: "lay",
        eventName: "Liverpool v Spurs",
        marketName: "Both Teams To Score",
        selectionName: "Yes",
        odds: 1.88,
        stake: 15.4,
        result: "pending",
        exchangeCommission: 0.02,
      },
    ],
    jobs: [],
  },
]

export function getDemoOffer(offerId: string) {
  return demoOffers.find((offer) => offer.id === offerId)
}

export function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(value?: string) {
  if (!value) return "No expiry set"
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
