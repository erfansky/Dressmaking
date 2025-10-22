from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models


# --- Customer ---
class Customer(models.Model):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(
        max_length=11,
        unique=True,           # uniqueness is still enforced if phone is provided
        null=True, 
        blank=True,            # allow empty phone numbers
        validators=[
            RegexValidator(
                regex=r'^0\d{10}$',  # Must start with 0 and have exactly 11 digits
                message="Phone number must start with 0 and be exactly 11 digits."
            )
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Ensure first and last names are not empty or just spaces
        if not self.first_name.strip():
            raise ValidationError({"first_name": "First name cannot be empty."})
        if not self.last_name.strip():
            raise ValidationError({"last_name": "Last name cannot be empty."})

        # Allow only Persian/English letters, spaces, or hyphens
        for field, value in [("first_name", self.first_name), ("last_name", self.last_name)]:
            if not all(ch.isalpha() or ch in " -" for ch in value):
                raise ValidationError({field: "Name must only contain letters, spaces, or hyphens."})

        # Validate phone only if provided
        if self.phone:
            if not self.phone.startswith("0") or len(self.phone) != 11 or not self.phone.isdigit():
                raise ValidationError({"phone": "Phone number must start with 0 and be exactly 11 digits."})

        super().clean()

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


# --- Product ---
class Product(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    def clean(self):
        """Ensure name is not empty or just whitespace."""
        if not self.name or not self.name.strip():
            raise ValidationError({"name": "Product name cannot be empty."})
        super().clean()

class ProductProperty(models.Model):
    VALUE_TYPE_CHOICES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('dropdown', 'Dropdown'),
    ]

    product = models.ForeignKey(Product, related_name="properties", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    value_type = models.CharField(max_length=20, choices=VALUE_TYPE_CHOICES)
    possible_values = models.JSONField(blank=True, null=True)  # Used for dropdown options
    is_customer_specific = models.BooleanField(default=False)  # Whether this property is specific to a customer or order specific
    
    def clean(self):
        if not self.name or not self.name.strip():
            raise ValidationError({"name": "Property name cannot be empty."})

        if self.value_type == "dropdown":
            if not self.possible_values or not isinstance(self.possible_values, list):
                raise ValidationError({"possible_values": "Dropdown properties must define a non-empty list of options."})
            for val in self.possible_values:
                if not isinstance(val, str):
                    raise ValidationError({"possible_values": "All dropdown options must be strings."})
        else:
            # For text/number, possible_values must not be used
            if self.possible_values not in (None, [], {}):
                raise ValidationError({"possible_values": "Only dropdown properties can define possible values."})

        super().clean()

    def __str__(self):
        return f"{self.product.name}: {self.name} ({self.value_type})"
    
    
    


# --- FIXED CustomerProductProperty ---
class CustomerProductProperty(models.Model):
    customer = models.ForeignKey(Customer, related_name="product_properties", on_delete=models.CASCADE)
    property = models.ForeignKey(ProductProperty, on_delete=models.CASCADE)
    value = models.JSONField()  # flexible: number, text, or dropdown choice

    class Meta:
        unique_together = ("customer", "property")

    def clean(self):
        # Enforce only customer-specific properties can be stored here
        if not self.property.is_customer_specific:
            raise ValidationError(
                {"property": f"Property '{self.property.name}' is not customer-specific and cannot be stored here."}
            )

        # Type validation
        if self.property.value_type == "number":
            if not isinstance(self.value, (int, float)):
                raise ValidationError({"value": f"{self.property.name} must be a number"})
        elif self.property.value_type == "text":
            if not isinstance(self.value, str):
                raise ValidationError({"value": f"{self.property.name} must be text"})
        elif self.property.value_type == "dropdown":
            if not isinstance(self.value, str) or self.value not in (self.property.possible_values or []):
                raise ValidationError(
                    {"value": f"Invalid choice for {self.property.name}, must be one of {self.property.possible_values}"}
                )

        super().clean()

    def __str__(self):
        return f"{self.customer}: {self.property.name} = {self.value}"  
    
    


# --- FIXED Order and OrderItem ---
class Order(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'IN_PROGRESS'),
        ('completed', 'COMPLETED'),
    ]
    
    placed_by = models.ForeignKey(Customer, related_name="placed_orders", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    price = models.PositiveIntegerField()
    payed = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES,default='in_progress')
    
    def __str__(self):
        return f"Order #{self.id} for {self.placed_by.first_name}"
    
    def clean(self):
        if self.price < 0:
            raise ValidationError({"price": "Price must be non-negative"})
        if self.payed < 0:
            raise ValidationError({"payed": "Payed amount must be non-negative"})
        if self.payed > self.price:
            raise ValidationError({"payed": "Payed amount cannot exceed total price"})

        super().clean()


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="order", on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    selected_properties = models.JSONField(blank=True, null=True)  # Stores selected options at time of order
    note = models.CharField(max_length=255, blank=True, null=True)


    def clean(self):
        if self.quantity <= 0:
            raise ValidationError({"quantity": "Quantity must be at least 1"})
        
        if self.selected_properties:
            for prop_id, val in self.selected_properties.items():
                try:
                    prop = ProductProperty.objects.get(id=prop_id, product=self.product)
                except ProductProperty.DoesNotExist:
                    raise ValidationError({"selected_properties": f"Invalid property ID {prop_id} for {self.product.name}"})

                # Enforce that only non-customer-specific properties are allowed here
                if prop.is_customer_specific:
                    raise ValidationError(
                        {"selected_properties": f"Property '{prop.name}' is customer-specific and cannot be set per order."}
                    )

                # Validate types
                if prop.value_type == "number" and not isinstance(val, (int, float)):
                    raise ValidationError({"selected_properties": f"'{prop.name}' must be a number"})
                elif prop.value_type == "text" and not isinstance(val, str):
                    raise ValidationError({"selected_properties": f"'{prop.name}' must be text"})
                elif prop.value_type == "dropdown":
                    if not isinstance(val, str) or val not in (prop.possible_values or []):
                        raise ValidationError(
                            {"selected_properties": f"Invalid choice '{val}' for '{prop.name}'. Allowed: {prop.possible_values}"}
                        )

        super().clean()

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"