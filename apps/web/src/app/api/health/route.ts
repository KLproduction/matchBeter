export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL)

  return Response.json({
    status: "ok",
    databaseConfigured,
    timestamp: new Date().toISOString(),
  })
}
