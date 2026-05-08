import Link from "next/link"
import { notFound } from "next/navigation"
import { createBetAction, deleteBetAction, updateBetAction } from "@/app/offers/bet-actions"
import { updateOfferStepAction } from "@/app/offers/step-actions"
import { getOfferById } from "@/lib/offer-store"
import { formatDate, formatMoney } from "@/lib/offers"

export const dynamic = "force-dynamic"

function actionLabel(stepStatus: string) {
  if (stepStatus === "pending") return "Start"
  if (stepStatus === "in_progress") return "Complete"
  return "Change"
}

function toDateTimeLocal(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function moneyOrDash(value?: number) {
  return typeof value === "number" ? formatMoney(value) : "—"
}

function oddsText(value?: number) {
  return typeof value === "number" ? value.toFixed(2).replace(/\.00$/, "") : "—"
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ offerId: string }>
}) {
  const { offerId } = await params
  const offer = await getOfferById(offerId)

  if (!offer) {
    notFound()
  }

  const actionableStepIndex = offer.steps.findIndex(
    (step) => step.status === "in_progress" || step.status === "pending",
  )
  const backBets = offer.bets.filter((bet) => bet.betType === "back")
  const layBets = offer.bets.filter((bet) => bet.betType === "lay")
  const matchedLayCount = backBets.filter((bet) => bet.layMatch).length
  const totalLayStake = layBets.reduce((sum, bet) => sum + bet.stake, 0)

  return (
    <main>
      <div className="shell">
        <div className="panel">
          <div className="panel-inner">
            <div className="actions" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="kicker">{offer.bookmaker}</div>
                <h1 className="title" style={{ fontSize: "2.4rem", maxWidth: "none" }}>
                  {offer.title}
                </h1>
                <p className="lede">{offer.summary}</p>
              </div>
              <Link className="button primary" href="/offers/new">
                Add another offer
              </Link>
            </div>
          </div>
        </div>

        <div className="grid metrics">
          <div className="metric">
            <div className="metric-label">Status</div>
            <div className="metric-value">{offer.status}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Expiry</div>
            <div className="metric-value" style={{ fontSize: "1rem" }}>
              {formatDate(offer.expiresAt)}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Expected profit</div>
            <div className="metric-value">{formatMoney(offer.expectedProfit)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Back / Lay</div>
            <div className="metric-value" style={{ fontSize: "1rem" }}>
              {backBets.length} back, {layBets.length} lay
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-inner">
            <h2 className="section-title">Trade data</h2>
            <p className="section-copy">
              Real back bets and exchange lay data from Postgres. This is the view to use when you want to inspect actual
              placed entries instead of seed/demo placeholders.
            </p>
            <div style={{ height: 16 }} />
            <div className="grid metrics">
              <div className="metric">
                <div className="metric-label">Matched lays</div>
                <div className="metric-value" style={{ fontSize: "1rem" }}>
                  {matchedLayCount}
                </div>
              </div>
              <div className="metric">
                <div className="metric-label">Exchange lay stake</div>
                <div className="metric-value" style={{ fontSize: "1rem" }}>
                  {formatMoney(totalLayStake)}
                </div>
              </div>
              <div className="metric">
                <div className="metric-label">Offer step</div>
                <div className="metric-value" style={{ fontSize: "1rem" }}>
                  {offer.currentStep}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-inner">
            <h2 className="section-title">Offer terms</h2>
            <p className="section-copy">
              Keep the stake model explicit. This is where cash bet logic and free bet logic diverge.
            </p>
            <div style={{ height: 12 }} />
              <div className="timeline">
                <div className="timeline-item">
                  <span className="timeline-marker" />
                  <div className="timeline-body">
                    <div className="timeline-label">Stake model</div>
                    <div className="timeline-note">
                      {String(offer.qualifyingRulesJson?.stakeModel ?? "cash").replaceAll("_", " ")}
                    </div>
                  </div>
                </div>
                <div className="timeline-item">
                  <span className="timeline-marker" />
                  <div className="timeline-body">
                    <div className="timeline-label">Welcome preset</div>
                    <div className="timeline-note">
                      {String(offer.qualifyingRulesJson?.welcomePreset ?? "bet_10_get_30_free_bet")
                        .replaceAll("_", " ")
                        .replaceAll("free bet", "free bet")}
                    </div>
                  </div>
                </div>
                <div className="timeline-item">
                  <span className="timeline-marker" />
                  <div className="timeline-body">
                    <div className="timeline-label">Qualifying stake / bonus</div>
                    <div className="timeline-note">
                      £{String(offer.qualifyingRulesJson?.qualifyingStake ?? "10")} qualifying stake, £
                      {String(offer.qualifyingRulesJson?.bonusAmount ?? "30")} bonus value
                    </div>
                  </div>
                </div>
                <div className="timeline-item">
                  <span className="timeline-marker" />
                  <div className="timeline-body">
                    <div className="timeline-label">Free bet stake returned</div>
                  <div className="timeline-note">
                    {offer.qualifyingRulesJson?.freeBetStakeReturned ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="split">
          <div className="panel">
            <div className="panel-inner">
              <h2 className="section-title">Offer steps</h2>
              <p className="section-copy">This is the lifecycle the app will track through completion.</p>
              <div style={{ height: 16 }} />
              <div className="timeline">
                {offer.steps.map((step, index) => (
                  <div className="timeline-item" key={step.id ?? step.stepType}>
                    <span className="timeline-marker" />
                    <div className="timeline-body" style={{ flex: 1 }}>
                      <div className="timeline-label">
                        {step.label} <span className="muted">({step.status})</span>
                      </div>
                      <div className="timeline-note">{step.notes ?? "Waiting on the next action."}</div>
                      {step.completedAt ? (
                        <div className="timeline-note">Completed {formatDate(step.completedAt)}</div>
                      ) : null}
                      <div className="actions" style={{ marginTop: 10 }}>
                        {index === actionableStepIndex && step.status !== "completed" && step.status !== "skipped" ? (
                          <>
                            <form action={updateOfferStepAction}>
                              <input type="hidden" name="offerId" value={offer.id} />
                              <input type="hidden" name="stepType" value={step.stepType} />
                              <input
                                type="hidden"
                                name="nextStatus"
                                value={step.status === "pending" ? "in_progress" : "completed"}
                              />
                              <button className="button" type="submit">
                                {actionLabel(step.status)}
                              </button>
                            </form>
                            <form action={updateOfferStepAction}>
                              <input type="hidden" name="offerId" value={offer.id} />
                              <input type="hidden" name="stepType" value={step.stepType} />
                              <input type="hidden" name="nextStatus" value="skipped" />
                              <button className="button" type="submit">
                                Skip
                              </button>
                            </form>
                          </>
                        ) : index < actionableStepIndex || actionableStepIndex === -1 ? (
                          <span className="badge success">Locked</span>
                        ) : (
                          <span className="badge">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid" style={{ gap: 16 }}>
            <div className="panel">
              <div className="panel-inner">
                <h2 className="section-title">Add bet</h2>
                <p className="section-copy">Create a back or lay bet and link it to an offer step.</p>
                <div style={{ height: 16 }} />
                <form action={createBetAction} className="form-grid">
                  <input type="hidden" name="offerId" value={offer.id} />
                  <input type="hidden" name="bookmaker" value={offer.bookmaker} />
                  <div className="field">
                    <label htmlFor="betType">Bet type</label>
                    <select id="betType" name="betType" defaultValue="back">
                      <option value="back">Back</option>
                      <option value="lay">Lay</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="offerStepId">Offer step</label>
                    <select id="offerStepId" name="offerStepId" defaultValue="">
                      <option value="">Unlinked</option>
                      {offer.steps.map((step) => (
                        <option key={step.id ?? step.stepType} value={step.id ?? ""}>
                          {step.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="sport">Sport</label>
                    <input id="sport" name="sport" defaultValue="football" />
                  </div>
                  <div className="field">
                    <label htmlFor="result">Result</label>
                    <select id="result" name="result" defaultValue="pending">
                      <option value="pending">Pending</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="void">Void</option>
                    </select>
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="eventName">Event name</label>
                    <input id="eventName" name="eventName" placeholder="Arsenal v Chelsea" />
                  </div>
                  <div className="field">
                    <label htmlFor="marketName">Market</label>
                    <input id="marketName" name="marketName" placeholder="Match Odds" />
                  </div>
                  <div className="field">
                    <label htmlFor="selectionName">Selection</label>
                    <input id="selectionName" name="selectionName" placeholder="Arsenal" />
                  </div>
                  <div className="field">
                    <label htmlFor="odds">Odds</label>
                    <input id="odds" name="odds" type="number" step="0.01" />
                  </div>
                  <div className="field">
                    <label htmlFor="stake">Stake</label>
                    <input id="stake" name="stake" type="number" step="0.01" />
                  </div>
                  <div className="field">
                    <label htmlFor="exchangeCommission">Commission</label>
                    <input id="exchangeCommission" name="exchangeCommission" type="number" step="0.001" defaultValue="0.02" />
                  </div>
                  <div className="field">
                    <label htmlFor="placedAt">Placed at</label>
                    <input id="placedAt" name="placedAt" type="datetime-local" defaultValue={toDateTimeLocal(new Date().toISOString())} />
                  </div>
                  <div className="field">
                    <label htmlFor="eventStartIso">Event start</label>
                    <input id="eventStartIso" name="eventStartIso" type="datetime-local" />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="externalRef">External ref</label>
                    <input id="externalRef" name="externalRef" placeholder="Optional reference" />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="notes">Notes</label>
                    <textarea id="notes" name="notes" placeholder="Optional note" />
                  </div>
                  <button className="button primary" type="submit">
                    Save bet
                  </button>
                </form>
              </div>
            </div>

            <div className="panel">
              <div className="panel-inner">
                <h2 className="section-title">Back / Lay pairs</h2>
                <p className="section-copy">This is the transaction-style view: bookmaker back data on the left, exchange lay data on the right.</p>
                <div style={{ height: 16 }} />
                <div className="grid" style={{ gap: 16 }}>
                  {backBets.length === 0 ? (
                    <p className="section-copy">No back bets recorded yet.</p>
                  ) : (
                    backBets.map((bet) => (
                      <div key={bet.id} className="timeline-item" style={{ display: "grid", gap: 14 }}>
                        <div className="actions" style={{ justifyContent: "space-between" }}>
                          <div>
                            <div className="timeline-label">Back bet</div>
                            <div className="timeline-note">{bet.eventName}</div>
                          </div>
                          <span className="badge success">Bookmaker</span>
                        </div>

                        <div className="grid metrics">
                          <div className="metric">
                            <div className="metric-label">Market</div>
                            <div className="metric-value" style={{ fontSize: "1rem" }}>{bet.marketName}</div>
                          </div>
                          <div className="metric">
                            <div className="metric-label">Selection</div>
                            <div className="metric-value" style={{ fontSize: "1rem" }}>{bet.selectionName}</div>
                          </div>
                          <div className="metric">
                            <div className="metric-label">Odds / Stake</div>
                            <div className="metric-value" style={{ fontSize: "1rem" }}>
                              {oddsText(bet.odds)} / {formatMoney(bet.stake)}
                            </div>
                          </div>
                          <div className="metric">
                            <div className="metric-label">Result</div>
                            <div className="metric-value" style={{ fontSize: "1rem" }}>{bet.result}</div>
                          </div>
                        </div>

                        <div className="split" style={{ alignItems: "start" }}>
                          <div className="panel" style={{ margin: 0 }}>
                            <div className="panel-inner">
                              <div className="timeline-label">Back side</div>
                              <div className="timeline-note">Placed {formatDate(bet.placedAt)}</div>
                              <div style={{ height: 10 }} />
                              <div className="timeline">
                                <div className="timeline-item">
                                  <span className="timeline-marker" />
                                  <div className="timeline-body">
                                    <div className="timeline-label">Sport</div>
                                    <div className="timeline-note">{bet.betType} / {bet.eventName}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="panel" style={{ margin: 0 }}>
                            <div className="panel-inner">
                              <div className="timeline-label">Lay side</div>
                              {bet.layMatch ? (
                                <>
                                  <div className="timeline-note">Match quality: {bet.layMatch.matchQuality}</div>
                                  <div style={{ height: 10 }} />
                                  <div className="grid metrics">
                                    <div className="metric">
                                      <div className="metric-label">Best lay price</div>
                                      <div className="metric-value" style={{ fontSize: "1rem" }}>
                                        {oddsText(bet.layMatch.bestLayPrice)}
                                      </div>
                                    </div>
                                    <div className="metric">
                                      <div className="metric-label">Lay stake</div>
                                      <div className="metric-value" style={{ fontSize: "1rem" }}>
                                        {moneyOrDash(bet.layMatch.layStake)}
                                      </div>
                                    </div>
                                    <div className="metric">
                                      <div className="metric-label">Liability</div>
                                      <div className="metric-value" style={{ fontSize: "1rem" }}>
                                        {moneyOrDash(bet.layMatch.liability)}
                                      </div>
                                    </div>
                                    <div className="metric">
                                      <div className="metric-label">Delayed</div>
                                      <div className="metric-value" style={{ fontSize: "1rem" }}>
                                        {bet.layMatch.delayedData ? "Yes" : "No"}
                                      </div>
                                    </div>
                                  </div>
                                  {bet.layMatch.warningsJson?.length ? (
                                    <div style={{ marginTop: 10 }}>
                                      <div className="timeline-label">Warnings</div>
                                      <div className="timeline-note">{bet.layMatch.warningsJson.join(" | ")}</div>
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <p className="section-copy">No lay match recorded for this back bet yet.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <form action={updateBetAction} className="panel" style={{ margin: 0 }}>
                          <div className="panel-inner">
                            <input type="hidden" name="betId" value={bet.id} />
                            <div className="actions" style={{ justifyContent: "space-between" }}>
                              <div className="timeline-label">Edit record</div>
                              <div className="actions">
                                <button className="button primary" type="submit">
                                  Update bet
                                </button>
                              </div>
                            </div>
                            <div style={{ height: 12 }} />
                            <div className="form-grid">
                              <div className="field">
                                <label>Bet type</label>
                                <select name="betType" defaultValue={bet.betType}>
                                  <option value="back">Back</option>
                                  <option value="lay">Lay</option>
                                </select>
                              </div>
                              <div className="field">
                                <label>Offer step</label>
                                <select name="offerStepId" defaultValue={bet.offerStepId ?? ""}>
                                  <option value="">Unlinked</option>
                                  {offer.steps.map((step) => (
                                    <option key={step.id ?? step.stepType} value={step.id ?? ""}>
                                      {step.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="field">
                                <label>Sport</label>
                                <input name="sport" defaultValue="football" />
                              </div>
                              <div className="field">
                                <label>Result</label>
                                <select name="result" defaultValue={bet.result}>
                                  <option value="pending">Pending</option>
                                  <option value="won">Won</option>
                                  <option value="lost">Lost</option>
                                  <option value="void">Void</option>
                                </select>
                              </div>
                              <div className="field" style={{ gridColumn: "1 / -1" }}>
                                <label>Event name</label>
                                <input name="eventName" defaultValue={bet.eventName} />
                              </div>
                              <div className="field">
                                <label>Market</label>
                                <input name="marketName" defaultValue={bet.marketName} />
                              </div>
                              <div className="field">
                                <label>Selection</label>
                                <input name="selectionName" defaultValue={bet.selectionName} />
                              </div>
                              <div className="field">
                                <label>Odds</label>
                                <input name="odds" type="number" step="0.01" defaultValue={bet.odds} />
                              </div>
                              <div className="field">
                                <label>Stake</label>
                                <input name="stake" type="number" step="0.01" defaultValue={bet.stake} />
                              </div>
                              <div className="field">
                                <label>Commission</label>
                                <input
                                  name="exchangeCommission"
                                  type="number"
                                  step="0.001"
                                  defaultValue={bet.exchangeCommission ?? 0}
                                />
                              </div>
                              <div className="field">
                                <label>Placed at</label>
                                <input name="placedAt" type="datetime-local" defaultValue={toDateTimeLocal(bet.placedAt)} />
                              </div>
                              <div className="field" style={{ gridColumn: "1 / -1" }}>
                                <label>External ref</label>
                                <input name="externalRef" defaultValue={bet.externalRef ?? ""} />
                              </div>
                              <div className="field" style={{ gridColumn: "1 / -1" }}>
                                <label>Notes</label>
                                <textarea name="notes" defaultValue={bet.notes ?? ""} />
                              </div>
                            </div>
                          </div>
                        </form>

                        <form action={deleteBetAction} className="actions" style={{ justifyContent: "flex-end" }}>
                          <input type="hidden" name="betId" value={bet.id} />
                          <button className="button" type="submit">
                            Delete record
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
