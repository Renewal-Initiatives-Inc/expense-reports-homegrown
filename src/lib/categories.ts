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
    id: 'default-property-taxes',
    name: 'Property Taxes',
    type: 'Expense',
    subType: 'PropertyTax',
    fullyQualifiedName: 'Property Taxes',
  },
  {
    id: 'default-property-insurance',
    name: 'Property Insurance',
    type: 'Expense',
    subType: 'Insurance',
    fullyQualifiedName: 'Property Insurance',
  },
  {
    id: 'default-management-fees',
    name: 'Management Fees',
    type: 'Expense',
    subType: 'ManagementFees',
    fullyQualifiedName: 'Management Fees',
  },
  {
    id: 'default-commissions',
    name: 'Commissions',
    type: 'Expense',
    subType: 'Commissions',
    fullyQualifiedName: 'Commissions',
  },
  {
    id: 'default-landscaping',
    name: 'Landscaping & Grounds',
    type: 'Expense',
    subType: 'Landscaping',
    fullyQualifiedName: 'Landscaping & Grounds',
  },
  {
    id: 'default-repairs',
    name: 'Repairs & Maintenance',
    type: 'Expense',
    subType: 'RepairMaintenance',
    fullyQualifiedName: 'Repairs & Maintenance',
  },
  {
    id: 'default-utilities-electric',
    name: 'Utilities - Electric',
    type: 'Expense',
    subType: 'Utilities',
    fullyQualifiedName: 'Utilities - Electric',
  },
  {
    id: 'default-utilities-gas',
    name: 'Utilities - Gas',
    type: 'Expense',
    subType: 'Utilities',
    fullyQualifiedName: 'Utilities - Gas',
  },
  {
    id: 'default-utilities-water',
    name: 'Utilities - Water/Sewer',
    type: 'Expense',
    subType: 'Utilities',
    fullyQualifiedName: 'Utilities - Water/Sewer',
  },
  {
    id: 'default-utilities-internet',
    name: 'Utilities - Internet',
    type: 'Expense',
    subType: 'Utilities',
    fullyQualifiedName: 'Utilities - Internet',
  },
  {
    id: 'default-utilities-security',
    name: 'Utilities - Security & Fire Monitoring',
    type: 'Expense',
    subType: 'Utilities',
    fullyQualifiedName: 'Utilities - Security & Fire Monitoring',
  },
  {
    id: 'default-utilities-trash',
    name: 'Utilities - Trash',
    type: 'Expense',
    subType: 'Utilities',
    fullyQualifiedName: 'Utilities - Trash',
  },
  {
    id: 'default-salaries',
    name: 'Salaries & Wages',
    type: 'Expense',
    subType: 'Payroll',
    fullyQualifiedName: 'Salaries & Wages',
  },
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
    id: 'default-professional-services',
    name: 'Professional Services',
    type: 'Expense',
    subType: 'ProfessionalServices',
    fullyQualifiedName: 'Professional Services',
  },
  {
    id: 'default-software',
    name: 'Software and Subscriptions',
    type: 'Expense',
    subType: 'Software',
    fullyQualifiedName: 'Software and Subscriptions',
  },
  {
    id: 'default-cip',
    name: 'Construction in Progress',
    type: 'Expense',
    subType: 'CapitalExpenditure',
    fullyQualifiedName: 'Construction in Progress',
  },
  {
    id: 'default-other',
    name: 'Other Operating Costs',
    type: 'Expense',
    subType: 'OtherMiscellaneousExpense',
    fullyQualifiedName: 'Other Operating Costs',
  },
]

export const EXPENSE_PROJECTS: ExpenseProject[] = [
  {
    id: 'default-general',
    name: 'General',
    fullyQualifiedName: 'General',
  },
]
