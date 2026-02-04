import { expect, test } from '@playwright/test'

/**
 * E2E Tests for Report Filtering
 *
 * These tests verify the report filtering functionality including:
 * 1. Status filter dropdown
 * 2. Date range picker
 * 3. URL parameter persistence
 * 4. Clear filters functionality
 */

test.describe('Report Filtering UI', () => {
  test('filter controls are visible on reports page', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    const filters = page.getByTestId('report-filters')
    await expect(filters).toBeVisible()

    const statusFilter = page.getByTestId('status-filter')
    await expect(statusFilter).toBeVisible()

    const dateRangeTrigger = page.getByTestId('date-range-trigger')
    await expect(dateRangeTrigger).toBeVisible()
  })

  test('status filter shows all options', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Open status dropdown
    await page.getByTestId('status-filter').click()

    // Verify all options are present
    await expect(page.getByTestId('status-option-all')).toBeVisible()
    await expect(page.getByTestId('status-option-open')).toBeVisible()
    await expect(page.getByTestId('status-option-submitted')).toBeVisible()
    await expect(page.getByTestId('status-option-approved')).toBeVisible()
    await expect(page.getByTestId('status-option-rejected')).toBeVisible()
  })
})

test.describe('Status Filter Functionality', () => {
  test('selecting status updates URL', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Open and select "Open" status
    await page.getByTestId('status-filter').click()
    await page.getByTestId('status-option-open').click()

    // URL should contain status param
    await page.waitForURL(/status=open/)
    expect(page.url()).toContain('status=open')
  })

  test('status filter persists in URL', async ({ page }) => {
    await page.goto('/reports?status=approved')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Status filter should show "Approved"
    const statusFilter = page.getByTestId('status-filter')
    await expect(statusFilter).toContainText('Approved')
  })

  test('filtering by status shows matching reports', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Apply status filter
    await page.getByTestId('status-filter').click()
    await page.getByTestId('status-option-open').click()

    await page.waitForURL(/status=open/)

    // Either we have matching reports or empty state
    const tableCard = page.getByTestId('reports-table-card')
    const emptyState = page.getByTestId('empty-state')

    const hasTable = await tableCard.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasTable || hasEmpty).toBe(true)
  })
})

test.describe('Date Range Filter Functionality', () => {
  test('date range picker opens on click', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Click date range trigger
    await page.getByTestId('date-range-trigger').click()

    // Popover should be visible
    const popover = page.getByTestId('date-range-popover')
    await expect(popover).toBeVisible()
  })

  test('preset buttons are available', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('date-range-trigger').click()

    // Check preset buttons
    await expect(page.getByTestId('date-preset-this-week')).toBeVisible()
    await expect(page.getByTestId('date-preset-this-month')).toBeVisible()
    await expect(page.getByTestId('date-preset-last-30')).toBeVisible()
    await expect(page.getByTestId('date-preset-this-year')).toBeVisible()
  })

  test('selecting preset updates URL', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('date-range-trigger').click()
    await page.getByTestId('date-preset-this-month').click()

    // URL should contain date params
    await page.waitForURL(/from=/)
    expect(page.url()).toContain('from=')
    expect(page.url()).toContain('to=')
  })

  test('custom date inputs work', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('date-range-trigger').click()

    // Click custom range to show date inputs
    await page.getByTestId('date-preset-custom').click()

    // Fill in date inputs
    const fromInput = page.getByTestId('date-from-input')
    const toInput = page.getByTestId('date-to-input')

    await fromInput.fill('2025-01-01')
    await toInput.fill('2025-01-31')

    // Close picker by clicking elsewhere
    await page.keyboard.press('Escape')

    // URL should update
    expect(page.url()).toContain('from=2025-01-01')
    expect(page.url()).toContain('to=2025-01-31')
  })
})

test.describe('Clear Filters Functionality', () => {
  test('clear button appears when filters active', async ({ page }) => {
    await page.goto('/reports?status=open')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    const clearButton = page.getByTestId('clear-filters-button')
    await expect(clearButton).toBeVisible()
  })

  test('clear button removes all filters', async ({ page }) => {
    await page.goto('/reports?status=open&from=2025-01-01')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('clear-filters-button').click()

    // URL should be clean
    await page.waitForURL('/reports')
    expect(page.url()).not.toContain('status=')
    expect(page.url()).not.toContain('from=')
  })

  test('clear button disappears after clearing', async ({ page }) => {
    await page.goto('/reports?status=open')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('clear-filters-button').click()
    await page.waitForURL('/reports')

    const clearButton = page.getByTestId('clear-filters-button')
    await expect(clearButton).not.toBeVisible()
  })
})

test.describe('Combined Filters', () => {
  test('status and date filters work together', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Set status filter
    await page.getByTestId('status-filter').click()
    await page.getByTestId('status-option-approved').click()
    await page.waitForURL(/status=approved/)

    // Set date filter
    await page.getByTestId('date-range-trigger').click()
    await page.getByTestId('date-preset-this-month').click()

    // Both should be in URL
    await page.waitForURL(/status=approved/)
    expect(page.url()).toContain('status=approved')
    expect(page.url()).toContain('from=')
  })

  test('clear filter count shows number of active filters', async ({ page }) => {
    await page.goto('/reports?status=open&from=2025-01-01')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    const clearButton = page.getByTestId('clear-filters-button')
    await expect(clearButton).toContainText('(2)')
  })
})

test.describe('Empty State with Filters', () => {
  test('shows filter-specific empty state when no results', async ({ page }) => {
    // Use a very specific filter that likely returns no results
    await page.goto('/reports?status=approved&from=2099-01-01&to=2099-12-31')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Either shows empty state or reports (if user has reports in that range)
    const emptyState = page.getByTestId('empty-state')
    const hasEmptyState = await emptyState.isVisible().catch(() => false)

    if (hasEmptyState) {
      // Should show filter-specific message
      await expect(emptyState).toContainText('No matching reports')
    }
  })
})

test.describe('URL Navigation', () => {
  test('browser back button restores previous filters', async ({ page }) => {
    await page.goto('/reports')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Apply filter
    await page.getByTestId('status-filter').click()
    await page.getByTestId('status-option-open').click()
    await page.waitForURL(/status=open/)

    // Go back
    await page.goBack()

    // Should be at clean reports page
    expect(page.url()).not.toContain('status=')
  })

  test('direct URL with filters loads correctly', async ({ page }) => {
    await page.goto('/reports?status=submitted')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Filter should be applied
    const statusFilter = page.getByTestId('status-filter')
    await expect(statusFilter).toContainText('Submitted')
  })
})
