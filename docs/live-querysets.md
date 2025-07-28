# Live Queryset Behavior

## What are Live Querysets?

Live querysets are reactive collections that automatically stay synchronized with your backend data. When you create a queryset in StateZero, you get a "live" version that updates in real-time as data changes, without needing to manually refetch or manage state updates.

Think of them as smart arrays that know how to keep themselves up-to-date.

## Key Benefits

- **Automatic Updates**: Your UI stays in sync without manual intervention
- **Optimistic Updates**: Changes appear immediately, then confirm with the server
- **Shared State**: Multiple components automatically share the same live data
- **Performance**: Intelligent caching reduces unnecessary API calls

## Basic Usage

### Creating Live Querysets

```javascript
// Get all users - returns immediately with cached data
const users = User.objects.all();

// Filtered queryset
const activeUsers = User.objects.filter({ active: true });

// The queryset behaves like a normal array
console.log(users.length);           // Current count
users.forEach(user => { ... });     // Iterate through users
const firstUser = users[0];          // Access by index
```

### Framework Integration

#### Vue.js
```javascript
import { useQueryset } from 'statezero/vue';

export default {
  setup() {
    // Reactive queryset that triggers re-renders
    const users = useQueryset(() => User.objects.all());
    
    return { users };
  }
};
```

### Direct Usage Pattern

StateZero works best when you use live querysets directly rather than copying or transforming the data. Because the ORM is so expressive, lots of local processing usually isn't necessary - you can get the data you need through queryset methods. The querysets themselves are reactive and optimized for direct use:

```javascript
// Preferred: Use querysets directly
const users = User.objects.all();
const activeUsers = User.objects.filter({ active: true });

// In your template, reference them directly (gives unpaginated data)
// <div v-for="user in users" :key="user.id">{{ user.name }}</div>
const firstUser = users[0];             // Direct indexing

// For pagination, use serializer options with .all() or .fetch()
const paginatedUsers = User.objects.all().all({ limit: 20, offset: 0 });
// or
const userPage = await User.objects.all().fetch({ limit: 20, offset: 0 });

// Understanding count vs length
const userCount = users.count();        // Total count from backend (even if paginated)
const loadedLength = users.length;      // Length of what you've retrieved/loaded

// If you need transformations, use computed properties to maintain reactivity
const userNames = computed(() => users.map(user => user.name));
const reactiveCount = computed(() => users.length);

// Filtering: Prefer backend filtering over frontend filtering
const activeUsers = User.objects.filter({ active: true }); // ✅ Backend filtering
const inactiveUsers = computed(() => 
  users.filter(user => !user.active)  // ❌ Frontend filtering - avoid when possible
);

// Frontend filtering should only be used for:
// - Additional computed fields not available in backend
// - Complex UI-specific transformations
const usersWithDisplayName = computed(() => 
  users.map(user => ({
    ...user,
    displayName: `${user.first_name} ${user.last_name}` // UI-specific computed field
  }))
);

// Avoid: Copying or transforming into other structures
const userArray = [...users];           // Unnecessary copy - loses reactivity
const userList = users.map(u => u);     // Unnecessary transformation - loses reactivity
const { 0: firstUser, length } = users; // Destructuring loses reactivity
```

**Why direct usage is better:**
- **Performance**: No unnecessary data copying or transformation
- **Reactivity**: Framework adapters are optimized for the queryset structure
- **Memory**: Single source of truth reduces memory usage
- **Consistency**: All components see the same live data automatically

### Reactivity Warning

**Important**: Destructuring or spreading querysets breaks reactivity. Always reference the queryset directly in your templates:

```javascript
// ✅ Good - maintains reactivity
<template>
  <div v-for="user in users" :key="user.id">
    {{ user.name }}
  </div>
  <p>Total: {{ users.length }}</p>
</template>

// ❌ Bad - loses reactivity
<template>
  <div v-for="user in userArray" :key="user.id">
    {{ user.name }}
  </div>
  <p>Total: {{ userCount }}</p>
</template>

const userArray = [...users];  // Static copy, won't update
const userCount = users.length; // Static value, won't update
```

