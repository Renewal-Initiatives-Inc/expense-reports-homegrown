import { z } from 'zod'

/**
 * Metadata shape for out-of-pocket expense staging records.
 */
export const outOfPocketMetadataSchema = z.object({
  merchant: z.string(),
  memo: z.string(),
  expenseType: z.literal('out_of_pocket'),
})

/**
 * Metadata shape for mileage expense staging records.
 */
export const mileageMetadataSchema = z.object({
  merchant: z.literal('Mileage Reimbursement'),
  memo: z.string(),
  expenseType: z.literal('mileage'),
  mileageDetails: z.object({
    miles: z.number().positive(),
    rate: z.number().positive(),
    origin: z.string(),
    destination: z.string(),
  }),
})

export const stagingMetadataSchema = z.discriminatedUnion('expenseType', [
  outOfPocketMetadataSchema,
  mileageMetadataSchema,
])

/**
 * Zod schema for a single staging_records INSERT row.
 * Matches the financial-system staging_records table shape.
 */
export const stagingRecordInsertSchema = z.object({
  sourceApp: z.literal('expense_reports'),
  sourceRecordId: z.string().regex(/^er_.+_line_.+$/, 'Must follow er_{reportId}_line_{expenseId} format'),
  recordType: z.literal('expense_line_item'),
  employeeId: z.string().min(1, 'Employee ID (Zitadel sub) is required'),
  referenceId: z.string().uuid('Reference ID must be the expense report UUID'),
  dateIncurred: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal'),
  fundId: z.number().int().positive('Fund ID is required'),
  glAccountId: z.number().int().positive('GL Account ID is required'),
  metadata: stagingMetadataSchema,
})

export type StagingRecordInsert = z.infer<typeof stagingRecordInsertSchema>
export type StagingMetadata = z.infer<typeof stagingMetadataSchema>
export type OutOfPocketMetadata = z.infer<typeof outOfPocketMetadataSchema>
export type MileageMetadata = z.infer<typeof mileageMetadataSchema>
