import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from '../status-badge'

describe('StatusBadge', () => {
  it('renders "Open" for open status', () => {
    render(<StatusBadge status="open" />)
    expect(screen.getByRole('status')).toHaveTextContent('Open')
    expect(screen.getByTestId('status-badge-open')).toBeInTheDocument()
  })

  it('renders "Submitted" for submitted status', () => {
    render(<StatusBadge status="submitted" />)
    expect(screen.getByRole('status')).toHaveTextContent('Submitted')
    expect(screen.getByTestId('status-badge-submitted')).toBeInTheDocument()
  })

  it('renders "Approved" for approved status', () => {
    render(<StatusBadge status="approved" />)
    expect(screen.getByRole('status')).toHaveTextContent('Approved')
    expect(screen.getByTestId('status-badge-approved')).toBeInTheDocument()
  })

  it('renders "Rejected" for rejected status', () => {
    render(<StatusBadge status="rejected" />)
    expect(screen.getByRole('status')).toHaveTextContent('Rejected')
    expect(screen.getByTestId('status-badge-rejected')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<StatusBadge status="open" className="custom-class" />)
    expect(screen.getByRole('status')).toHaveClass('custom-class')
  })
})
