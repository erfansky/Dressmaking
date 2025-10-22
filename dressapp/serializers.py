from rest_framework import serializers
from dressapp.models import *

# --- Customer ---
class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


# --- Product ---
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


# --- ProductProperty ---
class ProductPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductProperty
        fields = "__all__"


# --- CustomerProductProperty ---
class CustomerProductPropertySerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source="property.name", read_only=True)
    property_type = serializers.CharField(source="property.value_type", read_only=True)
    
    class Meta:
        model = CustomerProductProperty
        fields = ["id", "customer", "property", "property_name", "property_type", "value"]

    def validate(self, data):
        """Validate the value field according to property.value_type"""
        prop = data["property"]
        value = data["value"]

        if prop.value_type == "number" and not isinstance(value, (int, float)):
            raise serializers.ValidationError(f"Property {prop.name} requires a numeric value.")
        if prop.value_type == "text" and not isinstance(value, str):
            raise serializers.ValidationError(f"Property {prop.name} requires text.")
        if prop.value_type == "dropdown":
            if not isinstance(value, str) or value not in (prop.possible_values or []):
                raise serializers.ValidationError(
                    f"Invalid choice '{value}' for {prop.name}. Options: {prop.possible_values}"
                )
        return data


# --- OrderItem ---
class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = "__all__"

    def validate(self, data):
        """Check selected_properties validity"""
        product = data["product"]
        selected_props = data.get("selected_properties", {}) or {}

        for prop_id, val in selected_props.items():
            try:
                prop = ProductProperty.objects.get(id=prop_id, product=product)
            except ProductProperty.DoesNotExist:
                raise serializers.ValidationError(f"Invalid property {prop_id} for {product.name}")

            if prop.value_type == "number" and not isinstance(val, (int, float)):
                raise serializers.ValidationError(f"Property '{prop.name}' must be a number")
            if prop.value_type == "text" and not isinstance(val, str):
                raise serializers.ValidationError(f"Property '{prop.name}' must be text")
            if prop.value_type == "dropdown":
                if not isinstance(val, str) or val not in (prop.possible_values or []):
                    raise serializers.ValidationError(
                        f"Invalid choice '{val}' for property '{prop.name}'. Must be {prop.possible_values}"
                    )
        return data


# --- Order ---
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = "__all__"
