'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from './store'
import { formatDistanceToNow } from 'date-fns'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

import {
  Shield,
  Building2,
  Users,
  Clock,
  FileText,
  UserCog,
  ClipboardCheck,
  Settings,
} from 'lucide-react'

import { Category, Department, UserItem, SLAConfig, AuditLog } from './admin/types'


import dynamic from 'next/dynamic'

// ─── Shared Skeleton ────────────────────────────────────────────────────────
function TabSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-24" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Dynamic Tabs ────────────────────────────────────────────────────────────
const CategoriesTab = dynamic(() => import('./admin/categories-tab'), {
  loading: () => <TabSkeleton />,
})
const DepartmentsTab = dynamic(() => import('./admin/departments-tab'), {
  loading: () => <TabSkeleton />,
})
const UsersTab = dynamic(() => import('./admin/users-tab'), {
  loading: () => <TabSkeleton />,
})
const SLATab = dynamic(() => import('./admin/sla-tab'), {
  loading: () => <TabSkeleton />,
})
const ApprovalsTab = dynamic(() => import('./admin/approvals-tab'), {
  loading: () => <TabSkeleton />,
})
const AuditLogsTab = dynamic(() => import('./admin/audit-tab'), {
  loading: () => <TabSkeleton />,
})
const CustomFieldsTab = dynamic(() => import('./admin/custom-fields-tab'), {
  loading: () => <TabSkeleton />,
})

// ─── Access Guard ────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="rounded-full bg-muted p-4">
        <Shield className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Access Denied</h3>
      <p className="text-sm text-muted-foreground max-w-sm text-center">
        You don&apos;t have permission to access the admin panel. Only administrators and agents can view this section.
      </p>
    </div>
  )
}

// ─── Main Admin View ─────────────────────────────────────────────────────────

export function AdminView() {
  const { adminTab, setAdminTab, user } = useAppStore()

  // Gate access
  if (!user || (user.role !== 'ADMIN' && user.role !== 'AGENT')) {
    return <AccessDenied />
  }

  const TAB_ITEMS = [
    { value: 'categories' as const, label: 'Categories', icon: <Building2 className="h-4 w-4" /> },
    { value: 'departments' as const, label: 'Departments', icon: <Building2 className="h-4 w-4" /> },
    { value: 'users' as const, label: 'Users', icon: <Users className="h-4 w-4" /> },
    { value: 'custom-fields' as const, label: 'Custom Fields', icon: <Settings className="h-4 w-4" /> },
    { value: 'sla' as const, label: 'SLA', icon: <Clock className="h-4 w-4" /> },
    { value: 'approvals' as const, label: 'Approvals', icon: <ClipboardCheck className="h-4 w-4" /> },
    { value: 'audit-logs' as const, label: 'Audit Logs', icon: <FileText className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <UserCog className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage categories, departments, users, and SLA settings</p>
        </div>
      </div>

      <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as typeof adminTab)}>
        <TabsList className="flex-wrap h-auto gap-1">
          {TAB_ITEMS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs sm:text-sm">
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <DepartmentsTab />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>

        <TabsContent value="custom-fields" className="mt-4">
          <CustomFieldsTab />
        </TabsContent>

        <TabsContent value="sla" className="mt-4">
          <SLATab />
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <ApprovalsTab />
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-4">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

