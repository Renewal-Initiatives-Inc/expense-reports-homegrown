import { z } from 'zod'

export const createReportSchema = z.object({
  name: z.string().max(100, 'Name must be 100 characters or less').optional(),
})

export const updateReportSchema = z.object({
  name: z.string().max(100, 'Name must be 100 characters or less').optional(),
})

export const approveReportSchema = z.object({
  comment: z.string().max(1000, 'Comment must be 1000 characters or less').optional(),
})

export const rejectReportSchema = z.object({
  comment: z.string().min(1, 'Rejection reason is required').max(1000, 'Comment must be 1000 characters or less'),
})

export type CreateReportSchema = z.infer<typeof createReportSchema>
export type UpdateReportSchema = z.infer<typeof updateReportSchema>
export type ApproveReportSchema = z.infer<typeof approveReportSchema>
export type RejectReportSchema = z.infer<typeof rejectReportSchema>
