import { getMSGraphToken } from './token'

const DRIVE_ID = process.env.MSGRAPH_DRIVE_ID!
const ROOT_FOLDER_ID = process.env.MSGRAPH_ROOT_FOLDER_ID!
const BASE = 'https://graph.microsoft.com/v1.0'

async function graphFetch(path: string, options: RequestInit = {}) {
  const token = await getMSGraphToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph API error ${res.status}: ${text}`)
  }
  return res
}

export interface DriveItemResult {
  id: string
  name: string
  size: number
  webUrl: string
  file?: { mimeType: string }
  '@microsoft.graph.downloadUrl'?: string
}

export async function uploadFile(
  folderItemId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<DriveItemResult> {
  const encodedName = encodeURIComponent(fileName)
  const path = `/drives/${DRIVE_ID}/items/${folderItemId}:/${encodedName}:/content`

  const res = await graphFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: buffer as unknown as BodyInit,
  })

  return res.json()
}

export async function createFolder(
  parentFolderId: string,
  folderName: string
): Promise<DriveItemResult> {
  const res = await graphFetch(`/drives/${DRIVE_ID}/items/${parentFolderId}/children`, {
    method: 'POST',
    body: JSON.stringify({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    }),
  })
  return res.json()
}

export async function ensureProjectFolder(projectKey: string): Promise<string> {
  const res = await graphFetch(
    `/drives/${DRIVE_ID}/items/${ROOT_FOLDER_ID}/children?$filter=name eq '${projectKey}'`
  )
  const data = await res.json()

  if (data.value?.length > 0) {
    return data.value[0].id
  }

  const folder = await createFolder(ROOT_FOLDER_ID, projectKey)
  return folder.id
}

export async function deleteFile(itemId: string): Promise<void> {
  await graphFetch(`/drives/${DRIVE_ID}/items/${itemId}`, { method: 'DELETE' })
}

export async function listFolder(folderId: string): Promise<DriveItemResult[]> {
  const res = await graphFetch(`/drives/${DRIVE_ID}/items/${folderId}/children`)
  const data = await res.json()
  return data.value ?? []
}
