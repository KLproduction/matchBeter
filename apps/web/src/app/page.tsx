import Link from "next/link"
import { getOffers } from "@/lib/offer-store"
import { formatDate, formatMoney } from "@/lib/offers"

export default async function HomePage() {
  const offers = await getOffers()
  const activeOffers = offers.filter((offer) => offer.status === "active").length
  const completedOffers = offers.filter((offer) => offer.status === "completed").length

  return (
    <main>
      <div className="shell">
        <section className="hero">
          <div className="panel">
            <div className="panel-inner">
              <div className="kicker">Matched betting control room</div>
              <h1 className="title">Track offers first. Then automate the boring parts.</h1>
              <p className="lede">
                This scaffold sets up the web app boundary, Prisma schema, and first workflow screens for
                offers, bets, and lay matching. The worker comes later. The workflow is the product.
              </p>
              <div className="actions">
                <Link className="button primary" href="/offers">
                  Open offers
                </Link>
                <Link className="button" href="/offers/new">
                  Create offer
                </Link>
                <Link className="button" href="/api/health">
                  Health check
                </Link>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-inner grid">
              <div className="metric">
                <div className="metric-label">Active offers</div>
                <div className="metric-value">{activeOffers}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Completed offers</div>
                <div className="metric-value">{completedOffers}</div>
              </div>
            <div className="metric">
              <div className="metric-label">Next expiry</div>
              <div className="metric-value">{formatDate(offers[0]?.expiresAt)}</div>
            </div>
          </div>
        </div>
        </section>

        <section className="split">
          <div className="panel">
            <div className="panel-inner">
              <h2 className="section-title">What this first slice does</h2>
              <p className="section-copy">
                It gives you a working route structure, a real schema, and a visible offer workflow. The app
                now has a place to grow into instead of a pile of scripts.
              </p>
              <div style={{ height: 16 }} />
              <div className="timeline">
                {[
                  ["Offer-first model", "Templates and workflows are centered on the offer, not a lone bet."],
                  ["Prisma schema", "Core entities are defined for Postgres and the worker boundary."],
                  ["Demo workflow UI", "The routes already show how the real screens will behave."],
                ].map(([label, note]) => (
                  <div className="timeline-item" key={label}>
                    <span className="timeline-marker" />
                    <div className="timeline-body">
                      <div className="timeline-label">{label}</div>
                      <div className="timeline-note">{note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-inner">
              <h2 className="section-title">Recent offers</h2>
              <p className="section-copy">These are live records from Postgres.</p>
              <div style={{ height: 16 }} />
              <div className="grid">
                {offers.length === 0 ? (
                  <p className="section-copy">No offers yet.</p>
                ) : (
                  offers.slice(0, 3).map((offer) => (
                    <Link key={offer.id} className="timeline-item" href={`/offers/${offer.id}`}>
                      <div className="timeline-body">
                        <div className="timeline-label">
                          {offer.bookmaker} - {offer.title}
                        </div>
                        <div className="timeline-note">
                          {offer.currentStep} . {formatMoney(offer.expectedProfit)}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
