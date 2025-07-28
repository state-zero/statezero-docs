# Search Guide

StateZero provides flexible full-text search capabilities that work seamlessly with your models. The search system supports both basic text matching and advanced PostgreSQL full-text search, with automatic optimization and permission integration.

## Basic Usage

### Frontend Search API

Search for records using the simple `.search()` method:

```javascript
// Basic search - searches in all configured searchable fields
const articles = await Article.objects.search("django tutorial").fetch()

// Search in specific fields
const articles = await Article.objects.search("django tutorial", ["title", "content"]).fetch()

// Combine search with filtering
const articles = await Article.objects
  .filter({ status: 'published' })
  .search("django tutorial")
  .fetch()

// Search with ordering
const articles = await Article.objects
  .search("django tutorial")
  .orderBy('-created_at')
  .fetch()
```

### Search Configuration

Configure which fields are searchable in your model registration:

```python
# models.py
class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    excerpt = models.TextField()
    status = models.CharField(max_length=20)
    author = models.ForeignKey(User, on_delete=models.CASCADE)

# registration.py
from statezero.core.config import ModelConfig
from statezero.adaptors.django.config import registry

registry.register(
    Article,
    ModelConfig(
        model=Article,
        searchable_fields={"title", "content", "excerpt"},  # Configure searchable fields
        permissions=[MyPermission],
    ),
)
```

## Search Providers

StateZero includes multiple search providers for different database backends and use cases.

### Basic Search Provider

The default search provider works with any database and provides simple text matching:

```python
# Automatically configured by default
from statezero.adaptors.django.search_providers.basic_search import BasicSearchProvider

# Uses Django's __icontains lookup for text matching
# Query: "django tutorial" becomes:
# Q(title__icontains="django") | Q(title__icontains="tutorial") |
# Q(content__icontains="django") | Q(content__icontains="tutorial") | ...
```

**Features:**
- Works with any database (SQLite, PostgreSQL, MySQL, etc.)
- Case-insensitive text matching
- Splits search terms and searches each term across all fields
- Simple and reliable

### PostgreSQL Search Provider

For PostgreSQL databases, create a custom configuration to use the advanced full-text search provider:

```python
# myapp/config.py
from statezero.adaptors.django.config import DjangoLocalConfig
from statezero.adaptors.django.search_providers.postgres_search import PostgreSQLSearchProvider

class MyAppConfig(DjangoLocalConfig):
    def initialize(self):
        super().initialize()
        # Override with PostgreSQL search provider
        self.search_provider = PostgreSQLSearchProvider()

# settings.py
STATEZERO_CUSTOM_CONFIG = "myapp.config.MyAppConfig"
```

**Features:**
- Full-text search with ranking
- Supports complex search queries (phrases, operators)
- Automatic relevance scoring
- Can use precomputed search vectors for performance
- Language-aware search (stemming, stop words)

**Search Query Examples:**
```javascript
// Simple terms
await Article.objects.search("django tutorial").fetch()

// Phrase search
await Article.objects.search('"advanced django"').fetch()

// Boolean operators
await Article.objects.search("django & (tutorial | guide)").fetch()

// Exclusion
await Article.objects.search("django & !deprecated").fetch()
```

## Advanced Configuration

### All Fields Search

Allow searching across all text fields:

```python
registry.register(
    Article,
    ModelConfig(
        model=Article,
        searchable_fields="__all__",  # Search all text fields
        permissions=[MyPermission],
    ),
)
```

### Dynamic Search Fields

Control search fields from the frontend:

```javascript
// Search only in titles
const articles = await Article.objects.search("django", ["title"]).fetch()

// Search in title and content only
const articles = await Article.objects.search("tutorial", ["title", "content"]).fetch()

// Frontend fields are intersected with configured searchable_fields for security
```

## Performance Optimization

### PostgreSQL Full-Text Search Indexes

For optimal PostgreSQL performance, create search vector columns:

```sql
-- Add search vector column
ALTER TABLE article ADD COLUMN pg_search_vector tsvector;

-- Create search index
CREATE INDEX idx_article_search ON article USING GIN(pg_search_vector);

-- Update search vectors (can be automated with triggers)
UPDATE article SET pg_search_vector = 
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(excerpt, ''));
```

StateZero will automatically use the precomputed search vector when:
1. The `pg_search_vector` column exists
2. The search fields exactly match your model's `searchable_fields` configuration

### Automatic Search Vector Generation

StateZero can also generate search vectors dynamically:

```python
# This happens automatically when no precomputed vector is available
# or when search fields don't match the configuration

# Generated query:
Article.objects.annotate(
    pg_search_vector=SearchVector('title', 'content', 'excerpt'),
    rank=SearchRank(SearchVector('title', 'content', 'excerpt'), SearchQuery('django'))
).filter(pg_search_vector=SearchQuery('django')).order_by('-rank')
```

## Security Considerations

Search uses the `searchable_fields` configuration and does not automatically integrate with permission-based field restrictions. This means:

