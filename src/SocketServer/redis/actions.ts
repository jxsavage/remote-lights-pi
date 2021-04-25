import IORedis from 'ioredis';
import {
  SplitSegmentRedisPayload, MergeSegmentsRedisPayload,
  SetSegmentEffectRedisPayload, SetMicroBrightnessRedisPayload,
  ResizeSegmentsFromBoundariesRedisPayload,
} from 'Shared/redis';
import {
  writeSegmentBoundaries,
  writeSegmentIdsToMicroList, writeSegments
} from './writeMicros';
import redisClient from './client';
import { RedisExecResults, RedisLEDSegmentHashField, RedisMicroHashField, RedisSets } from './types';
import { generateMicroHashKey, generateSegmentHashKey } from './utils';
import { SegmentId } from 'Shared/types';

export async function writeSplitSegment({
  microId, segmentBoundaries, segmentIds,
  LEDSegments,
}: SplitSegmentRedisPayload): RedisExecResults {
  const multi = redisClient.multi();
  writeSegmentIdsToMicroList(multi, microId, segmentIds);
  writeSegmentBoundaries(multi, microId, segmentBoundaries);
  writeSegments(multi, LEDSegments);
  const results = await multi.exec();
  return results;
}
function removeSegmentHash(
  pipe: IORedis.Pipeline, segmentId: SegmentId,
  ): IORedis.Pipeline {
    return pipe
      .srem(RedisSets.SegmentIdSet, segmentId)
      .del(generateSegmentHashKey(segmentId));
}
export async function writeMergeSegments({
  microId, segmentIds, LEDSegments,
  deletedSegmentId, segmentBoundaries
}: MergeSegmentsRedisPayload): RedisExecResults {
  const multi = redisClient.multi();
  writeSegmentBoundaries(multi, microId, segmentBoundaries);
  writeSegmentIdsToMicroList(multi, microId, segmentIds);
  removeSegmentHash(multi, deletedSegmentId);
  writeSegments(multi, LEDSegments);
  const results = multi.exec();
  return results;
}

export async function writeSetSegmentEffect({
  newEffect, segmentId
}: SetSegmentEffectRedisPayload): RedisExecResults {
  const multi = redisClient.multi();
  multi.hset(
    generateSegmentHashKey(segmentId),
    RedisLEDSegmentHashField.effect,
    newEffect,
  );
  const results = await multi.exec();
  return results;
}

export async function writeSetMicroBrightness({
  brightness, microId
}: SetMicroBrightnessRedisPayload): RedisExecResults {
  const multi = redisClient.multi();
  multi.hset(
    generateMicroHashKey(microId),
    RedisMicroHashField.brightness,
    brightness,
  );
  const results = await multi.exec();
  return results;
}
function writeSegmentOffsetAndNumLEDs(
  pipe: IORedis.Pipeline,
  offsetAndNumLEDs: ResizeSegmentsFromBoundariesRedisPayload['offsetAndNumLEDs'],
  ): IORedis.Pipeline {
    offsetAndNumLEDs.forEach(({offset, numLEDs, segmentId}) => {
      pipe.hset(
        generateSegmentHashKey(segmentId),
        RedisLEDSegmentHashField.offset, offset,
        RedisLEDSegmentHashField.numLEDs, numLEDs
      );
    });
    return pipe;
}
export async function writeResizeSegmentsFromBoundaries({
  microId, segmentBoundaries, offsetAndNumLEDs,
}: ResizeSegmentsFromBoundariesRedisPayload): RedisExecResults {
  const multi = redisClient.multi();
  writeSegmentBoundaries(multi, microId, segmentBoundaries);
  writeSegmentOffsetAndNumLEDs(multi, offsetAndNumLEDs);
  const results = multi.exec();
  return results;
}

export async function flushAllRedis(): Promise<'OK'> {
  const results = await redisClient.flushall();
  return results;
}