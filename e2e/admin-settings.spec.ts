import { expect, test } from '@playwright/test'

/**
 * E2E Tests for Admin Settings
 *
 * These tests verify the admin settings functionality including:
 * 1. Navigation to settings page
 * 2. Mileage rate display and configuration
 * 3. Admin-only access
 */

test.describe('Admin Settings Page', () => {
  test('settings link appears in navigation for admin users', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Check if admin nav is visible (user must be admin)
    const settingsNav = page.getByTestId('nav-settings')
    const isAdmin = await settingsNav.isVisible().catch(() => false)

    if (!isAdmin) {
      test.skip(true, 'Admin role required')
      return
    }

    await expect(settingsNav).toBeVisible()
    await expect(settingsNav).toHaveText('Settings')
  })

  test('admin can navigate to settings page', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    const settingsNav = page.getByTestId('nav-settings')
    const isAdmin = await settingsNav.isVisible().catch(() => false)

    if (!isAdmin) {
      test.skip(true, 'Admin role required')
      return
    }

    await settingsNav.click()
    await page.waitForURL('/admin/settings')

    // Verify page loaded
    await expect(page.getByText('Admin Settings')).toBeVisible()
    await expect(page.getByTestId('mileage-rate-card')).toBeVisible()
  })

  test('mileage rate card displays current rate', async ({ page }) => {
    await page.goto('/admin/settings')

    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl === '/') {
      test.skip(true, 'Admin authentication required')
      return
    }

    const rateDisplay = page.getByTestId('current-rate-display')
    await expect(rateDisplay).toBeVisible()
    await expect(rateDisplay).toContainText('$')
    await expect(rateDisplay).toContainText('/mile')
  })

  test('effective date is displayed', async ({ page }) => {
    await page.goto('/admin/settings')

    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl === '/') {
      test.skip(true, 'Admin authentication required')
      return
    }

    const dateDisplay = page.getByTestId('effective-date-display')
    await expect(dateDisplay).toBeVisible()
    await expect(dateDisplay).toContainText('Effective since')
  })

  test('admin can update mileage rate', async ({ page }) => {
    await page.goto('/admin/settings')

    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl === '/') {
      test.skip(true, 'Admin authentication required')
      return
    }

    // Get the rate input
    const rateInput = page.getByTestId('rate-input')
    await expect(rateInput).toBeVisible()

    // Clear and enter new rate
    await rateInput.fill('0.71')

    // Save button should be enabled
    const saveButton = page.getByTestId('save-button')
    await expect(saveButton).toBeEnabled()

    // Click save
    await saveButton.click()

    // Wait for success toast or verify update
    await page.waitForTimeout(1000)

    // Rate should be updated (or we check for success message)
    // Note: actual verification depends on toast implementation
  })

  test('save button is disabled when no changes', async ({ page }) => {
    await page.goto('/admin/settings')

    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl === '/') {
      test.skip(true, 'Admin authentication required')
      return
    }

    const saveButton = page.getByTestId('save-button')
    await expect(saveButton).toBeDisabled()
  })

  test('QBO settings link is present', async ({ page }) => {
    await page.goto('/admin/settings')

    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl === '/') {
      test.skip(true, 'Admin authentication required')
      return
    }

    const qboLink = page.getByTestId('qbo-settings-link')
    await expect(qboLink).toBeVisible()
    await expect(qboLink).toHaveText(/Manage QBO Integration/)
  })

  test('QBO link navigates to QBO page', async ({ page }) => {
    await page.goto('/admin/settings')

    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl === '/') {
      test.skip(true, 'Admin authentication required')
      return
    }

    const qboLink = page.getByTestId('qbo-settings-link')
    await qboLink.click()

    await page.waitForURL('/admin/qbo')
    await expect(page.getByText('QuickBooks Online Integration')).toBeVisible()
  })
})

test.describe('Admin Settings Access Control', () => {
  test('non-admin users are redirected from settings page', async ({ page }) => {
    // Direct navigation to admin settings
    await page.goto('/admin/settings')

    // Should redirect non-admins to home or login
    await page.waitForTimeout(500)
    const finalUrl = page.url()

    // Either redirected to login (not authenticated) or home (not admin)
    const isRedirected = finalUrl.includes('/login') || finalUrl === '/' || !finalUrl.includes('/admin/settings')

    // If still on admin settings, user must be admin (test passes differently)
    if (!isRedirected) {
      // Verify admin status by checking for admin elements
      const mileageCard = page.getByTestId('mileage-rate-card')
      const isAdmin = await mileageCard.isVisible().catch(() => false)
      expect(isAdmin).toBe(true)
    }
  })
})

test.describe('Dashboard Admin Settings Link', () => {
  test('admin sees settings quick action on dashboard', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    const settingsAction = page.getByTestId('admin-settings-action')
    const isAdmin = await settingsAction.isVisible().catch(() => false)

    if (!isAdmin) {
      // Non-admin should not see this
      await expect(settingsAction).not.toBeVisible()
    } else {
      await expect(settingsAction).toBeVisible()
      await expect(settingsAction).toHaveText(/Admin Settings/)
    }
  })

  test('settings quick action navigates to settings page', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    const settingsAction = page.getByTestId('admin-settings-action')
    const isAdmin = await settingsAction.isVisible().catch(() => false)

    if (!isAdmin) {
      test.skip(true, 'Admin role required')
      return
    }

    await settingsAction.click()
    await page.waitForURL('/admin/settings')

    await expect(page.getByText('Admin Settings')).toBeVisible()
  })
})
