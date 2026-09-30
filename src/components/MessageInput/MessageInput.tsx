import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import s from './MessageInput.module.css'

/** sendMessage accepts up to 4000 characters */
const MAX_LENGTH = 4000

interface MessageInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

function SendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
    </svg>
  )
}

export function MessageInput({ onSend, disabled = false, placeholder = 'Введите сообщение' }: MessageInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = !disabled && text.trim().length > 0

  // Grow with the content up to max-height, then scroll
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [text])

  const send = () => {
    if (!canSend) return
    onSend(text.trim())
    setText('')
    textareaRef.current?.focus()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    send()
  }

  // Enter sends, Shift+Enter adds a new line; ignore Enter while an IME is composing
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  return (
    <form className={s.composer} onSubmit={handleSubmit}>
      <div className={s.field}>
        <textarea
          ref={textareaRef}
          className={s.textarea}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Сообщение"
          maxLength={MAX_LENGTH}
          disabled={disabled}
          autoFocus
        />
      </div>
      <button className={s.send} type="submit" disabled={!canSend} aria-label="Отправить" title="Отправить">
        <SendIcon />
      </button>
    </form>
  )
}
