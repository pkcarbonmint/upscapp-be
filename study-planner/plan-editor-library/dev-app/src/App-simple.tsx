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
  block_start_date: string
  block_end_date: string
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
  cycleStartDate: string
  cycleEndDate: string
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
  formatDateRange: (startDate: string, endDate: string) => string
}

function SortableBlock({ block, cycleId, isExpanded, onToggle, formatDateRange }: SortableBlockProps) {
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
        <div className="block-card">
          <div 
            className="block-header"
            onClick={() => onToggle(block.block_id)}
          >
            <div className="block-header-content">
              <div className="drag-handle" {...attributes} {...listeners}>
                <GripVertical size={16} />
              </div>
              
              <div className="expand-icon">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <BookOpen size={16} />
              </div>
              
              <div className="block-info">
                <h4 className="block-title">{block.block_title}</h4>
                <div className="block-meta">
                  <span className="meta-item">
                    <Calendar size={12} />
                    {formatDateRange(block.block_start_date, block.block_end_date)}
                  </span>
                  <span className="meta-item">
                    <Clock size={12} />
                    {totalHours.toFixed(1)}h
                  </span>
                  <span className="meta-item">{totalTasks} tasks</span>
                  <span className="meta-item">{block.duration_weeks} weeks</span>
                </div>
              </div>
            </div>
            
            <div className="subject-tags">
              {block.subjects.map((subject) => (
                <span key={subject} className="subject-tag">
                  {subject}
                </span>
              ))}
            </div>
          </div>
          
          {isExpanded && (
            <div className="block-details">
              <div className="weeks-container">
                {block.weekly_plan.map((week) => (
                  <div key={week.week} className="week-card">
                    <h5 className="week-title">
                      <Calendar size={14} />
                      Week {week.week}
                    </h5>
                    
                    <div className="days-grid">
                      {week.daily_plans.map((day) => (
                        <div key={day.day} className="day-card">
                          <div className="day-header">Day {day.day}</div>
                          <div className="tasks-list">
                            {day.tasks.slice(0, 3).map((task) => (
                              <div key={task.task_id} className="task-item">
                                <div className="task-title">{task.title2}</div>
                                <div className="task-duration">
                                  {Math.round(task.duration_minutes / 60 * 10) / 10}h
                                </div>
                              </div>
                            ))}
                            {day.tasks.length > 3 && (
                              <div className="more-tasks">
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      })
    } catch (error) {
      return dateString
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

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
    <div className="app-container">
      <div className="app-content">
        <div className="app-header">
          <h1 className="app-title">Plan Editor Development App</h1>
          <p className="app-subtitle">Tree-based layout with drag-and-drop functionality</p>
        </div>
        
        <div className="plan-selector">
          <div className="selector-group">
            <label htmlFor="plan-select" className="selector-label">
              Select Generated Plan:
            </label>
            <select 
              id="plan-select" 
              value={selectedPlan} 
              onChange={handlePlanChange}
              disabled={loading}
              className="plan-select"
            >
              {planOptions.map(plan => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <span className="loading-text">Loading plan data...</span>
          </div>
        )}

        {error && (
          <div className="error-state">
            Error: {error}
          </div>
        )}

        {planData && (
          <div className="plan-content">
            <div className="plan-summary">
              <h2 className="plan-title">{planData.plan.plan_title}</h2>
              <div className="plan-meta">
                <div className="meta-item">
                  <span className="meta-label">Target Year:</span>
                  <span className="meta-value">{planData.plan.targeted_year}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Start Date:</span>
                  <span className="meta-value">{new Date(planData.plan.start_date).toLocaleDateString()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Timeline Utilization:</span>
                  <span className="meta-value">{planData.plan.timelineUtilization}%</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Total Cycles:</span>
                  <span className="meta-value">{planData.plan.cycles.length}</span>
                </div>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="cycles-container">
                {planData.plan.cycles.map((cycle) => {
                  const isCycleExpanded = expandedCycles.has(cycle.cycleId)
                  
                  return (
                    <div key={cycle.cycleId} className="cycle-card">
                      <div 
                        className="cycle-header"
                        onClick={() => toggleCycleExpansion(cycle.cycleId)}
                      >
                        <div className="cycle-header-content">
                          {isCycleExpanded ? (
                            <ChevronDown size={20} />
                          ) : (
                            <ChevronRight size={20} />
                          )}
                          <div className="cycle-info">
                            <h3 className="cycle-title">{cycle.cycleName}</h3>
                            <div className="cycle-meta">
                              <span className="cycle-date-range">
                                <Calendar size={14} />
                                {formatDateRange(cycle.cycleStartDate, cycle.cycleEndDate)}
                              </span>
                              <span>Type: {cycle.cycleType}</span>
                              <span>Duration: {cycle.cycleDuration} weeks</span>
                              <span>Intensity: {cycle.cycleIntensity}</span>
                              <span>Blocks: {cycle.cycleBlocks.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {isCycleExpanded && (
                        <div className="cycle-content">
                          <SortableContext 
                            items={cycle.cycleBlocks.map(block => block.block_id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="blocks-list">
                              {cycle.cycleBlocks.map((block) => (
                                <SortableBlock
                                  key={block.block_id}
                                  block={block}
                                  cycleId={cycle.cycleId}
                                  isExpanded={expandedBlocks.has(block.block_id)}
                                  onToggle={toggleBlockExpansion}
                                  formatDateRange={formatDateRange}
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
