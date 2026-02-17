export type ExpenseType = 'out_of_pocket' | 'mileage'
export type ExpenseSource = 'camera' | 'email'

export interface Expense {
  id: string
  reportId: string
  type: ExpenseType
  amount: string
  date: string
  merchant: string | null
  memo: string | null
  categoryId: string | null
  categoryName: string | null
  projectId: string | null
  projectName: string | null
  billable: boolean
  // Financial system integration
  fundId: number | null
  glAccountId: number | null
  fundName: string | null
  glAccountName: string | null
  receiptUrl: string | null
  receiptThumbnailUrl: string | null
  originAddress: string | null
  destinationAddress: string | null
  miles: string | null
  aiConfidence: Record<string, number> | null
  // Email receipt fields (Phase 13)
  source: ExpenseSource
  emailReceivedAt: Date | null
  emailMessageId: string | null
  duplicateFlag: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateExpenseInput {
  type: ExpenseType
  amount: string
  date: string
  merchant?: string
  memo?: string
  categoryId?: string
  categoryName?: string
  projectId?: string
  projectName?: string
  billable?: boolean
  // Financial system integration
  fundId?: number
  glAccountId?: number
  fundName?: string
  glAccountName?: string
  receiptUrl?: string
  receiptThumbnailUrl?: string
  // Mileage-specific fields
  originAddress?: string
  destinationAddress?: string
  miles?: string
  // AI confidence for receipt extraction
  aiConfidence?: Record<string, number>
}

export interface UpdateExpenseInput {
  amount?: string
  date?: string
  merchant?: string
  memo?: string
  categoryId?: string
  categoryName?: string
  projectId?: string
  projectName?: string
  billable?: boolean
  // Financial system integration
  fundId?: number | null
  glAccountId?: number | null
  fundName?: string | null
  glAccountName?: string | null
  receiptUrl?: string
  receiptThumbnailUrl?: string
  // Mileage-specific fields
  originAddress?: string
  destinationAddress?: string
  miles?: string
  // AI confidence for receipt extraction
  aiConfidence?: Record<string, number>
}
