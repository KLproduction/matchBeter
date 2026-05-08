import { createOfferAction } from "@/app/offers/actions"
import { getBookmakerOptions } from "@/lib/offer-store"

export const dynamic = "force-dynamic"

export default async function NewOfferPage() {
  const bookmakers = await getBookmakerOptions()

  return (
    <main>
      <div className="shell">
        <div className="panel">
          <div className="panel-inner">
            <div className="kicker">Create offer</div>
            <h1 className="title" style={{ fontSize: "2.4rem", maxWidth: "none" }}>
              Start from a template, a promo URL, or raw terms.
            </h1>
            <p className="lede">
              This form now writes to Postgres. It creates the offer and the standard six-step workflow in
              one transaction-shaped flow.
            </p>
          </div>
        </div>

        <form action={createOfferAction} className="split">
          <div className="panel">
            <div className="panel-inner">
              <h2 className="section-title">Creation fields</h2>
              <p className="section-copy">This mirrors the future Prisma-backed create flow.</p>
              <div style={{ height: 16 }} />
              <div className="form-grid">
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="welcomePreset">Welcome offer shape</label>
                  <select id="welcomePreset" name="welcomePreset" defaultValue="bet_10_get_30_free_bet">
                    <option value="bet_10_get_30_free_bet">Bet £10, Get £30 free bet</option>
                    <option value="bet_5_get_20_free_bet">Bet £5, Get £20 free bet</option>
                    <option value="bet_x_get_y_free_bet">Custom welcome offer</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="bookmakerName">Bookmaker</label>
                  <select id="bookmakerName" name="bookmakerName" defaultValue={bookmakers[0]?.name ?? "Coral"}>
                    {bookmakers.map((bookmaker) => (
                      <option key={bookmaker.id} value={bookmaker.name}>
                        {bookmaker.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="offerType">Offer type</label>
                  <select id="offerType" name="offerType" defaultValue="welcome">
                    <option value="welcome">Welcome</option>
                    <option value="reload">Reload</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="sourceType">Source mode</label>
                  <select id="sourceType" name="sourceType" defaultValue="template">
                    <option value="template">Template</option>
                    <option value="url">Promo URL</option>
                    <option value="text">Terms text</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="stakeModel">Stake model</label>
                  <select id="stakeModel" name="stakeModel" defaultValue="free_bet_stake_not_returned">
                    <option value="free_bet_stake_not_returned">Free bet, stake not returned</option>
                    <option value="free_bet_stake_returned">Free bet, stake returned</option>
                    <option value="cash">Cash bet</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="qualifyingStake">Qualifying stake</label>
                  <input id="qualifyingStake" name="qualifyingStake" defaultValue="10" type="number" step="0.01" />
                </div>
                <div className="field">
                  <label htmlFor="bonusAmount">Bonus amount</label>
                  <input id="bonusAmount" name="bonusAmount" defaultValue="30" type="number" step="0.01" />
                </div>
                <div className="field">
                  <label htmlFor="expiresAt">Expiry date</label>
                  <input id="expiresAt" name="expiresAt" defaultValue="2026-05-10" type="date" />
                </div>
                <div className="field">
                  <label htmlFor="expectedProfit">Expected profit</label>
                  <input id="expectedProfit" name="expectedProfit" defaultValue="6.77" type="number" step="0.01" />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="title">Title</label>
                  <input id="title" name="title" defaultValue="Bet £10, Get £30 free bet" />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="actualProfit">Actual profit</label>
                  <input
                    id="actualProfit"
                    name="actualProfit"
                    placeholder="Optional once settled"
                    type="number"
                    step="0.01"
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="sourceUrl">Promo URL</label>
                  <input id="sourceUrl" name="sourceUrl" placeholder="https://..." />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="summary">Summary</label>
                  <input
                    id="summary"
                    name="summary"
                    defaultValue="Welcome offer preset with a £10 qualifying bet and a £30 free bet bonus."
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="rawTerms">Raw terms</label>
                  <textarea
                    id="rawTerms"
                    name="rawTerms"
                    defaultValue="Bet £10 and get £30 in free bets. Free bet stakes not included in returns."
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="initialStepNotes">First step note</label>
                  <textarea
                    id="initialStepNotes"
                    name="initialStepNotes"
                    defaultValue="Place the qualifying back bet of £10."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-inner">
              <h2 className="section-title">What happens on submit</h2>
              <p className="section-copy">
                The action creates the bookmaker if needed, inserts the offer, and seeds the standard lifecycle
                steps.
              </p>
              <div style={{ height: 16 }} />
              <div className="timeline">
                {[
                  "Confirm stake model, cash bet or free bet, before any calculation.",
                  "Confirm whether free bet stake is returned, if applicable.",
                  "Confirm market semantics and selection mapping.",
                  "Offer row is inserted with workflow steps.",
                  "You land on the new offer detail page.",
                ].map((note) => (
                  <div className="timeline-item" key={note}>
                    <span className="timeline-marker" />
                    <div className="timeline-body">
                      <div className="timeline-label">{note}</div>
                      <div className="timeline-note">This is the first real write path in the app.</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ height: 16 }} />
              <div className="panel" style={{ marginBottom: 16, background: "rgba(255,255,255,0.03)" }}>
                <div className="panel-inner">
                  <h3 className="section-title" style={{ marginBottom: 8 }}>
                    Offer creation checklist
                  </h3>
                  <div className="timeline">
                    {[
                      "Is this a cash bet or a free bet token?",
                      "If free bet, is stake returned or not returned?",
                      "Does the market mean the same thing on both sides?",
                      "Do bookmaker selection and exchange runner point to the same thing?",
                      "Will the exchange order need to be filled before you continue?",
                    ].map((item) => (
                      <div className="timeline-item" key={item}>
                        <span className="timeline-marker" />
                        <div className="timeline-body">
                          <div className="timeline-label">{item}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button className="button primary" type="submit">
                Create offer
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
