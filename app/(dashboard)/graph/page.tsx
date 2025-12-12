import { ProblemGraphCanvas } from '@/features/graph'

export const metadata = {
  title: 'Problem Graph | Refinery',
  description: 'Visualize how your notes cluster around problems',
}

export default function GraphPage() {
  return (
    <div className="h-full w-full">
      <ProblemGraphCanvas />
    </div>
  )
}
