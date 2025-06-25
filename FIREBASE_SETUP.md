# Firebase Setup Guide

## Environment Variables

The application requires Firebase configuration to be set up in environment variables. You need to create a `.env.local` file in the root of the project with the following variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

## How to Get Firebase Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Click on the gear icon (⚙️) next to "Project Overview" and select "Project settings"
4. Scroll down to the "Your apps" section
5. If you haven't added a web app yet, click on the web icon (</>) to add one
6. Register the app with a nickname (e.g., "Summary of Personnel Ratio")
7. Copy the configuration values from the provided code snippet:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

8. Use these values to fill in your `.env.local` file

## Development Mode

For development purposes, the application now includes fallback placeholder values if the environment variables are not set. However, these placeholders will not connect to a real Firebase project, so you won't be able to access or store any data.

To fully test the application's functionality, you must set up the proper Firebase configuration in your `.env.local` file.

## Production Deployment

When deploying to production, make sure to set these environment variables in your hosting platform (Vercel, Netlify, etc.).

For Vercel deployment:
1. Go to your project settings
2. Navigate to the "Environment Variables" section
3. Add all the required Firebase variables
4. Redeploy your application

For Netlify deployment:
1. Go to your site settings
2. Navigate to "Build & deploy" > "Environment"
3. Add all the required Firebase variables
4. Redeploy your application 