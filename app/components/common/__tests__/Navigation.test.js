import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '../Navigation';
import { PAGES, PAGE_LABELS } from '../../../config/constants';

describe('Navigation Component', () => {
  const mockSetCurrentPage = jest.fn();

  beforeEach(() => {
    mockSetCurrentPage.mockClear();
  });

  it('renders all navigation buttons', () => {
    render(
      <Navigation currentPage={PAGES.FORM} setCurrentPage={mockSetCurrentPage} />
    );

    Object.values(PAGE_LABELS).forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('highlights the current page button', () => {
    render(
      <Navigation currentPage={PAGES.FORM} setCurrentPage={mockSetCurrentPage} />
    );

    const activeButton = screen.getByText(PAGE_LABELS[PAGES.FORM]);
    expect(activeButton).toHaveClass('bg-white');
    expect(activeButton).toHaveClass('text-[#0ab4ab]');
  });

  it('calls setCurrentPage when clicking a button', () => {
    render(
      <Navigation currentPage={PAGES.FORM} setCurrentPage={mockSetCurrentPage} />
    );

    fireEvent.click(screen.getByText(PAGE_LABELS[PAGES.DASHBOARD]));
    expect(mockSetCurrentPage).toHaveBeenCalledWith(PAGES.DASHBOARD);
  });
}); 