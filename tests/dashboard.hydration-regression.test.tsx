import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CoasterType } from '../types';

const mockUseAppContext = vi.fn();

vi.mock('../context/AppContext', () => ({
  useAppContext: () => mockUseAppContext(),
}));

vi.mock('recharts', () => {
  const Mock = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    PieChart: Mock,
    Pie: Mock,
    Cell: Mock,
    ResponsiveContainer: Mock,
    Tooltip: Mock,
    BarChart: Mock,
    Bar: Mock,
    XAxis: Mock,
    YAxis: Mock,
    CartesianGrid: Mock,
  };
});

vi.mock('../components/EditCreditModal', () => ({ default: () => null }));
vi.mock('../components/RideDetailModal', () => ({ default: () => null }));
vi.mock('../components/ShareCardModal', () => ({ default: () => null }));
vi.mock('../services/geminiService', () => ({ findNearbyParks: vi.fn() }));

describe('Dashboard hydration-safe rendering', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    errorSpy.mockClear();

    mockUseAppContext.mockReturnValue({
      credits: [],
      coasters: [
        {
          id: 'c1',
          name: 'Nemesis',
          park: 'Alton Towers',
          country: 'UK',
          type: CoasterType.Steel,
          manufacturer: 'B&M',
        },
      ],
      activeUser: {
        id: 'u1',
        ownerId: 'owner-1',
        name: 'Alex',
        avatarColor: 'bg-emerald-500',
      },
      users: [
        {
          id: 'u1',
          ownerId: 'owner-1',
          name: 'Alex',
          avatarColor: 'bg-emerald-500',
        },
      ],
      switchUser: vi.fn(),
      changeView: vi.fn(),
      setLastSearchQuery: vi.fn(),
      showNotification: vi.fn(),
      setAnalyticsFilter: vi.fn(),
      appTheme: 'sky',
      isSyncing: false,
      manualRefresh: vi.fn(),
      currentUser: null,
      logout: vi.fn(),
      signIn: vi.fn(),
    });
  });

  afterEach(() => {
    errorSpy.mockClear();
  });

  it('renders starter subtitle without nesting warnings', async () => {
    const { default: Dashboard } = await import('../components/Dashboard');

    render(<Dashboard />);

    expect(screen.getByText("Alex's Starter View")).toBeInTheDocument();

    const joinedErrors = errorSpy.mock.calls.flat().join(' ');
    expect(joinedErrors).not.toContain('validateDOMNesting');
    expect(joinedErrors).not.toContain('hydration');
  });
});
