'use client';
import PropTypes from 'prop-types';
import { PAGES, PAGE_LABELS, THEME_COLORS } from '../../config/constants';

const Navigation = ({ currentPage, setCurrentPage }) => {
  const pages = Object.values(PAGES);

  return (
    <nav className={`bg-[${THEME_COLORS.PRIMARY}] p-4`}>
      <div className="w-full relative">
        {/* ปุ่มอยู่ตรงกลาง */}
        <div className="flex justify-center">
          <div className="flex space-x-4">
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === page
                    ? `bg-${THEME_COLORS.WHITE} text-[${THEME_COLORS.PRIMARY}]`
                    : `text-${THEME_COLORS.WHITE} hover:bg-[${THEME_COLORS.PRIMARY}]/80`
                }`}
              >
                {PAGE_LABELS[page]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

Navigation.propTypes = {
  currentPage: PropTypes.oneOf(Object.values(PAGES)).isRequired,
  setCurrentPage: PropTypes.func.isRequired
};

export default Navigation; 