# StateZero Hooks Documentation

Hooks in StateZero provide a mechanism to automatically populate fields that require server-side context during data operations. The primary use case is for fields that cannot be set from the frontend because they depend on request context, such as tenant IDs, user IDs, timestamps, or other server-side computed values.

## Primary Use Case

**The main purpose of hooks is to handle fields that require request context** - information that's only available on the server side and shouldn't be trusted from the client. This is essential for:

- **Multi-tenancy**: Automatically setting tenant/organization IDs based on the authenticated user
- **User tracking**: Setting `created_by`, `modified_by` fields from the request user
- **Security**: Ensuring sensitive fields are set server-side, not from client data
- **Audit trails**: Automatically capturing request metadata (IP, timestamp, etc.)

## Overview

StateZero supports two types of hooks:

- **Pre-hooks**: Execute before serialization/deserialization - ideal for setting context-dependent fields
- **Post-hooks**: Execute after serialization/deserialization - useful for generating computed values

Hooks are configured per model and are executed automatically during CRUD operations initiated through the StateZero API.

## Hook Types

### Pre-hooks

Pre-hooks run **before** the data is serialized or validated. They receive the raw incoming data and can modify it before it goes through validation and processing.

**Primary use cases:**
- **Setting tenant/organization IDs** from the authenticated user's context
- **Setting user tracking fields** (`created_by`, `modified_by`) from the request
- **Security enforcement** - ensuring sensitive fields are set server-side
- **Request-based defaults** that depend on user permissions or context

### Post-hooks

Post-hooks run **after** the data has been validated and processed. They receive the validated data and can perform additional transformations or side effects.

**Primary use cases:**
- **Generating unique identifiers** that require validated data
- **Computing derived values** based on the final validated data
- **Audit logging** with complete context
- **Side effects** that should only occur after successful validation

## Configuration

Hooks are configured when registering models with StateZero using the `ModelConfig` class:

```python
from statezero.core.config import ModelConfig
from statezero import register_model

# Primary use case: Setting tenant-specific and user-specific fields
def set_tenant_and_user_context(data, request=None):
    """Pre-hook to set tenant and user fields from request context"""
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        # Set tenant ID from user's organization
        if hasattr(request.user, 'tenant_id'):
            data['tenant_id'] = request.user.tenant_id
        
        # Set user tracking fields
        data['created_by'] = request.user.id
        data['created_by_username'] = request.user.username
        
        # Set user's department/role context if available
        if hasattr(request.user, 'department'):
            data['department'] = request.user.department
    
    return data

def set_security_context(data, request=None):
    """Pre-hook to set security-related fields"""
    if request:
        # Capture request metadata for audit trails
        data['created_from_ip'] = get_client_ip(request)
        data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
        
        # Set timestamp (server-side to prevent client manipulation)
        from datetime import datetime
        data['created_at'] = datetime.now()
    
    return data

def generate_tenant_specific_id(validated_data, request=None):
    """Post-hook to generate tenant-specific unique identifiers"""
    if request and hasattr(request.user, 'tenant_id'):
        tenant_id = request.user.tenant_id
        # Generate ID that includes tenant context
        validated_data['reference_number'] = f"T{tenant_id}-{generate_unique_id()}"
    
    return validated_data

# Register model with context-aware hooks
register_model(
    Order,
    ModelConfig(
        model=Order,
        pre_hooks=[set_tenant_and_user_context, set_security_context],
        post_hooks=[generate_tenant_specific_id],
        # ... other configuration options
    )
)
```

## Hook Function Signature

All hook functions must follow a consistent signature:

```python
def hook_function(data, request=None):
    """
    Hook function template
    
    Args:
        data (dict): The data being processed
        request (Optional): Django request object (if available)
        
    Returns:
        dict: Modified data
    """
    # Your processing logic here
    return data
```

### Parameters

- **data**: Dictionary containing the model data being processed
- **request**: Optional Django request object providing access to user context, headers, etc.

### Return Value

Hook functions **must** return the (potentially modified) data dictionary.

## Execution Flow

The hooks are executed during the serialization process in the Django backend:

```python
# Pre-hooks execution (in DjangoSerializationProvider.validate)
try:
    model_config = registry.get_config(model)
    if model_config.pre_hooks:
        for hook in model_config.pre_hooks:
            data = hook(data, request=request)
except ValueError:
    # No model config available - continue without hooks
    pass

# Validation occurs here...

# Post-hooks execution
if model_config and model_config.post_hooks:
    for hook in model_config.post_hooks:
        validated_data = hook(validated_data, request=request)
```

## Common Use Cases and Examples

### 1. Multi-Tenant Data Isolation

