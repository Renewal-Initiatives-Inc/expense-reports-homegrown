import { z } from 'zod'

export const expenseTypeEnum = z.enum(['out_of_pocket', 'mileage'])

// Base expense fields shared between both types
const baseExpenseFields = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  memo: z.string().max(500, 'Memo must be 500 characters or less').optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  billable: z.boolean().optional(),
}

// CP5 refinement function
const billableRequiresProject = (data: { billable?: boolean; projectId?: string | null }) => {
  if (data.billable && !data.projectId) {
    return false
  }
  return true
}

const billableRequiresProjectMessage = {
  message: 'Billable flag requires a project to be selected',
  path: ['billable'] as PropertyKey[],
}

/**
 * Schema for creating a new mileage expense.
 * Required fields per R4: origin, destination, date, miles
 * Amount is calculated (miles × IRS rate)
 * Max 999 miles per CP10
 */
export const createMileageExpenseSchema = z
  .object({
    type: z.literal('mileage'),
    ...baseExpenseFields,
    originAddress: z.string().min(1, 'Origin address is required'),
    destinationAddress: z.string().min(1, 'Destination address is required'),
    miles: z.number().positive('Miles must be positive').max(999, 'Maximum 999 miles per trip'),
    amount: z.number().positive('Amount must be positive'),
  })
  .refine(billableRequiresProject, billableRequiresProjectMessage)

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
 * Schema for creating a new out-of-pocket expense.
 * Required fields per R3.10: amount, date, category
 * CP5: billable flag requires project
 */
export const createOutOfPocketExpenseSchema = z
  .object({
    type: z.literal('out_of_pocket'),
    ...baseExpenseFields,
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal number')
      .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
    merchant: z.string().max(200, 'Merchant must be 200 characters or less').optional(),
    categoryId: z.string().min(1, 'Category is required'),
    categoryName: z.string().min(1, 'Category name is required'),
    receiptUrl: z.string().url('Invalid receipt URL').optional(),
    receiptThumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
    aiConfidence: aiConfidenceSchema,
  })
  .refine(billableRequiresProject, billableRequiresProjectMessage)

/**
 * Combined create expense schema using discriminated union
 */
export const createExpenseSchema = z.discriminatedUnion('type', [createMileageExpenseSchema, createOutOfPocketExpenseSchema])

/**
 * Schema for updating a mileage expense.
 * All fields optional except type for discrimination.
 */
export const updateMileageExpenseSchema = z
  .object({
    type: z.literal('mileage'),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional(),
    memo: z.string().max(500, 'Memo must be 500 characters or less').nullable().optional(),
    projectId: z.string().nullable().optional(),
    projectName: z.string().nullable().optional(),
    billable: z.boolean().optional(),
    originAddress: z.string().min(1, 'Origin address is required').optional(),
    destinationAddress: z.string().min(1, 'Destination address is required').optional(),
    miles: z.number().positive('Miles must be positive').max(999, 'Maximum 999 miles per trip').optional(),
    amount: z.number().positive('Amount must be positive').optional(),
  })
  .refine(
    (data) => {
      if (data.billable === true && data.projectId === null) {
        return false
      }
      return true
    },
    {
      message: 'Cannot set billable without a project',
      path: ['billable'],
    }
  )

/**
 * Schema for updating an out-of-pocket expense.
 * All fields optional except type for discrimination.
 * CP5 still enforced.
 */
export const updateOutOfPocketExpenseSchema = z
  .object({
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
    categoryId: z.string().min(1, 'Category is required').optional(),
    categoryName: z.string().min(1, 'Category name is required').optional(),
    projectId: z.string().nullable().optional(),
    projectName: z.string().nullable().optional(),
    billable: z.boolean().optional(),
    receiptUrl: z.string().url('Invalid receipt URL').nullable().optional(),
    receiptThumbnailUrl: z.string().url('Invalid thumbnail URL').nullable().optional(),
    aiConfidence: aiConfidenceSchema,
  })
  .refine(
    (data) => {
      // CP5: if billable is set to true, projectId must also be provided or already exist
      // This is a partial check - full validation happens with existing data in the API
      if (data.billable === true && data.projectId === null) {
        return false
      }
      return true
    },
    {
      message: 'Cannot set billable without a project',
      path: ['billable'],
    }
  )

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
