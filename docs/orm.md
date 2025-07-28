# StateZero ORM API Documentation

StateZero provides a faithful port of Django's ORM QuerySet API to JavaScript/TypeScript. The ORM uses an AST (Abstract Syntax Tree) parser to translate Django-style queries into backend database operations, enabling familiar Django patterns in your frontend code.

## Overview

StateZero's ORM implements a **subset** of Django's ORM functionality, focusing on the most commonly used features. The implementation supports:

- ✅ **Field lookups** (contains, startswith, gt, gte, etc.)
- ✅ **Filtering and exclusion** with Q objects
- ✅ **Aggregation functions** (count, sum, avg, min, max)
- ✅ **Ordering and pagination**
- ✅ **Automatic query optimization** (no manual select_related needed)
- ✅ **CRUD operations** (create, update, delete, get_or_create)
- ✅ **Relationship traversal** with double-underscore syntax
- ✅ **F expressions** for field references and calculations
- ✅ **Bulk operations** (update, delete) on querysets

### Notable Limitations

Some Django ORM features are **not supported**:

- ❌ **Regex queries** (`__regex`, `__iregex`) - not implemented in AST parser
- ❌ **Complex aggregations** with GROUP BY - use backend custom querysets instead
- ❌ **Subqueries** - backend-only features
- ❌ **Custom database functions** - limited to basic math functions in F expressions

## Model Manager

Every StateZero model includes an `.objects` manager that serves as the entry point for database operations:

```javascript
// Access the manager
MyModel.objects.all()    // Returns QuerySet
MyModel.objects.filter() // Returns QuerySet  
MyModel.objects.create() // Returns Promise<Model>
```

### Manager Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `all()` | All records | `QuerySet` |
| `filter(conditions)` | Filtered records | `QuerySet` |
| `exclude(conditions)` | Exclude conditions | `QuerySet` |
| `get(conditions)` | Single record | `Promise<Model>` |
| `create(data)` | Create record | `Promise<Model>` |
| `count(field?)` | Count records | `Promise<number>` |
| `sum(field)` | Sum values | `Promise<number>` |
| `avg(field)` | Average values | `Promise<number>` |
| `min(field)` | Minimum value | `Promise<any>` |
| `max(field)` | Maximum value | `Promise<any>` |

## QuerySet Basics

QuerySets are **lazy** - they don't execute until evaluated. This allows efficient query building through method chaining:

```javascript
// Building a query (lazy - no database hit)
const qs = MyModel.objects
  .filter({ status: 'active' })
  .exclude({ archived: true })
  .orderBy('-created_at');

// Executing the query
const results = await qs.fetch();           // Returns array
const first = await qs.first();            // Returns single instance
const count = await qs.count();            // Count all records
const exists = await qs.exists();          // Returns boolean

// Single value operations
const count = await qs.count();             // Count all records
const total = await qs.sum('amount');       // Sum a field
const average = await qs.avg('score');      // Average a field
```

### QuerySet Methods

#### Filtering
- `filter(conditions)` - Include records matching conditions
- `exclude(conditions)` - Exclude records matching conditions
- `search(query, fields?)` - Full-text search across specified fields

#### Ordering
- `orderBy(...fields)` - Order by one or more fields (prefix with `-` for descending)

#### Aggregation
- `count(field?)` - Count records
- `sum(field)` - Sum numeric field values
- `avg(field)` - Average numeric field values
- `min(field)` - Find minimum value
- `max(field)` - Find maximum value

#### Evaluation
- `fetch(options?)` - Return array of model instances
- `get(conditions?)` - Return single instance (throws if 0 or >1 found)
- `first()` - Return first instance or null
- `last()` - Return last instance or null
- `exists()` - Return boolean indicating if any records exist

#### Bulk Operations
- `update(data)` - Update all records in queryset (returns `[count, mapping]`)
- `delete()` - Delete all records in queryset (returns `[count, mapping]`)

#### Serialization Options  
- `fetch(options)` - Fetch records with serialization options:
  - `depth` - How deep to serialize nested objects (default: 0)
  - `fields` - Array of specific fields to include  
  - `limit` - Maximum number of records to return
  - `offset` - Number of records to skip (for pagination)

## Field Lookups

