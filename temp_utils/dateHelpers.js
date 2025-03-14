// Get current shift based on time
export const getCurrentShift = () => {
    const now = new Date();
    const currentHour = now.getHours();
    return (currentHour >= 7 && currentHour < 19) ? '07:00-19:00' : '19:00-07:00';
};

// Check if date is current date
export const isCurrentDate = (selectedDate) => {
    const today = new Date();
    const selected = new Date(selectedDate);
    return (
        today.getDate() === selected.getDate() &&
        today.getMonth() === selected.getMonth() &&
        today.getFullYear() === selected.getFullYear()
    );
};

// Check if date is past date
export const isPastDate = (date) => {
    if (!date) return false;
    const selected = new Date(date);
    const today = new Date();

    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return selected < today;
};

// Check if date is more than one day in future
export const isFutureDateMoreThanOneDay = (date) => {
    if (!date) return false;
    const selected = new Date(date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    selected.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);

    return selected > tomorrow;
}; 