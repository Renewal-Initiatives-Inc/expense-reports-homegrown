import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RoleBadge } from '../role-badge'

describe('RoleBadge', () => {
  it('renders Admin for admin role', () => {
    render(<RoleBadge role="admin" />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders User for user role', () => {
    render(<RoleBadge role="user" />)
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('has correct test id', () => {
    render(<RoleBadge role="admin" />)
    expect(screen.getByTestId('role-badge')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<RoleBadge role="admin" className="custom-class" />)
    expect(screen.getByTestId('role-badge')).toHaveClass('custom-class')
  })
})
