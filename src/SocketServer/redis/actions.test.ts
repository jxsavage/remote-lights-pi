import {
  writeMergeSegments, writeResizeSegmentsFromBoundaries,
  writeSetMicroBrightness, writeSetSegmentEffect,
  writeSplitSegment, removeSegmentHash
} from './actions';
import { 
  isSegmentMember, readMicroHash, readMicros,
  readMicroSegmentBoundaries, readMicroSegmentsList,
  readSegmentHash,
} from './readMicros';
import {
  writeMicroHash, writeMicros, writeSegment,
  writeSegmentBoundaries, writeSegmentIdsToMicroList,
} from './writeMicros';
import testData from 'Shared/test';
import {
  splitSegmentRedis, mergeSegmentsRedis,
  setMicroBrightnessRedis, setSegmentEffectRedis,
  resizeSegmentsFromBoundariesRedis
} from 'Shared/redis';
import { RemoteLightsEntity } from 'Shared/types';
import redisClient from 'SocketServer/redis';
import keys from './utils';
beforeEach(async () => {
  const allKeys = await redisClient.smembers(keys.get.keyIndex());
  if(allKeys.length) {
    await redisClient.del(allKeys);
  }
});
afterEach(async () => {
  const allKeys = await redisClient.smembers(keys.get.keyIndex());
  if(allKeys.length) {
    await redisClient.del(allKeys);
  }
});
describe('basic functions of the redis database', () => {
  it('writes and reads segment boundaries', async () => {
    const boundaries = [1, 2, 3];
    const microId = 10;
    const stringBoundaries = boundaries.map(String);
    await writeSegmentBoundaries(
      redisClient.multi(), microId, boundaries).exec();
    const [[,results]] = await readMicroSegmentBoundaries(
      redisClient.multi(), microId).exec();
    expect(results).toEqual(stringBoundaries);
  });
  it('writes and reads segmentIds to redis', async () => {
    const {segmentIds, microId} = testData.raw.micro.value();
    const stringSegmentIds = segmentIds.map(String);
    await writeSegmentIdsToMicroList(
      redisClient.multi(), microId, segmentIds).exec();
    const [[,results]] = await readMicroSegmentsList(
      redisClient.multi(), microId).exec();
    expect(results).toEqual(stringSegmentIds);
  });
  it('writes and reads a MicroHash', async () => {
    const hash = testData.raw.micro.hash();
    await writeMicroHash(redisClient.multi(), hash).exec();
    const [[,results]] = await readMicroHash(redisClient.multi(), hash.microId).exec();
    expect(results).toEqual(hash);
  });
  it('writes and reads a Segment', async () => {
    const segment = testData.raw.segment.value();
    const segmentHash = testData.raw.segment.hash();
    await writeSegment(redisClient.multi(), segment).exec();
    const isMember = await isSegmentMember(segment.segmentId);
    const [[,results]] = await readSegmentHash(redisClient.multi(), segment.segmentId).exec();
    expect(isMember).toEqual(1);
    expect(results).toEqual(segmentHash);
  });
  it('writes and reads a MicrosAndSegments object', async () => {
    const { microsAndSegments } = testData.raw;
    const testEntity = microsAndSegments();
    await writeMicros(testEntity).exec();
    const results = await readMicros();
    expect(results).toEqual(testEntity);
  });
  it('deletes a segment hash', async () => {
    const segment = testData.raw.segment.value();
    await writeSegment(redisClient.multi(), segment).exec();
    const [[,setDelCount], [,delCount]] = await removeSegmentHash(redisClient.multi(), segment.segmentId).exec();
    expect(delCount).toBe(1);
    expect(setDelCount).toBe(1);
  });
})


