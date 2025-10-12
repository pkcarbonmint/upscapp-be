import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { StudyPlan, StudyCycle, Block, StudentIntake } from '../types/models';
import { DocumentService } from './DocumentService';
import dayjs from 'dayjs';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

/**
 * Enhanced PDF generation service with beautiful visualizations
 * Generates PDFs from HTML/CSS with charts and modern design
 */
export class EnhancedPDFService {
  private static readonly PDF_CONFIG = {
    format: 'a4' as const,
    orientation: 'portrait' as const,
    unit: 'mm' as const,
    margin: {
      top: 20,
      right: 15,
      bottom: 20,
      left: 15
    },
    quality: 2, // High quality for charts
    useCORS: true,
    backgroundColor: '#ffffff'
  };

  private static readonly CHART_COLORS = {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    pink: '#ec4899',
    indigo: '#6366f1',
    teal: '#14b8a6'
  };

  /**
   * Generate enhanced PDF with beautiful visualizations for overall study plan
   */
  static async generateEnhancedStudyPlanPDF(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    filename?: string
  ): Promise<void> {
    try {
      // Create HTML document for PDF generation
      const htmlContent = this.createEnhancedStudyPlanHTML(studyPlan, studentIntake);
      
      // Create temporary container for rendering
      const container = this.createTemporaryContainer(htmlContent);
      
      // Generate charts and insert them
      await this.generateAndInsertCharts(container, studyPlan);
      
      // Generate PDF from HTML
      const pdf = await this.generatePDFFromHTML(container);
      
      // Download the PDF
      const finalFilename = filename || `enhanced-study-plan-${studyPlan.study_plan_id || 'plan'}.pdf`;
      pdf.save(finalFilename);
      
      // Cleanup
      this.cleanupTemporaryContainer(container);
      
    } catch (error) {
      console.error('Failed to generate enhanced PDF:', error);
      throw new Error('PDF generation failed');
    }
  }

  /**
   * Generate enhanced weekly schedule PDF with detailed visualizations
   */
  static async generateWeeklySchedulePDF(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    weekNumber: number = 1,
    weeklyData?: any,
    filename?: string
  ): Promise<void> {
    try {
      // Generate weekly data if not provided
      const finalWeeklyData = weeklyData || this.generateDefaultWeeklyData(studyPlan, weekNumber);
      
      // Create HTML document for weekly schedule
      const htmlContent = this.createWeeklyScheduleHTML(studyPlan, studentIntake, weekNumber, finalWeeklyData);
      
      // Create temporary container
      const container = this.createTemporaryContainer(htmlContent);
      
      // Generate weekly charts
      await this.generateAndInsertWeeklyCharts(container, finalWeeklyData);
      
      // Generate PDF
      const pdf = await this.generatePDFFromHTML(container);
      
      // Download
      const finalFilename = filename || `weekly-schedule-week${weekNumber}-${studyPlan.study_plan_id || 'plan'}.pdf`;
      pdf.save(finalFilename);
      
      // Cleanup
      this.cleanupTemporaryContainer(container);
      
    } catch (error) {
      console.error('Failed to generate weekly schedule PDF:', error);
      throw new Error('Weekly PDF generation failed');
    }
  }

