import { z } from 'zod'

export const mileageRateSchema = z.object({
  rate: z.number().positive('Rate must be positive').max(10, 'Rate seems too high'),
  effectiveDate: z.string().date('Must be a valid date in YYYY-MM-DD format'),
})

export type MileageRateSchema = z.infer<typeof mileageRateSchema>
