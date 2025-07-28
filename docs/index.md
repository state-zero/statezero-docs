---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "StateZero"
  text: "Your Django data, instantly live in your frontend"
  tagline: "Keep your decoupled SPA architecture. Eliminate the friction. Your frontend becomes a reactive thin client of your Django backend."
  actions:
    - theme: brand
      text: Quick Start Guide
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/state-zero/statezero

features:
  - title: 🚀 Perfect for AI-Generated Apps
    details: Bolt.dev creates your frontend? ChatGPT builds your UI? StateZero connects them to your Django backend with zero boilerplate code.
  
  - title: 🔄 True Full-Stack Models
    details: Write Django models once. Use them identically in JavaScript. Same syntax, same permissions, same security - but live and reactive.
  
  - title: ⚡ State Management? What State Management?
    details: No Redux. No Vuex. No manual synchronization. Your frontend becomes a reactive view of your Django database.
  
  - title: 🎯 Optimistic Everything
    details: Every action feels instant. Create, update, delete - users see changes immediately while the backend confirms in the background.
  
  - title: 📱 Legacy App Renaissance
    details: Transform your existing Django apps without rewrites. Add modern real-time frontends to battle-tested backends.
  
  - title: 🔐 Security-First Architecture
    details: Built on Django REST Framework's bombproof security. Authentication, authorization, and session management handled by battle-tested DRF. Sits happily alongside your existing DRF views.

---

## What is StateZero?

StateZero transforms your Django backend into a declarative, reactive data source for fully decoupled SPA frontends.

You keep your clean separation of concerns - Django handles business logic, your SPA handles presentation. But StateZero eliminates all the friction: no APIs to build, no state to manage, no synchronization code. Your frontend becomes a reactive thin client that stays perfectly in sync with your Django data.

### The Architecture You Want, Without the Pain

**You get the best of both worlds:**
- ✅ **Fully decoupled SPA** - Deploy frontend and backend independently
- ✅ **Clean separation** - Business logic stays in Django, UI logic in your SPA  
- ✅ **Zero friction** - No REST APIs, no state management, no sync complexity
- ✅ **Real-time by default** - Changes propagate instantly across all clients

### The Old Way vs StateZero

**Traditional Decoupled Django + SPA:**
```javascript
// Traditional: All the ceremony of decoupled architecture
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/products/')
    .then(r => r.json())
    .then(data => {
      setProducts(data);
      setLoading(false);
    });
}, []);

const createProduct = async (data) => {
  const response = await fetch('/api/products/', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  const newProduct = await response.json();
  setProducts([...products, newProduct]); // Manual sync hell
};
```

**StateZero - Decoupled but Frictionless:**
```javascript
// StateZero: Decoupled SPA, zero friction
import { useQueryset } from '@statezero/core/vue';
import { Product } from './models';

const products = useQueryset(() => Product.objects.all()); // Live, reactive, always current
const newProduct = Product.objects.create(data); // Instantly visible everywhere
```

**The difference is profound.** You maintain proper separation - your Django backend handles all business logic, validation, and permissions. Your frontend remains a pure presentation layer. But StateZero eliminates the integration complexity that usually makes decoupled architectures painful.

### Your Frontend: A Reactive Thin Client

Think of your SPA as a reactive window into your Django database:

```javascript
// Your frontend becomes a declarative view of backend state
const activeOrders = useQueryset(() => Order.objects.filter({ 
  status: 'active',
  customer__premium: true 
}));

// Business logic stays in Django - your frontend just declares what it needs
const customerOrders = useQueryset(() => Order.objects.filter({
  customer: user.id,
  created_at__gte: lastMonth
}).orderBy('-created_at'));
```

