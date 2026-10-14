import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Logo } from '../components/Logo'

export function OnboardingScreen() {
  const { updateUserName, setOnboarded, installMileRoutines } = useStore()
  const [name, setName] = useState('')
  const [step, setStep] = useState<'welcome' | 'name'>('welcome')

  const handleStart = () => {
    const trimmed = name.trim()
    if (trimmed) updateUserName(trimmed)
    // La app arranca con el plan de los 3 días ya cargado y repartido en la
    // semana; se puede editar o borrar como cualquier otra rutina.
    installMileRoutines()
    setOnboarded()
  }

  return (
    <div className="flex flex-col h-full bg-background items-center justify-center px-6 text-center">
      {step === 'welcome' ? (
        <div className="onboarding-in flex flex-col items-center gap-8 w-full max-w-sm">
          <Logo size={96} />

          <div>
            <h1 className="text-3xl font-bold text-ink mb-2">GymPro</h1>
            <p className="text-dim text-base leading-relaxed">
              Tu compañero de entrenamiento.<br />Registrá tus rutinas, seguí tu progreso y rompé récords.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <div className="flex flex-col gap-2 text-left">
              {[
                ['📋', 'Rutinas personalizadas'],
                ['⏱️', 'Timer de descanso automático'],
                ['📈', 'Seguimiento de progreso'],
                ['🏆', 'Récords personales'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-ink text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('name')}
              className="w-full bg-primary text-on-acc font-bold py-4 rounded-2xl text-base mt-2 active:scale-95 transition-transform"
            >
              Comenzar →
            </button>
          </div>
        </div>
      ) : (
        <div className="onboarding-in flex flex-col items-center gap-8 w-full max-w-sm">
          <div>
            <p className="text-3xl mb-4">💪</p>
            <h2 className="text-2xl font-bold text-ink mb-2">¿Cómo te llamás?</h2>
            <p className="text-dim text-sm">Así te vamos a saludar en la app</p>
          </div>

          <div className="w-full">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleStart()}
              placeholder="Tu nombre..."
              autoFocus
              maxLength={24}
              className="w-full bg-surface border-2 border-border rounded-2xl px-4 py-4 text-ink text-lg text-center placeholder-mute focus:border-primary transition-colors"
            />
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleStart}
              className="w-full bg-primary text-on-acc font-bold py-4 rounded-2xl text-base active:scale-95 transition-transform"
            >
              {name.trim() ? `Listo, ${name.trim()}!` : 'Continuar sin nombre'}
            </button>
            <button
              onClick={() => setStep('welcome')}
              className="text-dim text-sm"
            >
              ‹ Volver
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
