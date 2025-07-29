---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "StateZero"
  text: "Build features, not plumbing"
  tagline: "Turn your existing backend into a live, reactive data source. Ship modern UIs in hours, not weeks."
  actions:
    - theme: brand
      text: Quick Start Guide
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/state-zero/statezero

features:
  - title: 🚀 Ship UIs Fast
    details: Got an existing backend? Add beautiful, modern frontends without building APIs or managing state. Your data just works.
  
  - title: ⚡ Everything Feels Instant
    details: Every click, every update feels immediate. Users see changes instantly while your backend validates in the background.
  
  - title: 🎯 Focus on Features, Not Infrastructure
    details: Stop writing APIs, managing caches, handling WebSockets. Just declare what data you need and build your UI.
  
  - title: 🤖 Perfect for AI-Generated UIs
    details: Bolt.dev, v0, Cursor built you a beautiful frontend? Connect it to your backend in minutes, not days.
  
  - title: 🔄 Real-time by Default
    details: Multiplayer collaboration, live dashboards, instant notifications. Real-time feels like magic, not work.
  
  - title: 🛡️ Your Backend, Your Rules
    details: Keep your existing authentication, permissions, and business logic. StateZero works with what you have.

---

## Stop Fighting Your Tools. Start Building Features.

You have a working backend. You want to add a modern, responsive frontend. 

**The old way:** Spend weeks building REST APIs, setting up state management, handling real-time updates, debugging sync issues.

**StateZero:** Your backend data just works in your frontend. Focus on the UI your users will love.

### The Problem: Modern UIs Require Complex Infrastructure

Users expect apps that feel instant and stay in sync. But implementing this is a nightmare:

```javascript
// Basic CRUD is just the beginning...
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// Fetch data
useEffect(() => {
  fetch('/api/users/')
    .then(handleErrors)
    .then(r => r.json())
    .then(data => {
      setUsers(data);
      setLoading(false);
    })
    .catch(err => setError(err));
}, []);

// Optimistic updates (so UI feels instant)
const createUser = async (userData) => {
  const optimisticUser = { ...userData, id: Date.now() }; // Fake ID
  setUsers(prev => [...prev, optimisticUser]); // Show immediately
  
  try {
    const response = await fetch('/api/users/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const realUser = await response.json();
    
    // Replace optimistic user with real one
    setUsers(prev => prev.map(u => 
      u.id === optimisticUser.id ? realUser : u
    ));
  } catch (err) {
    // Remove optimistic user on failure
    setUsers(prev => prev.filter(u => u.id !== optimisticUser.id));
    setError(err);
  }
};

// Real-time updates (so everyone stays in sync)
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/users/');
  
  ws.onmessage = (event) => {
    const { type, user } = JSON.parse(event.data);
    
    if (type === 'user_created') {
      setUsers(prev => {
        // Don't duplicate if we created optimistically
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    } else if (type === 'user_updated') {
      setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    } else if (type === 'user_deleted') {
      setUsers(prev => prev.filter(u => u.id !== user.id));
    }
  };
  
  return () => ws.close();
}, []);

// And you still need:
// - Conflict resolution for simultaneous edits
// - Retry logic for failed optimistic updates  
// - Cache invalidation across components
// - Connection state handling
```

**You wrote 100+ lines of complex infrastructure code and haven't built a single feature yet.**

**The cruel irony:** Users expect instant, collaborative experiences, but implementing them properly takes months and is incredibly error-prone.

### The Solution: Modern App Feel, Zero Infrastructure

```javascript
// With StateZero, modern app experiences become this simple:
import { useQueryset } from '@statezero/core/vue';
import { User } from './models';

const users = useQueryset(() => User.objects.all()); // Live, reactive, always current
const newUser = User.objects.create(userData); // Instantly visible everywhere

// That's it. You get:
// ✅ Optimistic updates - UI feels instant on every action
// ✅ Real-time sync - Changes from other users appear automatically  
// ✅ Conflict resolution - Simultaneous edits handled gracefully
// ✅ Error handling - Failed operations auto-revert with user feedback

// 2 lines instead of 100+. Build your UI.
```

### Your Existing Backend, Supercharged

```python
# Keep your existing Django models exactly as they are
class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)
    
    def clean(self):
        # Your business logic stays put
        if User.objects.filter(email=self.email).exists():
            raise ValidationError("Email already exists")

# Keep your existing permissions
class UserPermission(AbstractPermission):
    def filter_queryset(self, request, queryset):
        if request.user.is_staff:
            return queryset
        return queryset.filter(created_by=request.user)
```

```javascript
// Use them directly in your frontend - same syntax, same security
const activeUsers = useQueryset(() => User.objects.filter({ is_active: true }));
const myUsers = useQueryset(() => User.objects.filter({ created_by: currentUser.id }));

// Your permissions automatically apply
// Your validation automatically works
// Changes sync automatically everywhere
```

