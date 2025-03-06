export const logEvent = (name, properties = {}) => {
  // Fallback to console.log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Event: ${name}]`, properties);
    return;
  }
  
  // In production, you might want to send to your own logging endpoint
  if (process.env.NODE_ENV === 'production') {
    try {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, properties })
      });
    } catch (error) {
      console.warn('Logging failed:', error);
    }
  }
};