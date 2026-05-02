'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { TemplateForm } from './template-form'

export function TemplateFormModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleCreated() {
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d5a8e] transition-colors">
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Add Template
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>
          <TemplateForm onCreated={handleCreated} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
