import React, { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, ChevronDown, GripVertical, Calendar, Clock, BookOpen } from 'lucide-react'

// Types based on the generated JSON structure
interface Task {
  task_id: string
  humanReadableId: string
  title2: string
  duration_minutes: number
  topicCode: string
  taskType: string
}

interface DailyPlan {
  day: number
  tasks: Task[]
}

interface WeeklyPlan {
  week: number
  daily_plans: DailyPlan[]
}

interface CycleBlock {
  block_id: string
  block_title: string
  cycle_type: string
  cycle_order: number
  cycle_name: string
  subjects: string[]
  duration_weeks: number
  weekly_plan: WeeklyPlan[]
}

interface Cycle {
  cycleId: string
  cycleType: string
  cycleIntensity: string
  cycleDuration: number
  cycleStartWeek: number
  cycleOrder: number
  cycleName: string
  cycleBlocks: CycleBlock[]
}

interface StudyPlan {
  intake: any
  plan: {
    targeted_year: number
    start_date: string
    study_plan_id: string
    user_id: string
    plan_title: string
    curated_resources: any
    created_for_target_year: string
    timelineUtilization: number
    cycles: Cycle[]
  }
}

// Sortable Block Component
interface SortableBlockProps {
  block: CycleBlock
  cycleId: string
  isExpanded: boolean
  onToggle: (blockId: string) => void
}

function SortableBlock({ block, cycleId, isExpanded, onToggle }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.block_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const totalTasks = block.weekly_plan.reduce((total, week) => 
    total + week.daily_plans.reduce((dayTotal, day) => dayTotal + day.tasks.length, 0), 0
  )

  const totalHours = block.weekly_plan.reduce((total, week) => 
    total + week.daily_plans.reduce((dayTotal, day) => 
      dayTotal + day.tasks.reduce((taskTotal, task) => taskTotal + task.duration_minutes, 0), 0), 0
  ) / 60

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tree-node ${isDragging ? 'dragging' : ''}`}
    >
      <div className="ml-8">
        <div className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onToggle(block.block_id)}
          >
            <div className="flex items-center gap-3">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground">{block.block_title}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {block.duration_weeks} weeks
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {totalHours.toFixed(1)}h
                  </span>
                  <span>{totalTasks} tasks</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {block.subjects.map((subject, index) => (
                  <span
                    key={subject}
                    className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {isExpanded && (
            <div className="border-t border-border">
              <div className="p-4 space-y-4">
                {block.weekly_plan.map((week) => (
                  <div key={week.week} className="bg-muted/30 rounded-lg p-3">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Week {week.week}
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                      {week.daily_plans.map((day) => (
                        <div key={day.day} className="bg-background rounded p-2 border">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Day {day.day}
                          </div>
                          <div className="space-y-1">
                            {day.tasks.slice(0, 3).map((task) => (
                              <div key={task.task_id} className="text-xs p-1 bg-muted/50 rounded">
                                <div className="font-medium truncate">{task.title2}</div>
                                <div className="text-muted-foreground">
                                  {Math.round(task.duration_minutes / 60 * 10) / 10}h
                                </div>
                              </div>
                            ))}
                            {day.tasks.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{day.tasks.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [selectedPlan, setSelectedPlan] = useState<string>('T1')
  const [planData, setPlanData] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const planOptions = [
    'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14'
  ]

  const loadPlan = async (planName: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/generated-docs/${planName}.js`)
      if (!response.ok) {
        throw new Error(`Failed to load ${planName}.js`)
      }
      
      const jsContent = await response.text()
      const jsonMatch = jsContent.match(/window\.studyPlanData = ({.*});/s)
      if (!jsonMatch) {
        throw new Error('Could not extract JSON data from JavaScript file')
      }
      
      const jsonData = JSON.parse(jsonMatch[1])
      setPlanData(jsonData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setPlanData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlan(selectedPlan)
  }, [selectedPlan])

  const handlePlanChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPlan(event.target.value)
  }

  const toggleBlockExpansion = (blockId: string) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
  }

  const toggleCycleExpansion = (cycleId: string) => {
    setExpandedCycles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cycleId)) {
        newSet.delete(cycleId)
      } else {
        newSet.add(cycleId)
      }
      return newSet
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      if (!planData) return

      const activeBlock = active.id as string
      const overBlock = over?.id as string

      // Find the cycle containing the dragged block
      const activeCycle = planData.plan.cycles.find(cycle => 
        cycle.cycleBlocks.some(block => block.block_id === activeBlock)
      )

      if (activeCycle) {
        const oldIndex = activeCycle.cycleBlocks.findIndex(block => block.block_id === activeBlock)
        const newIndex = activeCycle.cycleBlocks.findIndex(block => block.block_id === overBlock)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newCycleBlocks = arrayMove(activeCycle.cycleBlocks, oldIndex, newIndex)
          
          setPlanData(prev => {
            if (!prev) return null
            return {
              ...prev,
              plan: {
                ...prev.plan,
                cycles: prev.plan.cycles.map(cycle => 
                  cycle.cycleId === activeCycle.cycleId 
                    ? { ...cycle, cycleBlocks: newCycleBlocks }
                    : cycle
                )
              }
            }
          })
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Plan Editor Development App</h1>
          <p className="text-muted-foreground">Tree-based layout with drag-and-drop functionality</p>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <label htmlFor="plan-select" className="text-sm font-medium">
              Select Generated Plan:
            </label>
            <select 
              id="plan-select" 
              value={selectedPlan} 
              onChange={handlePlanChange}
              disabled={loading}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              {planOptions.map(plan => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading plan data...</span>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
            Error: {error}
          </div>
        )}

        {planData && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">{planData.plan.plan_title}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Target Year:</span>
                  <div className="font-medium">{planData.plan.targeted_year}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <div className="font-medium">{new Date(planData.plan.start_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Timeline Utilization:</span>
                  <div className="font-medium">{planData.plan.timelineUtilization}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Cycles:</span>
                  <div className="font-medium">{planData.plan.cycles.length}</div>
                </div>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                {planData.plan.cycles.map((cycle) => {
                  const isCycleExpanded = expandedCycles.has(cycle.cycleId)
                  
                  return (
                    <div key={cycle.cycleId} className="bg-card border border-border rounded-lg">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCycleExpansion(cycle.cycleId)}
                      >
                        <div className="flex items-center gap-3">
                          {isCycleExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{cycle.cycleName}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Type: {cycle.cycleType}</span>
                              <span>Duration: {cycle.cycleDuration} weeks</span>
                              <span>Intensity: {cycle.cycleIntensity}</span>
                              <span>Blocks: {cycle.cycleBlocks.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {isCycleExpanded && (
                        <div className="border-t border-border p-4">
                          <SortableContext 
                            items={cycle.cycleBlocks.map(block => block.block_id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {cycle.cycleBlocks.map((block) => (
                                <SortableBlock
                                  key={block.block_id}
                                  block={block}
                                  cycleId={cycle.cycleId}
                                  isExpanded={expandedBlocks.has(block.block_id)}
                                  onToggle={toggleBlockExpansion}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  )
}

export default App