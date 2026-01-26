"use client"

import { useState, useEffect } from "react"
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs"
import {
  Users,
  Crown,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Search,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  Mic2,
  Split,
  FileText
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ADMIN_EMAIL = 'coreypearsonemail@gmail.com'

interface Credits {
  transcription: number
  speakerSplit: number
  documents: number
}

interface UserData {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  tier: 'free' | 'pro'
  gumroadSubscriptionId: string | null
  tierUpdatedAt: string | null
  credits: Credits
  creditsUsed: Credits
  creditsRemaining: Credits
  createdAt: number
  lastSignInAt: number | null
  imageUrl: string
  hasPassword: boolean
  externalAccounts: Array<{
    provider: string
    email: string
  }>
}

function UserCard({
  user,
  onUpgrade,
  onDowngrade,
  isUpdating
}: {
  user: UserData
  onUpgrade: () => void
  onDowngrade: () => void
  isUpdating: boolean
}) {
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const isPro = user.tier === 'pro'
  const isAdmin = user.email === ADMIN_EMAIL

  return (
    <Card className={cn(
      "border-2 transition-all",
      isPro ? "border-amber-300 dark:border-amber-600" : "border-slate-200 dark:border-slate-700",
      isAdmin && "ring-2 ring-purple-500"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={user.imageUrl}
              alt={user.firstName || user.email}
              className="w-12 h-12 rounded-full object-cover"
            />
            {isPro && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}
            {isAdmin && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {user.firstName || user.lastName
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                  : 'No Name'}
              </h3>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                isPro
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}>
                {isPro ? 'Pro' : 'Free'}
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  Admin
                </span>
              )}
            </div>

            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>

              {user.phone && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Joined: {formatDate(user.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>Last sign in: {formatDate(user.lastSignInAt)}</span>
              </div>

              {/* Auth methods */}
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>
                  Auth: {user.hasPassword ? 'Password' : ''}
                  {user.externalAccounts.length > 0 && (
                    <>
                      {user.hasPassword && ', '}
                      {user.externalAccounts.map(acc => acc.provider).join(', ')}
                    </>
                  )}
                </span>
              </div>

              {user.gumroadSubscriptionId && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs">Gumroad: {user.gumroadSubscriptionId}</span>
                </div>
              )}
            </div>

            {/* Credits Display */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Credits Usage</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Mic2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1" />
                  <div className="text-center">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {user.creditsRemaining.transcription}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      /{isPro ? 100 : 10}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Transcribe</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20">
                  <Split className="w-4 h-4 text-teal-600 dark:text-teal-400 mb-1" />
                  <div className="text-center">
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                      {user.creditsRemaining.speakerSplit}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      /{isPro ? 100 : 10}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Split</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1" />
                  <div className="text-center">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {user.creditsRemaining.documents}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      /{isPro ? 100 : 10}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Docs</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                Used: {user.creditsUsed.transcription} transcriptions, {user.creditsUsed.speakerSplit} splits, {user.creditsUsed.documents} docs
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {isPro ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onDowngrade}
                disabled={isUpdating || isAdmin}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                {isUpdating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Downgrade
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onUpgrade}
                disabled={isUpdating}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isUpdating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-1" />
                    Upgrade
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminContent() {
  const { user } = useUser()
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTier, setFilterTier] = useState<'all' | 'free' | 'pro'>('all')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL

  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const updateUserTier = async (targetUserId: string, tier: 'free' | 'pro') => {
    setUpdatingUserId(targetUserId)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, tier }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      // Update local state
      setUsers(users.map(u =>
        u.id === targetUserId ? { ...u, tier } : u
      ))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (u.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (u.phone || '').includes(searchQuery)

    const matchesTier = filterTier === 'all' || u.tier === filterTier

    return matchesSearch && matchesTier
  })

  const stats = {
    total: users.length,
    pro: users.filter(u => u.tier === 'pro').length,
    free: users.filter(u => u.tier === 'free').length,
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Card className="max-w-md mx-4">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You don't have permission to access the admin panel.
            </p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Card className="max-w-md mx-4">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Error Loading Users
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <Button onClick={fetchUsers}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-purple-500" />
              Admin Panel
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm sm:text-base">
              Manage users and subscriptions
            </p>
          </div>

          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Total Users</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pro}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Pro Users</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.free}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Free Users</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex gap-2">
            {(['all', 'pro', 'free'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={cn(
                  "px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors flex-1 sm:flex-none",
                  filterTier === tier
                    ? tier === 'pro'
                      ? "bg-amber-500 text-white"
                      : "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {tier === 'all' ? 'All' : tier === 'pro' ? 'Pro' : 'Free'}
              </button>
            ))}
          </div>
        </div>

        {/* Password Note */}
        <div className="mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Security Note:</strong> User passwords cannot be viewed. Clerk stores only secure hashes for security reasons. You can see authentication methods (Password, Google, etc.) but not actual credentials.
            </div>
          </div>
        </div>

        {/* User List */}
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 sm:py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No users found
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery || filterTier !== 'all'
                  ? "Try adjusting your search or filter"
                  : "No users have signed up yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredUsers.map(userItem => (
              <UserCard
                key={userItem.id}
                user={userItem}
                onUpgrade={() => updateUserTier(userItem.id, 'pro')}
                onDowngrade={() => updateUserTier(userItem.id, 'free')}
                isUpdating={updatingUserId === userItem.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <>
      <SignedIn>
        <AdminContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}
