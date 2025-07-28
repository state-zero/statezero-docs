# Permissions Guide

StateZero provides a flexible permission system that allows you to control access to your models at multiple levels: global actions, object-level operations, field-level visibility, and bulk operations. This guide covers how to implement and configure permissions in your StateZero application.

## Overview

The StateZero permission system is built around the `AbstractPermission` class, which defines several key methods for controlling access:

- **Global Actions**: Control which CRUD operations users can perform on a model
- **Object-Level Permissions**: Fine-grained control over specific model instances
- **Field-Level Access**: Control which fields users can view, edit, or create
- **Queryset Filtering**: Automatically filter querysets based on user permissions
- **Bulk Operations**: Efficient permission checking for operations affecting multiple objects

## Core Permission Methods

Every permission class must implement the following abstract methods:

### Action-Level Methods

```python
def allowed_actions(self, request: RequestType, model: Type[ORMModel]) -> Set[ActionType]:
    """Return the set of CRUD actions the user can perform on the model."""
    pass

def allowed_object_actions(self, request: RequestType, obj: Any, model: Type[ORMModel]) -> Set[ActionType]:
    """Return the set of CRUD actions the user can perform on a specific object."""
    pass
```

### Field-Level Methods

```python
def visible_fields(self, request: RequestType, model: Type) -> Union[Set[str], Literal["__all__"]]:
    """Return fields that are visible to the user."""
    pass

def editable_fields(self, request: RequestType, model: Type) -> Union[Set[str], Literal["__all__"]]:
    """Return fields that the user can edit."""
    pass

def create_fields(self, request: RequestType, model: Type) -> Union[Set[str], Literal["__all__"]]:
    """Return fields that the user can specify when creating objects."""
    pass
```

### Queryset Filtering

```python
def filter_queryset(self, request: RequestType, queryset: Any) -> Any:
    """Filter the queryset based on user permissions."""
    pass
```

### Bulk Operations

```python
def bulk_operation_allowed(self, request: RequestType, items: ORMQuerySet, action_type: ActionType, model: type) -> bool:
    """
    Check if a bulk operation is allowed on a queryset.
    Default implementation checks each object individually.
    Override for more efficient bulk permission logic.
    """
    for obj in items:
        object_level_perms = self.allowed_object_actions(request, obj, model)
        if action_type not in object_level_perms:
            return False
    return True
```

## Built-in Permission Classes

StateZero provides several ready-to-use permission classes:

### AllowAllPermission

Grants full access to all operations and fields. Useful for development or public APIs.

```python
from statezero.adaptors.django.permissions import AllowAllPermission

registry.register(
    MyModel,
    ModelConfig(
        model=MyModel,
        permissions=[AllowAllPermission],
    ),
)
```

### IsAuthenticatedPermission

Allows access only to authenticated users. Anonymous users get empty querysets and no permissions.

```python
from statezero.adaptors.django.permissions import IsAuthenticatedPermission

registry.register(
    MyModel,
    ModelConfig(
        model=MyModel,
        permissions=[IsAuthenticatedPermission],
    ),
)
```

### IsStaffPermission

Restricts access to staff users only. Users must be both authenticated and marked as staff.

```python
from statezero.adaptors.django.permissions import IsStaffPermission

registry.register(
    MyModel,
    ModelConfig(
        model=MyModel,
        permissions=[IsStaffPermission],
    ),
)
```

## Understanding Bulk Operations

StateZero automatically uses bulk operations for performance when dealing with multiple objects. Understanding how permissions work with bulk operations is crucial for building efficient applications.

### When Bulk Operations Are Used

Bulk operations are triggered in several scenarios:

1. **Bulk Updates**: When updating multiple objects with a single query
2. **Bulk Deletes**: When deleting multiple objects at once
3. **Paginated Reads**: When fetching lists of objects with pagination
4. **Filtered Queries**: When retrieving multiple objects matching certain criteria

### Bulk Permission Checking Strategy

