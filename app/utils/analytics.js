// สามารถใช้ service อื่นๆ เช่น Google Analytics, Mixpanel ได้
export const Analytics = {
  // Track page views
  pageView: (pageName) => {
    try {
      // ส่งข้อมูลไปยัง analytics service
      if (process.env.NODE_ENV === 'production') {
        // Example implementation
        window.gtag?.('event', 'page_view', {
          page_title: pageName,
          page_location: window.location.href,
          page_path: window.location.pathname
        });
      }
      
      console.log('[Analytics] Page View:', pageName);
    } catch (error) {
      console.error('Analytics Error:', error);
    }
  },

  // Track form submissions
  trackFormSubmission: (formName, success, data = {}) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        window.gtag?.('event', 'form_submission', {
          form_name: formName,
          success,
          ...data
        });
      }

      console.log('[Analytics] Form Submission:', { formName, success, data });
    } catch (error) {
      console.error('Analytics Error:', error);
    }
  },

  // Track user actions
  trackAction: (actionName, data = {}) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        window.gtag?.('event', actionName, data);
      }

      console.log('[Analytics] Action:', { actionName, data });
    } catch (error) {
      console.error('Analytics Error:', error);
    }
  },

  // Track form field changes
  trackFieldChange: (formName, fieldName, value) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        window.gtag?.('event', 'field_change', {
          form_name: formName,
          field_name: fieldName,
          has_value: !!value
        });
      }

      console.log('[Analytics] Field Change:', { formName, fieldName });
    } catch (error) {
      console.error('Analytics Error:', error);
    }
  }
}; 