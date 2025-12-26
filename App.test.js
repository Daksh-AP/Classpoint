import { render, screen } from '@testing-library/react';
import App from './App';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

test('renders ClassPoint application', () => {
  render(<App />);
  // Should show section selector on first load
  expect(screen.getByText(/Welcome to ClassPoint/i)).toBeInTheDocument();
});