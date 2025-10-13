import React, { useState, useEffect } from 'react';
import type { FormData, BlockPreview } from '../types';
import TimelineView from './TimelineView';
import ListView from './ListView';
import TableView from './TableView';
import { apiService } from '../services/api';
let PDFService: typeof import('helios-ts')['PDFService'] | undefined;
const helioslibProm = import('helios-ts');

async function loadPDFService() {
  if (!PDFService) {
    const helioslib = await helioslibProm;
    PDFService = helioslib.PDFService;
  }
  return PDFService;
}
// Removed DocumentService import - now using server-side generation

// Type definitions for transformed cycle data
interface TransformedCycle {
  cycleId: string;
  name: string;
  cycleType: string;
  order: number;
  blocks: BlockPreview[];
}

interface PreviewStepProps {
  formData: FormData;
  onUpdate: (updates: Partial<FormData>) => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({ formData, onUpdate }) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'table'>('timeline');
  const [isDownloading, setIsDownloading] = useState<{ docx: boolean; pdf: boolean }>({ docx: false, pdf: false });
  const [showDebugPanel, _setShowDebugPanel] = useState<boolean>(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  // Extract cycles and blocks from raw Helios data
  const cycles = formData.preview.raw_helios_data?.cycles || [];
  const studyPlanId = formData.preview.studyPlanId;
  console.log('cycles', cycles);
  // Call getPreview when component mounts or when formData changes
  useEffect(() => {
    const generatePreview = async () => {
      console.log('generatePreview', formData.preview.studyPlanId, formData.preview.raw_helios_data);
      // Only generate preview if we don't already have preview data or if it's a debug app
      const hasPreviewData = formData.preview.studyPlanId && formData.preview.raw_helios_data;
      const isDebugApp = window.location.pathname.includes('debug.html');
      
      if (!hasPreviewData || isDebugApp) {
        setIsLoadingPreview(true);
        setPreviewError(null);
        
        try {
          console.log("fetching preview data")
          const previewResponse = await apiService.getPreview(formData);
          console.log('previewResponse', previewResponse);
          if (previewResponse.success && previewResponse.data) {
            onUpdate({
              preview: previewResponse.data.preview || formData.preview
            });
          } else {
            setPreviewError(previewResponse.error || 'Failed to generate preview');
          }
        } catch (error) {
          console.error('Failed to generate preview data:', error);
          setPreviewError(error instanceof Error ? error.message : 'Failed to generate preview');
        } finally {
          setIsLoadingPreview(false);
        }
      }
    };

    generatePreview();
    // Debounce the preview generation to avoid multiple calls
    const timeoutId = setTimeout(() => {
    }, 500); // Wait 500ms after last change

    return () => clearTimeout(timeoutId);
  }, [formData.background, formData.targetYear, formData.commitment, formData.confidenceLevel, onUpdate]);

  // Format date range from API response dates
  const formatDateRange = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return 'TBD';
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'TBD';
      }
      
      const formatOptions: Intl.DateTimeFormatOptions = { 
        day: '2-digit',
        month: '2-digit', 
        year: '2-digit'
      };
      
      const startFormatted = start.toLocaleDateString('en-US', formatOptions);
      const endFormatted = end.toLocaleDateString('en-US', formatOptions);
      
      return `${startFormatted} - ${endFormatted}`;
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Transform Helios cycles data to display format
  const transformedCycles: TransformedCycle[] = cycles.map((cycle: any) => {
    const { cycleId, cycleName, cycleType, cycleOrder } = cycle;
    const blocks = cycle.cycleBlocks || [];
    console.log({cycleId, cycleName, cycleType, cycleOrder, cycleBlocks: blocks});
    return {
      cycleId,  
      name: cycleName || 'Unknown Cycle',
      cycleType: cycleType || 'General',
      order: cycleOrder || 999,
      blocks: blocks.map((block: any, blockIndex: number) => {
        // Calculate hours from weekly plan data
        const calculateHours = (weeklyPlan: any[]) => {
          let totalMinutes = 0;
          let revisionMinutes = 0;
          let practiceMinutes = 0;
          let testMinutes = 0;

          if (Array.isArray(weeklyPlan)) {
            weeklyPlan.forEach((week: any) => {
              const dailyPlans = week.daily_plans || [];
              if (Array.isArray(dailyPlans)) {
                dailyPlans.forEach((day: any) => {
                  const tasks = day.tasks || [];
                  if (Array.isArray(tasks)) {
                    tasks.forEach((task: any) => {
                      const minutes = task.duration_minutes || 0;
                      totalMinutes += minutes;

                      // Categorize tasks based on title
                      const title = (task.title2 || task.title || '').toLowerCase();
                      if (title.includes('revision')) {
                        revisionMinutes += minutes;
                      } else if (title.includes('practice') || title.includes('mock')) {
                        practiceMinutes += minutes;
                      } else if (title.includes('test')) {
                        testMinutes += minutes;
                      }
                    });
                  }
                });
              }
            });
          }

          return {
            studyHours: Math.round((totalMinutes - revisionMinutes - practiceMinutes - testMinutes) / 60),
            revisionHours: Math.round(revisionMinutes / 60),
            practiceHours: Math.round(practiceMinutes / 60),
            testHours: Math.round(testMinutes / 60)
          };
        };

        const weeklyPlan = block.weekly_plan || [];
        const hours = calculateHours(weeklyPlan);
        const blockDurationWeeks = block.duration_weeks || 4;
        
        // Use date range from API response (no more client-side calculation)
        const dateRange = formatDateRange(block.block_start_date, block.block_end_date);

        return {
          blockId: block.block_id || `block-${blockIndex}`,
          title: block.block_title || 'Untitled Block',
          subjects: Array.isArray(block.subjects) ? block.subjects : [],
          durationWeeks: blockDurationWeeks,
          dateRange,
          hours,
          resources: {
            oneLine: block.block_resources?.primary_books?.[0]?.resource_title || 
                    block.block_resources?.books?.[0] || 
                    'Study materials',
            extraLine: block.block_resources?.supplementary_materials?.[0]?.resource_title || 
                      block.block_resources?.supplementary?.[0] || 
                      null
          },
          cycleId: cycle.cycle_id,
          cycleName: cycle.cycle_name,
          cycleType: cycle.cycle_type,
          cycleOrder: cycle.cycle_order,
          blockStartDate: block.block_start_date,  // NEW: Include API date fields
          blockEndDate: block.block_end_date       // NEW: Include API date fields
        };
      })
    };
  });

