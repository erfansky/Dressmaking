from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase,APIClient
from rest_framework import status
from dressapp.models import *
from dressapp.serializers import *
from dressapp.views import *
from decouple import config

User = get_user_model()
# ----------- Models ----------- #


class AuthenticatedAPITestCase(APITestCase):
    def authenticate(self) :
        self.username = config("TEST_USERNAME")
        self.password = config("TEST_PASSWORD")
        self.user = User.objects.create_user(
            username=self.username,
            password=self.password,
            is_staff=True,       # admin access
            is_superuser=True    # optional
        )
        
        self.client = APIClient()
        response = self.client.post(
            path="/api/token/",
            data={"username":self.username,"password":self.password},
            format="json"
        )
        self.assertEqual(response.status_code,200,response.data)
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
    
    
class CustomerModelTest(TestCase):
    def test_valid_customer(self):
        customer = Customer(first_name="Ali", last_name="Karimi", phone="09123456789")
        customer.full_clean()
        customer.save()
        self.assertEqual(Customer.objects.count(), 1)

    def test_invalid_phone_too_short(self):
        customer = Customer(first_name="Ali", last_name="Karimi", phone="091234567")
        with self.assertRaises(ValidationError):
            customer.full_clean()

    def test_invalid_phone_wrong_start(self):
        customer = Customer(first_name="Ali", last_name="Karimi", phone="19123456789")
        with self.assertRaises(ValidationError):
            customer.full_clean()

    def test_empty_first_name(self):
        customer = Customer(first_name=" ", last_name="Karimi", phone="09123456789")
        with self.assertRaises(ValidationError):
            customer.full_clean()

    def test_duplicate_phone(self):
        Customer.objects.create(first_name="Ali", last_name="Karimi", phone="09123456789")
        customer2 = Customer(first_name="Sara", last_name="Ahmadi", phone="09123456789")
        with self.assertRaises(ValidationError):
            customer2.full_clean()



class ProductModelTest(TestCase):

    def test_valid_product(self):
        """Product with a valid name should be saved successfully."""
        product = Product(name="Pants", description="Casual pants")
        product.full_clean()  # should not raise error
        product.save()
        self.assertEqual(Product.objects.count(), 1)

    def test_empty_name_raises_error(self):
        """Product with empty name should raise ValidationError."""
        product = Product(name="   ")  # only whitespace
        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_str_method(self):
        """__str__ should return the product name."""
        product = Product.objects.create(name="Shirt")
        self.assertEqual(str(product), "Shirt")
        
class ProductPropertyModelTest(TestCase):

    def setUp(self):
        self.product = Product.objects.create(name="Pants")

    def test_valid_text_property(self):
        prop = ProductProperty(product=self.product, name="Sleeve Length", value_type="number")
        prop.full_clean()  # should pass
        prop.save()
        self.assertEqual(ProductProperty.objects.count(), 1)

    def test_empty_name_raises_error(self):
        prop = ProductProperty(product=self.product, name="  ", value_type="text")
        with self.assertRaises(ValidationError):
            prop.full_clean()

    def test_dropdown_requires_possible_values(self):
        prop = ProductProperty(product=self.product, name="Pocket Style", value_type="dropdown", possible_values=None)
        with self.assertRaises(ValidationError):
            prop.full_clean()

    def test_dropdown_with_valid_possible_values(self):
        prop = ProductProperty(product=self.product, name="Pocket Style", value_type="dropdown", possible_values=["Style A", "Style B"])
        prop.full_clean()  # should pass

    def test_non_dropdown_cannot_have_possible_values(self):
        prop = ProductProperty(product=self.product, name="Color", value_type="text", possible_values=["Red", "Blue"])
        with self.assertRaises(ValidationError):
            prop.full_clean()

