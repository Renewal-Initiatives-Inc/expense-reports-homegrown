/**
 * Hardcoded expense categories and projects for fallback when QBO is not connected.
 * These are used as default options and are replaced by QBO data when connected.
 */

export interface ExpenseCategory {
  id: string
  name: string
  type: string
  subType: string
  fullyQualifiedName: string
}

export interface ExpenseProject {
  id: string
  name: string
  fullyQualifiedName: string
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'default-travel',
    name: 'Travel',
    type: 'Expense',
    subType: 'TravelExpense',
    fullyQualifiedName: 'Travel',
  },
  {
    id: 'default-meals',
    name: 'Meals and Entertainment',
    type: 'Expense',
    subType: 'EntertainmentMeals',
    fullyQualifiedName: 'Meals and Entertainment',
  },
  {
    id: 'default-mileage',
    name: 'Auto and Truck Expenses',
    type: 'Expense',
    subType: 'Auto',
    fullyQualifiedName: 'Auto and Truck Expenses',
  },
  {
    id: 'default-office',
    name: 'Office Supplies',
    type: 'Expense',
    subType: 'OfficeGeneralAdministrativeExpenses',
    fullyQualifiedName: 'Office Supplies',
  },
  {
    id: 'default-equipment',
    name: 'Equipment',
    type: 'Expense',
    subType: 'Equipment',
    fullyQualifiedName: 'Equipment',
  },
  {
    id: 'default-other',
    name: 'Other Miscellaneous Expense',
    type: 'Expense',
    subType: 'OtherMiscellaneousExpense',
    fullyQualifiedName: 'Other Miscellaneous Expense',
  },
]

export const EXPENSE_PROJECTS: ExpenseProject[] = [
  {
    id: 'default-general',
    name: 'General',
    fullyQualifiedName: 'General',
  },
]
