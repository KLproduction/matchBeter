import Link from "next/link"
import { getOffers } from "@/lib/offer-store"
import { formatDate, formatMoney } from "@/lib/offers"

export const dynamic = "force-dynamic"

function statusClass(status: string) {
  if (status === "active" || status === "completed") return "success"
  if (status === "draft") return "warning"
  return "danger"
}

export default async function OffersPage() {
  const offers = await getOffers()

  return (
    <main>
      <div className="shell">
        <div className="panel">
          <div className="panel-inner">
            <div className="actions" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="kicker">Offers</div>
                <h1 className="title" style={{ fontSize: "2.4rem", maxWidth: "none" }}>
                  The workflow lives here.
                </h1>
                <p className="lede">
                  This dashboard reads from Postgres. If there are no records yet, it shows an empty state.
                </p>
              </div>
              <Link className="button primary" href="/offers/new">
                Create offer
              </Link>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-inner" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Bookmaker</th>
                  <th>Offer</th>
                  <th>Status</th>
                  <th>Expiry</th>
                  <th>Current step</th>
                  <th>EV</th>
                </tr>
              </thead>
              <tbody>
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <p className="section-copy" style={{ margin: 0 }}>
                        No offers yet. Create one to start tracking real back and lay data.
                      </p>
                    </td>
                  </tr>
                ) : (
                  offers.map((offer) => (
                    <tr key={offer.id}>
                      <td>{offer.bookmaker}</td>
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <Link className="timeline-label" href={`/offers/${offer.id}`}>
                            {offer.title}
                          </Link>
                          <span className="muted">{offer.offerType}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${statusClass(offer.status)}`}>{offer.status}</span>
                      </td>
                      <td>{formatDate(offer.expiresAt)}</td>
                      <td>{offer.currentStep}</td>
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span>{formatMoney(offer.expectedProfit)}</span>
                          {typeof offer.actualProfit === "number" ? (
                            <span className="muted">Actual {formatMoney(offer.actualProfit)}</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
