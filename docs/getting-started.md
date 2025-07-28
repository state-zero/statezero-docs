# StateZero Quickstart Guide

Get StateZero running in **under 5 minutes** with our cookiecutter template. Choose your path below based on whether you want to start fresh or add StateZero to an existing project.

## What is StateZero?

StateZero lets you use Django ORM queries directly in your frontend code with real-time updates. Think of it as bringing Django's powerful data layer to Vue, React, or vanilla JavaScript.

```javascript
// Use Django models directly in your frontend with real-time updates
const products = await Product.objects.filter({ active: true }).fetch();
const newProduct = await Product.objects.create({ name: "New Product", price: 29.99 });
```

## Path 1: New Project (Recommended - 5 minutes)

**Perfect for:** Testing StateZero, building new projects, or AI-generated frontends

### Prerequisites

- Python 3.8+ and Node.js 16+
- Free [Neon](https://neon.com) account (PostgreSQL database)
- Free [Pusher](https://pusher.com) account (real-time updates)

### 1. Get Your Credentials (2 minutes)

**Neon Database:**
1. Create a free account at [neon.com](https://neon.com)
2. Create a new database
3. Copy your connection string from the dashboard

**Pusher Real-time:**
1. Create a free account at [pusher.com](https://pusher.com)
2. Create a new Channels app
3. Note your App ID, Key, Secret, and Cluster

### 2. Create Project with Cookiecutter (2 minutes)

```bash
pip install cookiecutter
cookiecutter https://github.com/state-zero/cookiecutter-statezero-django
```

**Just follow the prompts!** Cookiecutter will ask for your Neon and Pusher credentials and automatically create all the configuration files for you.

### 3. Start Backend (1 minute)

```bash
# Navigate to your new project
cd your-project-name

# Install dependencies and set up database
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate

# Start Django server
python manage.py runserver
```

Your Django backend with StateZero is now running! You should see: `StateZero is exposing models: [YourModels]`

### 4. Set Up Frontend

The cookiecutter template creates your Django backend, but you still need to set up your frontend. Follow the **Frontend Setup** section below to connect your frontend to the backend.

## Path 2: Existing Project (15 minutes)

**Perfect for:** Adding StateZero to your current Django project

### Backend Setup (8 minutes)

#### 1. Install Required Packages

```bash
pip install statezero django-cors-headers
```

#### 2. Create Pusher Account

1. Create a free account at [pusher.com](https://pusher.com)
2. Create a new Channels app
3. Note down your App ID, Key, Secret, and Cluster

#### 3. Configure Django Settings

Add to your `settings.py`:

```python
INSTALLED_APPS = [
    # ... your existing apps
    'corsheaders',
    'rest_framework',
    'statezero.adaptors.django',
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # ... your existing middleware
    'statezero.adaptors.django.middleware.OperationIDMiddleware',
]

# CORS configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Common frontend ports
    "http://localhost:5173",  # Vite default
    "http://localhost:8080",  # Vue CLI
]

from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + ["x-operation-id"]

# StateZero configuration
STATEZERO_VIEW_ACCESS_CLASS = "rest_framework.permissions.AllowAny"
STATEZERO_STORAGE_KEY = "default"

# Pusher configuration for real-time updates
STATEZERO_PUSHER = {
    "APP_ID": "your_app_id",        # Replace with your Pusher App ID
    "KEY": "your_pusher_key",       # Replace with your Pusher Key
    "SECRET": "your_pusher_secret", # Replace with your Pusher Secret
    "CLUSTER": "your_cluster",      # Replace with your Pusher Cluster
}

# DRF configuration (if not already present)
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

#### 4. Add URLs

In your main `urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... your existing URLs
    path('statezero/', include('statezero.adaptors.django.urls', namespace='statezero')),
]
```

#### 5. Register Your Models

Create a `crud.py` file in any app directory:

```python
from statezero.adaptors.django.config import registry
from statezero.adaptors.django.permissions import IsAuthenticatedPermission
from statezero.core.config import ModelConfig
from .models import YourModel  # Replace with your actual model

registry.register(
    YourModel,
    ModelConfig(
        model=YourModel,
        permissions=[IsAuthenticatedPermission],
    ),
)
```

#### 6. Run Migrations & Start Server

```bash
python manage.py migrate
python manage.py runserver
```

You should see: `StateZero is exposing models: YourModel`

## Frontend Setup (5 minutes)

**For both new and existing projects:** Whether you used the cookiecutter template or added StateZero to an existing project, you'll need to set up your frontend following these steps.

### 1. Install StateZero Client

```bash
npm install @statezero/core
```

### 2. Create Configuration

Create `statezero.config.js` in your project root:

```javascript
export const BASE_URL = "http://127.0.0.1:8000";

export default {
  backendConfigs: {
    default: {
      API_URL: `${BASE_URL}/statezero`,
      GENERATED_TYPES_DIR: "./src/models/",
      fileRootURL: BASE_URL,
      fileUploadMode: "server",
      BACKEND_TZ: "UTC",
      events: {
        type: "pusher",
        pusher: {
          clientOptions: {
            appKey: "your_pusher_key",      // Replace with your Pusher Key
            cluster: "your_pusher_cluster", // Replace with your Pusher Cluster
            forceTLS: true,
            authEndpoint: `${BASE_URL}/statezero/events/auth/`,
          },
        },
      },
    },
  },
};
```

### 3. Initialize StateZero

In your main JavaScript file (e.g., `main.js`, `index.js`):

```javascript
import { setupStateZero } from '@statezero/core'
import { getModelClass } from "./model-registry.js";
import config from "./statezero.config.js";

import {
  ModelAdaptor,
  QuerySetAdaptor,
  MetricAdaptor,
} from "@statezero/core/vue";

setupStateZero(config, getModelClass, {
  ModelAdaptor,
  QuerySetAdaptor,
  MetricAdaptor,
});
```

### 4. Generate Models

With your Django server running:

```bash
npx statezero sync-models
```

Select your models and hit enter. This generates TypeScript models that mirror your Django models.

## Your First Query (2 minutes)

Now you can query your Django models directly from the frontend with real-time updates:

### Vanilla JavaScript
```javascript
import { YourModel } from './models/index.js';

// Get all records
const records = await YourModel.objects.all().fetch();

// Filter records
const filtered = await YourModel.objects.filter({ active: true }).fetch();

// Create a record
const newRecord = await YourModel.objects.create({
  name: 'Test Record',
  active: true
});
```

### Vue
```vue
<script setup>
import { useQueryset } from '@statezero/core/vue';
import { YourModel } from './models/YourModel';

const records = useQueryset(() => YourModel.objects.all());
</script>

<template>
  <div v-for="record in records" :key="record.id">
    {{ record.name }}
  </div>
</template>
```

That's it! Your data automatically updates in real-time across all connected clients.

## What's Next?

You now have StateZero running! Here's what to explore:

- **[Full ORM Documentation](/orm)** - Advanced filtering, relationships, aggregations
- **[Permissions Guide](/permissions)** - Secure your data access

## Common Issues

**"StateZero is not exposing any models"**
- Make sure you created `crud.py` in an app directory
- Verify the app is in `INSTALLED_APPS`

**CORS errors**
- Add `corsheaders` middleware at the top of `MIDDLEWARE`
- Include your frontend URL in `CORS_ALLOWED_ORIGINS`

**Connection refused**
- Ensure Django server is running on port 8000
- Check `BASE_URL` in your frontend config

**Pusher connection issues**
- Verify your Pusher credentials in both Django settings and frontend config
- Check that your Pusher app is active

## Need Help?

- [Documentation](https://docs.statezero.dev)
- [GitHub Issues](https://github.com/statezero/statezero/issues)
- [Discord Community](https://discord.gg/statezero)