  const sortedCycles: TransformedCycle[] = transformedCycles.sort((a, b) => a.order - b.order);



  const handleDownload = async (format: 'docx' | 'pdf') => {
    if (!studyPlanId || !formData.preview.raw_helios_data) return;
    
    setIsDownloading(prev => ({ ...prev, [format]: true }));
    
    try {
      if (format === 'docx') {
        // Use server-side document generation via Python server forwarding to helios-server
        console.log('Generating DOCX document via Python server forwarding to helios-server');
        
        const response = await fetch('/api/studyplanner/onboarding/helios/plan/export/docx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studyPlan: formData.preview.raw_helios_data
          }),
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `study-plan-${studyPlanId}.docx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('DOCX document generated and downloaded successfully');
        } else {
          const errorText = await response.text();
          console.error(`Failed to download DOCX:`, response.status, errorText);
          alert(`Failed to download DOCX. Status: ${response.status}. Please try again.`);
        }
      } else {
        // For PDF, use client-side PDFService
        console.log('Generating PDF using client-side PDFService');
        
        try {
          const studyPlan = formData.preview.raw_helios_data;
          
          if (!studyPlan) {
            throw new Error('Missing study plan data');
          }
          
          // Transform form data to student intake for PDF generation
          const { transformToStudentIntake } = await import('../services/heliosService');
          const studentIntake = await transformToStudentIntake(formData);
          
          // Generate PDF using PDFService
          const PDFService = await loadPDFService();
          await PDFService.generateStructuredPDF(
            studyPlan,
            studentIntake,
            `study-plan-${studyPlanId}.pdf`
          );
          
          console.log('PDF generated and downloaded successfully');
        } catch (error) {
          console.error('Failed to generate PDF:', error);
          alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
        }
      }
    } catch (error) {
      console.error(`Error downloading ${format}:`, error);
      alert(`Error downloading ${format.toUpperCase()}. Please try again.`);
    } finally {
      setIsDownloading(prev => ({ ...prev, [format]: false }));
    }
  };

  // Show loading state while generating preview
  if (isLoadingPreview) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Your Study Plan</h3>
            <p className="text-gray-600">Please wait while we create your personalized study plan...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if preview generation failed
  if (previewError) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Generate Study Plan</h3>
            <p className="text-gray-600 mb-4">{previewError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Header with View Mode Selector and Download Buttons */}
      <div className="flex items-center justify-between py-4">
        {/* View Mode Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 Timeline
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 List
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Table
              </button>
            </div>
          </div>
        </div>

        {/* Compact Download Buttons */}
        {studyPlanId && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 mr-2"></span>
            <button
              onClick={() => handleDownload('docx')}
              disabled={isDownloading.docx}
              className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Download DOCX"
            >
              {isDownloading.docx ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={isDownloading.pdf}
              className="inline-flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Download PDF"
            >
              {isDownloading.pdf ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Detailed Block Information */}
      <div>
        {viewMode === 'timeline' ? (
          <TimelineView sortedCycles={sortedCycles} />
        ) : viewMode === 'list' ? (
          <ListView sortedCycles={sortedCycles} />
        ) : (
          <TableView sortedCycles={sortedCycles} />
        )}
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="bg-gray-50 border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-100 rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                🐛 Debug Panel - Raw JSON Data
                <button 
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(formData.preview.raw_helios_data, null, 2))}
                  className="ml-auto px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  📋 Copy JSON
                </button>
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Preview Data Structure:</h4>
                  <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                    <div>• studyPlanId: {formData.preview.studyPlanId || 'null'}</div>
                    <div>• target_year: {formData.preview.raw_helios_data?.created_for_target_year || 'unknown'}</div>
                    <div>• cycles: {cycles.length} cycles found</div>
                    <div>• total_blocks: {cycles.reduce((total: number, cycle: any) => total + (cycle.cycleBlocks?.length || 0), 0)} blocks</div>
                    <div>• transformed_cycles: {sortedCycles.length} cycles with {sortedCycles.reduce((total, cycle) => total + (cycle.blocks?.length || 0), 0)} blocks</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Raw Helios Data:</h4>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96 text-gray-800">
                    {JSON.stringify(formData.preview.raw_helios_data, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Transformed Cycles Data:</h4>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64 text-gray-800">
                    {JSON.stringify(sortedCycles, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewStep;
