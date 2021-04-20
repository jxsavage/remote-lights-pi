import IORedis from 'ioredis';
import { LEDSegment } from '../../Shared/store';
import { AddMicrosPayload,  } from '../../Shared/store/actions/microsEntity';
import { MicroId, SegmentId } from '../../Shared/store/types';
import redisClient from './client';
import { RedisSets } from './types';
import { 
  generateMicroSegmentListKey, generateSegmentBoundariesListKey,
  generateSegmentHashKey, generateMicroHashKey, 
} from './utils';


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
function writeSegmentBoundaries(
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
  pipe: IORedis.Pipeline, microId: MicroId, totalLEDs: number, brightness: number
  ): IORedis.Pipeline {
    return pipe.hmset(
        generateMicroHashKey(microId),
        'microId', microId,
        'totalLEDs', totalLEDs,
        'brightness', brightness);
}
/**
 * Append SADD SegmentId to Set of SegmentIds to pipeline.
 * @param pipe
 * @param segmentId 
 * @returns the pipe with the command appended.
 */
function writeSegmentToSet(
  pipe: IORedis.Pipeline, segmentId: SegmentId
  ): IORedis.Pipeline {
  return pipe.sadd(RedisSets.SegmentIdSet, String(segmentId));
}

/**
 * RPUSH and LTRIM a micros SegmentIds to the length of the list added to an existing pipe.
 * @param microId 
 * @param segmentId s
 * @returns the pipeline of commands.
 */
function writeSegmentsToMicroList(
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
  {microId, effect, segmentId, offset, numLEDs, effectControlledBy}: LEDSegment
): IORedis.Pipeline {
  return pipe.hmset(
      generateSegmentHashKey(segmentId),
      "segmentId", segmentId,
      "microId", microId,
      "effect", effect,
      "effectControlledBy", effectControlledBy,
      "numLEDs", numLEDs,
      "offset", offset);
}
function writeSegmentToMicro(
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
function writeSegments(
  pipe: IORedis.Pipeline, LEDSegments: LEDSegment[]
  ): IORedis.Pipeline {
    return LEDSegments.reduce(
      (pipeline, LEDSegment) => {
      writeSegmentToMicro(pipeline, LEDSegment)
      return pipeline;
    }, pipe);
}
function writeMicro(
  pipe: IORedis.Pipeline, microId: MicroId, totalLEDs: number,
  brightness: number, LEDSegments: LEDSegment[]
  ): IORedis.Pipeline {
    writeMicroIdToSet(pipe, microId);
    writeMicroHash(pipe, microId, totalLEDs, brightness);
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
      writeSegmentsToMicroList(segmentPipe, microId, segmentIds);
      writeSegmentToMicro(segmentPipe, LEDSegment);
      return segmentPipe;
    }, microPipe);
    return microPipe;
  }, pipe);
  return pipe;
}
