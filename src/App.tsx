import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { useWorkoutStore } from './stores/workoutStore'
import { BottomNav } from './components/BottomNav'
import { ToastContainer } from './components/Toast'
import { UpdatePrompt } from './components/UpdatePrompt'
import { HomeScreen } from './screens/HomeScreen'
import { RutinasScreen } from './screens/RutinasScreen'
import { RoutineDetailScreen } from './screens/RoutineDetailScreen'
import { CalendarioScreen } from './screens/CalendarioScreen'
import { ProgresoScreen } from './screens/ProgresoScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ActiveWorkoutScreen } from './screens/ActiveWorkoutScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal'

function App() {
  // Un entreno que quedó abierto más de 4 horas se cierra solo: al abrir la
  // app, al volver del segundo plano y una vez por minuto mientras está en uso.
  useEffect(() => {
    const check = () => {
      useWorkoutStore.getState().autoCloseStaleWorkout()
      // Si la app quedó abierta de un día para el otro, el cambio a Semanas
      // 4-6 no esperaba a que se volviera a abrir Inicio.
      if (document.visibilityState === 'visible') useStore.getState().sincronizarPrograma()
    }
    check()
    const id = setInterval(check, 60000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  // El aviso de actualización va una sola vez, afuera de las ramas: montado en
  // cada una se volvía a registrar el service worker al entrar y salir del
  // entreno, y el "Después" se olvidaba.
  return (
    <>
      <Pantalla />
      <UpdatePrompt />
    </>
  )
}

function Pantalla() {
  const { activeTab, activeRoutineId, onboarded } = useStore()
  const { activeWorkout, summaryWorkout, summaryPrCount, dismissSummary } = useWorkoutStore()

  if (!onboarded) return <OnboardingScreen />

  if (activeWorkout) {
    return (
      <div className="flex flex-col h-full relative">
        <ActiveWorkoutScreen />
        <ToastContainer />
      </div>
    )
  }

  if (summaryWorkout) {
    return (
      <div className="flex flex-col h-full relative">
        <WorkoutSummaryModal
          workout={summaryWorkout}
          prCount={summaryPrCount}
          onDismiss={dismissSummary}
        />
        {/* El resumen tiene su botón abajo: los avisos van arriba para no taparlo. */}
        <ToastContainer arriba />
      </div>
    )
  }

  const showRoutineDetail = activeTab === 'rutinas' && activeRoutineId !== null

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'rutinas' && (
          showRoutineDetail ? <RoutineDetailScreen /> : <RutinasScreen />
        )}
        {activeTab === 'calendario' && <CalendarioScreen />}
        {activeTab === 'progreso' && <ProgresoScreen />}
        {activeTab === 'perfil' && <ProfileScreen />}
      </div>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}

export default App
