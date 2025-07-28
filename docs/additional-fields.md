# StateZero Additional Fields Documentation

Additional fields in StateZero allow you to expose computed or derived data from your Django models that requires server-side context or real-time data that isn't available on the frontend. These fields are read-only and are calculated on the backend using information that only the server has access to.

## Overview

Additional fields enable you to:

- **Access server-side data** like real-time exchange rates, external API data, or system state
- **Perform calculations with sensitive data** that shouldn't be exposed to the frontend
- **Include real-time computed values** that depend on current server state
- **Add derived values from external systems** or third-party services

Additional fields are **always read-only** and are computed server-side during serialization using data that's only available on the backend.

## When to Use Additional Fields

Use additional fields when you need to:
- **Access real-time external data** (currency rates, stock prices, API data)
- **Perform calculations with server-only information** (user permissions, system configuration)
- **Include time-sensitive computations** that must reflect current server state
- **Aggregate data across tenants or systems** that the frontend can't access

**Don't use additional fields for:**
- Simple formatting (handle on frontend)
- Static choices/enums (use frontend mapping)
- Client-side calculations (do in JavaScript)
- Data the frontend already has access to

## Configuration

Additional fields are configured using the `AdditionalField` class when registering models with StateZero:

```python
from statezero.core.config import ModelConfig
from statezero.core.classes import AdditionalField
from statezero import register_model
from django.db import models

register_model(
    Product,
    ModelConfig(
        model=Product,
        additional_fields=[
            AdditionalField(
                name="price_in_user_currency",
                title="Price in User Currency",
                field=models.DecimalField(max_digits=10, decimal_places=2),
            ),
            AdditionalField(
                name="real_time_availability",
                title="Real-time Availability", 
                field=models.BooleanField(),
            ),
        ],
        # ... other configuration options
    )
)
```

## AdditionalField Parameters

### Required Parameters

- **`name`**: The name of the property or method on your Django model that provides the value
- **`field`**: A Django field instance that defines the serialization behavior and type

### Optional Parameters

- **`title`**: Display title for the field (overrides any title from the field definition)

## Django Model Implementation

For additional fields to work, your Django model must have corresponding properties or methods that access server-side data:

```python
from django.db import models
from decimal import Decimal
import requests
from django.core.cache import cache

class Product(models.Model):
    name = models.CharField(max_length=100)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2)
    sku = models.CharField(max_length=50)
    
    def price_in_user_currency(self, request=None):
        """Computed field: price converted to user's currency using real-time rates"""
        if not request or not hasattr(request.user, 'preferred_currency'):
            return self.price_usd
        
        user_currency = request.user.preferred_currency
        if user_currency == 'USD':
            return self.price_usd
        
        # Get real-time exchange rate (with caching)
        cache_key = f"fx_rate_USD_{user_currency}"
        exchange_rate = cache.get(cache_key)
        
        if exchange_rate is None:
            # Fetch from external API
            response = requests.get(f"https://api.exchangerate.com/USD/{user_currency}")
            exchange_rate = response.json()['rate']
            cache.set(cache_key, exchange_rate, timeout=300)  # 5 minutes
        
        return self.price_usd * Decimal(str(exchange_rate))
    
    @property
    def real_time_availability(self):
        """Computed field: check real-time inventory from external system"""
        # Check with external inventory API
        response = requests.get(f"https://inventory-api.com/check/{self.sku}")
        return response.json()['available']

class Investment(models.Model):
    symbol = models.CharField(max_length=10)
    shares = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    @property
    def current_value(self):
        """Computed field: current market value using real-time prices"""
        # Get current stock price from market data API
        cache_key = f"stock_price_{self.symbol}"
        current_price = cache.get(cache_key)
        
        if current_price is None:
            response = requests.get(f"https://market-api.com/price/{self.symbol}")
            current_price = response.json()['price']
            cache.set(cache_key, current_price, timeout=60)  # 1 minute
        
        return self.shares * Decimal(str(current_price))
    
    @property
    def gain_loss(self):
        """Computed field: profit/loss calculation"""
        purchase_value = self.shares * self.purchase_price
        return self.current_value - purchase_value
```

## Common Use Cases

### 1. Real-Time Currency Conversion