**Once wrapped with useQueryset(), everything downstream is reactive** unless you explicitly break it:

```javascript
const users = useQueryset(() => User.objects.all());

// ✅ These maintain reactivity
const firstUser = users[0];           // Individual models stay reactive
const userName = firstUser.name;      // Model properties are reactive
const userPosts = firstUser.posts;    // Related data stays reactive

// ✅ Slicing specific models is fine - they stay reactive
const topUsers = users.slice(0, 5);   // Each model in slice is reactive
const lastUser = users[users.length - 1]; // Still reactive

// ❌ These break reactivity
const usersCopy = [...users];         // Spreading breaks it
const { name } = firstUser;           // Destructuring breaks it
```

### State Management

When using StateZero, you typically **don't need additional state management libraries** like Pinia, Vuex, or Redux. StateZero provides:

- **Global state**: Live querysets are automatically shared across components
- **Reactivity**: Built-in reactive updates when data changes
- **Caching**: Intelligent caching and synchronization
- **Real-time updates**: Automatic sync with backend changes

```javascript
// Component A
const users = User.objects.all();

// Component B (elsewhere in your app)  
const sameUsers = User.objects.all(); // Same live data automatically

// No need for:
// - store.dispatch('fetchUsers')
// - this.$store.state.users
// - useState/useReducer patterns
```

### Thin Frontend Architecture

StateZero fundamentally changes how you architect SPAs. **Your frontend becomes much thinner** than traditional approaches:

**Traditional SPA:**
- Complex state management (actions, reducers, stores)
- Manual data synchronization
- Local state mutations and side effects
- Data transformation layers

**With StateZero:**
- Interact directly with the ORM
- State essentially evaporates as a concern
- Data flows automatically
- Focus on UI and user experience

```javascript
// Traditional: Complex state management
store.dispatch('fetchUsers');
store.dispatch('createUser', userData);
const users = computed(() => store.state.users);

// StateZero: Direct ORM interaction
const users = User.objects.all();
User.objects.create(userData); // users updates automatically
```

**The key mental model:** Your template code should feel like a **reactive function of your backend state**. When backend data changes (whether from your actions or external updates), your UI automatically reflects those changes without any manual intervention.

```javascript
// Your component becomes a pure function of backend state
const users = User.objects.filter({ active: true });
const posts = Post.objects.filter({ author__in: users });

// Template renders: f(backend_state) → UI
// Changes to users or posts anywhere automatically update your UI
```

StateZero provides a **unified state layer** accessed through the ORM, eliminating most frontend state concerns. Your components simply declare what data they need and render it - StateZero handles all the synchronization, caching, and reactivity automatically.

## How Live Querysets Work

### Immediate Access + Eventual Consistency

Live querysets follow a unique pattern: they return immediately with the best available data, but also resolve as promises when server confirmation arrives.

```javascript
// Returns immediately with cached/optimistic data
const users = User.objects.all();
console.log(users.length); // Shows current count right away

// Also awaitable for server-confirmed data
const confirmedUsers = await users;
console.log(confirmedUsers.length); // Shows confirmed count from server
```

### Real-Time Synchronization

Live querysets automatically update when:
- Another user modifies data
- You perform operations that affect the queryset
- Related data changes that impacts your filters

```javascript
const activeUsers = User.objects.filter({ active: true });

// If someone else activates a user, activeUsers automatically updates
// If you deactivate a user, they're automatically removed from activeUsers
// Your UI re-renders automatically with the new data
```

## Optimistic Updates

When you create, update, or delete objects, your live querysets update immediately for responsive UIs, then confirm with the server.

### Creating Objects

```javascript
// Create a new user
const newUser = User.objects.create({
  name: "Alice",
  email: "alice@example.com"
});

// Any live querysets that would include this user update immediately
const allUsers = User.objects.all(); // Now includes Alice instantly

// The creation is also a promise for the confirmed result
newUser.then(confirmedUser => {
  console.log('Server assigned ID:', confirmedUser.id);
});
```