StateZero supports Django-style field lookups for powerful filtering. Field lookups are specified using double underscores (`__`) to separate the field name from the lookup type.

### Supported Lookups

Based on the AST parser's `SUPPORTED_OPERATORS`, StateZero supports these lookup types:

#### Text Lookups
```javascript
// Case-sensitive
MyModel.objects.filter({ name__contains: 'john' });      // Contains substring
MyModel.objects.filter({ name__startswith: 'J' });       // Starts with
MyModel.objects.filter({ name__endswith: 'son' });       // Ends with
MyModel.objects.filter({ name__exact: 'John' });         // Exact match

// Case-insensitive (prefix with 'i')
MyModel.objects.filter({ name__icontains: 'JOHN' });     // Case-insensitive contains
MyModel.objects.filter({ name__istartswith: 'j' });      // Case-insensitive starts with
MyModel.objects.filter({ name__iendswith: 'SON' });      // Case-insensitive ends with
MyModel.objects.filter({ name__iexact: 'john' });        // Case-insensitive exact
```

#### Numeric/Comparison Lookups
```javascript
MyModel.objects.filter({ age__gt: 18 });        // Greater than
MyModel.objects.filter({ age__gte: 18 });       // Greater than or equal
MyModel.objects.filter({ age__lt: 65 });        // Less than
MyModel.objects.filter({ age__lte: 65 });       // Less than or equal
MyModel.objects.filter({ price__eq: 99.99 });   // Equal (same as no lookup)
```

#### List/Null Lookups
```javascript
MyModel.objects.filter({ status__in: ['active', 'pending'] });  // Value in list
MyModel.objects.filter({ description__isnull: true });          // Is null
MyModel.objects.filter({ description__isnull: false });         // Is not null
```

#### Date/Time Lookups
```javascript
// Date component extraction
MyModel.objects.filter({ created_at__year: 2024 });             // Year
MyModel.objects.filter({ created_at__month: 6 });               // Month (1-12)
MyModel.objects.filter({ created_at__day: 15 });                // Day of month
MyModel.objects.filter({ created_at__week_day: 1 });            // Day of week (1=Sunday)

// Time component extraction  
MyModel.objects.filter({ created_at__hour: 14 });               // Hour (0-23)
MyModel.objects.filter({ created_at__minute: 30 });             // Minute (0-59)
MyModel.objects.filter({ created_at__second: 45 });             // Second (0-59)

// Date parts with comparisons
MyModel.objects.filter({ created_at__year__gte: 2024 });        // Year >= 2024
MyModel.objects.filter({ created_at__hour__gt: 12 });           // Hour > 12
MyModel.objects.filter({ created_at__month__lt: 6 });           // Month < 6
```

#### Relationship Lookups
```javascript
// Filter by related object's primary key
MyModel.objects.filter({ user: 123 });
MyModel.objects.filter({ user__id: 123 });        // Explicit PK reference

// Filter by related object's fields
MyModel.objects.filter({ user__name: 'John' });
MyModel.objects.filter({ user__email__endswith: '@company.com' });

// Deep relationship traversal
MyModel.objects.filter({ user__profile__age__gte: 18 });
MyModel.objects.filter({ user__groups__name: 'admins' });
```

### Limitations

The following Django lookups are **not supported**:
- ❌ `__regex` and `__iregex` - Regular expression matching  
- ❌ `__range` - Range lookups (use `__gte` and `__lte` instead)

## Q Objects

Q objects enable complex filtering with AND, OR, and NOT logic, just like Django's ORM.

### Basic Q Object Usage

```javascript
import { Q } from 'statezero';

// OR conditions
MyModel.objects.filter({
  Q: [Q('OR', { status: 'active' }, { status: 'pending' })]
});

// AND conditions (default behavior)
MyModel.objects.filter({
  Q: [Q('AND', { is_published: true }, { score__gte: 70 })]
});
```

### Complex Q Object Patterns

```javascript
// Nested Q objects for complex logic
MyModel.objects.filter({
  Q: [
    Q('OR', 
      Q('AND', { category: 'tech', score__gte: 80 }),
      Q('AND', { category: 'business', score__gte: 90 }),
      Q('AND', { featured: true, score__gte: 60 })
    )
  ]
});

// Combining Q objects with regular filters
MyModel.objects.filter({
  created_at__gte: '2024-01-01',  // Regular filter
  Q: [Q('OR', { status: 'published' }, { featured: true })]
});

// Multiple Q object groups
MyModel.objects.filter({
  Q: [
    Q('OR', { category: 'tech' }, { category: 'science' }),
    Q('AND', { is_published: true }, { score__gte: 70 })
  ]
});
```

