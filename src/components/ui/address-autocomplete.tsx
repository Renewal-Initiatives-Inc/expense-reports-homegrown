'use client'

import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface Prediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  'aria-invalid'?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter an address',
  disabled = false,
  id,
  'aria-invalid': ariaInvalid,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionTokenRef = useRef<string>(crypto.randomUUID())
  const debounceRef = useRef<NodeJS.Timeout>(undefined)

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const url = new URL('/api/places/autocomplete', window.location.origin)
      url.searchParams.set('input', input)
      url.searchParams.set('sessionToken', sessionTokenRef.current)

      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        setPredictions(data.predictions || [])
        setIsOpen(data.predictions?.length > 0)
        setHighlightedIndex(-1)
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
      setPredictions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue)
    }, 300)
  }

  const handleSelect = (prediction: Prediction) => {
    setInputValue(prediction.description)
    onChange(prediction.description)
    setIsOpen(false)
    setPredictions([])
    // Generate a new session token for the next autocomplete session
    sessionTokenRef.current = crypto.randomUUID()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
          handleSelect(predictions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          data-testid="address-autocomplete-input"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          data-testid="address-autocomplete-dropdown"
        >
          {predictions.map((prediction, index) => (
            <li
              key={prediction.placeId}
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm',
                index === highlightedIndex && 'bg-accent text-accent-foreground',
                index !== highlightedIndex && 'hover:bg-accent/50'
              )}
              onClick={() => handleSelect(prediction)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="font-medium">{prediction.mainText}</div>
              <div className="text-xs text-muted-foreground">{prediction.secondaryText}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
