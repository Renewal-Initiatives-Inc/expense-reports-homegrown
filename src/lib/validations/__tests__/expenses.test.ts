import { describe, expect, it } from 'vitest'
import {
  createExpenseSchema,
  createMileageExpenseSchema,
  createOutOfPocketExpenseSchema,
  updateExpenseSchema,
  updateOutOfPocketExpenseSchema,
} from '../expenses'

describe('Expense Validation Schemas', () => {
  describe('createOutOfPocketExpenseSchema', () => {
    const validOutOfPocket = {
      type: 'out_of_pocket' as const,
      amount: '25.50',
      date: '2024-01-15',
      categoryId: 'cat-123',
      categoryName: 'Travel',
    }

    it('should validate a valid out-of-pocket expense', () => {
      const result = createOutOfPocketExpenseSchema.safeParse(validOutOfPocket)
      expect(result.success).toBe(true)
    })

    it('should require amount', () => {
      const { amount: _amount, ...withoutAmount } = validOutOfPocket
      const result = createOutOfPocketExpenseSchema.safeParse(withoutAmount)
      expect(result.success).toBe(false)
    })

    it('should require positive amount', () => {
      const result = createOutOfPocketExpenseSchema.safeParse({
        ...validOutOfPocket,
        amount: '0',
      })
      expect(result.success).toBe(false)
    })

    it('should require valid decimal format for amount', () => {
      const result = createOutOfPocketExpenseSchema.safeParse({
        ...validOutOfPocket,
        amount: '12.345',
      })
      expect(result.success).toBe(false)
    })

    it('should require date', () => {
      const { date: _date, ...withoutDate } = validOutOfPocket
      const result = createOutOfPocketExpenseSchema.safeParse(withoutDate)
      expect(result.success).toBe(false)
    })

    it('should require date in YYYY-MM-DD format', () => {
      const result = createOutOfPocketExpenseSchema.safeParse({
        ...validOutOfPocket,
        date: '01/15/2024',
      })
      expect(result.success).toBe(false)
    })

    it('should require categoryId', () => {
      const { categoryId: _categoryId, ...withoutCategoryId } = validOutOfPocket
      const result = createOutOfPocketExpenseSchema.safeParse(withoutCategoryId)
      expect(result.success).toBe(false)
    })

    it('should require categoryName', () => {
      const { categoryName: _categoryName, ...withoutCategoryName } = validOutOfPocket
      const result = createOutOfPocketExpenseSchema.safeParse(withoutCategoryName)
      expect(result.success).toBe(false)
    })

    it('should accept optional fields', () => {
      const result = createOutOfPocketExpenseSchema.safeParse({
        ...validOutOfPocket,
        merchant: 'Starbucks',
        memo: 'Coffee with client',
        projectId: 'proj-123',
        projectName: 'Project A',
        billable: true,
        receiptUrl: 'https://example.com/receipt.jpg',
      })
      expect(result.success).toBe(true)
    })

    it('should enforce CP5: billable requires project', () => {
      const result = createOutOfPocketExpenseSchema.safeParse({
        ...validOutOfPocket,
        billable: true,
        // No projectId
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('billable')
      }
    })

    it('should allow billable when project is provided', () => {
      const result = createOutOfPocketExpenseSchema.safeParse({
        ...validOutOfPocket,
        projectId: 'proj-123',
        projectName: 'Project A',
        billable: true,
      })
      expect(result.success).toBe(true)
    })

    it('should reject merchant over 200 characters', () => {
      const result = createOutOfPocketExpenseSchema.safeParse({
        ...validOutOfPocket,
        merchant: 'A'.repeat(201),
      })
      expect(result.success).toBe(false)
    })

    it('should reject memo over 500 characters', () => {
      const result = createOutOfPocketExpenseSchema.safeParse({
        ...validOutOfPocket,
        memo: 'A'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createMileageExpenseSchema', () => {
    const validMileage = {
      type: 'mileage' as const,
      date: '2024-01-15',
      originAddress: '123 Main St, City, ST',
      destinationAddress: '456 Oak Ave, Town, ST',
      miles: 25.5,
      amount: 17.34,
    }

    it('should validate a valid mileage expense', () => {
      const result = createMileageExpenseSchema.safeParse(validMileage)
      expect(result.success).toBe(true)
    })

    it('should require originAddress', () => {
      const { originAddress: _originAddress, ...without } = validMileage
      const result = createMileageExpenseSchema.safeParse(without)
      expect(result.success).toBe(false)
    })

    it('should require destinationAddress', () => {
      const { destinationAddress: _destinationAddress, ...without } = validMileage
      const result = createMileageExpenseSchema.safeParse(without)
      expect(result.success).toBe(false)
    })

    it('should require miles', () => {
      const { miles: _miles, ...without } = validMileage
      const result = createMileageExpenseSchema.safeParse(without)
      expect(result.success).toBe(false)
    })

    it('should require positive miles', () => {
      const result = createMileageExpenseSchema.safeParse({
        ...validMileage,
        miles: -10,
      })
      expect(result.success).toBe(false)
    })

    it('should enforce max 999 miles (CP10)', () => {
      const result = createMileageExpenseSchema.safeParse({
        ...validMileage,
        miles: 1000,
      })
      expect(result.success).toBe(false)
    })

    it('should allow 999 miles', () => {
      const result = createMileageExpenseSchema.safeParse({
        ...validMileage,
        miles: 999,
        amount: 679.32,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('createExpenseSchema (discriminated union)', () => {
    it('should accept out_of_pocket expense', () => {
      const result = createExpenseSchema.safeParse({
        type: 'out_of_pocket',
        amount: '25.50',
        date: '2024-01-15',
        categoryId: 'cat-123',
        categoryName: 'Travel',
      })
      expect(result.success).toBe(true)
    })

    it('should accept mileage expense', () => {
      const result = createExpenseSchema.safeParse({
        type: 'mileage',
        date: '2024-01-15',
        originAddress: '123 Main St',
        destinationAddress: '456 Oak Ave',
        miles: 25.5,
        amount: 17.34,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid type', () => {
      const result = createExpenseSchema.safeParse({
        type: 'invalid',
        amount: '25.50',
        date: '2024-01-15',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateOutOfPocketExpenseSchema', () => {
    it('should allow partial updates', () => {
      const result = updateOutOfPocketExpenseSchema.safeParse({
        type: 'out_of_pocket',
        amount: '30.00',
      })
      expect(result.success).toBe(true)
    })

    it('should enforce CP5 on update: cannot set billable true with null projectId', () => {
      const result = updateOutOfPocketExpenseSchema.safeParse({
        type: 'out_of_pocket',
        billable: true,
        projectId: null,
      })
      expect(result.success).toBe(false)
    })

    it('should allow billable with projectId on update', () => {
      const result = updateOutOfPocketExpenseSchema.safeParse({
        type: 'out_of_pocket',
        billable: true,
        projectId: 'proj-123',
      })
      expect(result.success).toBe(true)
    })

    it('should allow nullable fields', () => {
      const result = updateOutOfPocketExpenseSchema.safeParse({
        type: 'out_of_pocket',
        merchant: null,
        memo: null,
        projectId: null,
        receiptUrl: null,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateExpenseSchema (discriminated union)', () => {
    it('should accept out_of_pocket update', () => {
      const result = updateExpenseSchema.safeParse({
        type: 'out_of_pocket',
        amount: '50.00',
      })
      expect(result.success).toBe(true)
    })

    it('should accept mileage update', () => {
      const result = updateExpenseSchema.safeParse({
        type: 'mileage',
        miles: 30,
      })
      expect(result.success).toBe(true)
    })
  })
})