class CustomerProductPropertyModelTest(TestCase):

    def setUp(self):
        self.customer = Customer.objects.create(first_name="Alex", last_name="Smith", phone="09123456789")
        self.product = Product.objects.create(name="Pants")
        self.text_prop = ProductProperty.objects.create(product=self.product, name="Fabric Type", value_type="text",is_customer_specific=True)
        self.num_prop = ProductProperty.objects.create(product=self.product, name="Length", value_type="number",is_customer_specific=True)
        self.drop_prop = ProductProperty.objects.create(product=self.product, name="Pocket Style", value_type="dropdown", possible_values=["Style A", "Style B"],is_customer_specific=True)

    def test_valid_number_property(self):
        cpp = CustomerProductProperty(customer=self.customer, property=self.num_prop, value=100)
        cpp.full_clean()  # should pass
        cpp.save()
        self.assertEqual(CustomerProductProperty.objects.count(), 1)

    def test_invalid_number_property_with_text(self):
        cpp = CustomerProductProperty(customer=self.customer, property=self.num_prop, value="long")
        with self.assertRaises(ValidationError):
            cpp.full_clean()

    def test_valid_text_property(self):
        cpp = CustomerProductProperty(customer=self.customer, property=self.text_prop, value="Cotton")
        cpp.full_clean()  # should pass
        cpp.save()
        self.assertEqual(CustomerProductProperty.objects.count(), 1)

    def test_invalid_text_property_with_number(self):
        cpp = CustomerProductProperty(customer=self.customer, property=self.text_prop, value=123)
        with self.assertRaises(ValidationError):
            cpp.full_clean()

    def test_valid_dropdown_property(self):
        cpp = CustomerProductProperty(customer=self.customer, property=self.drop_prop, value="Style A")
        cpp.full_clean()  # should pass
        cpp.save()
        self.assertEqual(CustomerProductProperty.objects.count(), 1)

    def test_invalid_dropdown_property_with_wrong_choice(self):
        cpp = CustomerProductProperty(customer=self.customer, property=self.drop_prop, value="Style X")
        with self.assertRaises(ValidationError):
            cpp.full_clean()

    def test_unique_customer_property_constraint(self):
        CustomerProductProperty.objects.create(customer=self.customer, property=self.text_prop, value="Cotton")
        duplicate = CustomerProductProperty(customer=self.customer, property=self.text_prop, value="Linen")
        with self.assertRaises(Exception):  # IntegrityError or ValidationError depending on DB
            duplicate.save()
            
            