describe('basic microcontroller actions in redis', () => {
  beforeEach(async () => {
    const { microsAndSegments } = testData.raw;
    const testEntity = microsAndSegments();
    await writeMicros(testEntity).exec();
  });
  it('updates a microncontrollers brightness', async () => {
    const { after, action } = testData.setBrightness;
    const {meta: {redis}} = setMicroBrightnessRedis(action);
    await writeSetMicroBrightness(redis);
    const { micros } = await readMicros();
    expect(micros).toEqual(after());
  });
  it('updates a segments effect', async () => {
    const {after, action} = testData.setSegmentEffect;
    const {meta: {redis}} = setSegmentEffectRedis(action);
    await writeSetSegmentEffect(redis);
    const { segments } = await readMicros();
    expect(segments).toEqual(after());
  });
  it('splits a segment to the left at the beginning of the segments', async () => {
    const {after, action} = testData.splitSegment.left.edge;
    const nextState = after() as RemoteLightsEntity;
    const {meta: {redis}} = splitSegmentRedis(nextState, action);
    await writeSplitSegment(redis);
    const results = await readMicros();
    // order is irrelivant and not guranteed so we need to sort for equality.
    results.segments.allIds.sort();
    nextState.segments.allIds.sort();
    expect(results).toEqual(nextState);
  });
  it('splits a segment to the right at the end of the segments', async () => {
    const {after, action} = testData.splitSegment.right.edge;
    const nextState = after() as RemoteLightsEntity;
    const {meta: {redis}} = splitSegmentRedis(nextState, action);
    await writeSplitSegment(redis);
    const results = await readMicros();
    // order is irrelivant and not guranteed so we need to sort for equality.
    results.segments.allIds.sort();
    nextState.segments.allIds.sort();
    expect(results).toEqual(nextState);
  });
  it('splits a segment to the left interior of the segments', async () => {
    const {after, action} = testData.splitSegment.left.interior;
    const nextState = after() as RemoteLightsEntity;
    const {meta: {redis}} = splitSegmentRedis(nextState, action);
    await writeSplitSegment(redis);
    const results = await readMicros();
    // order is irrelivant and not guranteed so we need to sort for equality.
    results.segments.allIds.sort();
    nextState.segments.allIds.sort();
    expect(results).toEqual(nextState);
  });
  it('splits a segment to the right interior of the segments', async () => {
    const {after, action} = testData.splitSegment.right.interior;
    const nextState = after() as RemoteLightsEntity;
    const {meta: {redis}} = splitSegmentRedis(nextState, action);
    await writeSplitSegment(redis);
    const results = await readMicros();
    // order is irrelivant and not guranteed so we need to sort for equality.
    results.segments.allIds.sort();
    nextState.segments.allIds.sort();
    expect(results).toEqual(nextState);
  });
  it('merges a segment with the one on the right', async () => {
    const {before, after, action} = testData.mergeSegments.right;
    const nextState = after() as RemoteLightsEntity;
    const {meta: {redis}} = mergeSegmentsRedis(before(), nextState, action);
    await writeMergeSegments(redis);
    const results = await readMicros();
    const {micros, segments} = nextState;
    const next = {micros,segments};
    // order is irrelivant and not guranteed so we need to sort for equality.
    results.segments.allIds.sort();
    nextState.segments.allIds.sort();
    expect(results).toEqual(next);
  });
  it('merges a segment with the one on the left', async () => {
    const {before, after, action} = testData.mergeSegments.left;
    const nextState = after() as RemoteLightsEntity;
    const {meta: {redis}} = mergeSegmentsRedis(before(), nextState, action);
    await writeMergeSegments(redis);
    const results = await readMicros();
    const {micros, segments} = nextState;
    const next = {micros,segments};
    // order is irrelivant and not guranteed so we need to sort for equality.
    results.segments.allIds.sort();
    nextState.segments.allIds.sort();
    expect(results).toEqual(next);
  });
  it('resizes segments from boundaries provided', async () => {
    const {after, action} = testData.resizeSegmentsFromBoundaries;
    const nextState = after();
    const {meta: {redis}} = resizeSegmentsFromBoundariesRedis(action, nextState as RemoteLightsEntity);
    await writeResizeSegmentsFromBoundaries(redis);
    const results = await readMicros();
    expect(results).toEqual(nextState);
  })
});

