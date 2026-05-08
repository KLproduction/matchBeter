import { getDb } from "../src/lib/db"

async function main() {
  const db = getDb()

  const coral = await db.bookmaker.upsert({
    where: { name: "Coral" },
    update: {
      region: "UK",
      supportsDirectScrape: true,
    },
    create: {
      name: "Coral",
      region: "UK",
      supportsDirectScrape: true,
      scrapeConfigJson: {
        templates: ["welcome", "reload"],
      },
    },
  })

  await db.bookmaker.upsert({
    where: { name: "Ladbrokes" },
    update: {
      region: "UK",
      supportsDirectScrape: true,
    },
    create: {
      name: "Ladbrokes",
      region: "UK",
      supportsDirectScrape: true,
      scrapeConfigJson: {
        templates: ["welcome", "reload"],
      },
    },
  })

  await db.bookmaker.upsert({
    where: { name: "Sky Bet" },
    update: {
      region: "UK",
      supportsDirectScrape: false,
    },
    create: {
      name: "Sky Bet",
      region: "UK",
      supportsDirectScrape: false,
      scrapeConfigJson: {
        templates: ["welcome"],
      },
    },
  })

  const existingOffer = await db.offer.findFirst({
    where: {
      title: "Arsenal welcome offer",
      bookmakerId: coral.id,
    },
    select: { id: true },
  })

  if (!existingOffer) {
    const offer = await db.offer.create({
      data: {
        bookmakerId: coral.id,
        isSeed: true,
        title: "Arsenal welcome offer",
        offerType: "welcome",
        sourceType: "template",
        summary: "Seeded offer for initial workflow testing.",
        status: "active",
        expiresAt: new Date("2026-05-10T18:00:00.000Z"),
        expectedProfit: "41.20",
        actualProfit: null,
      },
    })

    await db.offerStep.createMany({
      data: [
        {
          offerId: offer.id,
          stepType: "qualifying_bet",
          status: "completed",
          sortOrder: 1,
          notes: "Opening back bet placed.",
        },
        {
          offerId: offer.id,
          stepType: "qualifying_lay",
          status: "in_progress",
          sortOrder: 2,
          notes: "Lay match pending.",
        },
        {
          offerId: offer.id,
          stepType: "bonus_received",
          status: "pending",
          sortOrder: 3,
          notes: null,
        },
        {
          offerId: offer.id,
          stepType: "bonus_bet",
          status: "pending",
          sortOrder: 4,
          notes: null,
        },
        {
          offerId: offer.id,
          stepType: "bonus_lay",
          status: "pending",
          sortOrder: 5,
          notes: null,
        },
        {
          offerId: offer.id,
          stepType: "settlement",
          status: "pending",
          sortOrder: 6,
          notes: "Close the workflow after settlement.",
        },
      ],
    })
  }

  await db.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await getDb().$disconnect().catch(() => undefined)
  process.exitCode = 1
})
