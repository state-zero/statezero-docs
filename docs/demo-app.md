# StateZero Getting Started Guide - Todo App

## Project Setup

StateZero works happily with existing Django projects. But for this guide, we will create a new one. There is no difference between adding StateZero to an existing Django project or a new one.

### Step 1 – Create Your Django Project

Create a new Django project with Django REST Framework:

```bash
# Install Django and DRF
pip install django djangorestframework

# Create new Django project
django-admin startproject todoproject
cd todoproject
```

### Step 2 – Configure Django Settings for DRF

Open `todoproject/settings.py` and add Django REST Framework to your installed apps:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
]

# Add DRF configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### Step 3 – Install StateZero

Install statezero from pypi:

```bash
pip install statezero
```

### Step 4 – Configure Django Settings for StateZero

Open `todoproject/settings.py` and make the following changes:

#### 1. Add StateZero to `INSTALLED_APPS`

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'statezero.adaptors.django',
]
```

#### 2. Add Middleware

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'statezero.adaptors.django.middleware.OperationIDMiddleware',
]
```

#### 3. Set Endpoint Access Permissions

`IsAuthenticatedOrReadOnly` should **not** be used with StateZero because even read operations are performed via `POST`. Use `AllowAny` (or a stricter class later):

```python
STATEZERO_VIEW_ACCESS_CLASS = "rest_framework.permissions.AllowAny"
```

#### 4. Set Storage Key

```python
STATEZERO_STORAGE_KEY = "default"
```

### Step 5 – Set Up Real-time Updates (Pusher)

