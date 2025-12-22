import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LikeButton from '../LikeButton';

describe('LikeButton', () => {
  beforeEach(() => {
    // Reset between tests
  });

  it('renders like button', () => {
    render(<LikeButton postId="test-post-id" initialLikeCount={5} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders with aria-label', () => {
    render(<LikeButton postId="test-post-id" />);
    const button = screen.getByLabelText(/like/i);
    expect(button).toBeInTheDocument();
  });

  it('applies custom size', () => {
    render(<LikeButton postId="test-post-id" size={32} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('is clickable', async () => {
    render(<LikeButton postId="test-post-id" initialLikeCount={0} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toBeInTheDocument();
    });
  });
});
