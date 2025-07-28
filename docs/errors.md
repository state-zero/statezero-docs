# Error Handling Guide

StateZero automatically translates Django exceptions into JavaScript exceptions with the same structure and meaning. When your Django backend raises an error, it appears as the corresponding JavaScript error in your frontend code.

## Error Types

### ValidationError

Raised when Django model validation fails during create/update operations.

```javascript
import { ValidationError } from '@statezero/core';

try {
  const user = await User.objects.create({
    email: 'invalid-email',  // Invalid email format
    age: -5                  // Negative age
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.detail);
    // Output:
    // {
    //   email: [{ message: "Enter a valid email address", code: "invalid" }],
    //   age: [{ message: "Ensure this value is greater than or equal to 0", code: "min_value" }]
    // }
  }
}
```

**Corresponds to Django's `ValidationError` and serializer validation errors.**

### DoesNotExist

Raised when a requested object cannot be found.

```javascript
import { DoesNotExist } from '@statezero/core';

try {
  const user = await User.objects.get({ id: 99999 });
} catch (error) {
  if (error instanceof DoesNotExist) {
    console.log(error.message); // "User matching query does not exist"
  }
}
```

**Corresponds to Django's `Model.DoesNotExist` exception.**

### MultipleObjectsReturned

Raised when `.get()` finds multiple objects but expected only one.

```javascript
import { MultipleObjectsReturned } from '@statezero/core';

try {
  const user = await User.objects.get({ name: 'John' }); // Multiple Johns exist
} catch (error) {
  if (error instanceof MultipleObjectsReturned) {
    console.log(error.message); // "Multiple User objects returned"
  }
}
```

**Corresponds to Django's `Model.MultipleObjectsReturned` exception.**

### PermissionDenied

Raised when the user lacks permission for the requested operation.

```javascript
import { PermissionDenied } from '@statezero/core';

try {
  await AdminSettings.objects.filter({ id: 1 }).delete();
} catch (error) {
  if (error instanceof PermissionDenied) {
    console.log(error.message); // "Delete operation not permitted"
  }
}
```

**Triggered by StateZero's permission system when user lacks required permissions.**

### ASTValidationError

Raised when query syntax is invalid.

```javascript
import { ASTValidationError } from '@statezero/core';

try {
  const users = await User.objects.filter({ 
    'invalid__lookup__chain': 'value'  // Invalid field lookup
  }).fetch();
} catch (error) {
  if (error instanceof ASTValidationError) {
    console.log(error.message); // "Invalid field lookup: invalid__lookup__chain"
  }
}
```

**Indicates malformed query syntax - typically a programming error.**

### NetworkError

Raised when network communication fails.

```javascript
import { NetworkError } from '@statezero/core';

try {
  const users = await User.objects.all().fetch();
} catch (error) {
  if (error instanceof NetworkError) {
    console.log(error.message); // "Network request failed"
  }
}
```

**Indicates connectivity issues between frontend and backend.**

## Error Structure

All StateZero errors follow Django's error structure:

```javascript
{
  status_code: 400,           // HTTP status code
  detail: "Error details",    // Error information (matches Django format)
  code: "validation_error"    // Error type identifier
}
```

### Error Detail Formats

**Simple string errors:**
```javascript
{
  detail: "User matching query does not exist",
  code: "not_found"
}
```

**Field validation errors (matches Django serializer format):**
```javascript
{
  detail: {
    email: [
      { message: "This field is required", code: "required" }
    ],
    password: [
      { message: "Password must be at least 8 characters", code: "min_length" }
    ]
  },
  code: "validation_error"
}
```

**Non-field errors:**
```javascript
{
  detail: {
    non_field_errors: [
      { message: "Email and username cannot be the same", code: "unique_together" }
    ]
  },
  code: "validation_error"
}
```

## Error Detection and Flow

StateZero errors are primarily detected server-side and flow through promises. All errors come from the Django backend and are translated to corresponding JavaScript exceptions:

```javascript
// All errors flow through the promise when server responds
const userPromise = User.objects.create({ email: 'invalid@' });

userPromise.catch(error => {
  if (error instanceof ValidationError) {
    console.log("Server validation failed:", error.detail);
  } else if (error instanceof PermissionDenied) {
    console.log("Server denied permission:", error.message);
  }
});
```

::: tip Future Enhancement
In future versions, StateZero will include comprehensive client-side validation using the generated Django schema. This will enable immediate error detection for invalid field names, type mismatches, and constraint violations before any server communication, providing faster feedback and reducing unnecessary network requests.
:::

## How Errors Work with Optimistic Updates

StateZero handles errors differently depending on whether you use optimistic (immediate) or confirmed (await) operations:

### Optimistic Operations (No await)

When you don't use `await`, operations happen optimistically - the UI updates immediately, then syncs with the server in the background:

```javascript
// UI updates immediately, error handling happens in background
const newUser = User.objects.create({ email: 'invalid' });

// Handle the error when it occurs
newUser.catch(error => {
  if (error instanceof ValidationError) {
    // The user was temporarily shown in UI but will be automatically removed
    console.log("Creation failed:", error.detail);
  }
});

// Update operations
user.name = "New Name";
user.save().catch(error => {
  // Changes are automatically reverted in the UI if the save fails
  console.log("Update failed:", error.detail);
});

// Delete operations  
user.delete().catch(error => {
  // User is automatically restored to UI if delete fails
  console.log("Delete failed:", error.detail);
});
```

### Confirmed Operations (With await)

When you use `await`, operations wait for server confirmation before updating the UI:

```javascript
try {
  // Wait for server confirmation before any UI changes
  const confirmedUser = await User.objects.create({ email: 'invalid' });
} catch (error) {
  // Handle error before any UI updates occur
  if (error instanceof ValidationError) {
    console.log("Creation failed:", error.detail);
  }
}
```

## Error Propagation

Errors automatically propagate through StateZero's reactive system:

```javascript
// Live queryset will automatically update when errors occur
const users = User.objects.all(); // Returns immediately with current data

// Create a user optimistically
const newUser = User.objects.create({ name: "Test" });

// If creation fails, newUser is automatically removed from the users queryset
newUser.catch(error => {
  console.log("User creation failed, automatically removed from UI");
});
```

## Framework Integration

### Vue.js

StateZero errors work seamlessly with Vue's reactivity:

```vue
<script setup>
import { ref } from 'vue';
import { User } from './models/User';
import { ValidationError } from '@statezero/core';

const error = ref(null);

async function createUser(userData) {
  try {
    error.value = null;
    await User.objects.create(userData);
  } catch (err) {
    if (err instanceof ValidationError) {
      error.value = err.detail;
    }
  }
}
</script>

<template>
  <div v-if="error" class="error">
    <div v-for="(fieldErrors, field) in error" :key="field">
      {{ field }}: {{ fieldErrors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
```

StateZero's error system ensures that Django validation rules and error messages appear identically in your frontend application, maintaining consistency across your full stack.