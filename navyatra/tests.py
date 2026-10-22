from django.contrib import admin
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.auth.middleware import AuthenticationMiddleware
from django.contrib.sessions.middleware import SessionMiddleware
from django.http import HttpResponse
from django.test import RequestFactory, TestCase
from unittest.mock import patch

from .admin import RegistrationRequestAdmin
from .models import RegistrationRequest
from .views import entry_view


class RegistrationApprovalTests(TestCase):
    def post_to_entry(self, data):
        request = RequestFactory().post('/entry/', data)
        SessionMiddleware(lambda req: None).process_request(request)
        request.session.save()
        AuthenticationMiddleware(lambda req: None).process_request(request)
        return request

    def approve_registration(self, registration):
        request = RequestFactory().get('/admin/')
        request.session = {}
        request._messages = FallbackStorage(request)
        admin_obj = RegistrationRequestAdmin(RegistrationRequest, admin.site)
        admin_obj.approve_registrations(
            request,
            RegistrationRequest.objects.filter(pk=registration.pk),
        )

    def test_approved_user_without_auth_account_can_log_in(self):
        RegistrationRequest.objects.create(
            username='loginrepair',
            email='loginrepair@example.com',
            full_name='Login Repair',
            phone_number='5555555555',
            password=make_password('LoginPass123!'),
            status='APPROVED',
        )

        request = self.post_to_entry({
            'action': 'login',
            'username': 'loginrepair',
            'password': 'LoginPass123!',
        })
        response = entry_view(request)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], '/')
        self.assertTrue(request.user.is_authenticated)
        self.assertTrue(User.objects.get(username='loginrepair').is_active)

    def test_wrong_password_does_not_create_approved_user_account(self):
        RegistrationRequest.objects.create(
            username='wrongpassword',
            email='wrongpassword@example.com',
            full_name='Wrong Password',
            phone_number='4444444444',
            password=make_password('ActualPass123!'),
            status='APPROVED',
        )

        request = self.post_to_entry({
            'action': 'login',
            'username': 'wrongpassword',
            'password': 'WrongPass123!',
        })
        with patch('navyatra.views.render', return_value=HttpResponse()):
            response = entry_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(username='wrongpassword').exists())

    def test_approve_registration_with_hashed_password_logs_in(self):
        request = RegistrationRequest.objects.create(
            username='hashuser',
            email='hashuser@example.com',
            full_name='Hash User',
            phone_number='9999999999',
            password=make_password('StrongPass123!'),
            status='PENDING',
        )

        self.approve_registration(request)

        user = authenticate(username='hashuser', password='StrongPass123!')
        self.assertIsNotNone(user)
        self.assertTrue(user.is_active)

    def test_approve_registration_with_plaintext_password_logs_in(self):
        request = RegistrationRequest.objects.create(
            username='plainuser',
            email='plainuser@example.com',
            full_name='Plain User',
            phone_number='8888888888',
            password='PlainPass123!',
            status='PENDING',
        )

        self.approve_registration(request)

        user = authenticate(username='plainuser', password='PlainPass123!')
        self.assertIsNotNone(user)
        self.assertTrue(user.is_active)

    def test_reapproving_approved_request_creates_missing_user(self):
        request = RegistrationRequest.objects.create(
            username='approveduser',
            email='approveduser@example.com',
            full_name='Approved User',
            phone_number='7777777777',
            password=make_password('ApprovedPass123!'),
            status='APPROVED',
        )

        self.approve_registration(request)

        user = authenticate(username='approveduser', password='ApprovedPass123!')
        self.assertIsNotNone(user)
        self.assertTrue(user.is_active)

    def test_reapproving_approved_request_repairs_existing_user_password(self):
        request = RegistrationRequest.objects.create(
            username='repairuser',
            email='repairuser@example.com',
            full_name='Repair User',
            phone_number='6666666666',
            password=make_password('CorrectPass123!'),
            status='APPROVED',
        )
        User.objects.create_user(username='repairuser', password='OldPass123!')

        self.approve_registration(request)

        user = authenticate(username='repairuser', password='CorrectPass123!')
        self.assertIsNotNone(user)
        self.assertTrue(user.is_active)