StateZero uses an intelligent strategy for bulk permission checking:

```python
def check_bulk_permissions(req, items, action, permissions, model):
    """
    If the queryset contains one or fewer items, perform individual permission checks.
    Otherwise, loop over permission classes and call bulk_operation_allowed.
    """
    if items.count() <= 1:
        # For single items, check individual object permissions
        for instance in items:
            check_object_permissions(req, instance, action, permissions, model)
    else:
        # For multiple items, try bulk permission checks first
        allowed = False
        for perm_cls in permissions:
            perm = perm_cls()
            if perm.bulk_operation_allowed(req, items, action, model):
                allowed = True
                break
        
        if not allowed:
            raise PermissionDenied(f"Bulk {action.value} operation not permitted")
```

### Performance Implications

The default `bulk_operation_allowed` implementation iterates through each object in the queryset, which can be slow for large datasets. For better performance, override this method with more efficient logic:

```python
class EfficientOwnerPermission(AbstractPermission):
    def bulk_operation_allowed(self, request, items, action_type, model):
        """
        Efficient bulk check: verify all items belong to the current user
        without iterating through each object individually.
        """
        if not request.user.is_authenticated:
            return False
            
        # Use a single database query to check ownership
        user_owned_count = items.filter(owner=request.user).count()
        total_count = items.count()
        
        # Only allow if user owns ALL items in the queryset
        return user_owned_count == total_count
    
    def allowed_object_actions(self, request, obj, model):
        if not request.user.is_authenticated:
            return set()
        
        if hasattr(obj, 'owner') and obj.owner == request.user:
            return {ActionType.READ, ActionType.UPDATE, ActionType.DELETE}
        return {ActionType.READ}
```

## Creating Custom Permission Classes

### Basic Custom Permission

Here's an example of a custom permission that allows read-only access:

```python
from statezero.core.interfaces import AbstractPermission
from statezero.core.types import ActionType

class ReadOnlyPermission(AbstractPermission):
    def filter_queryset(self, request, queryset):
        # Don't filter the queryset - allow all objects to be visible
        return queryset

    def allowed_actions(self, request, model):
        # Only allow read operations
        return {ActionType.READ}

    def allowed_object_actions(self, request, obj, model):
        # Only allow read operations on specific objects
        return {ActionType.READ}

    def bulk_operation_allowed(self, request, items, action_type, model):
        # Only allow bulk read operations
        return action_type == ActionType.READ

    def visible_fields(self, request, model):
        # Allow all fields to be visible
        return "__all__"

    def editable_fields(self, request, model):
        # No fields can be edited
        return set()

    def create_fields(self, request, model):
        # No fields can be used for creation
        return set()
```

### Owner-Based Permission with Efficient Bulk Operations

This example restricts access to objects owned by the current user with optimized bulk operations:

```python
class OwnerOnlyPermission(AbstractPermission):
    def filter_queryset(self, request, queryset):
        if not request.user.is_authenticated:
            return queryset.none()
        # Filter to only objects owned by the current user
        return queryset.filter(owner=request.user)

    def allowed_actions(self, request, model):
        if not request.user.is_authenticated:
            return set()
        return {ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE}

    def allowed_object_actions(self, request, obj, model):
        if not request.user.is_authenticated:
            return set()
        # Check if user owns the object
        if hasattr(obj, 'owner') and obj.owner == request.user:
            return {ActionType.READ, ActionType.UPDATE, ActionType.DELETE}
        return {ActionType.READ}  # Allow read-only for non-owned objects

    def bulk_operation_allowed(self, request, items, action_type, model):
        """
        Efficient bulk permission check for owner-based access.
        """
        if not request.user.is_authenticated:
            return False
        
        # For read operations, always allow (queryset is already filtered)
        if action_type == ActionType.READ:
            return True
        
        # For write operations, ensure all items are owned by the user
        if not hasattr(model, 'owner'):
            return False
            
        # Single query to check if all items belong to the user
        owned_count = items.filter(owner=request.user).count()
        total_count = items.count()
        
        return owned_count == total_count

    def visible_fields(self, request, model):
        if not request.user.is_authenticated:
            return set()
        return "__all__"

    def editable_fields(self, request, model):
        if not request.user.is_authenticated:
            return set()
        return "__all__"

    def create_fields(self, request, model):
        if not request.user.is_authenticated:
            return set()
        return "__all__"
```