class OrderModelTest(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(first_name="Alex", last_name="Smith", phone="09123456789")

    def test_valid_order(self):
        order = Order(placed_by=self.customer, price=1000, payed=500)
        order.full_clean()  # should not raise

    def test_payed_cannot_exceed_price(self):
        order = Order(placed_by=self.customer, price=1000, payed=1500)
        with self.assertRaises(ValidationError):
            order.full_clean()

    def test_negative_price_not_allowed(self):
        order = Order(placed_by=self.customer, price=-10, payed=0)
        with self.assertRaises(ValidationError):
            order.full_clean()

    def test_negative_payed_not_allowed(self):
        order = Order(placed_by=self.customer, price=1000, payed=-5)
        with self.assertRaises(ValidationError):
            order.full_clean()


class OrderItemModelTest(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(first_name="Alex", last_name="Smith", phone="09123456789")
        self.product = Product.objects.create(name="Pants")

        # property that is order-specific
        self.prop_color = ProductProperty.objects.create(
            product=self.product, name="Color", value_type="dropdown",
            possible_values=["Red", "Blue"], is_customer_specific=False
        )

        # property that is customer-specific
        self.prop_length = ProductProperty.objects.create(
            product=self.product, name="Length", value_type="number",
            is_customer_specific=True
        )

        self.order = Order.objects.create(placed_by=self.customer, price=500, payed=200)

    def test_valid_order_item_with_dropdown(self):
        item = OrderItem(order=self.order, customer=self.customer, product=self.product, quantity=1,
                         selected_properties={str(self.prop_color.id): "Red"})
        item.full_clean()  # should not raise

    def test_quantity_must_be_positive(self):
        item = OrderItem(order=self.order, customer=self.customer, product=self.product, quantity=0)
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_invalid_property_id(self):
        item = OrderItem(order=self.order, customer=self.customer, product=self.product,
                         selected_properties={"99999": "Red"})
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_customer_specific_property_not_allowed_in_order_item(self):
        item = OrderItem(order=self.order, customer=self.customer, product=self.product,
                         selected_properties={str(self.prop_length.id): 100})
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_invalid_dropdown_value(self):
        item = OrderItem(order=self.order, customer=self.customer, product=self.product,
                         selected_properties={str(self.prop_color.id): "Green"})
        with self.assertRaises(ValidationError):
            item.full_clean()
            


# ----------- Serializers ----------- #


class CustomerSerializerTest(TestCase):
    
    def test_valid_customer_seialization(self):
        costumer = Customer.objects.create(
            first_name = "Ali",
            last_name = "Karimi",
            phone = "09123456789"
        )
        serializer = CustomerSerializer(costumer)
        data = serializer.data
        self.assertEqual(data['first_name'], 'Ali')
        self.assertEqual(data['last_name'], 'Karimi')
        self.assertEqual(data['phone'], '09123456789')
    
    def test_customer_deserialization_valid(self):
        data = {
            "first_name": "Sara",
            "last_name": "Ahmadi",
            "phone": "09387654321"
        }
        serializer = CustomerSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        customer = serializer.save()
        self.assertEqual(customer.first_name, "Sara")
        self.assertEqual(customer.phone, "09387654321")

    def test_customer_deserialization_invalid_phone(self):
        data = {
            "first_name": "Sara",
            "last_name": "Ahmadi",
            "phone": "12345"  # invalid phone
        }
        serializer = CustomerSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("phone", serializer.errors)
        
    def test_customer_desrialization_invalid_first_name(self):
        data = {
            "first_name": "", # invalid first_name
            "last_name": "Ahmadi",
            "phone": "09387654321" 
        }
        serializer = CustomerSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("first_name", serializer.errors)

    
    
    def test_customer_desrialization_invalid_last_name(self):
        data = {
            "first_name": "sara", 
            "last_name": "",# invalid last_name
            "phone": "09387654321" 
        }
        serializer = CustomerSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("last_name", serializer.errors)
        
        
class ProductSerializerTest(TestCase):
    
    def test_valid_product_serialization(self):
        product = Product.objects.create(
            name="T-shirt", 
            description="A stylish T-shirt"
        )

        serializer = ProductSerializer(product)
        data = serializer.data
        self.assertEqual(data["name"], "T-shirt")
        self.assertEqual(data["description"], "A stylish T-shirt")
    
    def test_valid_product_deserialization(self):
        data = {
            "name":"T-shirt",
            "description":"A stylish T-shirt",
        }
        serializer = ProductSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        customer = serializer.save()
        self.assertEqual(customer.name, "T-shirt")
        self.assertEqual(customer.description, "A stylish T-shirt")
    
    
    def test_product_empty_name_deserialization(self):
        data = {
            "name":"", 
            "description":"A stylish T-shirt"
        }

        serializer = ProductSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)
        
# dressapp/tests/test_serializers.py
from django.test import TestCase
from dressapp.models import (
    Customer, Product, ProductProperty,
    CustomerProductProperty, Order, OrderItem
)
from dressapp.serializers import (
    ProductPropertySerializer, CustomerProductPropertySerializer,
    OrderSerializer, OrderItemSerializer
)


class ProductPropertySerializerTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(name="Shirt")

    def test_valid_property(self):
        data = {
            "product": self.product.id,
            "name": "Sleeve Length",
            "value_type": "number"
        }
        serializer = ProductPropertySerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_dropdown_property_validation(self):
        data = {
            "product": self.product.id,
            "name": "Pocket Style",
            "value_type": "dropdown",
            "possible_values": ["A", "B", "C"]
        }
        serializer = ProductPropertySerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class CustomerProductPropertySerializerTest(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(first_name="Alex", last_name="Doe", phone="09123456789")
        self.product = Product.objects.create(name="Pants")
        self.prop = ProductProperty.objects.create(
            product=self.product, name="Length", value_type="number", is_customer_specific=True
        )

    def test_valid_customer_property_number(self):
        data = {
            "customer": self.customer.id,
            "property": self.prop.id,
            "value": 100
        }
        serializer = CustomerProductPropertySerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_invalid_type(self):
        data = {
            "customer": self.customer.id,
            "property": self.prop.id,
            "value": "not_a_number"
        }
        serializer = CustomerProductPropertySerializer(data=data)
        self.assertFalse(serializer.is_valid())


class OrderSerializerTest(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(first_name="Alex", last_name="Doe", phone="09123456789")

    def test_valid_order(self):
        data = {
            "placed_by": self.customer.id,
            "price": 200,
            "payed": 100,
        }
        serializer = OrderSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class OrderItemSerializerTest(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(first_name="Alex", last_name="Doe", phone="09123456789")
        self.product = Product.objects.create(name="Jacket")
        self.prop = ProductProperty.objects.create(
            product=self.product, name="Pocket Style", value_type="dropdown", possible_values=["A", "B"], is_customer_specific=False
        )
        self.order = Order.objects.create(placed_by=self.customer, price=500, payed=200)

    def test_valid_order_item(self):
        data = {
            "order": self.order.id,
            "customer": self.customer.id,
            "product": self.product.id,
            "quantity": 1,
            "selected_properties": {str(self.prop.id): "A"}
        }
        serializer = OrderItemSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_invalid_dropdown_choice(self):
        data = {
            "order": self.order.id,
            "customer": self.customer.id,
            "product": self.product.id,
            "quantity": 1,
            "selected_properties": {str(self.prop.id): "X"}
        }
        serializer = OrderItemSerializer(data=data)
        self.assertFalse(serializer.is_valid())


# -------------- Views -----------------#



class CustomerViewSetTest(AuthenticatedAPITestCase):
    def setUp(self):
        self.customer_1 = Customer.objects.create(first_name="Ali",last_name="Rezaei",phone="09123456789")
        self.customer_2 = Customer.objects.create(first_name="Alex", last_name="Johnson", phone="09111111111")
        self.customer_3 = Customer.objects.create(first_name="Sara", last_name="Smith", phone="09333333333")
        self.list_url = reverse("dressapp:customer-list")
        self.detail_url = reverse("dressapp:customer-detail", args=[self.customer_1.id])
        
    def test_list_customers_unauthenticated(self):
        # clear any credentials set by authenticate()
        self.client.credentials()  
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_customers(self):
        self.authenticate()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
        sorted_customers = sorted(response.data['results'],key=lambda x: x['id'])
        
        self.assertEqual(sorted_customers[0]['first_name'], self.customer_1.first_name)

    def test_retrieve_customer(self):
        self.authenticate()
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["phone"], self.customer_1.phone)

    def test_create_customer(self):
        self.authenticate()
        data = {
            "first_name": "Sara",
            "last_name": "Ahmadi",
            "phone": "09387654321"
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Customer.objects.count(), 4)

    def test_invalid_customer_create(self):
        self.authenticate()
        data = {"first_name": "Sara", "last_name": "Ahmadi", "phone": "123"}  # bad phone
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)
        
    def test_duplicated_phone(self):
        self.authenticate()
        data  =  {"first_name":"Ali","last_name":"Karimi","phone":"09123456789"}
        response = self.client.post(data=data,path=self.list_url,format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)
    
    # searchs
     
    def test_search_by_exact_phone(self):
        self.authenticate()
        response = self.client.get("/api/customers/?phone=09123456789")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]["first_name"], self.customer_1.first_name)

    def test_search_by_partial_name(self):
        self.authenticate()
        response = self.client.get("/api/customers/?search=Al")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["first_name"] for c in response.json()['results']]
        self.assertIn("Alex", names)
        self.assertIn("Ali", names)
        self.assertNotIn("Sara", names)

    def test_search_by_partial_phone(self):
        self.authenticate()
        response = self.client.get("/api/customers/?search=0933")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]["first_name"], self.customer_3.first_name)
        
        
