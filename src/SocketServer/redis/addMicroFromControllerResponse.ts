
import { LEDSegment } from '../../Shared/store';
import { AddMicroFromControllerResponsePayload } from '../../Shared/store/actions/microsEntity';
import { MicroId, SegmentId, SegmentResponse } from '../../Shared/store/types';
import { createSegment } from '../../Shared/store/utils';
import redisClient from './client';

enum RedisSets {
  MicroIdSet = "MicroId.Set",
  SegmentIdSet = "SegmentId.Set"
}
/**
 * Write MicroId to Redis Set.
 * @param microId 
 * @returns  a Promise<void> indicating wether writing to Redis was successful.
 */
function addMicroIdToSet(microId: MicroId): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    redisClient.SADD(
      RedisSets.MicroIdSet,
      String(microId),
      (err) => {
      if(err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function generateMicroHashId(microId: MicroId): string {
  return `Micro.${microId}.Hash`;
}
/**
 * HMSET to write microcontroller hash to Redis.
 * @param microId 
 * @param totalLEDs 
 * @param brightness 
 * @returns a Promise<void> indicating wether writing to Redis was successful.
 */
function addMicroHash(
  microId: MicroId, totalLEDs: number, brightness: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      redisClient.HMSET(
        generateMicroHashId(microId),
        'totalLEDs', totalLEDs,
        'brightness', brightness,
        (err) => {
          if(err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
}
/**
 * SADD SegmentId to Set of SegmentIds.
 * @param segmentId 
 * @returns  a Promise<void> indicating wether writing to Redis was successful.
 */
function addSegmentToSet(segmentId: SegmentId): Promise<void> {
  return new Promise((resolve, reject) => {
    redisClient.SADD(
      RedisSets.SegmentIdSet,
      String(segmentId),
      (err) => {
        if(err) {
          reject(err);
        } else {
          resolve();
        }
      });
  })
  
}
// write to micros segment list
function generateMicroSegmentListId(microId: MicroId): string {
  return `Micro.${microId}.Segments.List`;
}
/**
 * RPUSH SegmentId to list for micro.
 * @param microId 
 * @param segmentId 
 * @returns a Promise<void> indicating wether writing to Redis was successful.
 */
function addSegmentToMicroList(
  microId: MicroId, segmentId: SegmentId): Promise<void> {
    return new Promise((resolve, reject) => {
      redisClient.RPUSH(
        generateMicroSegmentListId(microId),
        String(segmentId),
        (err) => {
          if(err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
}
function generateSegmentHashId(segmentId: SegmentId): string {
  return `Segment.${segmentId}.Hash`;
}
/**
 * HMSET Segment object to Redis.
 * @param LEDSegment
 * @returns  a Promise<void> indicating wether writing to Redis was successful.
 */
function addSegmentHash(
  {microId, effect, segmentId, offset, numLEDs, effectControlledBy}: LEDSegment
): Promise<void> {
  return new Promise((resolve, reject) => {
    redisClient.HMSET(
      generateSegmentHashId(segmentId),
      "microId", microId,
      "effect", effect,
      "effectControlledBy", effectControlledBy,
      "numLEDs", numLEDs,
      "offset", offset,
      (err) => {
        if(err) {
          reject(err);
        } else {
          resolve();
        }
      });
  })
}
/**
 * Uses addSegmentToSet, addSegmentToMicroList & addSegmentHash
 * to add all segments from a micro.
 * @param microId 
 * @param segmentsResponse 
 * @returns  a Promise<void> indicating wether writing to Redis was successful.
 */
async function addSegmentsFromMicroResponse(
  microId: MicroId,
  segmentsResponse: SegmentResponse[]
  ): Promise<void> {
    const redisActions = segmentsResponse.reduce(
      (actions, segmentResponse) => {
      const [,,,segmentId] = segmentResponse;
      
      actions.push(addSegmentToSet(segmentId));
      actions.push(addSegmentToMicroList(
        microId, segmentId
      ));
      actions.push(addSegmentHash(
        createSegment(microId, ...segmentResponse),
        ));
      return actions;

    }, [] as Promise<void>[]);
    await Promise.all(redisActions);
    return;
}
/**
 * Adds Microcontroller and segments to Redis from
 * the controllers response.
 * @param AddMicroFromControllerResponsePayload
 * @returns  a Promise<void> indicating wether writing to Redis was successful.
 */
export async function addMicroFromControllerResponse(
  {
    microResponse: [,
      microId, totalLEDs, brightness, segmentsResponse,
    ],
  }: AddMicroFromControllerResponsePayload,
): Promise<void> {
  const redisActions: Promise<void>[] = [
    addMicroIdToSet(microId),
    addMicroHash(microId, totalLEDs, brightness),
    addSegmentsFromMicroResponse(microId, segmentsResponse)
  ];
  await Promise.all(redisActions);
  return;
}