### Field-Restricted Permission

This example demonstrates restricting access to specific fields:

```python
class RestrictedFieldsPermission(AbstractPermission):
    def filter_queryset(self, request, queryset):
        return queryset

    def allowed_actions(self, request, model):
        if request.user.is_staff:
            return {ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE}
        return {ActionType.READ, ActionType.UPDATE}

    def allowed_object_actions(self, request, obj, model):
        return self.allowed_actions(request, model)

    def bulk_operation_allowed(self, request, items, action_type, model):
        """
        Allow bulk operations if the user has the required global action permission.
        """
        allowed_actions = self.allowed_actions(request, model)
        return action_type in allowed_actions

    def visible_fields(self, request, model):
        if request.user.is_staff:
            return "__all__"
        # Non-staff users can only see basic fields
        return {"id", "name", "description"}

    def editable_fields(self, request, model):
        if request.user.is_staff:
            return "__all__"
        # Non-staff users can only edit name and description
        return {"name", "description"}

    def create_fields(self, request, model):
        if request.user.is_staff:
            return "__all__"
        return {"name", "description"}
```

## Permission Combination Rules

When multiple permission classes are applied to a model, StateZero combines them using specific rules:

### How Multiple Permissions Interact

1. **Actions** (Union): User needs permission from **ANY** permission class
2. **Fields** (Union): User can access fields allowed by **ANY** permission class  
3. **Querysets** (Sequential): **ALL** permission classes filter the queryset
4. **Bulk Operations** (Any): **ANY** permission class can allow the bulk operation

### Example of Permission Combination

```python
class ReadOnlyPermission(AbstractPermission):
    def allowed_actions(self, request, model):
        return {ActionType.READ}
    
    def visible_fields(self, request, model):
        return {"id", "name"}

class OwnerPermission(AbstractPermission):
    def allowed_actions(self, request, model):
        return {ActionType.READ, ActionType.UPDATE}
    
    def visible_fields(self, request, model):
        return {"id", "name", "email"}

# Combined permissions
registry.register(
    MyModel,
    ModelConfig(
        model=MyModel,
        permissions=[ReadOnlyPermission, OwnerPermission],
    ),
)

# Result for a user:
# - Actions: {READ, UPDATE} (union of both)
# - Fields: {"id", "name", "email"} (union of both)
# - Queryset: filtered by ReadOnlyPermission, then by OwnerPermission
```

### ⚠️ Security Considerations

**Field Access with `"__all__"`**: If any permission returns `"__all__"` for fields, all fields become accessible:

```python
class AdminPermission(AbstractPermission):
    def visible_fields(self, request, model):
        return "__all__"  # This overrides all field restrictions

class RestrictedPermission(AbstractPermission):
    def visible_fields(self, request, model):
        return {"id", "name"}  # This gets ignored due to "__all__" above

# Result: All fields are visible due to AdminPermission
```

## Combining Multiple Permissions

You can apply multiple permission classes to a single model. StateZero will combine their effects:

```python
registry.register(
    MyModel,
    ModelConfig(
        model=MyModel,
        permissions=[IsAuthenticatedPermission, OwnerOnlyPermission],
    ),
)
```

When multiple permissions are applied:
- **Actions**: A user needs permission from at least one permission class
- **Fields**: The union of all allowed fields from all permission classes
- **Querysets**: All permission classes filter the queryset sequentially
- **Bulk Operations**: At least one permission class must allow the bulk operation

## Permission Checking in Practice

### Global Permission Checks

