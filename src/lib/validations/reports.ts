import { z } from 'zod'

export const createReportSchema = z.object({
  name: z.string().max(100, 'Name must be 100 characters or less').optional(),
})

export const updateReportSchema = z.object({
  name: z.string().max(100, 'Name must be 100 characters or less').optional(),
})

export type CreateReportSchema = z.infer<typeof createReportSchema>
export type UpdateReportSchema = z.infer<typeof updateReportSchema>
