import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard · FirstStep' }

export default async function AppPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <Dashboard />
}
