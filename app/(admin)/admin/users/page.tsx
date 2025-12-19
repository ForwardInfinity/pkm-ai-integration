'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { AdminLayout } from '@/features/admin/components/admin-layout'
import { UserList } from '@/features/admin/components/user-list'

export default function UsersPage() {
  return (
    <AdminLayout>
      <ScrollArea className="h-full">
        <div className="min-h-full">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="px-8 py-5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Users
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Manage user accounts and permissions
              </p>
            </div>
          </header>

          {/* Main Content */}
          <main className="px-8 py-8">
            <UserList />
          </main>
        </div>
      </ScrollArea>
    </AdminLayout>
  )
}