class ProductViewSetTest(AuthenticatedAPITestCase):
    def setUp(self):
        self.product_1 = Product.objects.create(
            name="Shirt",
            description="A shirt for men and women",
        )
        self.product_2 = Product.objects.create(
            name= "Pants",
            description= "Domestic persian pants",
        )
        self.product_3 = Product.objects.create(
            name="Jacket",
            description="Winter leather jacket",
        )
        self.product_4 = Product.objects.create(
            name="T-Shirt",
            description="Thin and summery",
        )
        self.list_url = reverse("dressapp:product-list")
        self.detail_url = reverse("dressapp:product-detail", args=[self.product_1.id])
    
    def test_list_products(self):
        self.authenticate()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 4)
        sorted_product = sorted(response.json()['results'],key= lambda x : x['id'])
        self.assertEqual(sorted_product[0]["name"], self.product_1.name)
        
    
    def test_unauthenticated_retrieve_product(self):
        self.client.credentials()
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_retrieve_product(self):
        self.authenticate()
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["name"], self.product_1.name)
        
    def test_create_product(self):
        self.authenticate()
        new_product = {"name": "Dress", "description": "For women and men"}
        response = self.client.post(self.list_url, new_product, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 5)

    def test_update_product(self):
        self.authenticate()
        data = {"name": "Shirt", "description": "A shirt for men and women"}
        response = self.client.put(self.detail_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["description"], "A shirt for men and women")

    def test_delete_product(self):
        self.authenticate()
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Product.objects.count(), 3)
        
    # search
    
    def test_search_by_name(self):
        self.authenticate()
        response = self.client.get("/api/products/?search=Shirt")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 2)

