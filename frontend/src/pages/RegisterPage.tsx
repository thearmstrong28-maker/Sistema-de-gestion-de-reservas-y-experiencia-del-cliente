import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { register } from '../api/auth'
import { getApiErrorMessage } from '../api/http'
import { StatusMessage } from '../components/StatusMessage'

const phonePattern = /^\+?[0-9\s().-]{7,20}$/

const registerSchema = z
  .object({
    email: z.string().trim().min(1, 'El correo electrónico es obligatorio.').email('Ingresá un correo electrónico válido.'),
    phone: z
      .string()
      .trim()
      .min(1, 'El teléfono es obligatorio.')
      .refine((value) => {
        const digits = value.replace(/\D/g, '')
        const hasSinglePrefix = (value.match(/\+/g) ?? []).length <= 1 && !value.includes('+', 1)

        return phonePattern.test(value) && digits.length >= 7 && digits.length <= 15 && hasSinglePrefix
      }, 'Ingresá un teléfono internacional válido.'),
    restaurantName: z
      .string()
      .trim()
      .min(1, 'El nombre del restaurante es obligatorio.')
      .max(120, 'El nombre del restaurante no puede superar 120 caracteres.'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .refine((value) => /[A-Z]/.test(value), 'La contraseña debe incluir una mayúscula.')
      .refine((value) => /[a-z]/.test(value), 'La contraseña debe incluir una minúscula.')
      .refine((value) => /\d/.test(value), 'La contraseña debe incluir un número.')
      .refine((value) => /[^A-Za-z\d]/.test(value), 'La contraseña debe incluir un símbolo.'),
    confirmPassword: z.string().min(1, 'Repetí la contraseña.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

const emptyForm: RegisterFormValues = {
  email: '',
  phone: '',
  restaurantName: '',
  password: '',
  confirmPassword: '',
}

export function RegisterPage() {
  const [submitState, setSubmitState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  })
  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: emptyForm,
    mode: 'onTouched',
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitState({ status: 'loading', message: 'Creando la cuenta...' })

    try {
      await register({
        email: values.email.trim(),
        phone: values.phone.trim(),
        restaurantName: values.restaurantName.trim(),
        password: values.password,
      })

      reset(emptyForm)
      setSubmitState({
        status: 'success',
        message: 'Cuenta creada correctamente. Ya podés iniciar sesión.',
      })
    } catch (error) {
      setSubmitState({ status: 'error', message: getApiErrorMessage(error) })
    }
  }

  return (
    <section className="auth-shell">
      <article className="auth-card panel">
        <div className="auth-intro">
          <h2>Crear cuenta</h2>
          <p className="muted">
            Completá los datos de tu restaurante para activar el acceso al sistema.
          </p>
        </div>

        <form className="form-panel auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-grid">
            <label>
              Correo electrónico
              <input
                type="email"
                autoComplete="email"
                placeholder="contacto@restaurante.com"
                {...registerField('email')}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
            </label>

            <label>
              Teléfono
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+54 11 5555 4444"
                {...registerField('phone')}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone ? <span className="field-error">{errors.phone.message}</span> : null}
            </label>
          </div>

          <label>
            Nombre del restaurante
            <input
              type="text"
              autoComplete="organization"
              placeholder="Casa del Sabor"
              {...registerField('restaurantName')}
              aria-invalid={Boolean(errors.restaurantName)}
            />
            {errors.restaurantName ? (
              <span className="field-error">{errors.restaurantName.message}</span>
            ) : null}
          </label>

          <div className="form-grid">
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Creá una contraseña fuerte"
                {...registerField('password')}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password ? <span className="field-error">{errors.password.message}</span> : null}
            </label>

            <label>
              Repetir contraseña
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Volvé a escribirla"
                {...registerField('confirmPassword')}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword ? (
                <span className="field-error">{errors.confirmPassword.message}</span>
              ) : null}
            </label>
          </div>

          <p className="form-hint">
            La contraseña debe tener 8 caracteres como mínimo, una mayúscula, una minúscula, un número y un símbolo.
          </p>

          <button
            type="submit"
            className="button button-primary"
            disabled={submitState.status === 'loading'}
          >
            Crear cuenta
          </button>

          <StatusMessage status={submitState.status} message={submitState.message} />

          <div className="auth-links">
            <Link className="button button-secondary" to="/login">
              Ya tengo una cuenta
            </Link>
          </div>
        </form>
      </article>
    </section>
  )
}