### Q Object with Field Lookups

```javascript
// Q objects work with all field lookups
MyModel.objects.filter({
  Q: [
    Q('OR',
      { title__icontains: 'python' },
      { description__icontains: 'python' },
      { tags__name__icontains: 'python' }
    )
  ]
});

// Complex relationship filtering
MyModel.objects.filter({
  Q: [
    Q('AND',
      { author__is_active: true },
      Q('OR',
        { author__groups__name: 'editors' },
        { author__groups__name: 'admins' }
      )
    )
  ]
});
```

## F Expressions

F expressions allow you to reference and perform calculations on field values within database operations, similar to Django's F objects.

### Basic F Expression Usage

```javascript
import { F } from 'statezero';

// Reference a field value
await MyModel.objects.filter({ id: 1 }).update({ 
  backup_value: F('current_value') 
});

// Mathematical operations
await MyModel.objects.filter({ status: 'active' }).update({
  score: F('score + 10')        // Increment by 10
});

await MyModel.objects.filter({ id: 1 }).update({
  total: F('price * quantity')   // Multiply fields
});
```

### Supported F Expression Operations

StateZero F expressions support:

#### Arithmetic Operators
- `+` Addition
- `-` Subtraction  
- `*` Multiplication
- `/` Division
- `%` Modulo
- `^` Exponentiation

#### Mathematical Functions
- `abs(field)` - Absolute value
- `round(field)` - Round to nearest integer
- `floor(field)` - Round down
- `ceil(field)` - Round up
- `min(field, value)` - Minimum of field and value
- `max(field, value)` - Maximum of field and value

### F Expression Examples

```javascript
// Increment/decrement values
await Post.objects.filter({ published: true }).update({
  view_count: F('view_count + 1')
});

await Product.objects.filter({ category: 'sale' }).update({
  price: F('price * 0.8')  // 20% discount
});

// Complex calculations
await Order.objects.filter({ status: 'completed' }).update({
  total_with_tax: F('subtotal * 1.1 + shipping_cost'),
  discount_amount: F('max(subtotal * 0.1, 5)')  // 10% discount, minimum $5
});

// Field-to-field operations
await User.objects.filter({ id: user_id }).update({
  last_score: F('current_score'),
  current_score: F('abs(new_score - current_score)')
});
```

### F Expression Limitations

- ❌ **Field access with dot notation** - Use simple field names only
- ❌ **Conditional expressions** - No ternary or if/else logic
- ❌ **String operations** - Math operations only
- ❌ **Custom functions** - Limited to predefined math functions
- ❌ **Cross-table references** - Field references within same model only

Validation ensures only safe mathematical operations and field references are allowed.

## Aggregations

StateZero provides Django-style aggregation functions for data analysis.

### Basic Aggregations

```javascript
// Count records
const totalUsers = await User.objects.count();
const activeUsers = await User.objects.filter({ is_active: true }).count();

// Sum values
const totalSales = await Order.objects.sum('amount');
const monthlySales = await Order.objects
  .filter({ created_at__month: 1 })
  .sum('amount');

// Average
const avgAge = await User.objects.avg('age');
const avgOrderValue = await Order.objects.avg('amount');

// Min/Max
const youngestAge = await User.objects.min('age');
const oldestAge = await User.objects.max('age');
const earliestOrder = await Order.objects.min('created_at');
const latestOrder = await Order.objects.max('created_at');
```

### Aggregation with Filtering

```javascript
// Complex aggregations with filtering
const premiumStats = await User.objects
  .filter({ 
    subscription_type: 'premium',
    is_active: true,
    created_at__gte: '2024-01-01'
  })
  .aggregate([
    { function: 'count', field: 'id', alias: 'total_premium_users' },
    { function: 'avg', field: 'monthly_spend', alias: 'avg_spend' },
    { function: 'sum', field: 'lifetime_value', alias: 'total_ltv' }
  ]);

// Results: { total_premium_users: 250, avg_spend: 89.50, total_ltv: 22375.00 }
```