class ProductPropertyViewSetTest(AuthenticatedAPITestCase):
    
    def setUp(self):
        self.product_1 = Product.objects.create(name="Pants", description="Domestic persian pants")
        self.property_1 = ProductProperty.objects.create(product=self.product_1, name="Length", value_type="number")
        self.property_2 = ProductProperty.objects.create(product=self.product_1, name="color", value_type="dropdown", possible_values=["Red", "Blue", "Green"])
        self.product_2 = Product.objects.create(name="Shirt", description="A shirt for men and women")
        self.property_3 = ProductProperty.objects.create(product=self.product_2, name="Size", value_type="dropdown", possible_values=["S", "M", "L", "XL"])
        self.list_url = "/api/properties/"
        
    def test_create_property(self):
        self.authenticate()
        data = {
            "product": self.product_1.id,
            "name": "Style",
            "value_type": "dropdown",
            "possible_values": ["Round", "V-neck"],
        }
        response = self.client.post(self.list_url,data= data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProductProperty.objects.count(), 4)
    
    def test_list_properties(self):
        self.authenticate()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 3)

    def test_list_property(self):
        self.authenticate()
        response = self.client.get(f'/api/properties/?product={self.product_1.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 2)

class CustomerProductPropertyViewSetTest(AuthenticatedAPITestCase):
    # TODO
    def setUp(self):
        self.customer_1 = Customer.objects.create(first_name="Alex", last_name="Doe", phone="09123456789")
        self.product_1 = Product.objects.create(name="Pants", description="Domestic persian pants")
        self.property_1 = ProductProperty.objects.create(product=self.product_1, name="Length", value_type="number", is_customer_specific=False)
        self.property_2 = ProductProperty.objects.create(product=self.product_1, name="color", value_type="dropdown", possible_values=["Red", "Blue", "Green"], is_customer_specific=True)
        self.product_2 = Product.objects.create(name="Shirt", description="A shirt for men and women")
        self.property_3 = ProductProperty.objects.create(product=self.product_2, name="Size", value_type="dropdown", possible_values=["S", "M", "L", "XL"],is_customer_specific=True)
        self.customer_product_property_1 = CustomerProductProperty.objects.create(customer=self.customer_1,property=self.property_1, value=110)
        self.customer_product_property_2 = CustomerProductProperty.objects.create(customer=self.customer_1,property=self.property_2, value="Red")
        self.list_url = reverse("dressapp:customerproductproperty-list")

    def test_list_customer_product_property(self):
        self.authenticate()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 2)

    def test_create_customer_property(self):
        self.authenticate()
        url = "/api/customer-properties/"
        data = {
            "customer": self.customer_1.id,
            "property": self.property_3.id,
            "value": "S",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class OrderViewSetTest(AuthenticatedAPITestCase):
    def setUp(self):
        self.customer = Customer.objects.create(first_name="Alex", last_name="Doe", phone="09123456789")

    def test_create_order(self):
        self.authenticate()
        url = "/api/orders/"
        data = {
            "placed_by": self.customer.id,
            "price": 500,
            "payed": 300,
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class OrderItemViewSetTest(AuthenticatedAPITestCase):
    def setUp(self):
        self.customer = Customer.objects.create(first_name="Alex", last_name="Doe", phone="09123456789")
        self.product = Product.objects.create(name="Jacket")
        self.prop = ProductProperty.objects.create(
            product=self.product, name="Pocket Style", value_type="dropdown", possible_values=["A", "B"], is_customer_specific=False
        )
        self.order = Order.objects.create(placed_by=self.customer, price=500, payed=200)
        
    
    def test_create_order_item(self):
        self.authenticate()
        url = "/api/order-items/"
        data = {
            "order": self.order.id,
            "customer": self.customer.id,
            "product": self.product.id,
            "quantity": 1,
            "selected_properties": {str(self.prop.id): "B"},
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)