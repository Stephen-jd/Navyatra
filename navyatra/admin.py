from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.models import User
from .auth_utils import sync_approved_user
from .models import RegistrationRequest


@admin.register(RegistrationRequest)
class RegistrationRequestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'username', 'email', 'phone_number', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('username', 'full_name', 'email', 'phone_number')
    actions = ['approve_registrations', 'reject_registrations']

    def approve_registrations(self, request, queryset):
        approved_count = 0

        for reg_req in queryset:
            try:
                existing_user = (
                    User.objects.filter(username=reg_req.username).first()
                    or User.objects.filter(email=reg_req.email).first()
                )
                sync_approved_user(reg_req, existing_user)
                reg_req.status = 'APPROVED'
                reg_req.save()
                approved_count += 1
            except Exception as e:
                self.message_user(request, f"Error approving {reg_req.username}: {str(e)}", messages.ERROR)

        if approved_count > 0:
            self.message_user(request, f"Successfully approved {approved_count} registration requests.", messages.SUCCESS)

    approve_registrations.short_description = "Approve selected registration requests"

    def reject_registrations(self, request, queryset):
        updated = queryset.filter(status='PENDING').update(status='REJECTED')
        self.message_user(request, f"Successfully marked {updated} pending requests as Rejected.", messages.SUCCESS)

    reject_registrations.short_description = "Reject selected registration requests"
