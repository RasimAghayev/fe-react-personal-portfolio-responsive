import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the hero tagline', () => {
  render(<App />);
  expect(screen.getByText(/Welcome to my Portfolio/i)).toBeInTheDocument();
});

test('renders the Skills and Projects section headings', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /skills/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /projects/i })).toBeInTheDocument();
});

test('renders the contact form submit button', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
});