Your Django backend remains authoritative:
```python
# All business logic, validation, and permissions stay in Django
class OrderPermission(AbstractPermission):
    def filter_queryset(self, request, queryset):
        return queryset.filter(customer=request.user)
    
    def visible_fields(self, request, model):
        if request.user.is_staff:
            return {"id", "total", "customer", "internal_notes"}
        return {"id", "total", "status"}

class Order(models.Model):
    # Your models define the contract
    def clean(self):
        if self.total < 0:
            raise ValidationError("Order total cannot be negative")
```

### Revolutionary for AI-Generated Frontends

AI tools like Bolt.dev, v0, and Claude excel at generating beautiful SPAs, but connecting them to Django backends traditionally requires building REST APIs and managing complex state synchronization.

**With StateZero, AI-generated SPAs work with Django immediately:**

```javascript
// AI generates this SPA code - it just works with your existing Django models
const Dashboard = () => {
  const activeOrders = useQueryset(() => Order.objects.filter({ 
    status: 'active',
    customer__premium: true 
  }));
  
  return (
    <div>
      {activeOrders.map(order => (
        <OrderCard key={order.pk} order={order} />
      ))}
    </div>
  );
};
```

The AI doesn't need to understand your backend - it just uses your Django models like any other JavaScript library. Your Django permissions and business logic automatically apply.

### Transform Legacy Django Apps Into Modern SPAs

Got a Django app built over years? StateZero gives you a migration path to modern SPA architecture without the usual rewrite:

- **Keep your existing models** - no changes needed to your Django backend
- **Add SPA frontends progressively** - page by page, component by component  
- **Preserve all business logic** - validation, permissions, and workflows stay in Django
- **Zero migration risk** - your backend remains unchanged and fully functional

### Live Demo: Decoupled but Synchronized

```python
# Your Django backend - unchanged, authoritative
class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    in_stock = models.BooleanField(default=True)
    
    def clean(self):
        if self.price < 0:
            raise ValidationError("Price cannot be negative")
```

```javascript
// Your SPA frontend - thin, reactive client
import { useQueryset } from '@statezero/core/vue';
import { Product } from './models';

const products = useQueryset(() => Product.objects.filter({ in_stock: true }));

// User A creates a product (validation happens in Django)
const newProduct = Product.objects.create({
  name: "iPhone 16",
  price: 999.99,
  in_stock: true
});

// User B's SPA updates instantly - no API calls, no manual sync
// The products queryset automatically includes newProduct
```

```vue
<!-- Real-time reactive SPA component -->
<template>
  <div v-for="product in products" :key="product.pk">
    {{ product.name }} - ${{ product.price }}
    <button @click="toggleStock(product)">
      {{ product.in_stock ? 'In Stock' : 'Out of Stock' }}
    </button>
  </div>
</template>

<script setup>
import { useQueryset } from '@statezero/core/vue';
import { Product } from './models';

// Reactive thin client - declares what it needs, stays in sync automatically
const products = useQueryset(() => Product.objects.all());

const toggleStock = (product) => {
  // Optimistic update in SPA - Django validates and confirms
  product.in_stock = !product.in_stock;
  product.save();
};
</script>
```

### How It Works

1. **Your Django backend stays unchanged** - models, permissions, business logic intact
2. **Run one command** - StateZero generates reactive JavaScript models that mirror your Django schema
3. **Build your SPA** - use familiar Django query syntax, but reactive and real-time
4. **Deploy independently** - your SPA and Django backend remain fully decoupled

You get clean architectural separation with zero integration friction.

### Framework Support

- **Vue.js** - Native reactive integration ✅
- **Vanilla JavaScript** - Works with any SPA framework ✅
- **React** - Hook-based integration (coming soon) 🚧
- **Svelte** - Native store integration (coming soon) 🚧

### The Best of Both Worlds

Stop choosing between clean architecture and development velocity.

Build properly decoupled SPAs with the Django knowledge you already have. Keep your separation of concerns. Eliminate the friction.

Your frontend becomes a reactive thin client of your Django data - exactly the architecture you want, without the pain you don't.

**[→ Transform your first Django app in 15 minutes](/getting-started)**

---