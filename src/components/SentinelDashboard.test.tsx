import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SentinelDashboard } from './SentinelDashboard';

describe('SentinelDashboard ECC Security & Immutability Suite', () => {
  it('rejects invalid or unsafe ticker inputs at the component boundary', () => {
    const mockExecute = vi.fn();
    render(<SentinelDashboard executePipeline={mockExecute} />);

    const input = screen.getByLabelText(/ticker symbol/i);
    fireEvent.change(input, { target: { value: 'NVDA<script>' } });
    fireEvent.click(screen.getByRole('button', { name: /run sentinel/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invalid ticker. Provide 1 to 5 alphabetic characters (e.g., NVDA, AAPL).'
    );
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('appends FinBERT directional signals immutably on valid execution', async () => {
    const mockExecute = vi.fn().mockResolvedValueOnce({
      runId: 'run_101',
      ticker: 'NVDA',
      latencyMs: 6.8,
      label: 'POSITIVE',
      confidence: 0.92,
      reflectionScore: 0.96,
      hallucinationDetected: false,
      report: '[NVDA Market Sentinel Brief] Directional Signal: POSITIVE.'
    });

    render(<SentinelDashboard executePipeline={mockExecute} />);

    fireEvent.change(screen.getByLabelText(/ticker symbol/i), {
      target: { value: 'nvda' }
    });
    fireEvent.click(screen.getByRole('button', { name: /run sentinel/i }));

    await waitFor(() => {
      expect(screen.getByText('POSITIVE (92.0%)')).toBeInTheDocument();
      expect(screen.getByText('6.8ms')).toBeInTheDocument();
    });
  });

  it('fails loudly with a sanitized message when upstream inference fails', async () => {
    const mockExecute = vi.fn().mockRejectedValueOnce(new Error('SQLite lock timeout at /var/db'));
    render(<SentinelDashboard executePipeline={mockExecute} />);

    fireEvent.change(screen.getByLabelText(/ticker symbol/i), {
      target: { value: 'MSFT' }
    });
    fireEvent.click(screen.getByRole('button', { name: /run sentinel/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Sentinel pipeline execution failed. Verify backend service status.');
      expect(alert).not.toHaveTextContent('/var/db');
    });
  });
});
