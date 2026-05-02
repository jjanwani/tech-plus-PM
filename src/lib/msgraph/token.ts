interface TokenCache {
  access_token: string
  expires_at: number
}

let cache: TokenCache | null = null

export async function getMSGraphToken(): Promise<string> {
  if (cache && Date.now() < cache.expires_at) {
    return cache.access_token
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.AZURE_CLIENT_ID!,
    client_secret: process.env.AZURE_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
  })

  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', body: params }
  )

  if (!res.ok) {
    throw new Error(`MS Graph token fetch failed: ${res.status}`)
  }

  const data = await res.json()
  cache = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  }

  return cache.access_token
}