StateZero automatically checks global permissions when processing requests:

```python
# This happens automatically in RequestProcessor
requested_actions = get_requested_action_types(query)
allowed_global_actions = set()

for permission_cls in model_config.permissions:
    allowed_global_actions |= permission_cls().allowed_actions(req, model)

if not requested_actions.issubset(allowed_global_actions):
    raise PermissionDenied("Missing global permissions")
```

### Object-Level Permission Checks

For operations on specific objects, StateZero checks object-level permissions:

```python
# Example from update operations
for perm_cls in permissions:
    perm = perm_cls()
    allowed = perm.allowed_object_actions(req, instance, model)
    if ActionType.UPDATE not in allowed:
        raise PermissionDenied(f"Update not permitted on {instance}")
```

### Field-Level Permission Checks

Field permissions are enforced during serialization and validation:

```python
# Example of field filtering
def _filter_writable_data(data, req, model, model_config, create=False):
    allowed_fields = set()
    
    for permission_cls in model_config.permissions:
        if create:
            permission_fields = permission_cls().create_fields(req, model)
        else:
            permission_fields = permission_cls().editable_fields(req, model)
        
        if permission_fields == "__all__":
            permission_fields = orm_provider.get_fields(model)
        
        allowed_fields |= permission_fields
    
    return {k: v for k, v in data.items() if k in allowed_fields}
```

### Bulk Permission Optimization Examples

Here are practical examples of how to optimize bulk permissions for different scenarios:

#### Department-Based Access

```python
class DepartmentPermission(AbstractPermission):
    def bulk_operation_allowed(self, request, items, action_type, model):
        """
        Efficient check: ensure all items belong to user's department.
        """
        if not hasattr(request.user, 'department'):
            return False
        
        # Single query to verify all items are in user's department
        user_dept_count = items.filter(department=request.user.department).count()
        return user_dept_count == items.count()
```

#### Time-Based Permissions

```python
class TimeBasedPermission(AbstractPermission):
    def bulk_operation_allowed(self, request, items, action_type, model):
        """
        Only allow bulk operations during business hours.
        """
        from datetime import datetime, time
        
        now = datetime.now().time()
        business_start = time(9, 0)  # 9 AM
        business_end = time(17, 0)   # 5 PM
        
        if business_start <= now <= business_end:
            return True
        
        # Outside business hours, only allow read operations
        return action_type == ActionType.READ
```

#### Status-Based Bulk Operations

```python
class StatusBasedPermission(AbstractPermission):
    def bulk_operation_allowed(self, request, items, action_type, model):
        """
        Only allow bulk modifications on items with 'draft' status.
        """
        if action_type == ActionType.READ:
            return True
        
        # For write operations, check if all items are in draft status
        if hasattr(model, 'status'):
            draft_count = items.filter(status='draft').count()
            return draft_count == items.count()
        
        return False
```

## Configuration Settings

Several Django settings control permission behavior:

```python
# settings.py

# Permission class for view access (schema, model list endpoints)
STATEZERO_VIEW_ACCESS_CLASS = "rest_framework.permissions.IsAuthenticated"

# Query timeout in milliseconds
STATEZERO_QUERY_TIMEOUT_MS = 1000
```

### Query Timeout: Critical DDoS Protection

The `STATEZERO_QUERY_TIMEOUT_MS` setting is a crucial security feature that prevents resource exhaustion attacks. Without query timeouts, attackers could easily overwhelm your server with expensive queries.

#### How Query Timeout Works

StateZero implements query timeouts through a database-level context manager that sets PostgreSQL statement timeouts:

```python
# Automatically applied to all StateZero requests
@transaction.atomic
def post(self, request, model_name):
    timeout_ms = getattr(settings, 'STATEZERO_QUERY_TIMEOUT_MS', 1000)
    with config.context_manager(timeout_ms):
        result = processor.process_request(req=request)
```

#### Attack Prevention

Without query timeouts, attackers could craft malicious queries that:

