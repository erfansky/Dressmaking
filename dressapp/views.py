from rest_framework import viewsets,filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.urls import reverse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from dressapp.models import *
from dressapp.serializers import *


class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": f"Hello, {request.user.username}!"})


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-created_at")
    serializer_class = CustomerSerializer
    
    filter_backends = [DjangoFilterBackend,filters.SearchFilter,filters.OrderingFilter]
    ordering_fields = ["first_name","created_at","updated_at"] # ordering fields
    ordering = ["first_name"] # default ordering
    filterset_fields = ["phone","updated_at"] # exact filtering
    search_fields = ["first_name","last_name","phone"] # partial matching
    permission_classes = [IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-created_at")
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend,filters.OrderingFilter,filters.SearchFilter]
    ordering_fields = ["created_at","updated_at"]
    search_fields = ['name']
    permission_classes = [IsAuthenticated]
    


class ProductPropertyViewSet(viewsets.ModelViewSet):
    queryset = ProductProperty.objects.all().order_by("id")
    serializer_class = ProductPropertySerializer
    filter_backends = [DjangoFilterBackend,filters.SearchFilter,filters.OrderingFilter]
    filterset_fields = ['product']
    permission_classes = [IsAuthenticated]


class CustomerProductPropertyViewSet(viewsets.ModelViewSet):
    queryset = CustomerProductProperty.objects.all().order_by('id')
    serializer_class = CustomerProductPropertySerializer
    filter_backends = [DjangoFilterBackend,filters.SearchFilter,filters.OrderingFilter]
    filterset_fields = ['customer',"property__product"]
    search_fields = ['customer']
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = CustomerProductProperty.objects.all().order_by('id')

        customer_id = self.request.query_params.get("customer")
        product_id = self.request.query_params.get("product")

        if customer_id and product_id:
            queryset = queryset.filter(
                customer_id=customer_id,
                property__product_id=product_id
            )

        return queryset


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by("-created_at")
    serializer_class = OrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['placed_by__first_name', 'placed_by__last_name']  # remove 'order'
    filterset_fields = ['status']  # you can filter by status

    def get_queryset(self):
        queryset = Order.objects.all().order_by("-created_at")
        placed_by_id = self.request.query_params.get("placed_by")
        status = self.request.query_params.get("status")

        if placed_by_id:
            queryset = queryset.filter(placed_by_id=placed_by_id)
        if status:
            queryset = queryset.filter(status=status)
        return queryset
    
    def update(self, request, *args, **kwargs):
        """Allow partial updates even if PUT is used"""
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all().order_by("id")
    serializer_class = OrderItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['customer__first_name', 'customer__last_name', 'product__name']  # correct fields

    def get_queryset(self):
        queryset = OrderItem.objects.all().order_by("id")
        order_id = self.request.query_params.get("order")
        customer_id = self.request.query_params.get("customer")

        if order_id:
            queryset = queryset.filter(order_id=order_id)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset




@api_view(['GET'])
def api_root(request, format=None):
    """
    Custom API root view that shows all major endpoints.
    """
    return Response({
        "customers": request.build_absolute_uri(reverse("dreesapp:customer-list")),
        "products": request.build_absolute_uri(reverse("dreesapp:product-list")),
        "properties": request.build_absolute_uri(reverse("dreesapp:productproperty-list")),
        "customer_properties": request.build_absolute_uri(reverse("dreesapp:customerproductproperty-list")),
        "orders": request.build_absolute_uri(reverse("dreesapp:order-list")),
        "order_items": request.build_absolute_uri(reverse("dreesapp:orderitem-list")),
    })