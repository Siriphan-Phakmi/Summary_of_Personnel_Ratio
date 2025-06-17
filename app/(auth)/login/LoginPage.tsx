import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useAuthCore as useAuth } from '@/app/features/auth/hooks/useAuthCore';
import { getFormConfiguration } from '@/app/features/config/services/configService';
import { FormConfiguration } from '@/app/features/config/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

const defaultTheme = createTheme();

export default function LoginPage() {
  const router = useRouter();
  const { login, authStatus, error: authError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfiguration | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    // Set initial error from auth hook if any
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setConfigLoading(true);
        const config = await getFormConfiguration('login_form');
        setFormConfig(config);
      } catch (err) {
        // Log error and potentially set a default config or show an error message
        console.error('Failed to fetch form configuration:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = data.get('username') as string;
    const password = data.get('password') as string;
    try {
      setError(null); // Clear previous errors
      await login(username, password);
      // Successful login is now handled by the AuthProvider's effect,
      // which will redirect automatically. We might not need to push here.
      // router.push('/dashboard'); 
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message || 'Invalid username or password');
    }
  };

  const isLoading = authStatus === 'loading' || configLoading;

  // Render a loading indicator while fetching config
  if (authStatus === 'loading' || configLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  // Fallback to default labels if config is not loaded
  const labels = formConfig?.labels || {
    title: 'Daily Patient Census and Staffing',
    subtitle: 'Please sign in to continue',
    username: 'Username',
    password: 'Password',
    rememberMe: 'Remember me',
    submitButton: 'Sign In',
  };

  const placeholders = formConfig?.placeholders || {
    username: 'Enter your username',
    password: 'Enter your password',
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            {labels.title}
          </Typography>
          <Typography component="p" variant="subtitle1" color="text.secondary">
            {labels.subtitle}
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 1 }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label={labels.username}
              name="username"
              autoComplete="username"
              autoFocus
              placeholder={placeholders.username}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={labels.password}
              type="password"
              id="password"
              autoComplete="current-password"
              placeholder={placeholders.password}
            />
            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label={labels.rememberMe}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : labels.submitButton}
            </Button>
            <Grid container>
              <Grid>
                {/* Optional: Add forgot password link if needed in config */}
              </Grid>
              <Grid>
                {/* Optional: Add sign up link if needed in config */}
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