**Complex Query Attacks:**
- Deep relationship traversals (`user__profile__department__company__industry__...`)
- Large result sets without pagination
- Complex filtering with multiple joins
- Aggregations on unindexed fields

**Resource Exhaustion:**
- **CPU**: Complex calculations and joins
- **Memory**: Large result sets and temporary tables  
- **I/O**: Disk reads for large table scans
- **Database Connections**: Holding connections while queries run

**Attack Example:**
```javascript
// Malicious query that could run for minutes without timeout
await MyModel.objects.filter({
  'related1__related2__related3__field': 'value',
  'other_field__icontains': 'search_term_forcing_full_scan'
}).fetch()
```

#### Timeout Configuration

Adjust timeouts based on your security requirements:

```python
# settings.py

# Strict timeout for high-traffic public APIs
STATEZERO_QUERY_TIMEOUT_MS = 500

# Relaxed timeout for internal admin interfaces  
STATEZERO_QUERY_TIMEOUT_MS = 5000

# Very strict for untrusted user input
STATEZERO_QUERY_TIMEOUT_MS = 200
```

#### Why Database-Level Timeouts

StateZero uses database-level timeouts (`statement_timeout`) rather than application timeouts because:

- **Resource Protection**: Database resources are freed immediately when timeout triggers
- **Connection Cleanup**: Prevents hanging database connections  
- **Memory Management**: Database can clean up intermediate results
- **Precision**: More accurate timing than application-level timeouts

#### Layered Security Approach

Query timeouts work best combined with:

1. **Rate Limiting**: Limit requests per user/IP
2. **Authentication**: Require valid users for complex operations
3. **Permissions**: Restrict access to sensitive models (covered in this guide)
4. **Pagination**: Enforce reasonable result set sizes
5. **Query Optimization**: Use proper indexing and query planning

The 1-second default timeout ensures that even the most expensive query will be terminated within a predictable timeframe, maintaining application availability for legitimate users while preventing trivial DDoS attacks.

## Error Handling

When permissions are violated, StateZero raises `PermissionDenied` exceptions:

```python
from statezero.core.exceptions import PermissionDenied

try:
    # Attempt operation
    result = MyModel.objects.create(name="test")
except PermissionDenied as e:
    # Handle permission error
    print(f"Permission denied: {e}")
```

## ⚠️ Performance Considerations

### Default Bulk Permission Implementation

The default `bulk_operation_allowed` implementation can be slow for large datasets:

```python
# ❌ Default implementation - potential performance issue
def bulk_operation_allowed(self, request, items, action_type, model):
    for obj in items:  # This iterates through every object in Python
        object_level_perms = self.allowed_object_actions(request, obj, model)
        if action_type not in object_level_perms:
            return False
    return True
```

**Always override this method for production use** with database-level checks:

```python
# ✅ Optimized implementation - single database query
class OptimizedOwnerPermission(AbstractPermission):
    def bulk_operation_allowed(self, request, items, action_type, model):
        if not request.user.is_authenticated:
            return False
        
        # Single database query instead of Python iteration
        owned_count = items.filter(owner=request.user).count()
        total_count = items.count()
        return owned_count == total_count
```

### Permission Caching for Expensive Calculations

For complex permission logic, implement caching:

```python
from django.core.cache import cache

class CachedPermission(AbstractPermission):
    def allowed_actions(self, request, model):
        cache_key = f"perms:{request.user.id}:{model._meta.label}"
        actions = cache.get(cache_key)
        if actions is None:
            actions = self._calculate_expensive_permissions(request, model)
            cache.set(cache_key, actions, timeout=300)  # 5 minutes
        return actions
    
    def _calculate_expensive_permissions(self, request, model):
        # Your expensive permission logic here
        return {ActionType.READ, ActionType.UPDATE}
```

### Automatic Query Optimization

StateZero automatically optimizes queries using `select_related` and `prefetch_related` based on the requested fields and relationships. You don't need to manually optimize querysets in most cases:

