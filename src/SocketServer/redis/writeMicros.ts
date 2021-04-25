import IORedis from 'ioredis';
import { LEDSegment, MicroId, SegmentId } from 'Shared/types'
import { AddMicrosPayload } from 'Shared/store';
import redisClient from './client';
import { 
  generateMicroSegmentListKey, generateSegmentBoundariesListKey,
  generateSegmentHashKey, generateMicroHashKey, RedisSets
} from 'SocketServer/redis';
import { RedisLEDSegmentHash, RedisMicroHash } from './types';
import { flattenObjectEntries } from './utils';


/**
 * Adds command to the pipeline to write MicroId to Redis Set.
 * @param pipe
 * @param microId 
 * @returns  pipe with command appended.
 */
function writeMicroIdToSet(
  pipe: IORedis.Pipeline, microId: MicroId
  ): IORedis.Pipeline {
  return pipe.sadd(RedisSets.MicroIdSet, String(microId));
}

/**
 * Adds write segments command to an existing redis multi command.
 * @param pipe 
 * @param microId 
 * @param boundaries 
 * @returns The command with write segment boundaries appended.
 */
export function writeSegmentBoundaries(
  pipe: IORedis.Pipeline, microId: MicroId, boundaries: number[]
  ): IORedis.Pipeline {
  const listId = generateSegmentBoundariesListKey(microId);
  return pipe
          .rpush(listId, boundaries.map(String))
          .ltrim(listId, 0, boundaries.length - 1);
}

/**
 * Adds command to pipe HMSET microcontroller hash to Redis.
 * @param pipe
 * @param microId 
 * @param totalLEDs 
 * @param brightness 
 * @returns a Promise<void> indicating wether writing to Redis was successful.
 */
function writeMicroHash(
  pipe: IORedis.Pipeline,
  hash: RedisMicroHash,
  ): IORedis.Pipeline {
    const { microId } = hash;
    return pipe.hmset(
        generateMicroHashKey(microId),
        ...flattenObjectEntries(hash));
}
/**
 * Append SADD SegmentId to Set of SegmentIds to pipeline.
 * @param pipe
 * @param segmentId 
 * @returns the pipe with the command appended.
 */
export function writeSegmentToSet(
  pipe: IORedis.Pipeline, segmentId: SegmentId
  ): IORedis.Pipeline {
  return pipe.sadd(RedisSets.SegmentIdSet, String(segmentId));
}

/**
 * RPUSH and LTRIM a micros SegmentIds to the length of the list added to an existing pipe.
 * @param microId 
 * @param segmentId
 * @returns the pipeline of commands.
 */
export function writeSegmentIdsToMicroList(
  pipe: IORedis.Pipeline, microId: MicroId, segmentIds: SegmentId[]
  ): IORedis.Pipeline {
    const key = generateMicroSegmentListKey(microId)
    return pipe.rpush(key,...segmentIds)
        .ltrim(key, 0, segmentIds.length - 1);
}

/**
 * HMSET Segment object to Redis.
 * @param LEDSegment
 * @returns  a Promise<void> indicating wether writing to Redis was successful.
 */
function writeSegmentHash(
  pipe: IORedis.Pipeline,
  hash: RedisLEDSegmentHash
): IORedis.Pipeline {
  const {segmentId} = hash;
  return pipe.hmset(
      generateSegmentHashKey(segmentId),
      ...flattenObjectEntries(hash));
}
/**
 * Appends the command to Write a Segments ID to the set and write the hash.
 * @param pipe 
 * @param LEDSegment 
 * @returns The pipe with the command appended.
 */
export function writeSegmentToMicro(
  pipe: IORedis.Pipeline, LEDSegment: LEDSegment
): IORedis.Pipeline {
  const { segmentId } = LEDSegment;
  writeSegmentToSet(pipe, segmentId);
  writeSegmentHash(pipe, LEDSegment);
  return pipe;
}
/**
 * Uses addSegmentToSet, addSegmentToMicroList & addSegmentHash
 * to add all segments from a micro.
 * @param microId 
 * @param LEDSegment[] 
 * @returns  a Promise<void> indicating wether writing to Redis was successful.
 */
export function writeSegments(
  pipe: IORedis.Pipeline, LEDSegments: LEDSegment[]
  ): IORedis.Pipeline {
    return LEDSegments.reduce(
      (pipeline, LEDSegment) => {
        return writeSegmentToMicro(pipeline, LEDSegment);
    }, pipe);
}
/**
 * Appends the commands to write the microId to the set,
 * write the micros hash & write the segment.
 * @param pipe 
 * @param microId 
 * @param totalLEDs 
 * @param brightness 
 * @param LEDSegments 
 * @returns The pipe with the command appended.
 */
function writeMicro(
  pipe: IORedis.Pipeline, microId: MicroId, totalLEDs: number,
  brightness: number, LEDSegments: LEDSegment[]
  ): IORedis.Pipeline {
    writeMicroIdToSet(pipe, microId);
    writeMicroHash(pipe, {microId, totalLEDs, brightness});
    writeSegments(pipe, LEDSegments);
    return pipe;
  }
/**
 * Adds Microcontroller and segments to Redis from
 * the controllers response.
 * @param AddMicrosPayload
 * @returns  a Promise<void> indicating wether writing to Redis was successful.
 */
export function writeMicros(
  { micros, segments }: AddMicrosPayload,
  ): IORedis.Pipeline {
  const pipe = redisClient.multi();
  micros.allIds.reduce((microPipe, microId) => {
    writeMicroIdToSet(microPipe, microId);
    const {brightness, totalLEDs, segmentIds, segmentBoundaries} = micros.byId[microId];
    writeSegmentBoundaries(microPipe, microId, segmentBoundaries)
    writeMicro(microPipe, microId, totalLEDs, brightness, segmentIds.map((segmentId) => segments.byId[segmentId]));
    segmentIds.reduce((segmentPipe, segmentId) => {
      const LEDSegment = segments.byId[segmentId];
      writeSegmentIdsToMicroList(segmentPipe, microId, segmentIds);
      writeSegmentToMicro(segmentPipe, LEDSegment);
      return segmentPipe;
    }, microPipe);
    return microPipe;
  }, pipe);
  return pipe;
}
