import { z } from 'zod'

export const expenseTypeEnum = z.enum(['out_of_pocket', 'mileage'])

// Financial system fields shared between both types
const financialFields = {
  fundId: z.number().int().positive('Funding source is required'),
  fundName: z.string().min(1),
  glAccountId: z.number().int().positive('GL account is required').optional(),
  glAccountName: z.string().optional(),
}

// Base expense fields shared between both types
const baseExpenseFields = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  memo: z.string().max(500, 'Memo must be 500 characters or less').optional(),
  // Legacy fields (kept for backward compat, not required for new expenses)
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  billable: z.boolean().optional(),
}

// AI confidence schema for receipt extraction results
const aiConfidenceSchema = z
  .object({
    merchant: z.number().min(0).max(1).optional(),
    amount: z.number().min(0).max(1).optional(),
    date: z.number().min(0).max(1).optional(),
    category: z.number().min(0).max(1).optional(),
  })
  .optional()

/**
 * Schema for creating a new mileage expense.
 */
export const createMileageExpenseSchema = z.object({
  type: z.literal('mileage'),
  ...baseExpenseFields,
  ...financialFields,
  originAddress: z.string().min(1, 'Origin address is required'),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  miles: z.number().positive('Miles must be positive').max(999, 'Maximum 999 miles per trip'),
  amount: z.number().positive('Amount must be positive'),
})

/**
 * Schema for creating a new out-of-pocket expense.
 */
export const createOutOfPocketExpenseSchema = z.object({
  type: z.literal('out_of_pocket'),
  ...baseExpenseFields,
  ...financialFields,
  glAccountId: z.number().int().positive('GL account is required'),
  glAccountName: z.string().min(1, 'GL account name is required'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal number')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
  merchant: z.string().max(200, 'Merchant must be 200 characters or less').optional(),
  // Legacy category fields (still accepted for backward compat)
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  receiptUrl: z.string().url('Invalid receipt URL').optional(),
  receiptThumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
  aiConfidence: aiConfidenceSchema,
})

/**
 * Combined create expense schema using discriminated union
 */
export const createExpenseSchema = z.discriminatedUnion('type', [createMileageExpenseSchema, createOutOfPocketExpenseSchema])

/**
 * Schema for updating a mileage expense.
 */
export const updateMileageExpenseSchema = z.object({
  type: z.literal('mileage'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  memo: z.string().max(500, 'Memo must be 500 characters or less').nullable().optional(),
  fundId: z.number().int().positive().optional(),
  fundName: z.string().optional(),
  glAccountId: z.number().int().positive().nullable().optional(),
  glAccountName: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  billable: z.boolean().optional(),
  originAddress: z.string().min(1, 'Origin address is required').optional(),
  destinationAddress: z.string().min(1, 'Destination address is required').optional(),
  miles: z.number().positive('Miles must be positive').max(999, 'Maximum 999 miles per trip').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
})

/**
 * Schema for updating an out-of-pocket expense.
 */
export const updateOutOfPocketExpenseSchema = z.object({
  type: z.literal('out_of_pocket'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal number')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0')
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  merchant: z.string().max(200, 'Merchant must be 200 characters or less').nullable().optional(),
  memo: z.string().max(500, 'Memo must be 500 characters or less').nullable().optional(),
  categoryId: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  fundId: z.number().int().positive().optional(),
  fundName: z.string().optional(),
  glAccountId: z.number().int().positive().nullable().optional(),
  glAccountName: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  billable: z.boolean().optional(),
  receiptUrl: z.string().url('Invalid receipt URL').nullable().optional(),
  receiptThumbnailUrl: z.string().url('Invalid thumbnail URL').nullable().optional(),
  aiConfidence: aiConfidenceSchema,
})

/**
 * Combined update expense schema using discriminated union
 */
export const updateExpenseSchema = z.discriminatedUnion('type', [updateMileageExpenseSchema, updateOutOfPocketExpenseSchema])

// Type exports
export type CreateMileageExpenseSchema = z.infer<typeof createMileageExpenseSchema>
export type CreateOutOfPocketExpenseSchema = z.infer<typeof createOutOfPocketExpenseSchema>
export type CreateExpenseSchema = z.infer<typeof createExpenseSchema>
export type UpdateMileageExpenseSchema = z.infer<typeof updateMileageExpenseSchema>
export type UpdateOutOfPocketExpenseSchema = z.infer<typeof updateOutOfPocketExpenseSchema>
export type UpdateExpenseSchema = z.infer<typeof updateExpenseSchema>
