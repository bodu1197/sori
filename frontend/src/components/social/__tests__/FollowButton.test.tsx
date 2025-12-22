import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowButton from '../FollowButton';

describe('FollowButton', () => {
  it('renders Follow button for other users', async () => {
    render(<FollowButton userId="other-user-id" />);
    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  it('applies size sm classes', async () => {
    render(<FollowButton userId="other-user-id" size="sm" />);
    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-xs');
    });
  });

  it('applies size md classes', async () => {
    render(<FollowButton userId="other-user-id" size="md" />);
    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-sm');
    });
  });

  it('applies custom className', async () => {
    render(<FollowButton userId="other-user-id" className="my-custom-class" />);
    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveClass('my-custom-class');
    });
  });
});