### Aggregation Best Practices

```javascript
// ✅ Good: Use specific field for count when possible
const userCount = await User.objects.count('id');

// ✅ Good: Combine filtering with aggregation
const recentOrderValue = await Order.objects
  .filter({ created_at__gte: '2024-01-01', status: 'completed' })
  .sum('amount');

// ✅ Good: Use appropriate aggregation for data type
const avgRating = await Review.objects.avg('rating');  // Numeric average
const lastLogin = await User.objects.max('last_login'); // Latest date
```

## CRUD Operations

### Create Operations

```javascript
// Create single record
const user = await User.objects.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 25
});

// Create with relationships
const post = await Post.objects.create({
  title: 'My Post',
  content: 'Post content...',
  author: user.id,  // Foreign key by ID
  category: category_instance  // Or pass model instance
});
```

### Read Operations

```javascript
// Get single record (throws DoesNotExist if not found)
const user = await User.objects.get({ email: 'john@example.com' });

// Get with conditions
const user = await User.objects.get({ id: 1, is_active: true });

// Safe get - returns null if not found
const user = await User.objects.filter({ email: 'john@example.com' }).first();

// Get multiple records
const users = await User.objects.filter({ is_active: true }).fetch();
const all_users = await User.objects.all().fetch();

// Ordered results
const recent_posts = await Post.objects
  .orderBy('-created_at')
  .fetch({ limit: 10 });
```

### Update Operations

```javascript
// Update single instance
const user = await User.objects.get({ id: 1 });
user.name = 'Jane Doe';
await user.save();

// Update with specific fields
await user.update({ name: 'Jane Doe', last_login: new Date() });
```

### Delete Operations

```javascript
// Delete single instance
const user = await User.objects.get({ id: 1 });
await user.delete();
```

### Get or Create

```javascript
// Get existing record or create new one
const [user, created] = await User.objects.getOrCreate(
  { email: 'john@example.com' },    // Lookup criteria
  { name: 'John Doe', age: 25 }     // Defaults for creation
);

if (created) {
  console.log('Created new user');
} else {
  console.log('Found existing user');
}
```

### Update or Create

```javascript
// Update existing record or create new one
const [user, created] = await User.objects.updateOrCreate(
  { email: 'john@example.com' },         // Lookup criteria  
  { name: 'John Doe', age: 26, is_active: true }  // Values to set
);

// If user exists: updates with provided values
// If user doesn't exist: creates with lookup + values combined
```

## Bulk Operations

StateZero supports efficient bulk operations on querysets, allowing you to update or delete multiple records with a single database operation.

### Bulk Update

Bulk updates work on filtered querysets and support F expressions:

```javascript
// Basic bulk update
const [updated_count, model_mapping] = await User.objects
  .filter({ is_active: false })
  .update({ last_login: null, status: 'inactive' });

console.log(`Updated ${updated_count} users`);
// model_mapping: { 'User': 15 } - breakdown by model

// Bulk update with F expressions
await Product.objects
  .filter({ category: 'electronics' })
  .update({ 
    price: F('price * 0.9'),        // 10% discount
    sale_count: F('sale_count + 1')  // Increment counter
  });

// Conditional bulk updates
await Order.objects
  .filter({ status: 'pending', created_at__lt: '2024-01-01' })
  .update({ 
    status: 'expired',
    expired_at: new Date()
  });
```

### Bulk Delete

```javascript
// Basic bulk delete
const [deleted_count, model_mapping] = await User.objects
  .filter({ is_active: false, last_login__lt: '2023-01-01' })
  .delete();

console.log(`Deleted ${deleted_count} inactive users`);

// Delete with complex conditions
await Post.objects
  .filter({
    Q: [
      Q('OR',
        { status: 'draft', created_at__lt: '2023-01-01' },
        { status: 'spam' }
      )
    ]
  })
  .delete();

// Delete all records in queryset
await TempFile.objects.all().delete();
```

### Bulk Operation Return Values

Both `update()` and `delete()` return a tuple:
- `[count, mapping]` where:
  - `count`: Total number of affected records
  - `mapping`: Object with model names as keys and counts as values

