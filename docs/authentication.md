# Authentication Setup

StateZero doesn't implement its own authentication system. Instead, it integrates seamlessly with Django REST Framework's standard authentication approaches. You handle authentication on the Django side using DRF's built-in authentication classes, then provide the auth headers to StateZero through the configuration.

## How Authentication Works

1. **Backend Authentication**: Use any standard DRF authentication (Session, Token, JWT, etc.)
2. **Frontend Configuration**: Provide a `getAuthHeaders` function in your StateZero config
3. **Automatic Header Injection**: StateZero automatically includes these headers in all API requests

## Django Backend Setup

Configure your Django REST Framework authentication in `settings.py`:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# StateZero-specific settings
STATEZERO_VIEW_ACCESS_CLASS = "rest_framework.permissions.IsAuthenticated"
```

Add the authtoken app to your installed apps:

```python
INSTALLED_APPS = [
    # ... other apps
    'rest_framework.authtoken',
]
```

Create the token table:

```bash
python manage.py migrate
```

Add token creation for users in your `urls.py`:

```python
# urls.py
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('api/token/', obtain_auth_token, name='api_token_auth'),
    # ... other URLs
]
```

## Frontend Configuration

Create your StateZero configuration with the `getAuthHeaders` function:

```javascript
// statezero.config.js
export const BASE_URL = "http://127.0.0.1:8000/statezero";

// Function to get the current token from storage
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export default {
  backendConfigs: {
    default: {
      API_URL: BASE_URL,
      GENERATED_TYPES_DIR: "./src/models/",
      fileUploadMode: "server",
      BACKEND_TZ: "UTC",
      
      // This function provides auth headers for all StateZero requests
      getAuthHeaders: () => {
        const token = getAuthToken();
        if (token) {
          return {
            'Authorization': `Token ${token}`
          };
        }
        return {};
      },
      
      events: {
        type: "pusher",
        pusher: {
          clientOptions: {
            appKey: "your_pusher_app_key",
            cluster: "your_pusher_cluster",
            forceTLS: true,
            authEndpoint: `${BASE_URL}/events/auth/`,
          },
        },
      },
    },
  },
};
```

## Complete Authentication Flow

Here's a complete example showing login, token management, and StateZero integration:

```javascript
// auth.js - Authentication utility functions
export class AuthService {
  constructor() {
    this.baseURL = 'http://127.0.0.1:8000/api';
  }

  async login(username, password) {
    const response = await fetch(`${this.baseURL}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      return data;
    } else {
      throw new Error('Login failed');
    }
  }

  logout() {
    localStorage.removeItem('auth_token');
  }

  getToken() {
    return localStorage.getItem('auth_token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
```

```javascript
// statezero.config.js - Updated with auth service
import { authService } from './auth.js';

export const BASE_URL = "http://127.0.0.1:8000/statezero";

export default {
  backendConfigs: {
    default: {
      API_URL: BASE_URL,
      GENERATED_TYPES_DIR: "./src/models/",
      fileUploadMode: "server",
      BACKEND_TZ: "UTC",
      
      getAuthHeaders: () => {
        const token = authService.getToken();
        if (token) {
          return {
            'Authorization': `Token ${token}`
          };
        }
        return {};
      },
      
      events: {
        type: "pusher",
        pusher: {
          clientOptions: {
            appKey: "your_pusher_app_key",
            cluster: "your_pusher_cluster",
            forceTLS: true,
            authEndpoint: `${BASE_URL}/events/auth/`,
          },
        },
      },
    },
  },
};
```



## Summary

StateZero's authentication approach is straightforward:

1. **Use DRF Token Authentication** on your Django backend
2. **Provide the token** through the `getAuthHeaders` function in your StateZero config  
3. **StateZero handles the rest** - automatically including the `Authorization: Token <token>` header in all requests

This gives you secure, token-based authentication that works seamlessly with StateZero's real-time features and file uploads.