```python
class SimplePermission(AbstractPermission):
    def filter_queryset(self, request, queryset):
        # StateZero will automatically optimize this based on requested fields
        return queryset.filter(owner=request.user)
        
    # StateZero handles the complex query optimization automatically
    # No need to manually add select_related() or prefetch_related()
```
## Best Practices

### General Guidelines

1. **Start Restrictive**: Begin with strict permissions and gradually open access
2. **Layer Permissions**: Use multiple permission classes for complex scenarios
3. **Test Thoroughly**: Test all permission combinations with different user types
4. **Security First**: Never rely solely on frontend validation - always enforce permissions on the backend

### Bulk Operation Optimization

1. **Override bulk_operation_allowed**: Always implement efficient bulk checks for better performance
2. **Use Database Queries**: Leverage database filtering instead of iterating through objects in Python
3. **Consider Queryset Filtering**: Remember that `filter_queryset` is applied before bulk operations
4. **Cache Permission Results**: For expensive permission calculations, consider caching results

### Performance Considerations

1. **Queryset Filtering**: Use `filter_queryset` to reduce the dataset early
2. **Database-Level Checks**: Perform permission logic at the database level when possible
3. **Avoid N+1 Queries**: Use `select_related` and `prefetch_related` in permission logic
4. **Monitor Performance**: Profile permission checks with large datasets

## Advanced Features

### Multi-Tenancy with Django Models

For multi-tenant applications, combine StateZero permissions with tenant fields on your models:

```python
# models.py
class TenantBase(models.Model):
    tenant = models.ForeignKey('Tenant', on_delete=models.CASCADE)
    
    class Meta:
        abstract = True

class MyModel(TenantBase):
    name = models.CharField(max_length=100)
    # tenant field inherited from TenantBase

# permissions.py
class TenantPermission(AbstractPermission):
    def filter_queryset(self, request, queryset):
        if not hasattr(request.user, 'tenant'):
            return queryset.none()
        # Automatically filter to user's tenant
        return queryset.filter(tenant=request.user.tenant)
    
    def allowed_actions(self, request, model):
        if not hasattr(request.user, 'tenant'):
            return set()
        return {ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE}
    
    def allowed_object_actions(self, request, obj, model):
        if not hasattr(request.user, 'tenant'):
            return set()
        # Only allow actions on objects in user's tenant
        if hasattr(obj, 'tenant') and obj.tenant == request.user.tenant:
            return {ActionType.READ, ActionType.UPDATE, ActionType.DELETE}
        return set()
    
    def bulk_operation_allowed(self, request, items, action_type, model):
        if not hasattr(request.user, 'tenant'):
            return False
        
        # Ensure all items belong to user's tenant
        if hasattr(model, 'tenant'):
            tenant_count = items.filter(tenant=request.user.tenant).count()
            return tenant_count == items.count()
        return False
    
    def visible_fields(self, request, model):
        return "__all__"
    
    def editable_fields(self, request, model):
        return "__all__"
    
    def create_fields(self, request, model):
        return "__all__"

# Usage in model config
registry.register(
    MyModel,
    ModelConfig(
        model=MyModel,
        permissions=[TenantPermission],
        # Auto-assign tenant on creation
        pre_hooks=[
            lambda data, request, **kwargs: data.update({'tenant': request.user.tenant})
        ]
    ),
)
```

This approach provides strong tenant isolation while working naturally with Django's ORM and StateZero's permission system.

### Custom Querysets with Permissions

Custom querysets work seamlessly with the permission system:

```python
class MyCustomQueryset(AbstractCustomQueryset):
    def get_queryset(self, request):
        qs = MyModel.objects.filter(status='active')
        # Permissions will be applied automatically after this
        return qs
```

This guide covers the essential aspects of StateZero's permission system, with special emphasis on bulk operations and performance optimization. For more complex scenarios, refer to the source code examples and test cases in the StateZero repository.