# Actions

Actions provide a streamlined way to create custom server-side business logic and expose it to the frontend as easily callable, type-safe functions. It's like creating simplified RPC (Remote Procedure Call) endpoint or a DRF Function Based View. The process involves defining a Python function in your Django backend, decorating it, and then running a command-line tool to automatically generate a corresponding TypeScript function for your frontend. It doesn't do any magic, it just streamlines the development process by allowing you to expose all the models and actions through the StateZero workflow. Under the hood, actions are simple DRF views.

## 1\. Creating an Action (Backend)

Actions are created in your Django project by decorating a Python function with the `@action` decorator. The function must be located within an installed Django app in an actions.py file for it to be discoverable. If you want to place the action somewhere else, just make sure to manually import the file e.g in your apps.py

### Basic Usage

The simplest action is a Python function with the `@action` decorator. The function's name automatically becomes the action's unique identifier.

```python
# In any file within a Django app, e.g., my_app/actions.py

from statezero.core.actions import action

@action
def send_welcome_email(user_id: int, request=None):
    """
    Finds a user and sends them a welcome email.
    This docstring will be used for auto-generated documentation.
    """
    # ... your logic here ...
    print(f"Sending email to user {user_id}")
    return {"status": "success", "message": f"Email sent to user {user_id}."}

```

### Decorator Parameters

The `@action` decorator accepts several arguments to add validation, permission controls, and extra metadata.

  * **`name: str`** (Optional): Overrides the function name as the action's identifier. This is useful for preventing name collisions.
  * **`serializer`**: A Django Rest Framework (DRF) serializer class to validate the incoming data payload.
  * **`response_serializer`**: A DRF serializer class to validate and serialize the action's return value.
  * **`permissions: list`**: A list of permission classes that control access to the action.
  * **`docstring: str`** (Optional): An explicit docstring to use for documentation, which will take precedence over the function's own `__doc__`.

### Securing Actions with Permissions 🔐

You can control who can execute an action by passing a list of permission classes to the `permissions` argument. This provides a robust, two-step validation process.

Permission classes must inherit from `AbstractActionPermission` and implement two methods: `has_permission` and `has_action_permission`.

```python
# statezero.core.interfaces.AbstractActionPermission

class AbstractActionPermission(ABC):
    """Permission class for StateZero actions."""

    @abstractmethod
    def has_permission(self, request, action_name: str) -> bool:
        """View-level check before validation."""
        pass

    @abstractmethod
    def has_action_permission(self, request, action_name: str, validated_data: dict) -> bool:
        """Action-level check after validation."""
        pass
```

1.  **`has_permission(request, action_name)`**: This check runs **before** the input data is validated. It's ideal for broad, general checks, such as verifying that a user is authenticated. If it returns `False`, the request is immediately rejected.

2.  **`has_action_permission(request, action_name, validated_data)`**: This check runs **after** the input data has been successfully validated by the serializer. It's designed for specific, data-dependent checks (i.e., object-level permissions), as it gives you access to the `validated_data` dictionary.

#### Example Implementation

Let's create a permission class that first checks if a user is logged in, and then checks if they are authorized to create an invoice for a specific customer.

```python
# my_app/permissions.py

from statezero.core.interfaces import AbstractActionPermission
from customers.models import Customer # A hypothetical Customer model

class CanManageInvoice(AbstractActionPermission):
    
    def has_permission(self, request, action_name: str) -> bool:
        # Step 1: General check. Is the user logged in?
        return request.user and request.user.is_authenticated

    def has_action_permission(self, request, action_name: str, validated_data: dict) -> bool:
        # Step 2: Specific check using validated data.
        # Does the customer belong to the user's organization?
        customer_id = validated_data.get("customer_id")
        if not customer_id:
            return False # Should be caught by serializer, but a good safeguard
            
        try:
            customer = Customer.objects.get(pk=customer_id)
            return customer.organization == request.user.organization
        except Customer.DoesNotExist:
            return False
```

You would then apply this permission class to your action's decorator.

```python
# my_app/actions.py

from .permissions import CanManageInvoice
from .serializers import CreateInvoiceInputSerializer, CreateInvoiceResponseSerializer

@action(
    name="invoicing_create_invoice",
    serializer=CreateInvoiceInputSerializer,
    response_serializer=CreateInvoiceResponseSerializer,
    permissions=[CanManageInvoice] # <-- Add permissions here
)
def create_invoice(customer_id, amount, is_urgent, request=None):
    """Creates a new invoice for a given customer."""
    # ... function logic ...
```

Now, when this action is called, the permission checks run in sequence, providing layered security before your core business logic is ever executed.

## 2\. Generating the Frontend Client

After defining actions in the backend, you generate corresponding client-side functions using the StateZero CLI.

From your frontend project's root directory, run:

```bash
npx statezero-cli sync-actions
```

The CLI connects to your backend's `/actions-schema/` endpoint, fetches a list of all available actions, and presents an interactive prompt for you to select which ones to generate.

The tool then generates the necessary JavaScript (`.js`) and TypeScript declaration (`.d.ts`) files inside your configured `GENERATED_ACTIONS_DIR`. The files are automatically organized into subdirectories based on the Django app they belong to.

```
/src/generated-actions
├── general/
│   ├── send-welcome-email.d.ts
│   └── send-welcome-email.js
├── invoicing/
│   ├── invoicing-create-invoice.d.ts
│   └── invoicing-create-invoice.js
└── index.js
```

-----

## 3\. Using an Action (Frontend)

The generated files provide fully-typed functions that you can import directly into your frontend code.

```typescript
import { invoicingCreateInvoice } from '../generated-actions/invoicing';

async function handleCreateInvoice() {
  try {
    const response = await invoicingCreateInvoice({
      customerId: 123,
      amount: "99.99", // Note: DecimalField is treated as a string
      isUrgent: true,
    });
    
    // The response is fully typed based on the response_serializer
    console.log('Invoice created successfully!', response.invoiceId);
    // response.status -> "created"
    
  } catch (error) {
    // StateZero errors are automatically parsed into a helpful format
    console.error('Failed to create invoice:', error.message);
  }
}
```

The generated function handles everything for you:

  * Making the `axios` POST request to the correct backend endpoint (e.g., `/actions/invoicing_create_invoice/`).
  * Sending the parameters as the request payload.
  * Ensuring type safety for both inputs and the returned `Promise`.
  * Validating the server's response against the expected schema using Zod.
  * Parsing and throwing structured errors for easy debugging.

## The End-to-End Flow

1.  **Define (Backend)**: Define a Python function and decorates it with `@action` in a Django app.
2.  **Expose Schema (Backend)**: The Django backend automatically exposes a schema of this action at the `/actions-schema/` endpoint, detailing its name, parameters, permissions, and documentation.
3.  **Generate Client (Frontend)**: The `syncActions` CLI command reads this schema and generates a corresponding TypeScript function in the frontend project.
4.  **Call (Frontend)**: A frontend developer imports and calls the generated function as if it were a local async function.
5.  **Execute (Backend)**: The generated function makes a `POST` request. The `ActionView` on the server finds the corresponding Python function, checks permissions, validates data with the specified DRF serializer, executes the logic, and returns the result.
6.  **Receive Response (Frontend)**: The frontend receives the response within the `Promise`, with types and data structure automatically validated.