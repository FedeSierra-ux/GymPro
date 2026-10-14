// Client-side Anthropic API calls, using the API key the user pastes into
// Ajustes. Runs directly from the browser/PWA (no backend), so it relies on
// Anthropic's opt-in direct-browser-access header.
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

/** Sin respuesta en este tiempo se corta: con la red colgada el spinner del resumen no terminaba nunca. */
const TIMEOUT_MS = 15000

async function callAnthropic(apiKey: string, system: string, userPrompt: string, maxTokens = 300): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await pedir(apiKey, system, userPrompt, maxTokens, controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

async function pedir(apiKey: string, system: string, userPrompt: string, maxTokens: number, signal: AbortSignal): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    signal,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.content?.find((b: { type: string; text?: string }) => b.type === 'text')?.text
  if (!text) throw new Error('Respuesta de IA vacía')
  return text.trim()
}

export interface WorkoutTipContext {
  routineName: string
  durationMin: number
  totalSets: number
  newPrCount: number
  exerciseSummaries: string[] // e.g. "Press banca: 4 series, mejor 80kg x 6"
  recentTrend: string // short description of recent frequency/volume trend
}

export async function getWorkoutTip(apiKey: string, ctx: WorkoutTipContext): Promise<string> {
  const system = 'Sos un coach de gimnasio breve y directo que habla en español rioplatense. ' +
    'Das un solo consejo accionable y específico basado en los datos que te pasan, en 1-2 frases cortas. ' +
    'No uses markdown ni emojis salvo alguno ocasional. No repitas los números que ya te dieron, interpretalos.'
  const userPrompt = [
    `Rutina: ${ctx.routineName}`,
    `Duración: ${ctx.durationMin} min · Series totales: ${ctx.totalSets} · PRs nuevos: ${ctx.newPrCount}`,
    `Ejercicios de hoy:\n${ctx.exerciseSummaries.join('\n')}`,
    `Tendencia reciente: ${ctx.recentTrend}`,
    'Dame un consejo corto y personalizado para la próxima sesión.',
  ].join('\n\n')
  return callAnthropic(apiKey, system, userPrompt, 150)
}

export interface ExerciseSuggestionCandidate {
  id: string
  nameEs: string
  muscleGroup: string
  equipment: string
}

export interface ExerciseSuggestionResult {
  exerciseId: string | null
  reason: string
}

export async function getExerciseSuggestion(
  apiKey: string,
  routineName: string,
  currentExercises: string[],
  candidates: ExerciseSuggestionCandidate[]
): Promise<ExerciseSuggestionResult> {
  const system = 'Sos un coach de gimnasio que arma rutinas balanceadas. Respondés SIEMPRE en este formato exacto, sin nada más:\n' +
    'ID: <id del ejercicio elegido, exactamente como aparece en la lista>\n' +
    'RAZON: <una frase corta explicando por qué, en español>'
  const list = candidates.map(c => `${c.id} — ${c.nameEs} (${c.muscleGroup}, ${c.equipment})`).join('\n')
  const userPrompt = [
    `Rutina "${routineName}" ya tiene estos ejercicios: ${currentExercises.join(', ') || 'ninguno todavía'}.`,
    `Elegí UN ejercicio de esta lista para agregar y balancear mejor la rutina:`,
    list,
  ].join('\n\n')
  const text = await callAnthropic(apiKey, system, userPrompt, 150)
  const idMatch = text.match(/ID:\s*(\S+)/i)
  const reasonMatch = text.match(/RAZON:\s*(.+)/i)
  const exerciseId = idMatch && candidates.some(c => c.id === idMatch[1]) ? idMatch[1] : null
  return { exerciseId, reason: reasonMatch?.[1]?.trim() ?? text }
}
