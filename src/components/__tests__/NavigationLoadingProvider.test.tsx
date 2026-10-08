/* eslint-env jest */
import { act, fireEvent, render, screen } from '@testing-library/react';

import {
  NavigationLoadingProvider,
  useNavigationLoading,
} from '../NavigationLoadingProvider';

let mockQuery = new URLSearchParams('q=first');
let mockSuspend = false;
const mockPendingQuery = new Promise(() => {
  // Keep the query read suspended, as it is during static prerendering.
});

jest.mock('next/navigation', () => ({
  usePathname: () => '/search',
  useSearchParams: () => {
    if (mockSuspend) throw mockPendingQuery;
    return mockQuery;
  },
}));

function PageContent() {
  const { isLoading, startLoading } = useNavigationLoading();
  return (
    <button onClick={startLoading}>
      {isLoading ? '正在加载' : '页面内容'}
    </button>
  );
}

function page() {
  return (
    <NavigationLoadingProvider>
      <PageContent />
    </NavigationLoadingProvider>
  );
}

describe('静态页面的导航加载状态', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockQuery = new URLSearchParams('q=first');
    mockSuspend = false;
  });

  afterEach(() => jest.useRealTimers());

  it('查询参数等待客户端时，仍显示页面内容', () => {
    mockSuspend = true;
    render(page());
    expect(screen.getByRole('button', { name: '页面内容' })).toBeVisible();
  });

  it('同一路径的搜索词改变后结束加载，避免搜索时卡住加载条', () => {
    const { rerender } = render(page());
    act(() => jest.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: '页面内容' }));
    expect(screen.getByRole('button', { name: '正在加载' })).toBeVisible();

    mockQuery = new URLSearchParams('q=second');
    rerender(page());
    act(() => jest.advanceTimersByTime(300));
    expect(screen.getByRole('button', { name: '页面内容' })).toBeVisible();
  });
});
