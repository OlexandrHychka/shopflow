import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../app/page';

// Phase 0 scaffolding: replace with a WEB requirement in phase 1.
describe('QA-019 the start page renders', () => {
  it('shows the heading and the start page marker', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /ShopFlow/i })).toBeInTheDocument();
    expect(screen.getByTestId('start-page')).toBeInTheDocument();
  });
});