1. Create a free account at [https://pusher.com](https://pusher.com)
2. Create a Channels app (free tier is fine)
3. Add the following block to your settings, replacing the stars with your credentials:

```python
STATEZERO_PUSHER = {
    "APP_ID": "********",
    "KEY": "**************",
    "SECRET": "*************",
    "CLUSTER": "eu",
}
```

> **Tip** When you outgrow Pusher, you can drop-in replace it with [https://www.soketi.app](https://www.soketi.app) — an open-source, high-performance alternative. Don't forget to sponsor the project if you rely on it!

### Step 6 – Configure CORS

Because we're going to serve a standalone SPA (React, Vue, etc.), we need CORS just like in any DRF project.

```bash
pip install django-cors-headers
```

Add the middleware **above all others**:

```python
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'statezero.adaptors.django.middleware.OperationIDMiddleware',
]
```

Add corsheaders to installed apps:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'statezero.adaptors.django',
]
```

Allow requests from your dev server:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default (React, Vue)
]
```

StateZero adds a custom header, so include it:

```python
from corsheaders.defaults import default_headers

CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-operation-id",
]
```

### Step 7 – Set Up the Database

Neon ([https://neon.com](https://neon.com)) offers a free Postgres tier. It's usually too slow for a user-facing website, but thanks to StateZero users still get a native-app feel even with a sluggish DB.

Install the required database packages:

```bash
pip install dj-database-url psycopg2-binary
```

Create a database → **Connect to your database** → copy the connection string, then add to your `todoproject/settings.py`:

```python
import dj_database_url, os

DATABASES = {
    "default": dj_database_url.config(
        default="<your-connection-string>",
        conn_max_age=int(os.getenv("POSTGRES_CONN_MAX_AGE", 600)),
    )
}
```

### Step 8 - Connect The URLs

Add the StateZero urls to your `todoproject/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('statezero/', include('statezero.adaptors.django.urls', namespace='statezero')),
]
```

---

## Setting Up the Backend (Todo App)

We'll build a simple but powerful todo app with tasks, categories, and priority levels.

Follow the numbered steps below.

### Step 1 – Create the `todos` app

```bash
python manage.py startapp todos
```

### Step 2 – Add the app to `INSTALLED_APPS`

`todoproject/settings.py` →

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'todos',
    'statezero.adaptors.django',
]
```

### Step 3 – Define the data model

Replace the contents of `todos/models.py` with:

```python
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()

class Category(models.Model):
    """Categories for organizing todos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default="#3B82F6", help_text="Hex color code")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

    @property
    def total_todos(self):
        return self.todos.count()

    @property
    def completed_todos(self):
        return self.todos.filter(is_completed=True).count()

    @property
    def pending_todos(self):
        return self.todos.filter(is_completed=False).count()


class Todo(models.Model):
    """Individual todo items"""
    PRIORITY_CHOICES = [
        (1, "Low"),
        (2, "Medium"), 
        (3, "High"),
        (4, "Urgent"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    priority = models.PositiveSmallIntegerField(
        choices=PRIORITY_CHOICES, 
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(4)]
    )
    
    # Relationships
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="todos")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="todos")
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name="assigned_todos", null=True, blank=True)
    
    # Dates
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "due_date", "created_at"]

    def __str__(self):
        return self.title

    @property
    def priority_display(self):
        return dict(self.PRIORITY_CHOICES)[self.priority]

    @property
    def is_overdue(self):
        if self.due_date and not self.is_completed:
            from django.utils import timezone
            return self.due_date < timezone.now()
        return False

    def mark_completed(self):
        """Mark todo as completed and set completion timestamp"""
        from django.utils import timezone
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save()

    def mark_pending(self):
        """Mark todo as pending and clear completion timestamp"""
        self.is_completed = False
        self.completed_at = None
        self.save()


class TodoAttachment(models.Model):
    """File attachments for todos"""
    todo = models.ForeignKey(Todo, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="todo_attachments/")
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        ordering = ["uploaded_at"]

    def __str__(self):
        return f"Attachment for {self.todo.title}: {self.original_filename}"


class TodoComment(models.Model):
    """Comments on todo items"""
    todo = models.ForeignKey(Todo, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author.username} on {self.todo.title}"
```

### Step 4 – Create and apply migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Step 5 – Create a superuser (optional)

```bash
python manage.py createsuperuser
```

### Step 6 – Register the models with StateZero

Create `todos/crud.py`, which StateZero will auto discover:

```python
from statezero.adaptors.django.config import registry
from statezero.adaptors.django.permissions import IsAuthenticatedPermission
from statezero.core.config import ModelConfig
from statezero.core.classes import AdditionalField
from .models import Category, Todo, TodoAttachment, TodoComment
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

registry.register(
    Category,
    ModelConfig(
        model=Category,
        permissions=[IsAuthenticatedPermission],
        additional_fields=[
            AdditionalField(name="total_todos", title="Total Todos", field=models.PositiveIntegerField()),
            AdditionalField(name="completed_todos", title="Completed Todos", field=models.PositiveIntegerField()),
            AdditionalField(name="pending_todos", title="Pending Todos", field=models.PositiveIntegerField()),
        ],
    ),
)

registry.register(
    Todo,
    ModelConfig(
        model=Todo,
        permissions=[IsAuthenticatedPermission],
        additional_fields=[
            AdditionalField(name="priority_display", title="Priority Display", field=models.CharField(max_length=50)),
            AdditionalField(name="is_overdue", title="Is Overdue", field=models.BooleanField()),
        ],
    ),
)

registry.register(
    TodoAttachment,
    ModelConfig(
        model=TodoAttachment,
        permissions=[IsAuthenticatedPermission],
    ),
)

registry.register(
    TodoComment,
    ModelConfig(
        model=TodoComment,
        permissions=[IsAuthenticatedPermission],
    ),
)

registry.register(
    User,
    ModelConfig(
        model=User,
        permissions=[IsAuthenticatedPermission],
        fields={"username", "first_name", "last_name", "email"},
    ),
)
```

> **Heads-up** If you expose a relationship (e.g. `created_by` FK) and forget to register that model, StateZero will raise a helpful error:
>
> ```
> ValueError: Model 'todos.todo' exposes relation 'created_by' to unregistered model 'auth.user'.
> ```

Either register the related model (preferred) or exclude the field in the `ModelConfig`.

### Step 7 – Run the server and verify

```bash
python manage.py runserver
```

You should see something like:

```
StateZero is exposing models: Category, Todo, TodoAttachment, TodoComment, User
```

---

## Frontend Setup

We will setup a Vue frontend for this project. React and Svelte support is coming soon.

If you haven't installed Node.js, you'll need to do it now.

You'll want to navigate to the top level folder your backend sits within. With StateZero your frontend and backend code are fully decoupled, so do not put your frontend code in the same folder or git repo. 

In your Node.js command prompt, run:

```bash
npm create vue@latest todo-frontend
```

When selecting the features, select **Router (SPA development)**

```bash
cd todo-frontend
npm i
```

Now add StateZero by running the command:

```bash
npm i @statezero/core
```

In the root of the project create a file called `statezero.config.js`. We'll need to use your pusher appKey and Cluster from the pusher account we already created.

```javascript
export const BASE_URL = "http://127.0.0.1:8000/statezero";

export default {
  backendConfigs: {
    default: {
      API_URL: BASE_URL,
      GENERATED_TYPES_DIR: "./src/models/",
      fileUploadMode: "server",
      BACKEND_TZ: "UTC",
      events: {
        type: "pusher",
        pusher: {
          clientOptions: {
            appKey: "your_pusher_app_key", // Replace with your Pusher app key
            cluster: "your_pusher_cluster", // Replace with your Pusher cluster
            forceTLS: true,
            authEndpoint: `${BASE_URL}/events/auth/`,
          },
        },
      },
    },
  },
};
```

Now we need to go to our `src/main.js` file and add the following code to setup StateZero:

```javascript
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// StateZero
import { setupStateZero } from '@statezero/core'
import { getModelClass } from "../model-registry.js";
import config from "../statezero.config.js";
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

// ... rest of main.js code
const app = createApp(App)
app.mount('#app')
```

That's all the configuration completed.

Make sure your StateZero Django backend is running, and in your frontend command prompt run:

```bash
npx statezero sync-models
```

We see a list of our models preselected:

```
>(*) todos.category
 (*) todos.todo
 (*) todos.todoattachment
 (*) todos.todocomment
 (*) auth.user
```

Hit enter to generate the models.

That's all the setup completed! You've now created a frontend Model for every backend model, as well as a typescript type files. You will now be able to run secure ORM queries from your client side code, with fully featured django style filtering.

Let's startup the frontend development server. Remember, the backend server needs to be running whenever you want to run the frontend.

```bash
npm run dev
```

## Using StateZero in Your Frontend

Now that everything is set up, you can start using StateZero's Django-like ORM in your frontend code. Here's a quick overview of the basic patterns:

### Importing Models

```javascript
import { Todo, Category } from './models/index.js';
```

### Basic Querying

```javascript
// Get all todos
const todos = await Todo.objects.all().fetch();

// Filter todos
const completedTodos = await Todo.objects.filter({ is_completed: true }).fetch();

// Get a single todo
const todo = await Todo.objects.get({ id: 1 });
```

### Creating Records

```javascript
// Create a new todo
const newTodo = await Todo.objects.create({
  title: 'Learn StateZero',
  description: 'Follow the getting started guide',
  priority: 2
});
```

### Reactive Querying (Vue)

```vue
<script setup>
import { useQueryset } from '@statezero/core/vue';
import { Todo } from './models/Todo';

// This creates a reactive queryset that updates automatically
const todos = useQueryset(() => Todo.objects.filter({ is_completed: false }));
</script>

<template>
  <div v-for="todo in todos" :key="todo.id">
    {{ todo.title }}
  </div>
</template>
```

For a complete guide to StateZero's ORM capabilities, including advanced filtering, relationships, aggregations, and more, see the **[ORM Documentation](/orm)**.

## What's Next?

Congratulations! You've successfully set up StateZero with Django and Vue. You now have:

- ✅ A Django backend with StateZero integration
- ✅ Real-time data synchronization via Pusher
- ✅ A Vue frontend that can query Django models directly
- ✅ Automatic type generation and model synchronization
- ✅ Django-style permissions enforced in the frontend

**Next Steps:**

1. **[Understanding Permissions](/permissions)** - Learn how to secure your data with Django-style permissions before building your UI
2. **[ORM Documentation](/orm)** - Master StateZero's Django-like ORM for powerful frontend data management
3. **[Build a UI with Bolt.dev](/building-with-bolt)** - Generate a beautiful frontend using AI and connect it to your StateZero backend
4. **Explore Advanced Features** - Custom querysets, F expressions, file uploads, and more