```python
# Django Model
class Product(models.Model):
    name = models.CharField(max_length=100)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2)
    
    def price_in_user_currency(self, request=None):
        """Convert price using real-time exchange rates"""
        if not request or not hasattr(request.user, 'preferred_currency'):
            return self.price_usd
        
        user_currency = request.user.preferred_currency
        if user_currency == 'USD':
            return self.price_usd
        
        # Get real-time FX rate from external service
        exchange_rate = get_exchange_rate('USD', user_currency)
        return self.price_usd * exchange_rate

# StateZero Configuration
register_model(
    Product,
    ModelConfig(
        model=Product,
        additional_fields=[
            AdditionalField(
                name="price_in_user_currency",
                title="Price in User Currency",
                field=models.DecimalField(max_digits=12, decimal_places=2),
            ),
        ],
    )
)
```

### 2. Real-Time External System Data

```python
# Django Model
class Product(models.Model):
    sku = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    
    @property
    def real_time_stock_level(self):
        """Get current stock from warehouse management system"""
        response = requests.get(f"https://wms-api.com/stock/{self.sku}")
        return response.json()['quantity']
    
    @property
    def estimated_delivery_date(self):
        """Calculate delivery date based on current logistics data"""
        logistics_api = "https://logistics-api.com/delivery-estimate"
        response = requests.post(logistics_api, json={
            'sku': self.sku,
            'destination': self.get_user_location()  # From request context
        })
        return response.json()['estimated_date']

# StateZero Configuration  
register_model(
    Product,
    ModelConfig(
        model=Product,
        additional_fields=[
            AdditionalField(
                name="real_time_stock_level",
                title="Current Stock Level", 
                field=models.PositiveIntegerField(),
            ),
            AdditionalField(
                name="estimated_delivery_date",
                title="Estimated Delivery",
                field=models.DateField(),
            ),
        ],
    )
)
```

### 3. User-Specific Calculations with Server Context

```python
# Django Model
class Investment(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    symbol = models.CharField(max_length=10)
    shares = models.DecimalField(max_digits=10, decimal_places=2)
    
    def current_value_in_user_currency(self, request=None):
        """Calculate current value in user's preferred currency"""
        # Get real-time stock price
        current_price = get_stock_price(self.symbol)
        value_usd = self.shares * current_price
        
        # Convert to user's currency if needed
        if request and hasattr(request.user, 'preferred_currency'):
            user_currency = request.user.preferred_currency
            if user_currency != 'USD':
                fx_rate = get_exchange_rate('USD', user_currency)
                return value_usd * fx_rate
        
        return value_usd
    
    def tax_impact(self, request=None):
        """Calculate tax implications based on user's tax jurisdiction"""
        if not request or not request.user.is_authenticated:
            return None
        
        # Get user's tax jurisdiction from their profile
        tax_jurisdiction = request.user.profile.tax_jurisdiction
        
        # Calculate using jurisdiction-specific tax rules
        current_value = self.current_value_in_user_currency(request)
        purchase_value = self.shares * self.purchase_price
        gain = current_value - purchase_value
        
        if gain > 0:
            tax_rate = get_capital_gains_rate(tax_jurisdiction)
            return gain * tax_rate
        return 0

# StateZero Configuration
register_model(
    Investment,
    ModelConfig(
        model=Investment,
        additional_fields=[
            AdditionalField(
                name="current_value_in_user_currency",
                title="Current Value",
                field=models.DecimalField(max_digits=15, decimal_places=2),
            ),
            AdditionalField(
                name="tax_impact",
                title="Estimated Tax Impact",
                field=models.DecimalField(max_digits=15, decimal_places=2),
            ),
        ],
    )
)
```

## Frontend Usage

Once configured, additional fields appear as regular properties on your model instances:

```javascript
// Fetch a product with real-time computed fields
const product = await Product.objects.get({ id: 1 });

console.log(product.name);                    // "iPhone 15"
console.log(product.price_usd);               // 999.00
console.log(product.price_in_user_currency);  // 850.15 (real-time EUR conversion)
console.log(product.real_time_stock_level);   // 42 (from warehouse API)

// Fetch investment with current market data
const investment = await Investment.objects.get({ id: 1 });

console.log(investment.symbol);                        // "AAPL"
console.log(investment.shares);                        // 100
console.log(investment.current_value_in_user_currency); // 18,450.25 (real-time price)
console.log(investment.tax_impact);                    // 1,245.30 (jurisdiction-specific)

// Multiple products with real-time data
const products = await Product.objects.all().fetch();
products.forEach(product => {
    console.log(`${product.name}: ${product.price_in_user_currency} ${user.preferred_currency}`);
    console.log(`Stock: ${product.real_time_stock_level} units`);
});
```

