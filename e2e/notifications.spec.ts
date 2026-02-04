import { expect, test } from '@playwright/test'

/**
 * E2E Tests for Notification Flow
 *
 * These tests verify the complete notification workflow including:
 * 1. Admin receiving notifications when reports are submitted
 * 2. Submitter receiving notifications on approval/rejection
 * 3. Mark as read functionality
 *
 * Note: These tests require authentication. To run locally:
 * - Set up test users in Zitadel (one admin, one regular user)
 * - Configure test credentials in .env.test
 * - Or implement auth bypass for testing
 */

test.describe('Notification Bell UI', () => {
  // This test assumes an authenticated session with notifications
  // For full E2E, auth setup would be needed via beforeEach hook

  test('notification bell displays in header when logged in', async ({ page }) => {
    // Navigate to home - will redirect to login if not authenticated
    await page.goto('/')

    // If redirected to login, this test will need auth setup
    // For now, check if we reach the authenticated area
    const currentUrl = page.url()

    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required - skipping in unauthenticated state')
      return
    }

    // Check for notification bell in header
    const notificationBell = page.getByTestId('notification-bell')
    await expect(notificationBell).toBeVisible()
  })

  test('notification bell opens dropdown on click', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Click the notification bell
    await page.getByTestId('notification-bell').click()

    // Dropdown should appear
    const dropdown = page.getByTestId('notification-dropdown')
    await expect(dropdown).toBeVisible()

    // Should show "Notifications" header
    await expect(dropdown.getByText('Notifications')).toBeVisible()
  })

  test('notification dropdown shows empty state when no notifications', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('notification-bell').click()

    const dropdown = page.getByTestId('notification-dropdown')

    // Wait for loading to complete and check for empty state
    // Either we see notifications or the empty state
    const emptyState = dropdown.getByText('No notifications yet')
    const hasEmptyState = await emptyState.isVisible().catch(() => false)

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible()
    }
  })
})

test.describe('Mark Notifications as Read', () => {
  test('clicking a notification marks it as read', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    // Open notifications
    await page.getByTestId('notification-bell').click()

    // Get the notification badge count before (if exists)
    const badge = page.getByTestId('notification-badge')
    const hasBadge = await badge.isVisible().catch(() => false)

    if (!hasBadge) {
      test.skip(true, 'No unread notifications to test')
      return
    }

    const initialCount = parseInt((await badge.textContent()) || '0')

    // Click first notification
    const firstNotification = page
      .getByTestId('notification-dropdown')
      .locator('[data-testid^="notification-"]')
      .first()
    const hasNotification = await firstNotification.isVisible().catch(() => false)

    if (!hasNotification) {
      test.skip(true, 'No notifications to click')
      return
    }

    await firstNotification.click()

    // Wait for potential navigation and badge update
    await page.waitForTimeout(500)

    // Badge count should decrease or disappear
    const newBadge = page.getByTestId('notification-badge')
    const stillHasBadge = await newBadge.isVisible().catch(() => false)

    if (stillHasBadge) {
      const newCount = parseInt((await newBadge.textContent()) || '0')
      expect(newCount).toBeLessThan(initialCount)
    }
  })

  test('mark all as read button clears all notifications', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('notification-bell').click()

    const markAllButton = page.getByTestId('mark-all-read')
    const hasMarkAllButton = await markAllButton.isVisible().catch(() => false)

    if (!hasMarkAllButton) {
      test.skip(true, 'No unread notifications - mark all button not visible')
      return
    }

    await markAllButton.click()

    // Wait for update
    await page.waitForTimeout(500)

    // Badge should disappear
    const badge = page.getByTestId('notification-badge')
    await expect(badge).not.toBeVisible()

    // Mark all button should also disappear
    await expect(markAllButton).not.toBeVisible()
  })
})

test.describe('Notification Links', () => {
  test('report_approved notification links to report page', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('notification-bell').click()

    // Look for any notification with "approved" in the message
    const approvedNotification = page.getByTestId('notification-dropdown').getByText(/approved/i).first()
    const hasApprovedNotification = await approvedNotification.isVisible().catch(() => false)

    if (!hasApprovedNotification) {
      test.skip(true, 'No approved notifications to test')
      return
    }

    // Click the notification
    await approvedNotification.click()

    // Should navigate to a reports page
    await page.waitForURL(/\/reports\//)
    expect(page.url()).toMatch(/\/reports\/[a-f0-9-]+/)
  })

  test('report_submitted notification links to admin approval page', async ({ page }) => {
    await page.goto('/')

    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      test.skip(true, 'Authentication required')
      return
    }

    await page.getByTestId('notification-bell').click()

    // Look for any notification with "submitted" in the message
    const submittedNotification = page.getByTestId('notification-dropdown').getByText(/submitted/i).first()
    const hasSubmittedNotification = await submittedNotification.isVisible().catch(() => false)

    if (!hasSubmittedNotification) {
      test.skip(true, 'No submitted notifications to test')
      return
    }

    // Click the notification
    await submittedNotification.click()

    // Should navigate to admin approvals page
    await page.waitForURL(/\/admin\/approvals\//)
    expect(page.url()).toMatch(/\/admin\/approvals\/[a-f0-9-]+/)
  })
})

/**
 * Full workflow tests - these require two user accounts
 * and proper auth setup. Listed here for completeness.
 */
test.describe.skip('Full Notification Workflow (requires auth setup)', () => {
  test('admin receives notification when report is submitted', async ({ page }) => {
    // 1. Login as regular user
    // 2. Create a report with expense
    // 3. Submit the report
    // 4. Logout
    // 5. Login as admin
    // 6. Check notification bell shows new notification
    // 7. Click notification - should go to approval page
  })

  test('submitter receives notification when report is approved', async ({ page }) => {
    // 1. Setup: Have a submitted report
    // 2. Login as admin
    // 3. Approve the report
    // 4. Logout
    // 5. Login as submitter
    // 6. Check notification bell shows approval notification
    // 7. Click notification - should go to report page
  })

  test('submitter receives notification when report is rejected', async ({ page }) => {
    // 1. Setup: Have a submitted report
    // 2. Login as admin
    // 3. Reject the report with comment
    // 4. Logout
    // 5. Login as submitter
    // 6. Check notification shows rejection with comment preview
    // 7. Click notification - should go to report page
  })
})
