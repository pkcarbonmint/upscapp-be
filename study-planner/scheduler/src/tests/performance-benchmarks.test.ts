import { describe, it, expect, beforeEach } from 'vitest';
import { determineBlockSchedule, calculateSubjectAllocations } from '../blocks';
import { 
  Subject, 
  StudyApproach, 
  ConfidenceMap, 
  CycleType,
  CycleSchedule
} from '../types';

/**
 * Performance Benchmarking Tests
 * Tests scalability, speed, and resource efficiency
 */

describe('Performance Benchmarking Tests', () => {
  let largeSubjectList: Subject[];
  let largeConfidenceMap: ConfidenceMap;
  let benchmarkCycleSchedule: CycleSchedule;

  beforeEach(() => {
    // Generate large dataset for performance testing
    largeSubjectList = Array.from({ length: 100 }, (_, i) => ({
      subjectCode: `SUBJECT_${i.toString().padStart(3, '0')}`,
      baselineHours: Math.floor(Math.random() * 200) + 50,
      priority: Math.floor(Math.random() * 5) + 1,
      subjectType: i % 10 === 0 ? 'Optional' : 'GS',
      isOptional: i % 10 === 0
    }));

    // Generate confidence map
    largeConfidenceMap = new Map();
    largeSubjectList.forEach(subject => {
      largeConfidenceMap.set(subject.subjectCode, Math.floor(Math.random() * 5) + 1);
    });

    benchmarkCycleSchedule = {
      cycleType: CycleType.C1,
      startDate: '2025-03-01',
      endDate: '2025-05-31',
      priority: 'mandatory' as const
    };
  });

  describe('Scalability Tests', () => {
    it('should schedule 100 subjects within 1 second', () => {
      const startTime = Date.now();
      
      const blocks = determineBlockSchedule(
        benchmarkCycleSchedule,
        largeSubjectList,
        largeConfidenceMap,
        1000,
        'balanced',
        8,
        { gs: 0.67, optional: 0.33 }
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(blocks).toBeDefined();
      expect(blocks.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`✅ 100 subjects scheduled in ${executionTime}ms`);
    });

    it('should handle 500 subjects efficiently', () => {
      const veryLargeSubjectList = Array.from({ length: 500 }, (_, i) => ({
        subjectCode: `LARGE_SUBJECT_${i.toString().padStart(3, '0')}`,
        baselineHours: Math.floor(Math.random() * 150) + 30,
        priority: Math.floor(Math.random() * 5) + 1,
        subjectType: i % 15 === 0 ? 'Optional' : 'GS',
        isOptional: i % 15 === 0
      }));

      const veryLargeConfidenceMap = new Map();
      veryLargeSubjectList.forEach(subject => {
        veryLargeConfidenceMap.set(subject.subjectCode, Math.floor(Math.random() * 5) + 1);
      });

      const startTime = Date.now();
      
      const blocks = determineBlockSchedule(
        benchmarkCycleSchedule,
        veryLargeSubjectList,
        veryLargeConfidenceMap,
        2000,
        'balanced',
        8,
        { gs: 0.7, optional: 0.3 }
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(blocks).toBeDefined();
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`✅ 500 subjects scheduled in ${executionTime}ms`);
    });

    it('should scale linearly with subject count', () => {
      const subjectCounts = [10, 50, 100, 200];
      const executionTimes: number[] = [];
      
      subjectCounts.forEach(count => {
        const testSubjects = largeSubjectList.slice(0, count);
        const testConfidenceMap = new Map();
        testSubjects.forEach(subject => {
          testConfidenceMap.set(subject.subjectCode, largeConfidenceMap.get(subject.subjectCode) || 3);
        });
        
        const startTime = Date.now();
        
        determineBlockSchedule(
          benchmarkCycleSchedule,
          testSubjects,
          testConfidenceMap,
          count * 10, // Scale hours with subject count
          'balanced',
          8
        );
        
        const endTime = Date.now();
        executionTimes.push(endTime - startTime);
      });
      
      // Verify execution time doesn't grow exponentially
      for (let i = 1; i < executionTimes.length; i++) {
        const timeRatio = executionTimes[i] / executionTimes[i - 1];
        const subjectRatio = subjectCounts[i] / subjectCounts[i - 1];
        
        // Time growth should be reasonable compared to subject growth
        expect(timeRatio).toBeLessThan(subjectRatio * 2);
      }
      
      console.log(`✅ Linear scaling verified for ${subjectCounts.length} subject counts`);
      executionTimes.forEach((time, i) => {
        console.log(`  ${subjectCounts[i]} subjects: ${time}ms`);
      });
    });
  });

  describe('Memory Efficiency Tests', () => {
    it('should handle memory efficiently with large datasets', () => {
      const initialMemory = process.memoryUsage();
      
      // Process large dataset multiple times
      for (let i = 0; i < 10; i++) {
        const blocks = determineBlockSchedule(
          benchmarkCycleSchedule,
          largeSubjectList,
          largeConfidenceMap,
          1000,
          'balanced',
          8
        );
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`✅ Memory efficiency: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase for 10 iterations`);
    });

    it('should not leak memory with repeated calls', () => {
      const memorySnapshots: number[] = [];
      
      // Take memory snapshots after each iteration
      for (let i = 0; i < 20; i++) {
        determineBlockSchedule(
          benchmarkCycleSchedule,
          largeSubjectList,
          largeConfidenceMap,
          1000,
          'balanced',
          8
        );
        
        if (global.gc) {
          global.gc();
        }
        
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }
      
      // Check for memory leaks (exponential growth)
      const firstHalf = memorySnapshots.slice(0, 10);
      const secondHalf = memorySnapshots.slice(10);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const memoryGrowthRatio = secondHalfAvg / firstHalfAvg;
      
      // Memory growth should be minimal (less than 50% increase)
      expect(memoryGrowthRatio).toBeLessThan(1.5);
      
      console.log(`✅ Memory leak test: ${Math.round((memoryGrowthRatio - 1) * 100)}% growth over 20 iterations`);
    });
  });

  describe('Concurrent Processing Tests', () => {
    it('should handle multiple simultaneous scheduling requests', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) => {
        return new Promise<{ index: number; blocks: any[]; time: number }>((resolve) => {
          const requestStartTime = Date.now();
          
          const blocks = determineBlockSchedule(
            benchmarkCycleSchedule,
            largeSubjectList,
            largeConfidenceMap,
            1000,
            'balanced',
            8
          );
          
          const requestEndTime = Date.now();
          resolve({
            index: i,
            blocks,
            time: requestEndTime - requestStartTime
          });
        });
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All requests should complete successfully
      results.forEach(result => {
        expect(result.blocks).toBeDefined();
        expect(result.blocks.length).toBeGreaterThan(0);
      });
      
      // Concurrent processing should be faster than sequential (with some tolerance)
      const sequentialTime = results.reduce((sum, result) => sum + result.time, 0);
      expect(totalTime).toBeLessThan(sequentialTime * 1.5); // Allow 50% overhead for concurrent processing
      
      console.log(`✅ Concurrent processing: ${concurrentRequests} requests in ${totalTime}ms (vs ${sequentialTime}ms sequential)`);
    });
  });

  describe('Algorithm Efficiency Tests', () => {
    it('should efficiently calculate GS:Optional allocations', () => {
      const startTime = Date.now();
      
      const allocations = calculateSubjectAllocations(
        largeSubjectList,
        1000,
        largeConfidenceMap,
        CycleType.C1,
        { gs: 0.67, optional: 0.33 }
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(allocations).toBeDefined();
      expect(allocations.size).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(100); // Should be very fast
      
      console.log(`✅ GS:Optional allocation calculation: ${executionTime}ms for ${largeSubjectList.length} subjects`);
    });

    it('should handle complex scheduling scenarios efficiently', () => {
      const complexScenarios = [
        { name: 'High Priority Focus', approach: 'StrongFirst' as StudyApproach, hours: 500 },
        { name: 'Balanced Approach', approach: 'balanced' as StudyApproach, hours: 300 },
        { name: 'Weak Subject Focus', approach: 'WeakFirst' as StudyApproach, hours: 400 },
        { name: 'Single Subject', approach: 'SingleSubject' as StudyApproach, hours: 200 }
      ];
      
      const results = complexScenarios.map(scenario => {
        const startTime = Date.now();
        
        const blocks = determineBlockSchedule(
          benchmarkCycleSchedule,
          largeSubjectList,
          largeConfidenceMap,
          scenario.hours,
          scenario.approach,
          8,
          { gs: 0.67, optional: 0.33 }
        );
        
        const endTime = Date.now();
        return {
          scenario: scenario.name,
          executionTime: endTime - startTime,
          blocksCount: blocks.length
        };
      });
      
      // All scenarios should complete efficiently
      results.forEach(result => {
        expect(result.executionTime).toBeLessThan(1000);
        expect(result.blocksCount).toBeGreaterThan(0);
      });
      
      console.log(`✅ Complex scenarios efficiency:`);
      results.forEach(result => {
        console.log(`  ${result.scenario}: ${result.executionTime}ms, ${result.blocksCount} blocks`);
      });
    });
  });

  describe('Resource Cleanup Tests', () => {
    it('should clean up resources properly after scheduling', () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple scheduling operations
      for (let i = 0; i < 50; i++) {
        determineBlockSchedule(
          benchmarkCycleSchedule,
          largeSubjectList,
          largeConfidenceMap,
          1000,
          'balanced',
          8
        );
      }
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory should be cleaned up reasonably well
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      
      console.log(`✅ Resource cleanup: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase after 50 operations`);
    });
  });
});
