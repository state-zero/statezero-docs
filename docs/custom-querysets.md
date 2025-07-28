# Custom Querysets

Custom querysets allow you to define reusable server-side query logic that can be called from your frontend. They're useful for encapsulating complex filtering or business logic on the backend.

## Creating a Custom Queryset

Create a class that inherits from `AbstractCustomQueryset`:

```python
from statezero.core.interfaces import AbstractCustomQueryset

class ActiveProductsQuerySet(AbstractCustomQueryset):
    def get_queryset(self, request=None):
        """Return only products that are in stock."""
        from .models import Product
        return Product.objects.filter(in_stock=True)
```

The `get_queryset` method should return a Django QuerySet. The optional `request` parameter gives you access to the current HTTP request.

## Registering Custom Querysets

Register your custom querysets when configuring your model:

```python
from statezero.adaptors.django.config import registry
from statezero.core.config import ModelConfig
from .models import Product
from .querysets import ActiveProductsQuerySet

registry.register(
    Product,
    ModelConfig(
        model=Product,
        custom_querysets={
            'active_products': ActiveProductsQuerySet,
        },
    ),
)
```

You can also use string imports:

```python
custom_querysets={
    'active_products': 'myapp.querysets.ActiveProductsQuerySet',
}
```

## Using Custom Querysets in Frontend

Call your custom queryset using `.customQueryset()`:

```javascript
// Get all active products
const activeProducts = await Product.objects
  .customQueryset('active_products')
  .fetch();
```

You can chain other QuerySet methods:

```javascript
// Get active products, filtered and ordered
const products = await Product.objects
  .customQueryset('active_products')
  .filter({ price__gt: 100 })
  .orderBy('name')
  .fetch();
```

## Examples

### Basic filtering:
```python
class InStockProductsQuerySet(AbstractCustomQueryset):
    def get_queryset(self, request=None):
        from .models import Product
        return Product.objects.filter(in_stock=True)
```

### User-specific data:
```python
class UserOrdersQuerySet(AbstractCustomQueryset):
    def get_queryset(self, request=None):
        from .models import Order
        if request and request.user.is_authenticated:
            return Order.objects.filter(user=request.user)
        return Order.objects.none()
```

### Complex business logic:
```python
class FeaturedProductsQuerySet(AbstractCustomQueryset):
    def get_queryset(self, request=None):
        from .models import Product
        from django.utils import timezone
        from datetime import timedelta
        
        recent = timezone.now() - timedelta(days=30)
        return Product.objects.filter(
            in_stock=True,
            created_at__gte=recent,
            featured=True
        )
```

## Live Updates

Custom querysets are less efficient for live updates compared to regular querysets. Since the filtering logic is on the server, StateZero can't determine which items should be included in the result set without re-running the entire queryset, which requires a full refetch from the backend.

For frequently changing data where live updates are critical, consider using regular querysets with client-side filtering instead.

## Summary

Custom querysets are a simple way to move server-side logic to the backend while keeping the familiar QuerySet API on the frontend.