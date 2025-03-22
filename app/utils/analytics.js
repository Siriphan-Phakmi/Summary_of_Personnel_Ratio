// สามารถใช้ service อื่นๆ เช่น Google Analytics, Mixpanel ได้
export const Analytics = {
  // Track page views
  pageView: (pageName) => {
    try {
      // ส่งข้อมูลไปยัง analytics service
      if (process.env.NODE_ENV === 'production') {
        // Example implementation
        window.gtag?.('config', process.env.NEXT_PUBLIC_GA_ID, {
          page_path: pageName
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
        window.gtag?.('event', success ? 'form_submit_success' : 'form_submit_failure', {
          form_name: formName,
          ...data
        });
      }

      console.log('[Analytics] Form Submission:', { formName, success, data });
    } catch (error) {
      console.error('Analytics Form Submission Error:', error);
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
      console.error('Analytics Action Error:', error);
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
  },
  
  // Track data validation issues
  trackValidationIssue: (formName, fieldName, errorType) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        window.gtag?.('event', 'validation_error', {
          form_name: formName,
          field_name: fieldName,
          error_type: errorType
        });
      }
      console.log('[Analytics] Validation Issue:', { formName, fieldName, errorType });
    } catch (error) {
      console.error('Analytics Error:', error);
    }
  },
  
  // Track staff ratio warnings
  trackStaffRatioWarning: (wardId, ratio, patients, staffCount) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        window.gtag?.('event', 'staff_ratio_warning', {
          ward_id: wardId,
          ratio: ratio,
          patient_count: patients,
          staff_count: staffCount
        });
      }
      console.log('[Analytics] Staff Ratio Warning:', { wardId, ratio, patients, staffCount });
    } catch (error) {
      console.error('Analytics Error:', error);
    }
  },
  
  // Track form approval events
  trackApprovalEvent: (formId, action, role, reason = null) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        window.gtag?.('event', 'form_approval', {
          form_id: formId,
          action: action, // approve, reject, request_changes
          role: role,
          reason: reason
        });
      }
      console.log('[Analytics] Approval Event:', { formId, action, role, reason });
    } catch (error) {
      console.error('Analytics Error:', error);
    }
  }
};