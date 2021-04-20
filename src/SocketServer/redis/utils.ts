import { MicroId, SegmentId } from "Shared/store/types";


/**
 * Generates segment boundary redis list key.
 * @param microId 
 * @returns A micros segment boundary list key.
 */
export function generateSegmentBoundariesListKey(microId: MicroId | string): string {
  return `Micro.${microId}.SegmentBoundaries.List`
}
/**
 * Generate a micros segment list key. 
 * @param microId
 * @returns The key as a string.
 */
export function generateMicroSegmentListKey(microId: MicroId | string): string {
  return `Micro.${microId}.Segments.List`;
}
/**
 * Generate a LEDSegments hash key.
 * @param segmentId 
 * @returns The key as a string.
 */
export function generateSegmentHashKey(segmentId: SegmentId | string): string {
  return `Segment.${segmentId}.Hash`;
}
/**
 * Generate a Micros hash key.
 * @param microId 
 * @returns The key as a string.
 */
export function generateMicroHashKey(microId: MicroId | string): string {
  return `Micro.${microId}.Hash`;
}