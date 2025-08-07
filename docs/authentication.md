# 🔐 Authentication Setup (Not Permissions)

> ⚠️ **Important:**  
> This document covers **authentication** — verifying **who** a user is.  
> It does **not** cover **permissions**, which define **what** the user can access or do.  
> See the [**Permissions Guide**](#permissions) for data permissions.

## 🧠 Authentication vs Permissions

- **Authentication** answers: _“Who are you?”_  
  e.g., validating a token or session.

- **Permissions** answer: _“Are you allowed to do this?”_  
  e.g., can you view this object? edit this field?

StateZero handles **permissions** internally, but **authentication** is delegated to Django REST Framework (DRF).

## 🔒 Outer Defense: `STATEZERO_VIEW_ACCESS_CLASS`

StateZero uses Django-style permission classes to guard access to its own endpoints.  
This is defined via:

```python
# settings.py
STATEZERO_VIEW_ACCESS_CLASS = "rest_framework.permissions.IsAuthenticated"
````

This setting is like the **castle gate** — it defines **who can even make requests** to a StateZero endpoint.
It is the **outer defense layer**, enforced before any actual request processing occurs.

* If a request **fails this check**, **StateZero will not process it at all**.
* This gate applies to **all StateZero routes**: schema discovery, model reads/writes, file uploads, event subscriptions, etc.
* ✅ You **can** use classes like `IsAuthenticated`, `AllowAny`, `IsAdminUser`, or `IsStaffUser`.
* ❌ Do **not** use DRF permission classes like `IsAuthenticatedOrReadOnly`, `DjangoModelPermissionsOrAnonReadOnly`, or others that assume REST-style verb-based logic.
  StateZero works with **abstract operations**, not HTTP verbs — these mixed-mode permission classes will not behave as intended.

## 🛠 How Authentication Works

1. **Backend Authentication**
   Use DRF authentication: Token, Session, JWT, etc.

2. **Frontend Configuration**
   Provide a `getAuthHeaders()` function in your StateZero config.

3. **Automatic Header Injection**
   StateZero includes those headers in every request.

## 🧱 Django Backend Setup

In `settings.py`:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

STATEZERO_VIEW_ACCESS_CLASS = "rest_framework.permissions.IsAuthenticated"
```

Install DRF token support:

```python
INSTALLED_APPS = [
    # ... other apps
    'rest_framework.authtoken',
]
```

Run migrations:

```bash
python manage.py migrate
```

Add a token login endpoint:

```python
# urls.py
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('api/token/', obtain_auth_token, name='api_token_auth'),
    # ... other URLs
]
```
## 💻 Frontend Configuration

Basic example using localStorage:

```js
// statezero.config.js
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export default {
  backendConfigs: {
    default: {
      API_URL: "http://127.0.0.1:8000/statezero",
      GENERATED_TYPES_DIR: "./src/models/",
      GENERATED_ACTIONS_DIR: "./src/actions/",
      fileUploadMode: "server",
      BACKEND_TZ: "UTC",

      // Inject the auth header for all requests
      getAuthHeaders: () => {
        const token = getAuthToken();
        return token ? { Authorization: `Token ${token}` } : {};
      },

      events: {
        type: "pusher",
        pusher: {
          clientOptions: {
            appKey: "your_pusher_app_key",
            cluster: "your_pusher_cluster",
            forceTLS: true,
            authEndpoint: "http://127.0.0.1:8000/statezero/events/auth/",
          },
        },
      },
    },
  },
};
```

## 🧪 Full Login + Token Management Example

```js
// auth.js
export class AuthService {
  constructor() {
    this.baseURL = 'http://127.0.0.1:8000/api';
  }

  async login(username, password) {
    const res = await fetch(`${this.baseURL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error('Login failed');

    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    return data;
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

```js
// statezero.config.js — updated to use auth service
import { authService } from './auth.js';

export default {
  backendConfigs: {
    default: {
      API_URL: "http://127.0.0.1:8000/statezero",
      GENERATED_TYPES_DIR: "./src/models/",
      GENERATED_ACTIONS_DIR: "./src/actions/",
      fileUploadMode: "server",
      BACKEND_TZ: "UTC",

      getAuthHeaders: () => {
        const token = authService.getToken();
        return token ? { Authorization: `Token ${token}` } : {};
      },

      events: {
        type: "pusher",
        pusher: {
          clientOptions: {
            appKey: "your_pusher_app_key",
            cluster: "your_pusher_cluster",
            forceTLS: true,
            authEndpoint: "http://127.0.0.1:8000/statezero/events/auth/",
          },
        },
      },
    },
  },
};
```

## ✅ Summary

* **Authentication** = verify who the user is
* Use **DRF Token Auth** on the backend
* Inject auth headers via `getAuthHeaders()` in the frontend
* `STATEZERO_VIEW_ACCESS_CLASS` defines the outermost access gate
* ✅ Use simple DRF permission classes like `IsAuthenticated`, `AllowAny`, `IsAdminUser`, `IsStaffUser`
* ❌ Do **not** use `IsAuthenticatedOrReadOnly`, `DjangoModelPermissionsOrAnonReadOnly`, or similar
* StateZero automatically sends headers in all requests

> ✅ Authenticated users can now **connect** to StateZero
> 🔒 What they can do or see is governed by [**permissions**](#permissions)

## 📘 Continue Reading: [Permissions Guide](#permissions)

Once authenticated, users must still pass **fine-grained permissions** to:

* Read or edit models
* View or write fields
* Perform object-level or bulk actions

👉 Learn how in the [**StateZero Permissions Guide**](#permissions)