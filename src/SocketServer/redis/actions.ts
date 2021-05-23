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
import redisClient from 'SocketServer/redis';
import keys from './utils';
import { SegmentId, RedisExecResults, RedisLEDSegmentHashField, RedisMicroHashField } from 'Shared/types';

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
export function removeSegmentHash(
  pipe: IORedis.Pipeline, segmentId: SegmentId | string,
  ): IORedis.Pipeline {
    return pipe
      .srem(keys.get.segmentIdSet(), segmentId)
      .del(keys.get.segmentHashKey(segmentId));
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
  const {key} = keys.generate.segmentHash(segmentId);
  multi.hset(
    key,
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
  const {key} = keys.generate.microHash(microId);
  multi.hset(
    key,
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
      const {key} = keys.generate.segmentHash(segmentId);
      pipe.hset(
        key,
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