### Updating Objects

```javascript
// Update existing user
const user = await User.objects.get({ id: 123 });
const updatedUser = user.update({ name: "New Name" });

// Any live querysets containing this user show the change immediately
// The update confirms with the server in the background
```

### Deleting Objects

```javascript
// Delete user
const user = await User.objects.get({ id: 123 });
const result = user.delete();

// User immediately disappears from all live querysets
// Deletion confirms with server in the background
```

## Shared State

Multiple components that use the same queryset automatically share state:

```javascript
// Component A
const users = User.objects.all();

// Component B (elsewhere in your app)
const sameUsers = User.objects.all(); // Same live data

// When Component A creates a user, Component B sees it immediately
```

StateZero automatically detects when querysets are equivalent and shares the underlying live data.

## Caching and Persistence

StateZero provides intelligent caching and persistence to ensure fast performance and offline capability.

### IndexedDB Storage

StateZero automatically persists data to IndexedDB (the browser's local database) for:

- **Queryset results**: Cached results from API calls
- **Model instances**: Individual object data  
- **Metric values**: Cached aggregation results

```javascript
// First load - fetches from server and caches in IndexedDB
const users = User.objects.all();

// Page refresh - hydrates immediately from IndexedDB, then syncs with server
const users = User.objects.all(); // Shows cached data instantly
```

### Cache Hydration

When your app starts, StateZero:

1. **Hydrates from IndexedDB** - Loads cached data immediately for instant UI
2. **Syncs with backend** - Fetches latest data and updates cache
3. **Merges optimistic operations** - Applies any pending local changes

This provides the best of both worlds: instant loading from cache plus always-current data.

### Automatic Cache Management

StateZero handles cache management automatically:

- **Intelligent updates**: Only caches data that's actively used
- **Semantic keys**: Uses queryset structure to determine cache keys
- **Automatic cleanup**: Removes unused cache entries
- **Error recovery**: Automatically resets corrupted caches

```javascript
// These share the same cache automatically
const users1 = User.objects.filter({ active: true });
const users2 = User.objects.filter({ active: true }); // Same semantic key = shared cache

// These use different caches  
const activeUsers = User.objects.filter({ active: true });
const inactiveUsers = User.objects.filter({ active: false }); // Different semantic key
```

### Fast Reloads and Native Feel

With IndexedDB persistence, StateZero provides a native app experience:

- **Instant startup**: App shows data immediately on reload, no loading spinners
- **Seamless transitions**: Navigation feels instant with cached data
- **Progressive enhancement**: UI appears immediately, then updates with fresh data
- **Native app feel**: Eliminates the "web app loading delay"

```javascript
// User refreshes page
// 1. UI renders instantly with cached data (no loading state needed)
// 2. Fresh data syncs in background and updates UI seamlessly
// 3. User sees content immediately, then sees any updates

const users = User.objects.all(); // Shows cached data instantly on refresh
```

The cache transforms typical web app behavior (load → fetch → render) into native app behavior (render immediately → sync in background).

## How Live Querysets Render

Understanding the rendering mechanics helps explain the live behavior you see in your application.

### Ground Truth + Operations Model

Live querysets work by combining two sources of data:

1. **Ground Truth**: The confirmed data from your backend
2. **Operations**: Pending optimistic changes that haven't been confirmed yet

```javascript
const users = User.objects.all();

// What you see in the UI = Ground Truth + Optimistic Operations
// - Ground truth: [Alice, Bob, Charlie] (confirmed from server)
// - Pending operation: Create "David" (optimistic)
// - Rendered result: [Alice, Bob, Charlie, David] (immediately visible)
```

When you access the live queryset (through `users.length`, `users[0]`, iteration, etc.), StateZero:

1. **Starts with ground truth** - the confirmed data from the backend
2. **Applies optimistic operations** - create/update/delete operations that are pending
3. **Returns the combined result** - what you see reflects both confirmed and optimistic data

## How Operations Work

Understanding how StateZero handles operations helps explain the live behavior you see in your application.

### The Operation Lifecycle

When you perform an operation (create, update, delete), StateZero follows a three-phase process:

1. **Optimistic Phase**: Changes appear immediately in your UI
2. **API Phase**: The operation is sent to your backend
3. **Confirmation Phase**: Server response updates the final state

```javascript
// 1. Optimistic: User appears in UI immediately
const newUser = User.objects.create({ name: "Alice" });

// 2. API: Request sent to backend in background
// 3. Confirmation: Real data replaces optimistic data
const confirmedUser = await newUser;
```

### Operation Types

StateZero tracks different types of operations:

- **CREATE**: Adding new objects
- **UPDATE**: Modifying existing objects  
- **DELETE**: Removing objects
- **UPDATE_INSTANCE**: Updating a specific instance
- **DELETE_INSTANCE**: Deleting a specific instance

### Smart Updates

Operations automatically affect related live querysets:

```javascript
const allUsers = User.objects.all();
const activeUsers = User.objects.filter({ active: true });

// Create active user
User.objects.create({ name: "Bob", active: true });

// Both querysets update automatically:
// - allUsers gets Bob added
// - activeUsers gets Bob added (because active: true)

// Deactivate Bob
bob.update({ active: false });

// Both querysets update automatically:
// - allUsers keeps Bob (still exists)
// - activeUsers removes Bob (no longer active: true)
```

## Common Patterns

### Loading States

```javascript
const users = User.objects.all();

// Check if still loading initial data
if (users.length === 0 && users.isOptimistic) {
  return <LoadingSpinner />;
}

return <UserList users={users} />;
```

### Error Handling

```javascript
try {
  const user = await User.objects.get({ id: 123 });
} catch (error) {
  if (error.name === 'DoesNotExist') {
    // Handle missing user
  }
}
```

### Pagination

```javascript
// Load first page with serializer options
const users = User.objects.all().all({ limit: 20 });

// Load more with offset
const moreUsers = User.objects.all().all({ limit: 20, offset: 20 });

// You can also pass serializer options to fetch()
const users = await User.objects.all().fetch({ limit: 20, offset: 20 });
```

### Related Data

```javascript
// Automatically loads related data
const posts = Post.objects.select_related(['author']).all();

// Access related data without additional queries  
posts.forEach(post => {
  console.log(post.author.name); // Already loaded
});
```

## Best Practices

### Use Specific Filters

```javascript
// Good - specific queryset
const todaysPosts = Post.objects.filter({ 
  created_at__date: new Date().toISOString().split('T')[0] 
});

// Avoid - overly broad queryset
const allPosts = Post.objects.all(); // Might be huge
```

### Leverage Shared State

```javascript
// Good - reuse the same queryset structure
const getUserPosts = (userId) => Post.objects.filter({ author_id: userId });

// In multiple components
const userPosts = getUserPosts(123); // Shared automatically
```

### Handle Edge Cases

```javascript
const users = User.objects.filter({ role: 'admin' });

// Always check for empty results
if (users.length === 0) {
  return <EmptyState message="No admins found" />;
}
```

## Limitations & Considerations

### Memory Usage
Live querysets keep data in memory for fast access. Very large datasets should use pagination.

### Network Connectivity
Optimistic updates require network connectivity. If the network request fails, the optimistic changes are reverted and an error is thrown.

### Concurrent Modifications
If multiple users modify the same data simultaneously, server state wins and optimistic updates are corrected.

## Debugging

### Inspect Queryset State

```javascript
const users = User.objects.all();

console.log(users.length);        // Current count
console.log(users.isOptimistic);  // Whether still loading
console.log(users.queryset);      // Underlying queryset object
```

### Monitor Updates

```javascript
// Log when querysets update (development only)
const users = User.objects.all();
users.addEventListener('update', () => {
  console.log('Users updated:', users.length);
});
```

Live querysets make building reactive UIs simple by handling all the complexity of real-time data synchronization behind the scenes. You write code as if working with normal arrays, but get the benefits of live, shared, optimistically-updated data automatically.