```python
class RestrictedPermission(AbstractPermission):
    def visible_fields(self, request, model):
        if request.user.is_staff:
            return {"title", "content", "excerpt", "internal_notes"}
        return {"title", "excerpt"}  # Regular users can't see internal_notes

registry.register(
    Article,
    ModelConfig(
        model=Article,
        searchable_fields={"title", "content", "excerpt", "internal_notes"},
        permissions=[RestrictedPermission],
    ),
)
```

**Important**: All users can search in all `searchable_fields` regardless of permission restrictions. If you need permission-aware search, configure `searchable_fields` appropriately:

```python
# ✅ Safe - only include fields all users can search
registry.register(
    Article,
    ModelConfig(
        model=Article,
        searchable_fields={"title", "excerpt"},  # Only public fields
        permissions=[RestrictedPermission],
    ),
)

# ❌ Potentially unsafe - includes sensitive fields
registry.register(
    Article,
    ModelConfig(
        model=Article,
        searchable_fields={"title", "content", "internal_notes"},  # All users can search internal_notes
        permissions=[RestrictedPermission],
    ),
)
```

## Search with Filtering and Ordering

### Combined Operations

Search works seamlessly with filtering and ordering:

```javascript
// Complex query combining search, filtering, and ordering
const articles = await Article.objects
  .filter({ 
    status: 'published',
    created_at__gte: new Date('2024-01-01')
  })
  .search("django tutorial", ["title", "content"])
  .orderBy('-created_at', 'title')
  .fetch()
```

**Generated SQL (with PostgreSQL search):**
```sql
SELECT * FROM article 
WHERE status = 'published' 
  AND created_at >= '2024-01-01'
  AND pg_search_vector @@ to_tsquery('django & tutorial')
ORDER BY ts_rank(pg_search_vector, to_tsquery('django & tutorial')) DESC, 
         created_at DESC, title ASC
```

### Pagination with Search

Search results are automatically optimized for pagination:

```javascript
// Paginated search results
const articles = await Article.objects
  .search("django tutorial")
  .limit(20)
  .offset(40)
  .fetch()
```

## Real-Time Search

Search works with StateZero's live queries for real-time search results:

```javascript
// Live search that updates automatically
const liveArticles = Article.objects
  .search("django tutorial")
  .live()

// Search results update when:
// - New articles matching the search are created
// - Existing articles are updated to match/not match
// - Articles are deleted
```

## Custom Search Providers

StateZero allows you to create custom search providers for specialized requirements by implementing the `AbstractSearchProvider` interface. This enables you to integrate with external search engines (Elasticsearch, Solr), implement custom ranking algorithms, or handle specialized search logic for your domain.

```python
# myapp/config.py
from statezero.adaptors.django.config import DjangoLocalConfig
from myapp.search import CustomSearchProvider

class MyAppConfig(DjangoLocalConfig):
    def initialize(self):
        super().initialize()
        self.search_provider = CustomSearchProvider()

# settings.py
STATEZERO_CUSTOM_CONFIG = "myapp.config.MyAppConfig"
```

## Best Practices

### 1. **Configure Appropriate Search Fields**

Only include fields that make sense to search:

```python
# ✅ Good - relevant text fields
searchable_fields={"title", "content", "excerpt", "tags__name"}

# ❌ Avoid - irrelevant or sensitive fields  
searchable_fields={"title", "id", "password_hash", "created_at"}
```

### 2. **Use PostgreSQL for Production**

For production applications with significant search requirements:

```python
# myapp/config.py
from statezero.adaptors.django.config import DjangoLocalConfig
from statezero.adaptors.django.search_providers.postgres_search import PostgreSQLSearchProvider

class ProductionConfig(DjangoLocalConfig):
    def initialize(self):
        super().initialize()
        self.search_provider = PostgreSQLSearchProvider()

# settings.py
STATEZERO_CUSTOM_CONFIG = "myapp.config.ProductionConfig"
```

### 3. **Index Your Search Fields**

Create database indexes for better performance:

```sql
-- Basic indexes
CREATE INDEX idx_article_title ON article(title);
CREATE INDEX idx_article_content ON article USING GIN(to_tsvector('english', content));

-- Full-text search index
CREATE INDEX idx_article_search ON article USING GIN(pg_search_vector);
```

### 4. **Configure Search Fields Carefully**

Since search doesn't automatically respect permission field restrictions, be careful with `searchable_fields`:

```python
# ✅ Good - only include fields appropriate for all users
searchable_fields={"title", "excerpt", "public_description"}

# ❌ Risky - sensitive fields searchable by all users
searchable_fields={"title", "content", "internal_notes", "private_data"}
```

### 5. **Monitor Search Performance**

Monitor search query performance in production:

```python
# Add logging for slow search queries
import logging
logger = logging.getLogger('django.db.backends')

# Or use Django Debug Toolbar in development
```

The search system in StateZero provides powerful, flexible text search capabilities while maintaining security through permission integration and performance through intelligent provider selection and query optimization.