The most common use case - ensuring all data is automatically associated with the correct tenant:

```python
def set_tenant_context(data, request=None):
    """Automatically set tenant ID from authenticated user"""
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        # Multi-tenant setup: user belongs to an organization/tenant
        if hasattr(request.user, 'tenant'):
            data['tenant_id'] = request.user.tenant.id
        else:
            raise ValueError("User must belong to a tenant/organization")
    else:
        raise ValueError("Authentication required for tenant-aware operations")
    
    return data
```

### 2. User Tracking and Audit Fields

Automatically capture who performed the operation:

```python
def set_user_tracking(data, request=None):
    """Set user tracking fields from request context"""
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
        
        # Always set the current user as modifier
        data['created_by'] = user.id
        data['modified_by'] = user.id
        
        # Set server-side timestamp (cannot be manipulated by client)
        from datetime import datetime
        data['created_at'] = datetime.now()
    
    return data
```

## Best Practices

### 1. Keep Hooks Focused on Request Context

Each hook should focus on setting fields that require server-side context:

```python
# Good: Focuses on tenant and user context
def set_tenant_and_user(data, request=None):
    if request and request.user.is_authenticated:
        data['tenant_id'] = request.user.tenant.id
        data['created_by'] = request.user.id
    return data

# Avoid: Mixing concerns
def process_everything(data, request=None):
    # Tenant setting + validation + external API calls + formatting
    pass
```

### 2. Handle Authentication Requirements

Always check for proper authentication when hooks require user context:

```python
def require_auth_hook(data, request=None):
    if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
        raise ValueError("Authentication required for this operation")
    
    # Your context-dependent logic here
    return data
```

### 3. Use Request Context Appropriately

Leverage the information only available server-side:

```python
def context_aware_hook(data, request=None):
    if request and request.user.is_authenticated:
        user = request.user
        
        # Use organizational context
        data['tenant_id'] = user.tenant.id
        data['department'] = user.profile.department
        
        # Apply user-specific business rules
        if user.has_perm('app.can_create_premium_orders'):
            data['priority_level'] = 'high'
    
    return data
```

## Advanced Patterns

### Conditional Tenant-Based Processing

```python
def tenant_aware_processing(data, request=None):
    """Processing that depends on tenant context"""
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        tenant = request.user.tenant
        
        # Tenant-specific business rules
        if tenant.subscription_tier == 'premium':
            data['processing_priority'] = 'high'
        else:
            data['processing_priority'] = 'standard'
        
        # Set tenant-specific defaults
        data['currency'] = tenant.default_currency
        data['region'] = tenant.primary_region
    
    return data
```

### 3. External Service Integration

```python
def external_service_hook(validated_data, request=None):
    """Integrate with external services"""
    try:
        # Call external API for additional data
        external_data = fetch_external_data(validated_data['id'])
        validated_data['external_reference'] = external_data['reference_id']
    except Exception as e:
        # Handle external service failures gracefully
        validated_data['external_reference'] = None
        logging.warning(f"External service call failed: {e}")
    
    return validated_data
```

## Troubleshooting

### Common Issues

1. **Hook not executing**: Ensure the model is properly registered with the hook configuration
2. **Data not persisting**: Verify that hooks return the modified data
3. **Validation errors**: Pre-hooks run before validation, so ensure data format is correct
4. **Performance issues**: Avoid expensive operations in hooks;

### Debugging

```python
def debug_hook(data, request=None):
    """Hook with debugging information"""
    import logging
    
    logging.info(f"Hook received data: {data}")
    logging.info(f"Request user: {getattr(request, 'user', 'None')}")
    
    # Your processing logic
    result = process_data(data)
    
    logging.info(f"Hook returning data: {result}")
    return result
```

## When NOT to Use Hooks

Hooks should **not** be used for:

1. **Simple data validation** - Use Django model validation or serializer validation instead
2. **Data formatting that can be done client-side** - Handle in the frontend when possible
3. **Business logic that doesn't require request context** - Consider custom model methods
4. **Heavy computational tasks** - Use background tasks instead
5. **Operations that can fail** - Hooks should be reliable and fast

**Use hooks specifically when you need access to the authenticated user, tenant context, or other request-specific information that cannot be provided by the client.**

## Conclusion

Hooks are specifically designed to solve the problem of **server-side context injection** in StateZero applications. Their primary value is in multi-tenant applications and scenarios where you need to automatically populate fields based on the authenticated user's context, permissions, or organizational membership.

Remember:
- Use hooks when you need request context (user, tenant, permissions)
- Keep hooks fast and reliable 
- Focus on security-sensitive fields that must be set server-side
- Test thoroughly to ensure tenant isolation and security
- Document the request context requirements for your hooks