```javascript
const [count, mapping] = await MyModel.objects
  .filter({ status: 'inactive' })
  .delete();

// count: 25
// mapping: { 'MyModel': 25 }
```

### Bulk Operation Considerations

- **Permissions**: Bulk operations respect model-level and object-level permissions
- **Signals**: Operations trigger appropriate model signals and real-time updates
- **Transactions**: Bulk operations are atomic within backend transactions
- **Performance**: Much more efficient than iterating over individual records
- **F Expressions**: Only bulk update supports F expressions, not bulk delete

## Serialization Options

StateZero automatically optimizes database queries based on the fields you request, eliminating the need for manual `select_related` and `prefetch_related` calls. Simply specify what data you need using serialization options, and StateZero handles the query optimization transparently.

### Serialization Parameters

#### `depth` Parameter

Controls how deep to serialize nested relationships:

```javascript
// Depth 0: Only direct fields, no relationships
const posts = await Post.objects.all().fetch({ depth: 0 });

// Depth 1: Include direct relationships
const posts = await Post.objects.all().fetch({ depth: 1 });
// Includes: post.author, post.category (as full objects)

// Depth 2: Include relationships of relationships  
const posts = await Post.objects.all().fetch({ depth: 2 });
// Includes: post.author.profile, post.category.parent, etc.
```

#### `fields` Parameter

Specify exactly which fields to include in the response:

```javascript
// Only specific fields
const users = await User.objects.all().fetch({
  fields: ['id', 'name', 'email']
});

// Include related fields using double underscore syntax
const posts = await Post.objects.all().fetch({
  fields: [
    'id', 'title', 'content',
    'author__name', 'author__email',
    'category__name'
  ]
});

// The depth parameter is automatically calculated from field paths
// No need to specify depth when using fields
```

#### `limit` and `offset` Parameters

Control pagination:

```javascript
// Basic pagination
const page1 = await Post.objects.all().fetch({
  limit: 10,
  offset: 0
});

const page2 = await Post.objects.all().fetch({
  limit: 10, 
  offset: 10
});

// Combine with other options
const results = await Post.objects
  .filter({ published: true })
  .orderBy('-created_at')
  .fetch({
    fields: ['title', 'author__name', 'created_at'],
    limit: 20,
    offset: 40
  });
```

### Combining Serialization Options

```javascript
// Complex example combining all options
const posts = await Post.objects
  .filter({ status: 'published' })
  .orderBy('-created_at')
  .fetch({
    depth: 2,                    // Deep serialization
    fields: [                    // Specific fields only
      'id', 'title', 'excerpt',
      'author__name', 'author__profile__bio',
      'category__name', 'tags__name',
      'comments__text', 'comments__author__name'
    ],
    limit: 25,                   // Pagination
    offset: 50
  });

// StateZero automatically optimizes this complex query behind the scenes
```

### Performance Benefits

The automatic optimization provides significant performance improvements:

```javascript
// Before optimization (N+1 queries):
// 1 query for posts + N queries for each post's author
const posts = await Post.objects.all().fetch();
posts.forEach(post => console.log(post.author.name));

// After optimization (2 queries total):  
// 1 query with JOIN for posts+authors
const posts = await Post.objects.all().fetch({
  fields: ['title', 'author__name']
});
posts.forEach(post => console.log(post.author.name));
```

### Best Practices

```javascript
// ✅ Good: Specify exactly what you need
const minimal_posts = await Post.objects.fetch({
  fields: ['id', 'title', 'author__name']
});

// ✅ Good: Use depth for consistent relationship loading
const full_posts = await Post.objects.fetch({ depth: 2 });

// ✅ Good: Combine filtering with optimized fetching
const recent_posts = await Post.objects
  .filter({ created_at__gte: '2024-01-01' })
  .orderBy('-created_at')
  .fetch({
    fields: ['title', 'author__name', 'created_at'],
    limit: 10
  });

// ❌ Avoid: Fetching all fields when you only need a few
const wasteful = await Post.objects.all().fetch(); // Gets everything

// ❌ Avoid: Accessing relationships without optimization hints
const posts = await Post.objects.all().fetch({ depth: 0 });
posts.forEach(post => console.log(post.author.name)); // N+1 queries
```

The automatic optimization means you can focus on what data you need rather than how to optimize the database queries - StateZero handles the performance optimization transparently.