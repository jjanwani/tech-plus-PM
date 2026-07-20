import { redirect } from 'next/navigation'
import { ADMIN_FILE_CATEGORIES } from '@/types'

export default function AdminFilesPage() {
  redirect(`/admin/files/${ADMIN_FILE_CATEGORIES[0]}`)
}