### Perfect for Teams Who Want to Move Fast

**Building with AI tools?** Bolt.dev, v0, and Cursor create beautiful frontends, but connecting them to your backend usually means:
- Building REST endpoints
- Managing authentication 
- Handling state synchronization
- Setting up real-time updates

**StateZero eliminates all of that.** Your AI-generated frontend just works with your existing backend.

```jsx
// AI generates this React component
const Dashboard = () => {
  const orders = useQueryset(() => Order.objects.filter({ 
    status: 'pending',
    created_at__gte: lastWeek 
  }));
  
  return (
    <div>
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};

// It immediately works with your Django backend
// No API endpoints needed
// No state management required
// Real-time updates included
```

### Modernize Legacy Apps Without Risk

**Got a Django app that's been running for years?** StateZero gives you a migration path to modern SPAs without the usual rewrite:

- ✅ **Zero backend changes** - Your models, views, and business logic stay identical
- ✅ **Progressive enhancement** - Add modern frontends page by page
- ✅ **Keep what works** - Your existing admin, APIs, and workflows continue unchanged
- ✅ **Deploy independently** - Frontend and backend remain fully decoupled

### See It In Action

```python
# Your existing Django backend (unchanged)
class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    in_stock = models.BooleanField(default=True)
```

```vue
<!-- Your new Vue frontend -->
<template>
  <div class="product-grid">
    <div v-for="product in products" :key="product.id" class="product-card">
      <h3>{{ product.name }}</h3>
      <p>${{ product.price }}</p>
      <button @click="toggleStock(product)">
        {{ product.in_stock ? 'In Stock' : 'Out of Stock' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useQueryset } from '@statezero/core/vue';
import { Product } from './models';

// This is all the JavaScript you write
const products = useQueryset(() => Product.objects.filter({ in_stock: true }));

const toggleStock = (product) => {
  product.in_stock = !product.in_stock;
  product.save(); // Validates in Django, updates everywhere instantly
};
</script>
```

**When someone else updates a product, your UI updates automatically. When you create a product, everyone else sees it instantly. No WebSocket code. No manual synchronization. It just works.**

### Real-Time Collaboration Without the Complexity

**The modern app standard:** Users expect Google Docs-style collaboration everywhere. Changes from other users should appear instantly, your actions should feel immediate, and everything should stay in sync.

**The traditional nightmare:** Implementing this requires WebSockets, optimistic updates, conflict resolution, connection state management, message queuing, and countless edge cases.

**With StateZero:** You get enterprise-grade real-time collaboration automatically.

```vue
<!-- Multiple users editing the same data -->
<template>
  <div v-for="task in tasks" :key="task.id">
    <input 
      v-model="task.title" 
      @input="task.save()"
      :class="{ 'being-edited': task.isBeingEditedByOthers }"
    />
    <span v-if="task.lastEditedBy">
      Last edited by {{ task.lastEditedBy.name }}
    </span>
  </div>
</template>

<script setup>
import { useQueryset } from '@statezero/core/vue';
import { Task } from './models';

// This component automatically:
// - Shows changes from other users instantly
// - Handles optimistic updates for snappy UX  
// - Resolves conflicts when users edit simultaneously

const tasks = useQueryset(() => Task.objects.filter({ project: currentProject.id }));
</script>
```

**No WebSocket code. No optimistic update logic. No conflict resolution. Real-time collaboration just works.**

### Framework Support

- **Vue.js** - Native reactive integration ✅
- **Vanilla JavaScript** - Works with any framework ✅
- **React** - Hook-based integration (coming soon) 🚧
- **Svelte** - Native store integration (coming soon) 🚧

### Your Architecture Stays Clean

StateZero doesn't blur boundaries or create coupling. It creates a clean **declarative data layer** that sits between your frontend and backend:

- **Backend:** Business logic, validation, permissions (unchanged)
- **StateZero:** Self-managing reactive state layer
- **Frontend:** Pure presentation and user interaction

Deploy them independently. Scale them separately. Your architecture stays proper.

### Get Started in Minutes

1. **Add StateZero to your existing Django project** (5 minutes)
2. **Generate frontend models from your Django models** (1 command)
3. **Build your UI using familiar syntax** (just like Django views, but in JavaScript)
4. **Deploy independently** (your frontend and backend stay decoupled)

**[→ Transform your first app in 15 minutes](/getting-started)**

---

## Ready to Ship Features Instead of Infrastructure?

Stop spending weeks on plumbing. Start building the features your users actually want.

Your backend works. Your data is solid. Now make it feel magical in the frontend.

**StateZero: Build features, not plumbing.**