## Field Type Mapping

The Django field type you specify determines how the additional field is serialized and typed:

| Django Field | Purpose | Frontend Type |
|--------------|---------|---------------|
| `CharField` | Text/string values | `string` |
| `IntegerField` | Whole numbers | `number` |
| `DecimalField` | Precise decimal numbers | `number` |
| `BooleanField` | True/false values | `boolean` |
| `DateTimeField` | Date and time | `string` (ISO format) |
| `DateField` | Date only | `string` (YYYY-MM-DD) |

## Best Practices

### 1. Cache External API Calls

Always cache data from external APIs to avoid performance issues:

```python
from django.core.cache import cache

@property
def real_time_exchange_rate(self):
    cache_key = f"fx_rate_{self.from_currency}_{self.to_currency}"
    rate = cache.get(cache_key)
    
    if rate is None:
        # Fetch from external API
        rate = fetch_exchange_rate(self.from_currency, self.to_currency)
        cache.set(cache_key, rate, timeout=300)  # 5 minutes
    
    return rate
```

### 2. Handle External Service Failures Gracefully

Always provide fallbacks when external services are unavailable:

```python
@property
def current_stock_level(self):
    try:
        response = requests.get(f"https://api.com/stock/{self.sku}", timeout=2)
        return response.json()['quantity']
    except (requests.RequestException, KeyError):
        # Fallback to last known value or estimated value
        return self.last_known_stock or 0
```

### 3. Use Appropriate Field Types for External Data

Match the Django field type to your external data:

```python
# Financial data - use DecimalField for precision
AdditionalField(
    name="current_market_value",
    field=models.DecimalField(max_digits=15, decimal_places=2),
)

# API availability - use BooleanField
AdditionalField(
    name="is_available_for_shipping",
    field=models.BooleanField(),
)

# External timestamps - use DateTimeField
AdditionalField(
    name="next_restock_date",
    field=models.DateTimeField(),
)
```

## Limitations

### 1. Read-Only Nature

Additional fields cannot be set from the frontend - they're always computed server-side:

```javascript
// This won't work - additional fields are read-only
const product = await Product.objects.get({ id: 1 });
product.price_in_user_currency = 1000;  // ❌ This will be ignored
await product.save();
```

### 2. Not Filterable

You cannot filter or search on additional fields:

```javascript
// This won't work - additional fields can't be used in filters
const products = await Product.objects
  .filter({ price_in_user_currency__gte: 1000 })  // ❌ Error
  .fetch();
```

### 3. Performance and Reliability Considerations

Additional fields that depend on external services can impact performance and reliability:
- **Latency**: External API calls add response time
- **Rate limits**: External services may have usage restrictions  
- **Availability**: External services may be temporarily unavailable
- **Cost**: Some external APIs charge per request

Always implement proper caching, error handling, and fallbacks.

## Troubleshooting

### Common Issues

1. **Missing property on model**: Ensure the Django model has a property/method matching the `name`
2. **Wrong field type**: Use the appropriate Django field type for serialization
3. **Performance issues**: Consider caching or database optimizations for expensive computations

### Debugging

Check that your model property returns the expected data type:

```python
# In Django shell or tests
product = Product.objects.get(id=1)
print(type(product.price_with_tax))  # Should match your field type
print(product.price_with_tax)        # Check the actual value
```

## Conclusion

Additional fields are specifically designed for exposing **server-side computed data** that requires external APIs, real-time information, or sensitive calculations that can't be performed on the frontend. They're perfect for:

- **Real-time financial data** (currency conversion, stock prices, market rates)
- **External system integration** (inventory levels, shipping estimates, availability)
- **User-specific calculations** that require server context (tax calculations, personalized pricing)
- **Time-sensitive data** that must reflect current server state

Remember:
- Use for data that **only the server can access**
- Always implement **caching and error handling** for external APIs
- Provide **meaningful fallbacks** when external services fail
- Focus on **real-time or server-context dependent** computations
- Avoid using for simple formatting or static data transformations