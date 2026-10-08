/* eslint-env jest */
import { downloadM3U8Video, M3U8Task } from '../m3u8-downloader';

const mockModuleLoaded = jest.fn();
const mockTransmux = jest.fn((segments: ArrayBuffer[]) =>
  new Blob(segments, { type: 'video/mp4' })
);
const mockFinish = jest.fn(async () => undefined);
const mockStreamingTransmuxer = jest.fn(() => ({ finish: mockFinish }));
const mockWriter = { close: jest.fn() };

jest.mock('../mp4-transmuxer', () => {
  mockModuleLoaded();
  return {
    transmuxTSToMP4: mockTransmux,
    StreamingTransmuxer: mockStreamingTransmuxer,
  };
});

jest.mock('../stream-saver-fallback', () => ({
  createFileSystemWriteStream: async () => ({ getWriter: () => mockWriter }),
}));

function completedTask(type: 'TS' | 'MP4'): M3U8Task {
  return {
    url: 'https://example.test/video.m3u8',
    title: 'test',
    type,
    tsUrlList: ['https://example.test/segment.ts'],
    finishList: [{ title: 'segment', status: 'success' }],
    downloadIndex: 0,
    finishNum: 1,
    errorNum: 0,
    aesConf: { method: '', uri: '', iv: '', key: '' },
    durationSecond: 8,
    segmentDurations: [8],
    rangeDownload: { startSegment: 1, endSegment: 1, targetSegment: 1 },
    downloadedSegments: new Map([[0, new Uint8Array([1, 2, 3]).buffer]]),
  };
}

describe('按需加载 MP4 转码库', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    URL.createObjectURL = jest.fn(() => 'blob:test');
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('普通 TS 下载完成时不加载 MP4 库，首页无需承担转码代码的开销', async () => {
    const onProgress = jest.fn();
    await downloadM3U8Video(completedTask('TS'), onProgress);
    expect(mockModuleLoaded).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'done' }));
  });

  it('普通 MP4 下载仍按原顺序和时长转码', async () => {
    const task = completedTask('MP4');
    await downloadM3U8Video(task);
    expect(mockModuleLoaded).toHaveBeenCalledTimes(1);
    expect(mockTransmux).toHaveBeenCalledWith([task.downloadedSegments?.get(0)], 8);
  });

  it('边下边存 MP4 仍创建流式转码器并完成写入', async () => {
    await downloadM3U8Video(completedTask('MP4'), undefined, undefined, undefined, 1, 'file-system');
    expect(mockStreamingTransmuxer).toHaveBeenCalledWith(mockWriter, 8);
    expect(mockFinish).toHaveBeenCalledTimes(1);
  });
});
