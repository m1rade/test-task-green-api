import { useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { normalizePhone, phoneErrorMessages, validatePhone } from '@/lib/phone'
import s from './PhoneForm.module.css'

interface PhoneFormProps {
  /**
   * Receives the phone as digits with the country code, e.g. "79991234567".
   * May return (or resolve to) an error message to show under the input
   */
  onSubmit: (phone: string) => string | null | void | Promise<string | null | void>
  className?: string
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function PhoneForm({ onSubmit, className }: PhoneFormProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const errorId = useId()

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhone(event.target.value)
    if (error) setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const validationError = validatePhone(phone)
    if (validationError) {
      setError(phoneErrorMessages[validationError])
      return
    }

    setIsSubmitting(true)
    const submitError = await onSubmit(normalizePhone(phone)!)
    setIsSubmitting(false)

    if (submitError) {
      setError(submitError)
      return
    }
    setPhone('')
  }

  return (
    <form className={s.form + (className ? ' ' + className : '')} onSubmit={handleSubmit} noValidate>
      <div className={s.row}>
        <input
          className={s.input}
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7"
          aria-label="Номер телефона"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          value={phone}
          onChange={handleChange}
        />
        <button className={s.submit} type="submit" aria-label="Начать чат" disabled={isSubmitting}>
          <ArrowIcon />
        </button>
      </div>
      {error && (
        <p className={s.error} id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