  /**
   * Create enhanced HTML template for study plan overview
   */
  private static createEnhancedStudyPlanHTML(studyPlan: StudyPlan, studentIntake: StudentIntake): string {
    const totalWeeks = this.calculateTotalWeeks(studyPlan);
    const totalBlocks = this.countTotalBlocks(studyPlan);
    const uniqueSubjects = this.getUniqueSubjects(studyPlan);
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${studyPlan.plan_title || 'Study Plan'}</title>
        ${this.getEnhancedCSS()}
    </head>
    <body>
        <div class="page">
            <!-- Header Section -->
            <div class="header">
                <h1>${studyPlan.plan_title || 'Comprehensive Study Plan'}</h1>
                <div class="subtitle">Strategic UPSC ${studyPlan.targeted_year || '2025'} Preparation Plan</div>
            </div>
            
            <!-- Plan Information Grid -->
            <div class="info-grid">
                <div class="info-card">
                    <h3>📋 Plan Details</h3>
                    <div class="info-item">
                        <span class="info-label">Student:</span>
                        <span class="info-value">${studentIntake.personal_details?.full_name || 'Student'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Target Year:</span>
                        <span class="info-value">${studyPlan.targeted_year || '2025'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Start Date:</span>
                        <span class="info-value">${studentIntake.start_date || 'TBD'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Generated:</span>
                        <span class="info-value">${dayjs().format('MMMM DD, YYYY')}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3>📊 Plan Statistics</h3>
                    <div class="info-item">
                        <span class="info-label">Total Duration:</span>
                        <span class="info-value">${totalWeeks} weeks</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Study Cycles:</span>
                        <span class="info-value">${studyPlan.cycles?.length || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Study Blocks:</span>
                        <span class="info-value">${totalBlocks}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Subjects:</span>
                        <span class="info-value">${uniqueSubjects.length}</span>
                    </div>
                </div>
            </div>
            
            <!-- Statistics Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${totalWeeks}</div>
                    <div class="stat-label">Total Weeks</div>
                </div>
                <div class="stat-card accent">
                    <div class="stat-number">${studyPlan.cycles?.length || 0}</div>
                    <div class="stat-label">Study Cycles</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-number">${totalBlocks}</div>
                    <div class="stat-label">Study Blocks</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-number">${uniqueSubjects.length}</div>
                    <div class="stat-label">Subjects</div>
                </div>
            </div>
            
            <!-- Subjects Overview -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📚 Subjects Distribution</h2>
                </div>
                <div class="subjects-distribution">
                    ${uniqueSubjects.map(subject => `<div class="subject-tag">${subject}</div>`).join('')}
                </div>
            </div>
            
            <!-- Charts Container -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📊 Visual Analytics</h2>
                </div>
                
                <div class="charts-row">
                    <div class="chart-container" id="subjects-pie-chart">
                        <h3>Subjects Time Distribution</h3>
                        <canvas id="subjectsChart" width="400" height="200"></canvas>
                    </div>
                    
                    <div class="chart-container" id="cycles-timeline-chart">
                        <h3>Cycles Timeline</h3>
                        <canvas id="cyclesChart" width="400" height="200"></canvas>
                    </div>
                </div>
                
                <div class="chart-container" id="weekly-distribution-chart">
                    <h3>Weekly Study Load Distribution</h3>
                    <canvas id="weeklyChart" width="800" height="300"></canvas>
                </div>
            </div>
            
            <!-- Study Plan Cycles -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">🗓️ Study Plan by Cycles</h2>
                </div>
                
                ${this.generateCyclesHTML(studyPlan)}
            </div>
            
            <!-- Timeline Visualization -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📈 Study Timeline</h2>
                </div>
                <div class="timeline">
                    ${this.generateTimelineHTML(studyPlan)}
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="footer-content">
                    <div class="footer-left">
                        Generated on ${dayjs().format('MMMM DD, YYYY')} | Helios Study Planner
                    </div>
                    <div class="footer-right">
                        Your Path to Excellence
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * Create HTML template for weekly schedule
   */
  private static createWeeklyScheduleHTML(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    weekNumber: number,
    weeklyData: any
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${studyPlan.plan_title} - Week ${weekNumber}</title>
        ${this.getWeeklyScheduleCSS()}
    </head>
    <body>
        <div class="page">
            <!-- Header -->
            <div class="header">
                <h1>${studyPlan.plan_title || 'Study Plan'}</h1>
                <div class="subtitle">Week ${weekNumber} Schedule</div>
            </div>
            
            <!-- Week Info -->
            <div class="week-info">
                <div class="week-info-grid">
                    <div class="week-info-item">
                        <div class="week-info-label">Week Number</div>
                        <div class="week-info-value">${weekNumber}</div>
                    </div>
                    <div class="week-info-item">
                        <div class="week-info-label">Study Days</div>
                        <div class="week-info-value">${weeklyData.studyDays || 7}</div>
                    </div>
                    <div class="week-info-item">
                        <div class="week-info-label">Total Hours</div>
                        <div class="week-info-value">${weeklyData.totalHours || 40}h</div>
                    </div>
                    <div class="week-info-item">
                        <div class="week-info-label">Active Subjects</div>
                        <div class="week-info-value">${weeklyData.activeSubjects?.length || 4}</div>
                    </div>
                </div>
            </div>
            
            <!-- Daily Schedules -->
            <div class="content">
                ${this.generateDailySchedulesHTML(weeklyData)}
                
                <!-- Weekly Charts -->
                <div class="section">
                    <div class="section-header">
                        <h2 class="section-title">📊 Weekly Analytics</h2>
                    </div>
                    
                    <div class="charts-row">
                        <div class="chart-container" id="daily-hours-chart">
                            <h3>Daily Study Hours</h3>
                            <canvas id="dailyHoursChart" width="400" height="200"></canvas>
                        </div>
                        
                        <div class="chart-container" id="subject-balance-chart">
                            <h3>Subject Time Balance</h3>
                            <canvas id="subjectBalanceChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Weekly Summary -->
                ${this.generateWeeklySummaryHTML(weeklyData)}
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="footer-content">
                    <div class="footer-left">
                        Week ${weekNumber} Schedule | Generated ${dayjs().format('MMMM DD, YYYY')}
                    </div>
                    <div class="footer-right">
                        Helios Study Planner
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * Generate and insert charts into the HTML container
   */
  private static async generateAndInsertCharts(container: HTMLElement, studyPlan: StudyPlan): Promise<void> {
    const subjectsCanvas = container.querySelector('#subjectsChart') as HTMLCanvasElement;
    const cyclesCanvas = container.querySelector('#cyclesChart') as HTMLCanvasElement;
    const weeklyCanvas = container.querySelector('#weeklyChart') as HTMLCanvasElement;

    if (subjectsCanvas) {
      await this.createSubjectsPieChart(subjectsCanvas, studyPlan);
    }

    if (cyclesCanvas) {
      await this.createCyclesTimelineChart(cyclesCanvas, studyPlan);
    }

    if (weeklyCanvas) {
      await this.createWeeklyDistributionChart(weeklyCanvas, studyPlan);
    }
  }

  /**
   * Generate and insert weekly charts
   */
  private static async generateAndInsertWeeklyCharts(container: HTMLElement, weeklyData: any): Promise<void> {
    const dailyHoursCanvas = container.querySelector('#dailyHoursChart') as HTMLCanvasElement;
    const subjectBalanceCanvas = container.querySelector('#subjectBalanceChart') as HTMLCanvasElement;

    if (dailyHoursCanvas) {
      await this.createDailyHoursChart(dailyHoursCanvas, weeklyData);
    }

    if (subjectBalanceCanvas) {
      await this.createSubjectBalanceChart(subjectBalanceCanvas, weeklyData);
    }
  }

  /**
   * Create subjects pie chart
   */
  private static async createSubjectsPieChart(canvas: HTMLCanvasElement, studyPlan: StudyPlan): Promise<Chart> {
    const subjects = this.getUniqueSubjects(studyPlan);
    const subjectHours = this.calculateSubjectHours(studyPlan);
    
    const data = subjects.map(subject => subjectHours[subject] || 0);
    const colors = subjects.map((_, index) => Object.values(this.CHART_COLORS)[index % Object.values(this.CHART_COLORS).length]);

    return new Chart(canvas, {
      type: 'pie',
      data: {
        labels: subjects,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                family: 'Inter, sans-serif',
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = ((value / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                return `${label}: ${value}h (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create cycles timeline chart
   */
  private static async createCyclesTimelineChart(canvas: HTMLCanvasElement, studyPlan: StudyPlan): Promise<Chart> {
    const cycles = studyPlan.cycles || [];
    const cycleNames = cycles.map(cycle => cycle.cycleName || cycle.cycleType || 'Cycle');
    const cycleDurations = cycles.map(cycle => cycle.cycleDuration || 0);

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: cycleNames,
        datasets: [{
          label: 'Duration (Weeks)',
          data: cycleDurations,
          backgroundColor: this.CHART_COLORS.primary,
          borderColor: this.CHART_COLORS.primary,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Weeks'
            }
          }
        }
      }
    });
  }

  /**
   * Create weekly distribution chart
   */
  private static async createWeeklyDistributionChart(canvas: HTMLCanvasElement, studyPlan: StudyPlan): Promise<Chart> {
    const weeklyData = this.calculateWeeklyDistribution(studyPlan);
    
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: weeklyData.map((_, index) => `Week ${index + 1}`),
        datasets: [{
          label: 'Study Hours',
          data: weeklyData.map(week => week.hours),
          borderColor: this.CHART_COLORS.success,
          backgroundColor: this.CHART_COLORS.success + '20',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours per Week'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Study Timeline'
            }
          }
        }
      }
    });
  }

  /**
   * Create daily hours chart for weekly schedule
   */
  private static async createDailyHoursChart(canvas: HTMLCanvasElement, weeklyData: any): Promise<Chart> {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyHours = weeklyData.dailyHours || [6, 7, 6, 8, 7, 5, 4];

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Study Hours',
          data: dailyHours,
          backgroundColor: days.map((_, index) => Object.values(this.CHART_COLORS)[index]),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          }
        }
      }
    });
  }

  /**
   * Create subject balance chart for weekly schedule
   */
  private static async createSubjectBalanceChart(canvas: HTMLCanvasElement, weeklyData: any): Promise<Chart> {
    const subjects = weeklyData.activeSubjects || ['Math', 'Physics', 'Chemistry', 'Biology'];
    const subjectHours = weeklyData.subjectHours || [8, 7, 6, 5];

    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: subjects,
        datasets: [{
          data: subjectHours,
          backgroundColor: subjects.map((_, index) => Object.values(this.CHART_COLORS)[index]),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Inter, sans-serif',
                size: 10
              }
            }
          }
        }
      }
    });
  }

  // Helper methods continue in next part due to length...
  
  /**
   * Calculate total weeks across all cycles
   */
  private static calculateTotalWeeks(studyPlan: StudyPlan): number {
    return studyPlan.cycles?.reduce((total, cycle) => total + (cycle.cycleDuration || 0), 0) || 0;
  }

  /**
   * Count total blocks across all cycles
   */
  private static countTotalBlocks(studyPlan: StudyPlan): number {
    return studyPlan.cycles?.reduce((total, cycle) => total + (cycle.cycleBlocks?.length || 0), 0) || 0;
  }

  /**
   * Get unique subjects from study plan
   */
  private static getUniqueSubjects(studyPlan: StudyPlan): string[] {
    const subjects = new Set<string>();
    studyPlan.cycles?.forEach(cycle => {
      cycle.cycleBlocks?.forEach(block => {
        block.subjects?.forEach(subject => subjects.add(subject));
      });
    });
    return Array.from(subjects);
  }

  /**
   * Calculate subject hours distribution
   */
  private static calculateSubjectHours(studyPlan: StudyPlan): Record<string, number> {
    const subjectHours: Record<string, number> = {};
    const uniqueSubjects = this.getUniqueSubjects(studyPlan);
    
    uniqueSubjects.forEach(subject => {
      let totalHours = 0;
      studyPlan.cycles?.forEach(cycle => {
        cycle.cycleBlocks?.forEach(block => {
          if (block.subjects?.includes(subject)) {
            // Estimate hours based on block duration and subject count
            const blockHours = (block.duration_weeks || 0) * 35; // 35 hours per week
            const subjectHours = blockHours / (block.subjects?.length || 1);
            totalHours += subjectHours;
          }
        });
      });
      subjectHours[subject] = Math.round(totalHours);
    });
    
    return subjectHours;
  }

  /**
   * Calculate weekly distribution data
   */
  private static calculateWeeklyDistribution(studyPlan: StudyPlan): Array<{hours: number, week: number}> {
    const totalWeeks = this.calculateTotalWeeks(studyPlan);
    const weeklyData: Array<{hours: number, week: number}> = [];
    
    for (let week = 1; week <= Math.min(totalWeeks, 52); week++) {
      // Simulate varying study load throughout the year
      const baseHours = 35;
      const variation = Math.sin((week / totalWeeks) * Math.PI) * 10;
      const hours = Math.round(baseHours + variation);
      weeklyData.push({ hours, week });
    }
    
    return weeklyData;
  }

  /**
   * Generate default weekly data
   */
  private static generateDefaultWeeklyData(studyPlan: StudyPlan, weekNumber: number): any {
    const subjects = this.getUniqueSubjects(studyPlan).slice(0, 4);
    
    return {
      studyDays: 7,
      totalHours: 42,
      activeSubjects: subjects,
      dailyHours: [6, 7, 6, 8, 7, 5, 4],
      subjectHours: subjects.map(() => Math.floor(Math.random() * 10) + 5),
      goals: [
        'Complete foundation chapters for active subjects',
        'Solve practice problems for each topic',
        'Review previous week\'s learning',
        'Take mock assessments',
        'Identify and address weak areas'
      ],
      progress: {
        foundation: 75,
        revision: 60,
        practice: 45
      }
    };
  }

  // Additional helper methods for HTML generation...
  
  /**
   * Generate cycles HTML
   */
  private static generateCyclesHTML(studyPlan: StudyPlan): string {
    if (!studyPlan.cycles) return '<p>No cycles available</p>';
    
    return studyPlan.cycles.map(cycle => `
      <div class="cycle-container">
        <div class="cycle-header">
          ${cycle.cycleName || cycle.cycleType} (${cycle.cycleDuration || 0} weeks)
        </div>
        <div class="cycle-content">
          ${cycle.cycleBlocks?.map(block => `
            <div class="block-item">
              <div class="block-title">${block.block_title || 'Untitled Block'}</div>
              <div class="block-duration">${block.duration_weeks || 0} weeks</div>
              <div class="block-subjects">${block.subjects?.join(', ') || 'No subjects'}</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.random() * 100}%"></div>
              </div>
            </div>
          `).join('') || '<p>No blocks in this cycle</p>'}
        </div>
      </div>
    `).join('');
  }

  /**
   * Generate timeline HTML
   */
  private static generateTimelineHTML(studyPlan: StudyPlan): string {
    if (!studyPlan.cycles) return '<p>No timeline available</p>';
    
    return studyPlan.cycles.map(cycle => `
      <div class="timeline-item">
        <h4>${cycle.cycleName || cycle.cycleType}</h4>
        <p><strong>Duration:</strong> ${cycle.cycleDuration || 0} weeks</p>
        <p><strong>Blocks:</strong> ${cycle.cycleBlocks?.length || 0}</p>
        <p><strong>Period:</strong> ${cycle.cycleStartDate || 'TBD'} - ${cycle.cycleEndDate || 'TBD'}</p>
      </div>
    `).join('');
  }

  /**
   * Generate daily schedules HTML for weekly view
   */
  private static generateDailySchedulesHTML(weeklyData: any): string {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return days.map(day => `
      <div class="daily-schedule">
        <div class="day-header">
          <div class="day-title">${day}</div>
        </div>
        <div class="day-content">
          <div class="time-slot study-session">
            <div class="time-range">09:00<br>10:30</div>
            <div class="activity">
              <div class="activity-title">Morning Study Session</div>
              <div class="activity-description">Foundation concepts and theory</div>
            </div>
            <div class="subject-tag foundation">Core Subject</div>
            <div class="duration">1.5h</div>
          </div>
          <div class="time-slot study-session">
            <div class="time-range">11:00<br>12:30</div>
            <div class="activity">
              <div class="activity-title">Focused Study</div>
              <div class="activity-description">Deep dive into key topics</div>
            </div>
            <div class="subject-tag">Subject A</div>
            <div class="duration">1.5h</div>
          </div>
          <div class="time-slot revision-session">
            <div class="time-range">14:00<br>15:30</div>
            <div class="activity">
              <div class="activity-title">Revision Session</div>
              <div class="activity-description">Review and consolidation</div>
            </div>
            <div class="subject-tag revision">Subject B</div>
            <div class="duration">1.5h</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Generate weekly summary HTML
   */
  private static generateWeeklySummaryHTML(weeklyData: any): string {
    return `
      <div class="weekly-summary">
        <div class="summary-header">📊 Weekly Summary</div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number">${weeklyData.totalHours || 42}</div>
            <div class="summary-label">Total Hours</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">${weeklyData.activeSubjects?.length || 4}</div>
            <div class="summary-label">Subjects</div>
          </div>
          <div class="summary-card">
            <div class="summary-number">14</div>
            <div class="summary-label">Sessions</div>
          </div>
        </div>
        
        <div class="progress-section">
          <div class="progress-header">📈 Weekly Progress</div>
          <div class="progress-bars">
            <div class="progress-item">
              <div class="progress-label">Foundation</div>
              <div class="progress-bar">
                <div class="progress-fill foundation" style="width: ${weeklyData.progress?.foundation || 75}%"></div>
              </div>
              <div class="progress-percentage">${weeklyData.progress?.foundation || 75}%</div>
            </div>
            <div class="progress-item">
              <div class="progress-label">Revision</div>
              <div class="progress-bar">
                <div class="progress-fill revision" style="width: ${weeklyData.progress?.revision || 60}%"></div>
              </div>
              <div class="progress-percentage">${weeklyData.progress?.revision || 60}%</div>
            </div>
            <div class="progress-item">
              <div class="progress-label">Practice</div>
              <div class="progress-bar">
                <div class="progress-fill practice" style="width: ${weeklyData.progress?.practice || 45}%"></div>
              </div>
              <div class="progress-percentage">${weeklyData.progress?.practice || 45}%</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create temporary container for HTML rendering
   */
  private static createTemporaryContainer(htmlContent: string): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    container.style.backgroundColor = 'white';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Generate PDF from HTML container
   */
  private static async generatePDFFromHTML(container: HTMLElement): Promise<jsPDF> {
    const canvas = await html2canvas(container, {
      scale: this.PDF_CONFIG.quality,
      useCORS: this.PDF_CONFIG.useCORS,
      backgroundColor: this.PDF_CONFIG.backgroundColor,
      width: container.scrollWidth,
      height: container.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF(this.PDF_CONFIG.orientation, this.PDF_CONFIG.unit, this.PDF_CONFIG.format);
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;
    
    const x = (pdfWidth - scaledWidth) / 2;
    const y = (pdfHeight - scaledHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
    
    return pdf;
  }

  /**
   * Cleanup temporary container
   */
  private static cleanupTemporaryContainer(container: HTMLElement): void {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  // CSS styles continue in next part...
  
  /**
   * Get enhanced CSS for study plan PDF
   */
  private static getEnhancedCSS(): string {
    return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1e293b;
        background: #f8fafc;
      }
      
      .page {
        width: 210mm;
        min-height: 297mm;
        background: white;
        padding: 0;
      }
      
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 30px;
        text-align: center;
      }
      
      .header h1 {
        font-size: 3.5em;
        font-weight: 800;
        margin-bottom: 10px;
      }
      
      .header .subtitle {
        font-size: 1.2em;
        font-weight: 300;
        opacity: 0.9;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        padding: 30px;
        margin-bottom: 20px;
      }
      
      .info-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .info-card h3 {
        color: #2563eb;
        font-weight: 600;
        margin-bottom: 15px;
        font-size: 1.1em;
      }
      
      .info-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      
      .info-label {
        font-weight: 500;
        color: #64748b;
      }
      
      .info-value {
        font-weight: 600;
        color: #1e293b;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        padding: 0 30px;
        margin-bottom: 30px;
      }
      
      .stat-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #2563eb;
      }
      
      .stat-card.accent {
        border-left-color: #06b6d4;
      }
      
      .stat-card.success {
        border-left-color: #10b981;
      }
      
      .stat-card.warning {
        border-left-color: #f59e0b;
      }
      
      .stat-number {
        font-size: 2.5em;
        font-weight: 800;
        color: #2563eb;
        margin-bottom: 5px;
      }
      
      .stat-label {
        font-size: 0.9em;
        color: #64748b;
        font-weight: 500;
      }
      
      .section {
        margin: 40px 30px;
      }
      
      .section-header {
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e2e8f0;
      }
      
      .section-title {
        font-size: 1.8em;
        font-weight: 700;
        color: #0f172a;
      }
      
      .subjects-distribution {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 15px 0;
      }
      
      .subject-tag {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.8em;
        font-weight: 500;
      }
      
      .charts-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .chart-container {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .chart-container h3 {
        color: #2563eb;
        font-weight: 600;
        margin-bottom: 15px;
        text-align: center;
      }
      
      .cycle-container {
        margin-bottom: 25px;
      }
      
      .cycle-header {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
        font-size: 1.1em;
      }
      
      .cycle-content {
        background: white;
        border: 1px solid #e2e8f0;
        border-top: none;
        border-radius: 0 0 8px 8px;
      }
      
      .block-item {
        padding: 15px 20px;
        border-bottom: 1px solid #f1f5f9;
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 2fr;
        gap: 15px;
        align-items: center;
      }
      
      .block-title {
        font-weight: 600;
        color: #1e293b;
      }
      
      .block-duration {
        background: #06b6d4;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8em;
        font-weight: 600;
        text-align: center;
      }
      
      .block-subjects {
        color: #64748b;
        font-size: 0.9em;
      }
      
      .progress-bar {
        width: 100%;
        height: 6px;
        background: #f1f5f9;
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        border-radius: 3px;
      }
      
      .timeline {
        position: relative;
        padding-left: 30px;
      }
      
      .timeline::before {
        content: '';
        position: absolute;
        left: 15px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #e2e8f0;
      }
      
      .timeline-item {
        position: relative;
        margin-bottom: 20px;
        background: white;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .timeline-item::before {
        content: '';
        position: absolute;
        left: -22px;
        top: 20px;
        width: 12px;
        height: 12px;
        background: #2563eb;
        border-radius: 50%;
        border: 3px solid white;
      }
      
      .footer {
        background: #0f172a;
        color: white;
        padding: 20px 30px;
        margin-top: 40px;
      }
      
      .footer-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .footer-left {
        font-size: 0.9em;
        opacity: 0.8;
      }
      
      .footer-right {
        font-weight: 600;
      }
    </style>`;
  }

  /**
   * Get CSS for weekly schedule
   */
  private static getWeeklyScheduleCSS(): string {
    return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        line-height: 1.5;
        color: #1e293b;
        background: #f8fafc;
      }
      
      .page {
        width: 210mm;
        min-height: 297mm;
        background: white;
        padding: 0;
      }
      
      .header {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 30px 25px;
        text-align: center;
      }
      
      .header h1 {
        font-size: 2.5em;
        font-weight: 700;
        margin-bottom: 5px;
      }
      
      .header .subtitle {
        font-size: 1em;
        font-weight: 300;
        opacity: 0.9;
      }
      
      .week-info {
        background: white;
        border-bottom: 1px solid #e2e8f0;
        padding: 20px 25px;
      }
      
      .week-info-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
      }
      
      .week-info-item {
        text-align: center;
        padding: 15px;
        border-radius: 8px;
        background: #f8fafc;
      }
      
      .week-info-label {
        font-size: 0.8em;
        color: #64748b;
        margin-bottom: 5px;
        font-weight: 500;
      }
      
      .week-info-value {
        font-size: 1.2em;
        font-weight: 700;
        color: #2563eb;
      }
      
      .content {
        padding: 25px;
      }
      
      .daily-schedule {
        margin-bottom: 30px;
      }
      
      .day-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
        font-size: 1.1em;
      }
      
      .day-content {
        background: white;
        border: 1px solid #e2e8f0;
        border-top: none;
        border-radius: 0 0 8px 8px;
      }
      
      .time-slot {
        display: grid;
        grid-template-columns: 80px 1fr 120px 80px;
        gap: 15px;
        padding: 12px 20px;
        border-bottom: 1px solid #f1f5f9;
        align-items: center;
        min-height: 60px;
      }
      
      .time-slot:nth-child(even) {
        background: #fafbfc;
      }
      
      .time-range {
        font-weight: 600;
        color: #2563eb;
        font-size: 0.85em;
      }
      
      .activity {
        display: flex;
        flex-direction: column;
      }
      
      .activity-title {
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 3px;
      }
      
      .activity-description {
        color: #64748b;
        font-size: 0.85em;
      }
      
      .subject-tag {
        background: #06b6d4;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75em;
        font-weight: 500;
        text-align: center;
      }
      
      .subject-tag.foundation {
        background: #10b981;
      }
      
      .subject-tag.revision {
        background: #f59e0b;
      }
      
      .duration {
        color: #64748b;
        font-size: 0.8em;
        font-weight: 500;
      }
      
      .charts-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .chart-container {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .weekly-summary {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        margin: 30px 0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .summary-header {
        color: #2563eb;
        font-weight: 700;
        font-size: 1.2em;
        margin-bottom: 15px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .summary-card {
        text-align: center;
        padding: 15px;
        background: #f8fafc;
        border-radius: 8px;
      }
      
      .summary-number {
        font-size: 2em;
        font-weight: 800;
        color: #2563eb;
        margin-bottom: 5px;
      }
      
      .summary-label {
        color: #64748b;
        font-size: 0.85em;
        font-weight: 500;
      }
      
      .progress-section {
        margin-top: 20px;
      }
      
      .progress-header {
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 15px;
        font-size: 1.1em;
      }
      
      .progress-bars {
        display: grid;
        gap: 12px;
      }
      
      .progress-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .progress-label {
        font-weight: 500;
        color: #1e293b;
        min-width: 120px;
      }
      
      .progress-bar {
        flex: 1;
        height: 8px;
        background: #f1f5f9;
        border-radius: 4px;
        margin: 0 15px;
        overflow: hidden;
      }
      
      .progress-fill.foundation {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      .progress-fill.revision {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      }
      
      .progress-fill.practice {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      
      .progress-percentage {
        font-weight: 600;
        color: #1e293b;
        min-width: 40px;
        text-align: right;
        font-size: 0.85em;
      }
      
      .footer {
        background: #0f172a;
        color: white;
        padding: 15px 25px;
        margin-top: 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .footer-left {
        font-size: 0.85em;
        opacity: 0.8;
      }
      
      .footer-right {
        font-weight: 600;
        font-size: 0.85em;
      }
    </style>`;
  }
}

export default EnhancedPDFService;