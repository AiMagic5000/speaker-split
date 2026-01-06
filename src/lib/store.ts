import { create } from 'zustand'

export interface Speaker {
  id: string
  label: string
  name: string
  color: string
}

export interface TranscriptSegment {
  speaker: string
  text: string
  start: number
  end: number
}

export interface ProcessingJob {
  id: string
  status: 'uploading' | 'processing' | 'transcribing' | 'diarizing' | 'splitting' | 'complete' | 'error'
  progress: number
  stage: string
  audioFile: {
    name: string
    size: number
    type: string
  } | null
  speakerCount: number
  speakers: Speaker[]
  transcript: TranscriptSegment[]
  outputs: {
    json?: string
    txt?: string
    srt?: string
    speakerAudios: { speaker: string; url: string; concatenated?: string }[]
    html?: string
  }
  clientInfo: {
    clientName: string
    businessName: string
    website: string
    sessionDate: string
    primarySpeaker: string
  }
  error?: string
  createdAt: string
}

interface AppState {
  currentJob: ProcessingJob | null
  jobs: ProcessingJob[]

  // Actions
  createJob: () => string
  updateJob: (id: string, updates: Partial<ProcessingJob>) => void
  setCurrentJob: (job: ProcessingJob | null) => void
  getJob: (id: string) => ProcessingJob | undefined
}

const SPEAKER_COLORS = [
  '#4493f2', // Primary blue
  '#4dc0b5', // Teal
  '#9f7aea', // Purple
  '#ed8936', // Orange
  '#48bb78', // Green
  '#f56565', // Red
]

export const useAppStore = create<AppState>((set, get) => ({
  currentJob: null,
  jobs: [],

  createJob: () => {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newJob: ProcessingJob = {
      id,
      status: 'uploading',
      progress: 0,
      stage: 'Preparing upload...',
      audioFile: null,
      speakerCount: 2,
      speakers: [
        { id: 'SPEAKER_00', label: 'Speaker 1', name: '', color: SPEAKER_COLORS[0] },
        { id: 'SPEAKER_01', label: 'Speaker 2', name: '', color: SPEAKER_COLORS[1] },
      ],
      transcript: [],
      outputs: { speakerAudios: [] },
      clientInfo: {
        clientName: '',
        businessName: '',
        website: '',
        sessionDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        primarySpeaker: 'SPEAKER_00',
      },
      createdAt: new Date().toISOString(),
    }

    set(state => ({
      jobs: [...state.jobs, newJob],
      currentJob: newJob,
    }))

    return id
  },

  updateJob: (id, updates) => {
    set(state => {
      const updatedJobs = state.jobs.map(job =>
        job.id === id ? { ...job, ...updates } : job
      )
      const updatedCurrentJob = state.currentJob?.id === id
        ? { ...state.currentJob, ...updates }
        : state.currentJob

      return {
        jobs: updatedJobs,
        currentJob: updatedCurrentJob,
      }
    })
  },

  setCurrentJob: (job) => set({ currentJob: job }),

  getJob: (id) => get().jobs.find(job => job.id === id),
}))

// Helper to update speaker count
export const updateSpeakerCount = (count: number) => {
  const { currentJob, updateJob } = useAppStore.getState()
  if (!currentJob) return

  const speakers: Speaker[] = []
  for (let i = 0; i < count; i++) {
    const existingSpeaker = currentJob.speakers[i]
    speakers.push({
      id: `SPEAKER_0${i}`,
      label: `Speaker ${i + 1}`,
      name: existingSpeaker?.name || '',
      color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
    })
  }

  updateJob(currentJob.id, { speakerCount: count, speakers })
}
