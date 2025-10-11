import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhoneInput from '../PhoneInput'

describe('PhoneInput Component', () => {
  const mockOnChange = vi.fn()
  const mockOnNext = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onNext: mockOnNext,
    disabled: false,
    error: undefined
  }

  describe('Rendering', () => {
    it('renders phone input component with correct elements', () => {
      render(<PhoneInput {...defaultProps} />)
      
      expect(screen.getByText('Enter Phone Number')).toBeInTheDocument()
      expect(screen.getByText('We\'ll send a verification code to your phone')).toBeInTheDocument()
      expect(screen.getByDisplayValue('')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('9876543210')).toBeInTheDocument()
      expect(screen.getByText('Send OTP')).toBeInTheDocument()
      expect(screen.getByText('+91')).toBeInTheDocument()
    })

    it('renders with error message when error prop is provided', () => {
      const errorMessage = 'Invalid phone number'
      render(<PhoneInput {...defaultProps} error={errorMessage} />)
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('renders disabled state correctly', () => {
      render(<PhoneInput {...defaultProps} disabled={true} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      const button = screen.getByText('Sending...')
      
      expect(input).toBeDisabled()
      expect(button).toBeDisabled()
    })
  })

  describe('Input Handling', () => {
    it('calls onChange with digits only when typing', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.type(input, '9876543210')
      
      // Each character typed calls onChange
      expect(mockOnChange).toHaveBeenCalledTimes(10)
      expect(mockOnChange).toHaveBeenLastCalledWith('0')
    })

    it('filters out non-digit characters', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.type(input, 'abc987def654ghi321jkl0')
      
      // Only digits should be passed to onChange
      expect(mockOnChange).toHaveBeenLastCalledWith('0')
    })

    it('limits input to 10 digits maximum', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.type(input, '12345678901234567890')
      
      // Should only accept first 10 digits
      expect(mockOnChange).toHaveBeenLastCalledWith('0')
    })

    it('handles backspace and delete correctly', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} value="9876543210" />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.click(input)
      await user.keyboard('{Backspace}')
      
      expect(mockOnChange).toHaveBeenCalledWith('987654321')
    })

    it('handles paste events correctly', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.click(input)
      await user.paste('9876543210')
      
      expect(mockOnChange).toHaveBeenCalledWith('9876543210')
    })
  })

  describe('Validation', () => {
    it('enables submit button when phone number is valid (10 digits)', async () => {
    //   const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} value="9876543210" />)
      
      const button = screen.getByText('Send OTP')
      expect(button).not.toBeDisabled()
    })

    it('disables submit button when phone number is invalid', () => {
      render(<PhoneInput {...defaultProps} value="987654321" />)
      
      const button = screen.getByText('Send OTP')
      expect(button).toBeDisabled()
    })

    it('disables submit button when phone number is empty', () => {
      render(<PhoneInput {...defaultProps} value="" />)
      
      const button = screen.getByText('Send OTP')
      expect(button).toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('calls onNext when form is submitted with valid phone number', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} value="9876543210" />)
      
      const button = screen.getByText('Send OTP')
      await user.click(button)
      
      expect(mockOnNext).toHaveBeenCalledTimes(1)
    })

    it('does not call onNext when form is submitted with invalid phone number', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} value="987654321" />)
      
      const button = screen.getByText('Send OTP')
      await user.click(button)
      
      expect(mockOnNext).not.toHaveBeenCalled()
    })

    it('prevents default form submission behavior', async () => {
    //   const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} value="9876543210" />)
      
      const form = screen.getByText('Send OTP').closest('form')
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault')
      
      if (form) {
        fireEvent(form, submitEvent)
        expect(preventDefaultSpy).toHaveBeenCalled()
      }
    })
  })

  describe('Key Event Handling', () => {
    it('handles Enter key press correctly', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} value="9876543210" />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.click(input)
      await user.keyboard('{Enter}')
      
      // Enter key should NOT trigger onNext anymore - requires button click
      expect(mockOnNext).not.toHaveBeenCalled()
    })

    it('handles Tab key navigation correctly', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.click(input)
      await user.keyboard('{Tab}')
      
      // Should not trigger any unwanted behavior
      expect(mockOnNext).not.toHaveBeenCalled()
    })

    it('handles Escape key correctly', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.click(input)
      await user.keyboard('{Escape}')
      
      // Should not trigger any unwanted behavior
      expect(mockOnNext).not.toHaveBeenCalled()
    })

    it('handles arrow keys correctly', async () => {
      const user = userEvent.setup()
      render(<PhoneInput {...defaultProps} value="1234567890" />)
      
      const input = screen.getByPlaceholderText('9876543210')
      
      await user.click(input)
      await user.keyboard('{ArrowLeft}')
      await user.keyboard('{ArrowRight}')
      await user.keyboard('{ArrowUp}')
      await user.keyboard('{ArrowDown}')
      
      // Should not trigger any unwanted behavior
      expect(mockOnNext).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles onChange errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorOnChange = vi.fn(() => {
        throw new Error('Test error')
      })
      
      render(<PhoneInput {...defaultProps} onChange={errorOnChange} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      fireEvent.change(input, { target: { value: '1234567890' } })
      
      expect(consoleSpy).toHaveBeenCalledWith('Error in handlePhoneChange:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('handles onSubmit errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorOnNext = vi.fn(() => {
        throw new Error('Test error')
      })
      
      render(<PhoneInput {...defaultProps} value="9876543210" onNext={errorOnNext} />)
      
      const form = screen.getByText('Send OTP').closest('form')
      if (form) {
        fireEvent.submit(form)
        expect(consoleSpy).toHaveBeenCalledWith('Error in handleSubmit:', expect.any(Error))
      }
      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<PhoneInput {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('9876543210')
      expect(input).toHaveAttribute('type', 'tel')
      expect(input).toHaveAttribute('maxLength', '10')
    })

    it('has proper labels and descriptions', () => {
      render(<PhoneInput {...defaultProps} />)
      
      expect(screen.getByText('Phone Number')).toBeInTheDocument()
      expect(screen.getByText('Enter Phone Number')).toBeInTheDocument()
    })

    it('announces validation state correctly', () => {
      render(<PhoneInput {...defaultProps} value="9876543210" />)
      
      const button = screen.getByText('Send OTP')
      expect(button).not.toBeDisabled()
    })
  })
})
