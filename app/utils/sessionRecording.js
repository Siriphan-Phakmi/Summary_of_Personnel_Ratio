import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

export const initSessionRecording = () => {
  if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
    LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID, {
      release: process.env.NEXT_PUBLIC_VERSION,
      dom: {
        // Mask sensitive data
        textSanitizer: true,
        inputSanitizer: true,
      },
      network: {
        // Sanitize request/response bodies
        requestSanitizer: (request) => {
          // Mask sensitive data in requests
          if (request.headers.Authorization) {
            request.headers.Authorization = '***';
          }
          return request;
        },
        responseSanitizer: (response) => {
          // Mask sensitive data in responses
          if (response.body && response.body.sensitiveData) {
            response.body.sensitiveData = '***';
          }
          return response;
        },
      },
    });

    // Integrate with React
    setupLogRocketReact(LogRocket);

    // Integrate with Sentry if available
    if (window.Sentry) {
      LogRocket.getSessionURL(sessionURL => {
        window.Sentry.configureScope(scope => {
          scope.setExtra('sessionURL', sessionURL);
        });
      });
    }
  }
};

export const identifyUser = (userId, userInfo = {}) => {
  if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
    LogRocket.identify(userId, {
      ...userInfo,
      environment: process.env.NODE_ENV,
    });
  }
};

export const logEvent = (name, properties = {}) => {
  if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
    LogRocket.track(name, properties);
  }
};

export const startWatching = (componentName) => {
  if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
    return LogRocket.startNewSession();
  }
};

export const captureException = (error, properties = {}) => {
  if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
    LogRocket.captureException(error, {
      tags: {
        environment: process.env.NODE_ENV,
        ...properties,
      },
    });
  }
}; 