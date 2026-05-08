-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('welcome', 'reload');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('template', 'url', 'text');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('draft', 'active', 'completed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "OfferStepType" AS ENUM ('qualifying_bet', 'qualifying_lay', 'bonus_received', 'bonus_bet', 'bonus_lay', 'settlement');

-- CreateEnum
CREATE TYPE "OfferStepStatus" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('back', 'lay');

-- CreateEnum
CREATE TYPE "BetResult" AS ENUM ('won', 'lost', 'void', 'pending');

-- CreateEnum
CREATE TYPE "MatchQuality" AS ENUM ('exact', 'strong', 'ambiguous', 'no_match');

-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('scrape_offer', 'parse_terms', 'match_lay', 'refresh_quote');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "Bookmaker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "supportsDirectScrape" BOOLEAN NOT NULL DEFAULT false,
    "scrapeConfigJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "bookmakerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offerType" "OfferType" NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "rawTerms" TEXT,
    "summary" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'draft',
    "expiresAt" TIMESTAMP(3),
    "expectedProfit" DECIMAL(12,2),
    "actualProfit" DECIMAL(12,2),
    "qualifyingRulesJson" JSONB,
    "bonusRulesJson" JSONB,
    "extractedTermsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferStep" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "stepType" "OfferStepType" NOT NULL,
    "status" "OfferStepStatus" NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "offerStepId" TEXT,
    "betType" "BetType" NOT NULL,
    "sport" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "selectionName" TEXT NOT NULL,
    "odds" DECIMAL(10,4) NOT NULL,
    "stake" DECIMAL(12,2) NOT NULL,
    "exchangeCommission" DECIMAL(5,4) NOT NULL DEFAULT 0.00,
    "result" "BetResult" NOT NULL DEFAULT 'pending',
    "placedAt" TIMESTAMP(3),
    "externalRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayMatch" (
    "id" TEXT NOT NULL,
    "backBetId" TEXT NOT NULL,
    "matchQuality" "MatchQuality" NOT NULL,
    "matchedEventName" TEXT,
    "matchedMarketName" TEXT,
    "matchedSelectionName" TEXT,
    "bestLayPrice" DECIMAL(10,4),
    "bestLaySize" DECIMAL(12,2),
    "layStake" DECIMAL(12,2),
    "liability" DECIMAL(12,2),
    "delayedData" BOOLEAN NOT NULL DEFAULT true,
    "warningsJson" JSONB,
    "rawResponseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LayMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "jobType" "SyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'queued',
    "payloadJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "errorMessage" TEXT,
    "runAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmaker_name_key" ON "Bookmaker"("name");

-- CreateIndex
CREATE INDEX "Offer_bookmakerId_status_idx" ON "Offer"("bookmakerId", "status");

-- CreateIndex
CREATE INDEX "Offer_status_expiresAt_idx" ON "Offer"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "OfferStep_offerId_stepType_idx" ON "OfferStep"("offerId", "stepType");

-- CreateIndex
CREATE UNIQUE INDEX "OfferStep_offerId_sortOrder_key" ON "OfferStep"("offerId", "sortOrder");

-- CreateIndex
CREATE INDEX "Bet_offerId_betType_idx" ON "Bet"("offerId", "betType");

-- CreateIndex
CREATE INDEX "Bet_offerStepId_idx" ON "Bet"("offerStepId");

-- CreateIndex
CREATE UNIQUE INDEX "LayMatch_backBetId_key" ON "LayMatch"("backBetId");

-- CreateIndex
CREATE INDEX "SyncJob_jobType_status_idx" ON "SyncJob"("jobType", "status");

-- CreateIndex
CREATE INDEX "SyncJob_runAt_idx" ON "SyncJob"("runAt");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_bookmakerId_fkey" FOREIGN KEY ("bookmakerId") REFERENCES "Bookmaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferStep" ADD CONSTRAINT "OfferStep_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_offerStepId_fkey" FOREIGN KEY ("offerStepId") REFERENCES "OfferStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayMatch" ADD CONSTRAINT "LayMatch_backBetId_fkey" FOREIGN KEY ("backBetId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
