'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Expense } from '@/types/expenses'
import { Car, DollarSign, FileText, MapPin, MoreVertical, Pencil, Receipt, Trash2 } from 'lucide-react'
import Image from 'next/image'

function isDocumentUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return pathname.endsWith('.pdf') || pathname.endsWith('.html')
  } catch {
    const lower = url.toLowerCase()
    return lower.endsWith('.pdf') || lower.endsWith('.html')
  }
}

interface ExpenseCardProps {
  expense: Expense
  canModify: boolean
  onEdit: () => void
  onDelete: () => void
  onViewReceipt: () => void
}

export function ExpenseCard({ expense, canModify, onEdit, onDelete, onViewReceipt }: ExpenseCardProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(expense.amount))

  const formattedDate = new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const isMileage = expense.type === 'mileage'

  // For mileage, truncate addresses for display
  const formatAddress = (address: string | null) => {
    if (!address) return ''
    // Extract city or first meaningful part
    const parts = address.split(',')
    if (parts.length >= 2) {
      return parts[0].trim()
    }
    return address.length > 30 ? address.substring(0, 30) + '...' : address
  }

  return (
    <Card className="overflow-hidden" data-testid={`expense-card-${expense.id}`}>
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Icon/Thumbnail */}
          <div
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted ${!isMileage && expense.receiptUrl ? 'cursor-pointer' : ''}`}
            onClick={!isMileage && expense.receiptUrl ? onViewReceipt : undefined}
            data-testid="expense-thumbnail"
          >
            {isMileage ? (
              <div className="flex h-full w-full items-center justify-center bg-blue-50">
                <Car className="h-8 w-8 text-blue-600" />
              </div>
            ) : expense.receiptThumbnailUrl || expense.receiptUrl ? (
              isDocumentUrl(expense.receiptThumbnailUrl || expense.receiptUrl!) ? (
                <div className="flex h-full w-full items-center justify-center bg-red-50">
                  <FileText className="h-8 w-8 text-red-600" />
                </div>
              ) : (
                <Image
                  src={expense.receiptThumbnailUrl || expense.receiptUrl!}
                  alt="Receipt"
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Expense Details */}
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  {isMileage ? (
                    <>
                      <div className="flex items-center gap-1 text-sm" data-testid="expense-route">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{formatAddress(expense.originAddress)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{formatAddress(expense.destinationAddress)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="expense-miles">
                        {formattedDate} · {expense.miles} miles
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium" data-testid="expense-merchant">
                        {expense.merchant || 'No merchant'}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="expense-date">
                        {formattedDate}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold" data-testid="expense-amount">
                    {formattedAmount}
                  </p>
                  {canModify && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="expense-actions">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit} data-testid="edit-expense">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-destructive" data-testid="delete-expense">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isMileage ? (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs" data-testid="expense-type-mileage">
                  <Car className="mr-1 h-3 w-3" />
                  Mileage
                </Badge>
              ) : (
                (expense.glAccountName || expense.categoryName) && (
                  <Badge variant="secondary" className="text-xs" data-testid="expense-gl-account">
                    {expense.glAccountName || expense.categoryName}
                  </Badge>
                )
              )}
              {(expense.fundName || expense.projectName) && (
                <Badge variant="outline" className="text-xs" data-testid="expense-fund">
                  {expense.fundName || expense.projectName}
                </Badge>
              )}
              {expense.billable && (
                <Badge className="bg-green-100 text-green-800 text-xs" data-testid="expense-billable">
                  <DollarSign className="mr-1 h-3 w-3" />
                  Billable
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Memo */}
        {expense.memo && (
          <div className="border-t bg-muted/50 px-4 py-2">
            <p className="text-sm text-muted-foreground" data-testid="expense-memo">
              {expense.memo}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
