import { useState } from 'react'

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = '',
  autoComplete = 'current-password',
  className = '',
  inputClassName = '',
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`input pr-10 ${className} ${inputClassName}`.trim()}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute inset-y-0 right-2 flex items-center justify-center rounded-full text-slate-400 transition hover:text-slate-700"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5.33 0-9.86-3.33-11.74-8a10.94 10.94 0 0 1 1.73-3.25" />
            <path d="M1 1l22 22" />
            <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
            <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
            <path d="M12 5c2.67 0 5.09 1.17 6.78 3.05" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
