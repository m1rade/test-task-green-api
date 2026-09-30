import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { Credentials } from '@/types/Credentials'
import { saveCredentials } from '@/api/session'
import { createGreenApi, getErrorMessage, getInstanceStateMessage } from '@/api/greenApi'
import s from './LoginForm.module.css'

interface LoginFormProps {
  onSubmit?: (values: Credentials) => void
  initialValues?: Partial<Credentials>
  isSubmitting?: boolean
  /** Message shown above the submit button, e.g. a failed login */
  error?: string | null
  className?: string;
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.2" />
      <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

export function LoginForm({ onSubmit, initialValues, className }: LoginFormProps) {
  const [values, setValues] = useState<Credentials>({
    apiUrl: initialValues?.apiUrl ?? '',
    idInstance: initialValues?.idInstance ?? '',
    apiTokenInstance: initialValues?.apiTokenInstance ?? '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isTokenVisible, setIsTokenVisible] = useState(false)
  const tokenBtnMsg = isTokenVisible ? 'Скрыть токен' : 'Показать токен'

  const handleChange = (field: keyof Credentials) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const credentials: Credentials = {
      apiUrl: values.apiUrl.trim().replace(/\/+$/, ''),
      idInstance: values.idInstance.trim(),
      apiTokenInstance: values.apiTokenInstance.trim(),
    }

      setIsSubmitting(true)
      setError(null)

      const result = await createGreenApi(credentials).getStateInstance()

      setIsSubmitting(false)

      if (!result.ok) {
        setError(getErrorMessage(result.error))
        return
      }
      if (result.data.stateInstance !== 'authorized') {
        setError(getInstanceStateMessage(result.data.stateInstance))
        return
      }

    saveCredentials(credentials)
    onSubmit?.(credentials)
  }

  return (
      <form className={s.form + ' ' + className} onSubmit={handleSubmit}>
      <h1 className={s.title}>WhatsApp через GREEN-API</h1>

      <p className={s.description}>Введите данные вашего WhatsApp Инстанса</p>
      <label className={s.field}>
        <span className={s.label}>API URL</span>
        <input
          className={s.input}
          type="url"
          name="apiUrl"
          placeholder="Ex: https://api.green-api.com"
          value={values.apiUrl}
          onChange={handleChange('apiUrl')}
          required
        />
      </label>

      <label className={s.field}>
        <span className={s.label}>Id Instance</span>
        <input
          className={s.input}
          type="text"
          name="idInstance"
          inputMode="numeric"
          autoComplete="username"
          value={values.idInstance}
          onChange={handleChange('idInstance')}
          required
        />
      </label>

      <label className={s.field}>
        <span className={s.label}>Api Token Instance</span>
        <div className={s.inputWrapper}>
          <input
            className={s.input + ' ' + s.inputWithAction}
            type={isTokenVisible ? 'text' : 'password'}
            name="apiTokenInstance"
            autoComplete="current-password"
            value={values.apiTokenInstance}
            onChange={handleChange('apiTokenInstance')}
            required
          />
          <button
            className={s.visibilityToggle}
            type="button"
            onClick={() => setIsTokenVisible((prev) => !prev)}
            aria-label={tokenBtnMsg}
            title={tokenBtnMsg}
            aria-pressed={isTokenVisible}
          >
            {isTokenVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </label>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <button className={s.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Загрузка...' : 'Войти'}
      </button>
      </form>
  )
}
