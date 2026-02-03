export type ReportStatus = 'open' | 'submitted' | 'approved' | 'rejected'

export interface ExpenseReportSummary {
  id: string
  userId: string
  name: string | null
  status: ReportStatus
  expenseCount: number
  totalAmount: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ExpenseReport {
  id: string
  userId: string
  name: string | null
  status: ReportStatus
  submittedAt: Date | null
  reviewedAt: Date | null
  reviewerId: string | null
  reviewerComment: string | null
  qboBillId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateReportInput {
  name?: string
}

export interface UpdateReportInput {
  name?: string
}

export interface ReportCountsByStatus {
  open: number
  submitted: number
  approved: number
  rejected: number
}
