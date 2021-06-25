import IORedis from 'ioredis';
import log from 'Shared/logger';
import {
  MicroId, MicrosAndSegmentsEntity, SegmentId,
} from 'Shared/types';
import redisClient from 'SocketServer/redis';
import {
  RedisLEDSegmentHash, RedisMicroHash,
  RedisAllLEDSegmentIdsSet, RedisAllMicroIdsSet,
} from 'Shared/types';
import keys from './utils';
function isMicroMember(microId: string | MicroId): Promise<IORedis.BooleanResponse> {
  return redisClient.sismember(keys.get.segmentIdSet(), String(microId));
}
export function isSegmentMember(segmendId: string | SegmentId): Promise<IORedis.BooleanResponse> {
  return redisClient.sismember(keys.get.segmentIdSet(), String(segmendId));
}
/**
 * Adds SMEMBERS redis command to pipe to read all MicroIds.
 * @param pipe 
 * @returns The pipe with the command appended.
 */
function readAllMicroIds(pipe: IORedis.Pipeline): IORedis.Pipeline {
  return pipe.smembers(keys.get.microIdSet());
}
/**
 * Adds SMEMBERS redis command to pipe to read all SegmentIds.
 * @param pipe 
 * @returns The pipe with the command appended.
 */
function readAllSegmentIds(pipe: IORedis.Pipeline): IORedis.Pipeline {
  return pipe.smembers(keys.get.segmentIdSet());
}
type RedisMicrosAndSegmentIdsResponse = [
  [Error | null, RedisAllMicroIdsSet],
  [Error | null, RedisAllLEDSegmentIdsSet],
];
/**
 * Reads all segment & micro IDs from redis using a 
 * pipeline command.
 * @returns Promise<RedisSegmentsAndMicrosResposne>
 */
async function readAllSegmentAndMicroIds():
  Promise<RedisMicrosAndSegmentIdsResponse> {
  const multi = redisClient.multi();
  readAllMicroIds(multi);
  readAllSegmentIds(multi);
  /*
  * cast to unknown because we know the length of return type
  * but it cannot be infered by Type from IORedis lib.
  */ 
  const results = await multi.exec() as unknown as RedisMicrosAndSegmentIdsResponse;
  return results;
}
/**
 * Append HGETALL on the micros hash to the command pipe.
 * @param pipe 
 * @param microId 
 * @returns The pipe with the command appended.
 */
export function readMicroHash(pipe: IORedis.Pipeline , microId: MicroId | string): IORedis.Pipeline {
  const key = keys.get.microHashKey(microId);
  return pipe.hgetall(key);
}
/**
 * Append LRANGE to the pipe on a micros segment list to retrieve it.
 * @param pipe 
 * @param microId 
 * @returns The pipe with the command appended.
 */
export function readMicroSegmentsList(pipe: IORedis.Pipeline, microId: MicroId | string): IORedis.Pipeline {
  return pipe.lrange(keys.get.microSegmentListKey(microId), 0, -1);
}
/**
 * Append LRANGE to the pipe on a micros segment boundaries list to retrive it.
 * @param pipe 
 * @param microId 
 * @returns The pipe with the command appended.
 */
export function readMicroSegmentBoundaries(pipe: IORedis.Pipeline, microId: MicroId | string): IORedis.Pipeline {
  return pipe.lrange(keys.get.segmentBoundariesListKey(microId), 0, -1);
}
/**
 * Append HGETALL to the pipe on a LEDSegments hash to retrieve it.
 * @param pipe 
 * @param segmentId 
 * @returns The pipe with the command appended.
 */
export function readSegmentHash(pipe: IORedis.Pipeline , segmentId: SegmentId | string): IORedis.Pipeline {
  return pipe.hgetall(keys.get.segmentHashKey(segmentId));
}
/**
 * Reads all the Micros and LEDSegments in Redis.
 * @returns A Promise of MicrosAndSegmentsEntity.
 */
export async function readMicros(): Promise<MicrosAndSegmentsEntity> {
  const allIdsResponse = await readAllSegmentAndMicroIds();
  const [
    [allMicroIdErr, allMicroIds],[AllSegIdErr, allSegmentIds]
  ] = allIdsResponse;
  if(allMicroIdErr || AllSegIdErr) {
    throw new Error('Error getting MicroId and SegmentId Sets.')
  }
  const multi = redisClient.multi();
  allMicroIds.forEach((microId) => {
    readMicroHash(multi, microId);
    readMicroSegmentsList(multi, microId);
    readMicroSegmentBoundaries(multi, microId);
  });

  allSegmentIds.forEach((segmentId) => readSegmentHash(multi, segmentId));

  const results = await multi.exec();
  const microIndices = allMicroIds.length * 3;
  const microsResults = results.slice(0, microIndices);
  const microsById: MicrosAndSegmentsEntity['micros']['byId'] = {};
  for(let i = 0; i < microIndices; i+=3) {
    const [microHashErr, microHash] = microsResults[i];
    const [microSegListErr, segmentsList] = microsResults[i+1];
    const [segBoundariesErr, segmentBoundaries] = microsResults[i+2];
    if(microHashErr || microSegListErr || segBoundariesErr) {
      throw new Error('Bad response from redis server in read micros.')
    }
    const {microId, alias, totalLEDs, brightness}: RedisMicroHash = microHash;
    microsById[microId] = {
      alias,
      microId: Number(microId),
      totalLEDs: Number(totalLEDs),
      brightness: Number(brightness),
      segmentIds: segmentsList.map(Number),
      segmentBoundaries: segmentBoundaries.map(Number)
    };
  }
  const segmentsStart = microIndices;
  const segmentIndices = allSegmentIds.length + microIndices;
  const segmentsResults = results.slice(segmentsStart, segmentIndices);
  const segmentsById: MicrosAndSegmentsEntity['segments']['byId'] = {};
  for(let i = 0; i < segmentsResults.length; i++) {
    const {segmentId, microId, alias, offset, numLEDs, effect, effectControlledBy}: RedisLEDSegmentHash = segmentsResults[i][1];
    segmentsById[segmentId] = {
      alias,
      segmentId: Number(segmentId),
      effect: Number(effect),
      offset: Number(offset),
      numLEDs: Number(numLEDs),
      microId: Number(microId),
      effectControlledBy: Number(effectControlledBy),
    }
  }


  return {
    micros: {
      byId: microsById,
      allIds: allMicroIds.map(Number)
    },
    segments: {
      byId: segmentsById,
      allIds: allSegmentIds.map(Number)
    }
  }

}